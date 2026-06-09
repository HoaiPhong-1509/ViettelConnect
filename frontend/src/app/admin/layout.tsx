'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/services/api';

const DEFAULT_AVATAR = '/viettel-telecom-seeklogo.svg';

type AdminTeamMember = {
    Id: number;
    TenDangNhap: string;
    Email?: string;
    AnhDaiDienUrl?: string | null;
    TenVaiTro?: string;
};

const getAvatarSrc = (avatarUrl?: string | null) => {
    const normalizedUrl = avatarUrl?.trim();

    if (!normalizedUrl) {
        return DEFAULT_AVATAR;
    }

    if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('/')) {
        return normalizedUrl;
    }

    return DEFAULT_AVATAR;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthReady } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [teamMembers, setTeamMembers] = useState<AdminTeamMember[]>([]);
    const [isTeamLoading, setIsTeamLoading] = useState(false);
    const [isTeamOpen, setIsTeamOpen] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    useEffect(() => {
        if (!isAuthReady) {
            return;
        }

        if (!user) {
            router.replace('/login');
            return;
        }

        const isAdmin = Array.isArray(user.roles) && user.roles.includes('Admin');

        if (!isAdmin) {
            router.replace('/login');
            return;
        }

        setIsAuthorized(true);
    }, [isAuthReady, user, router]);

    useEffect(() => {
        if (!isAuthorized) {
            return;
        }

        const loadTeam = async () => {
            setIsTeamLoading(true);
            try {
                const response = await api.get('/admin/team');
                setTeamMembers(response.data || []);
            } catch (error) {
                console.error('Không thể tải admin team:', error);
                setTeamMembers([]);
            } finally {
                setIsTeamLoading(false);
            }
        };

        loadTeam();
    }, [isAuthorized]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && !target.closest('[data-admin-team-popover]')) {
                setIsTeamOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isAuthorized) {
        return <div className="min-h-screen flex items-center justify-center bg-[#E60000] text-white">Đang kiểm tra quyền truy cập...</div>;
    }

    const navItems = [
        { href: '/admin', icon: 'fa-chart-pie', label: 'Overview' },
        { href: '/admin/nguoidung', icon: 'fa-users', label: 'Users' },
        { href: '/admin/posts', icon: 'fa-newspaper', label: 'Posts' },
    ];

    return (
        <div className="flex h-screen bg-[#E60000] text-white font-sans overflow-hidden">
            {/* Mobile Nav Toggle */}
            <div className="md:hidden absolute top-4 left-4 z-50">
                <button 
                  onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} 
                  className="w-10 h-10 bg-[#B30000] rounded-full flex items-center justify-center shadow-lg"
                >
                    <i className={isMobileNavOpen ? "fa-solid fa-times" : "fa-solid fa-bars"}></i>
                </button>
            </div>

            {/* Sidebar styled like the image */}
            <aside className={`absolute md:relative z-40 transform ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-24 flex flex-col items-center py-6 justify-between bg-[#E60000] h-full shadow-2xl md:shadow-none`}>
                <div className="flex flex-col items-center space-y-10 w-full">
                    {/* Keep a fixed spacer so nav links stay at the same vertical position after removing logo/info */}
                    <div className="h-[60px] w-full" aria-hidden="true"></div>

                    {/* Nav Links */}
                    <nav className="flex flex-col w-full space-y-4 items-center">
                        {navItems.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href} onClick={() => setIsMobileNavOpen(false)} className="group flex flex-col items-center relative w-full py-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#B30000] text-white shadow-lg shadow-black/20 scale-110' : 'text-red-100 hover:text-white hover:bg-[#CC0000]'}`}>
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
                    <Link href="/" className="w-12 h-12 rounded-full border-2 border-transparent hover:border-white transition-all flex items-center justify-center bg-white/20 hover:bg-white/30 text-white shadow-sm" title="Rời khỏi Admin">
                        <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
                    </Link>
                    <span className="text-[10px] uppercase font-bold text-red-200">Exit</span>
                </div>
            </aside>

            {/* Main Content Container */}
            <main className="flex-1 flex flex-col h-full overflow-hidden pt-16 md:pt-6 pr-4 md:pr-6 pb-6 w-full">
                
                {/* Header Navigation */}
                <header className="flex items-center justify-between mb-6 px-2 md:px-6">
                    <div className="flex items-center text-red-100 hover:text-white cursor-pointer transition-colors" onClick={() => router.back()}>
                        <div className="w-8 h-8 rounded-full bg-[#B30000] text-white flex items-center justify-center mr-3 font-bold border border-transparent transition-transform hover:scale-105 shadow-md">
                            <i className="fa-solid fa-arrow-left text-sm"></i>
                        </div>
                        <span className="hidden sm:block text-sm font-semibold tracking-wide">Back</span>
                    </div>
                    
                    <div className="hidden lg:flex">
                        <span className="uppercase font-bold tracking-widest text-sm text-white border-b-2 border-white pb-1">DASHBOARD</span>
                    </div>

                    <div className="relative flex items-center space-x-4" data-admin-team-popover>
                        <button
                            type="button"
                            onClick={() => setIsTeamOpen((value) => !value)}
                            className="flex items-center space-x-3 text-left"
                        >
                            <div className="flex -space-x-2">
                                {isTeamLoading ? (
                                    <div className="w-8 h-8 rounded-full border-2 border-[#E60000] bg-white/90 animate-pulse" />
                                ) : teamMembers.length > 0 ? (
                                    teamMembers.slice(0, 3).map((member, index) => (
                                        <img
                                            key={member.Id}
                                            src={getAvatarSrc(member.AnhDaiDienUrl)}
                                            className={`w-8 h-8 rounded-full border-2 border-[#E60000] object-cover shadow-sm ${index === 0 ? 'z-0' : index === 1 ? 'z-10' : 'z-20'}`}
                                            alt={member.TenDangNhap}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = DEFAULT_AVATAR;
                                            }}
                                        />
                                    ))
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#E60000] flex items-center justify-center text-xs font-bold z-20 text-[#E60000] shadow-sm">
                                        {user?.tenDangNhap?.charAt(0).toUpperCase() || 'A'}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm text-white font-medium whitespace-nowrap">Admin Team</span>
                        </button>

                        {isTeamOpen && (
                            <div className="absolute right-0 top-full mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl z-50 text-gray-900">
                                <div className="border-b border-gray-100 px-4 py-3">
                                    <div className="text-sm font-bold text-gray-900">Admin Team</div>
                                    <div className="text-xs text-gray-500">Danh sách quản trị viên đang hoạt động trong hệ thống</div>
                                </div>
                                <div className="max-h-72 overflow-y-auto p-2">
                                    {isTeamLoading ? (
                                        <div className="px-3 py-6 text-center text-sm text-gray-500">Đang tải danh sách admin...</div>
                                    ) : teamMembers.length === 0 ? (
                                        <div className="px-3 py-6 text-center text-sm text-gray-500">Không tìm thấy admin nào.</div>
                                    ) : (
                                        teamMembers.map((member) => (
                                            <div key={member.Id} className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-gray-50 transition-colors">
                                                <img
                                                    src={getAvatarSrc(member.AnhDaiDienUrl)}
                                                    alt={member.TenDangNhap}
                                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-red-100"
                                                    onError={(event) => {
                                                        event.currentTarget.onerror = null;
                                                        event.currentTarget.src = DEFAULT_AVATAR;
                                                    }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-semibold text-gray-900">{member.TenDangNhap}</div>
                                                    <div className="truncate text-xs text-gray-500">{member.Email || `#${member.Id}`}</div>
                                                </div>
                                                <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                                                    {member.TenVaiTro || 'Admin'}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
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