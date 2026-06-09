'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/services/api';

// Định nghĩa kiểu dữ liệu cho User
interface User {
    id: number;
    tenDangNhap: string;
    email: string;
    roles: string[];
    avatar?: string;
    createdAt?: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
    isAuthReady: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const syncSession = async () => {
            const storedUser = localStorage.getItem('userInfo');

            if (!storedUser) {
                if (!isMounted) return;
                setUser(null);
                setIsAuthReady(true);
                return;
            }

            try {
                const response = await api.get('/auth/me');
                const currentUser = response.data?.user ?? JSON.parse(storedUser);

                if (!isMounted) return;
                setUser(currentUser);
                localStorage.setItem('userInfo', JSON.stringify(currentUser));
            } catch (error) {
                if (!isMounted) return;
                setUser(null);
                localStorage.removeItem('userInfo');

                if (pathname !== '/login') {
                    router.replace('/login');
                }
            } finally {
                if (isMounted) {
                    setIsAuthReady(true);
                }
            }
        };

        void syncSession();

        return () => {
            isMounted = false;
        };
    }, [pathname, router]);

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('userInfo', JSON.stringify(userData));
        setIsAuthReady(true);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
        setIsAuthReady(true);

        if (pathname !== '/login') {
            router.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthReady }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
