'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Nếu đã xác định xong user từ localStorage nhưng không có user hoặc không có quyền DuyetNguoiDung/XemDanhSachNguoiDung
        if (user === null) {
            // Đợi AuthContext load, nếu null thực sự thì đẩy về home
            const timer = setTimeout(() => {
                if (!localStorage.getItem('userInfo')) {
                    router.push('/');
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // Kiểm tra roles. Nếu là Admin thì mới cho vào.
            
            const isAdmin = user.roles && (
                user.roles.includes('Admin')
            );
            if (!isAdmin) {
                router.push('/');
            } else {
                setIsAuthorized(true);
            }
        }
    }, [user, router]);

    if (!isAuthorized) {
        return <div className="min-h-screen flex items-center justify-center bg-primary text-white">Đang kiểm tra quyền truy cập...</div>;
    }

    const navItems = [
        { href: '/admin', icon: 'fa-chart-pie', label: 'Overview' },
        { href: '/admin/nguoidung', icon: 'fa-users', label: 'Users' },
        { href: '/admin/posts', icon: 'fa-newspaper', label: 'Reports' },
    ];

    return (
        <div className="flex h-screen bg-primary text-white font-sans overflow-hidden">
            {/* Sidebar styled like the image */}
            <aside className="w-24 flex flex-col items-center py-6 justify-between">
                <div className="flex flex-col items-center space-y-10 w-full">
                    {/* Logo Info */}
                    <div className="flex flex-col items-center justify-center cursor-pointer group">
                        <div className="text-white text-2xl font-bold bg-[#b30000] w-12 h-12 rounded-full flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-lg shadow-black/20">
                            V
                        </div>
                        <span className="text-[10px] font-bold tracking-wider">Viettel</span>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex flex-col w-full space-y-4 items-center">
                        {navItems.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} className="group flex flex-col items-center relative w-full py-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#b30000] text-white shadow-lg shadow-black/20 scale-110' : 'text-red-200 hover:text-white hover:bg-[#cc0000]'}`}>
                                        <i className={`fa-solid ${item.icon} text-lg`}></i>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold mt-2 ${isActive ? 'text-white' : 'text-red-200 group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Profile & Exit */}
                <div className="mb-4 flex flex-col items-center space-y-3">
                    <Link href="/settings" className="w-12 h-12 rounded-full flex items-center justify-center text-red-200 hover:text-white hover:bg-white/10 transition-colors" title="Cài đặt">
                        <i className="fa-solid fa-gear text-lg"></i>
                    </Link>
                    <Link href="/" className="w-12 h-12 rounded-full border-2 border-transparent hover:border-white transition-all flex items-center justify-center bg-white/20 hover:bg-white/30 text-white shadow-sm" title="Rời khỏi Admin">
                        <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
                    </Link>
                    <span className="text-[10px] uppercase font-bold text-red-200">Exit</span>
                </div>
            </aside>

            {/* Main Content Container */}
            <main className="flex-1 flex flex-col h-full overflow-hidden pt-6 pr-6 pb-6">
                
                {/* Header Navigation */}
                <header className="flex items-center justify-between mb-6 px-6">
                    <div className="flex items-center text-red-100 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
                        <div className="w-8 h-8 rounded-full bg-[#b30000] text-white flex items-center justify-center mr-3 font-bold border border-transparent transition-transform hover:scale-105 shadow-md">
                            <i className="fa-solid fa-arrow-left text-sm"></i>
                        </div>
                        <span className="text-sm font-semibold tracking-wide">Back</span>
                    </div>
                    
                    <div className="flex space-x-12">
                        <span className="uppercase font-bold tracking-widest text-sm text-white border-b-2 border-white pb-1">DASHBOARD</span>
                        <span className="uppercase font-bold tracking-widest text-sm text-red-200 hover:text-white cursor-pointer transition-colors">INSIGHTS</span>
                        <span className="uppercase font-bold tracking-widest text-sm text-red-200 hover:text-white cursor-pointer transition-colors">CHANNELS</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex -space-x-2">
                            <img src="https://i.pravatar.cc/100?img=1" className="w-8 h-8 rounded-full border-2 border-primary object-cover shadow-sm z-0" alt="Member" />
                            <img src="https://i.pravatar.cc/100?img=2" className="w-8 h-8 rounded-full border-2 border-primary object-cover shadow-sm z-10" alt="Member" />
                            <div className="w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center text-xs font-bold z-20 text-primary shadow-sm">
                                {user?.tenDangNhap?.charAt(0).toUpperCase() || 'A'}
                            </div>
                        </div>
                        <span className="text-sm text-white font-medium whitespace-nowrap">Admin Team</span>
                    </div>
                </header>

                {/* White Paper Area */}
                <div className="flex-1 bg-[#F9FAFB] rounded-[2.5rem] shadow-2xl overflow-y-auto w-full h-full p-8 text-gray-800">
                    {children}
                </div>
            </main>
        </div>
    );
}