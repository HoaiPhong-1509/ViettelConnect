'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';

// Định nghĩa kiểu dữ liệu cho User
interface User {
    id: number;
    tenDangNhap: string;
    email: string;
    roles: string[];
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => {},
    logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    // Kiểm tra xem User đã đăng nhập chưa (có lưu trong localStorage tạm phần Info, còn token thì nằm ở Cookie rổi)
    useEffect(() => {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (userData: User) => {
        setUser(userData);
        // Lưu THÔNG TIN (không bao gồm Token) vào LocalStorage để F5 không bị mất hiển thị tên
        localStorage.setItem('userInfo', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
