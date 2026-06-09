"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getActivityMeta, sortActivitiesDesc, type ActivityEvent } from '@/utils/adminActivity';
import { getRecentNotificationsApi } from '@/services/notifications.api';
import { useNotificationPanel } from '@/contexts/NotificationPanelContext';

const DEFAULT_LIMIT = 10;

const normalizeNotifications = (payload: unknown): ActivityEvent[] => {
    if (Array.isArray(payload)) {
        return payload as ActivityEvent[];
    }

    if (payload && typeof payload === 'object') {
        const maybeData = (payload as { data?: unknown }).data;

        if (Array.isArray(maybeData)) {
            return maybeData as ActivityEvent[];
        }
    }

    return [];
};

const formatRelativeTime = (value?: string) => {
    if (!value) {
        return 'Vừa xong';
    }

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return 'Vừa xong';
    }

    const diffMinutes = Math.max(0, Math.floor((Date.now() - dateValue.getTime()) / 60000));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(dateValue);
};

const getNotificationHref = (notification: ActivityEvent) => {
    return notification.href || '/';
};

export default function NotificationPanel() {
    const { isOpen, closeNotifications, lastSeenAt, markNotificationsSeen, setUnreadCount } = useNotificationPanel();
    const [notifications, setNotifications] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const sortedNotifications = useMemo(() => sortActivitiesDesc(notifications), [notifications]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        let isActive = true;

        const loadNotifications = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await getRecentNotificationsApi(DEFAULT_LIMIT);
                const fetchedNotifications = normalizeNotifications(response);

                if (!isActive) {
                    return;
                }

                setNotifications(fetchedNotifications);

                const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
                const unreadItems = fetchedNotifications.filter((item) => {
                    const occurredAt = new Date(item.occurredAt || 0).getTime();
                    return occurredAt > lastSeenTime;
                });

                setUnreadCount(unreadItems.length);
            } catch (fetchError) {
                console.error('Không thể tải thông báo:', fetchError);

                if (isActive) {
                    setError('Không thể tải thông báo lúc này.');
                    setNotifications([]);
                    setUnreadCount(0);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void loadNotifications();

        return () => {
            isActive = false;
        };
    }, [isOpen, lastSeenAt, setUnreadCount]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (window.innerWidth >= 1280) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const latestSeenTimestamp = sortedNotifications[0]?.occurredAt;

    const handleClose = () => {
        if (latestSeenTimestamp) {
            markNotificationsSeen(latestSeenTimestamp);
        }

        closeNotifications();
    };

    const handleItemClick = () => {
        if (latestSeenTimestamp) {
            markNotificationsSeen(latestSeenTimestamp);
        }

        closeNotifications();
    };

    return (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/30 xl:fixed xl:inset-auto xl:right-6 xl:top-[120px] xl:z-[120] xl:bg-transparent xl:pointer-events-none">
            <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={handleClose}
                className="absolute inset-0 cursor-default bg-transparent xl:hidden"
            />

            <aside className="relative h-full w-full max-w-[390px] overflow-hidden bg-white shadow-2xl xl:h-[calc(100vh-160px)] xl:rounded-[28px] xl:border xl:border-gray-200 xl:shadow-[0_20px_50px_rgba(15,23,42,0.14)] xl:pointer-events-auto">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Thông báo</p>
                        <h2 className="mt-2 text-xl font-black text-gray-900">Hoạt động gần đây</h2>
                        <p className="mt-2 max-w-[250px] text-sm leading-relaxed text-gray-500">
                            Bài viết, lượt thích và bình luận mới nhất trong hệ thống.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
                    >
                        Đóng
                    </button>
                </div>

                <div className="h-[calc(100%-140px)] overflow-y-auto bg-[#f7f7f8] px-4 py-4">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="rounded-3xl bg-white p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="h-11 w-11 rounded-2xl bg-gray-200 animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3.5 w-3/4 rounded-full bg-gray-200 animate-pulse" />
                                            <div className="h-3 w-full rounded-full bg-gray-200 animate-pulse" />
                                            <div className="h-3 w-1/2 rounded-full bg-gray-200 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm font-medium text-gray-500 shadow-sm">
                            {error}
                        </div>
                    ) : sortedNotifications.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm font-medium text-gray-500 shadow-sm">
                            Chưa có thông báo mới phù hợp với hoạt động hiện tại.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedNotifications.map((notification) => {
                                const meta = getActivityMeta(notification.eventType);

                                return (
                                    <Link
                                        key={`${notification.eventType}-${notification.entityId}-${notification.occurredAt}`}
                                        href={getNotificationHref(notification)}
                                        onClick={handleItemClick}
                                        className="group block rounded-3xl bg-white p-4 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:ring-red-100 hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white shadow-lg shadow-black/10`}>
                                                <i className={`${meta.icon} text-xs`} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-gray-900">{notification.title}</p>
                                                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{notification.detail}</p>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                                        {meta.badge}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                                                    <span className="font-semibold text-gray-700">{notification.actorName || 'Hệ thống'}</span>
                                                    <span>{formatRelativeTime(notification.occurredAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}