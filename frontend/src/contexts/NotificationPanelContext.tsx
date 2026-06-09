"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { getRecentNotificationsApi } from '@/services/notifications.api';

const STORAGE_KEY = 'viettel.notifications.lastSeenAt';

type NotificationPanelContextType = {
    isOpen: boolean;
    unreadCount: number;
    lastSeenAt: string | null;
    openNotifications: () => void;
    closeNotifications: () => void;
    toggleNotifications: () => void;
    markNotificationsSeen: (timestamp?: string) => void;
    setUnreadCount: (count: number) => void;
};

const NOTIFICATION_LIMIT = 20;
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

const NotificationPanelContext = createContext<NotificationPanelContextType>({
    isOpen: false,
    unreadCount: 0,
    lastSeenAt: null,
    openNotifications: () => {},
    closeNotifications: () => {},
    toggleNotifications: () => {},
    markNotificationsSeen: () => {},
    setUnreadCount: () => {},
});

export const NotificationPanelProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const refreshUnreadCount = async (seenAt = lastSeenAt) => {
        try {
            const response = await getRecentNotificationsApi(NOTIFICATION_LIMIT);
            const notifications = Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : [];

            const seenTime = seenAt ? new Date(seenAt).getTime() : 0;
            const nextUnreadCount = notifications.filter((item: { occurredAt?: string }) => {
                const occurredAt = new Date(item.occurredAt || 0).getTime();
                return occurredAt > seenTime;
            }).length;

            setUnreadCount(nextUnreadCount);
        } catch (error) {
            console.error('Không thể cập nhật số lượng thông báo:', error);
        }
    };

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            setLastSeenAt(null);
            return;
        }

        const storedLastSeenAt = localStorage.getItem(STORAGE_KEY);

        if (storedLastSeenAt) {
            setLastSeenAt(storedLastSeenAt);
        }

        setIsReady(true);
    }, [user]);

    useEffect(() => {
        if (!isReady || !user) {
            return;
        }

        void refreshUnreadCount(lastSeenAt || undefined);
    }, [isReady, lastSeenAt, user]);

    useEffect(() => {
        if (!user) {
            return;
        }

        const socket = io(SOCKET_URL, {
            withCredentials: true,
        });

        socketRef.current = socket;

        const handleNotificationCreated = () => {
            void refreshUnreadCount();
        };

        socket.on('notification_created', handleNotificationCreated);

        return () => {
            socket.off('notification_created', handleNotificationCreated);
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    const openNotifications = () => setIsOpen(true);
    const closeNotifications = () => setIsOpen(false);
    const toggleNotifications = () => setIsOpen((value) => !value);

    const markNotificationsSeen = (timestamp?: string) => {
        if (!isReady || !user) {
            return;
        }

        const nextTimestamp = timestamp || new Date().toISOString();
        setLastSeenAt(nextTimestamp);
        setUnreadCount(0);
        localStorage.setItem(STORAGE_KEY, nextTimestamp);
        void refreshUnreadCount(nextTimestamp);
    };

    return (
        <NotificationPanelContext.Provider
            value={{
                isOpen,
                unreadCount,
                lastSeenAt,
                openNotifications,
                closeNotifications,
                toggleNotifications,
                markNotificationsSeen,
                setUnreadCount,
            }}
        >
            {children}
        </NotificationPanelContext.Provider>
    );
};

export const useNotificationPanel = () => useContext(NotificationPanelContext);