"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationPanel } from '../contexts/NotificationPanelContext';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';
import UserSearch from './UserSearch/UserSearch';
import api from '../services/api';
import { getConversations } from '../services/chat.api';

export default function Header() {
	const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const [expandedUtility, setExpandedUtility] = useState<string | null>(null);
	const [chatUnread, setChatUnread] = useState(0);
	const { user, logout } = useAuth();
	const { isOpen: isNotificationPanelOpen, unreadCount, openNotifications, toggleNotifications } = useNotificationPanel();
	const pathname = usePathname();
	const router = useRouter();
	
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

	const handleLogout = async () => {
    	try {
        	await api.post('/auth/logout'); // Nhờ Backend xoá Cookie bảo mật
        	logout(); // Xoá Local cache trên giao diện
    	} catch (error) {
        	console.error("Lỗi khi đăng xuất", error);
    	}
	};

	const isFeedActive = pathname === '/' || pathname === '/feed';
	const isChatActive = pathname === '/chat';
	const isSupportActive = pathname === '/support';
	const isAdminUser = Array.isArray(user?.roles) && user.roles.includes('Admin');
	const isNotificationActive = isFeedActive && isNotificationPanelOpen;
	const handleNotificationClick = () => {
		if (!isFeedActive) {
			router.push('/');
			openNotifications();
			return;
		}

		toggleNotifications();
	};

	useEffect(() => {
		// simple socket listener for chat unread count
		const { io } = require('socket.io-client');
		const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', { withCredentials: true });

		socket.on('connect', async () => {
			// reset from local storage on connect (quick fallback)
			const stored = Number(localStorage.getItem('chat_unread') || '0');
			setChatUnread(stored);

			// if user is logged in, compute unread by comparing conversation last_message_time
			try {
				if (user && user.id) {
					const res = await getConversations();
					const convs = (res.data && res.data.data) || [];

					let totalUnread = 0;
					for (const c of convs) {
						if (!c.last_message_time) continue;
						const lm = new Date(c.last_message_time).getTime();
						try {
							const key = `chat_last_seen_${user.id}_${c.id}`;
							const ls = localStorage.getItem(key);
							const lastSeenConv = ls ? new Date(ls).getTime() : 0;
							if (lm > lastSeenConv) totalUnread += 1;
						} catch (e) {
							if (lm > 0) totalUnread += 1;
						}
					}

					if (totalUnread > 0) {
						localStorage.setItem('chat_unread', String(totalUnread));
						setChatUnread(totalUnread);
					}
				}
			} catch (err) {
				// ignore
			}
		});

		socket.on('new_message', (msg: any) => {
			if (!isChatActive) {
				const prev = Number(localStorage.getItem('chat_unread') || '0');
				const next = prev + 1;
				localStorage.setItem('chat_unread', String(next));
				setChatUnread(next);
			} else {
				// if already on chat page, clear
				localStorage.setItem('chat_unread', '0');
				setChatUnread(0);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [isChatActive, user?.id]);

	useEffect(() => {
		if (isChatActive) {
			localStorage.setItem('chat_unread', '0');
			setChatUnread(0);
		}
	}, [isChatActive]);

	return (
		<div className="sticky top-4 z-[180] w-full flex justify-center mt-4 px-4">
			<div className="w-full max-w-[1320px] bg-[#f7f7f8] rounded-[18px] px-5 md:px-7 lg:px-10 py-2.5 flex flex-col shadow-[0_6px_18px_rgba(18,18,26,0.4)] relative z-[180]">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3 shrink-0 w-1/4">
						<img
							src="/viettel-telecom-seeklogo.svg"
							alt="Viettel Logo"
							className="w-25 h-5 object-contain"
						/>

						{/* User search placed next to logo (desktop) */}
						<div className="hidden md:block ml-3 w-full">
							<UserSearch />
						</div>
					</div>

					<div className="flex items-center justify-center gap-6 md:gap-10 sm:gap-6 shrink-0 w-2/4">
						{/* Home */}
						<div className="relative">
							<button
								onClick={() => router.push('/')}
								className={`group flex flex-col items-center gap-2 transition-colors relative text-[16px] md:text-[18px] ${isFeedActive ? 'text-[#e60000]' : 'text-[#3f4047] hover:text-[#e60000]'}`}
							>
								<i className="fa-solid fa-house"></i>
								{/* Gạch chân báo hiệu active */}
								{isFeedActive && (
									<span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#e60000] rounded-t-md"></span>
								)}

								{/* Tooltip */}
								<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
									Bảng tin
								</span>
							</button>
						</div>

						{/* Messages */}
						<div className="relative">
							<button
								type="button"
								onClick={() => router.push('/chat')}
								aria-label="Messages"
								className={`group flex flex-col items-center justify-center text-[16px] md:text-[18px] transition-colors relative ${isChatActive ? 'text-[#e60000]' : 'text-[#3f4047] hover:text-[#e60000]'}`}
							>
								<i className="fa-solid fa-message"></i>
								{isChatActive && (
									<span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#e60000] rounded-t-md"></span>
								)}
								{chatUnread > 0 && (
									<span className="absolute -right-1.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[#e60000] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-md ring-2 ring-[#f7f7f8]">
										{chatUnread > 9 ? '9+' : chatUnread}
									</span>
								)}
								<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
									Tin nhắn
								</span>
							</button>
						</div>

						{/* Notifications */}
						<button
							type="button"
							aria-label="Notifications"
							onClick={handleNotificationClick}
							className={`group relative flex flex-col items-center justify-center text-[16px] md:text-[18px] transition-colors ${isNotificationActive ? 'text-[#e60000]' : 'text-[#3f4047] hover:text-[#e60000]'}`}
						>
							<i className="fa-solid fa-bell"></i>
							{isNotificationActive && (
								<span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#e60000] rounded-t-md"></span>
							)}
							{unreadCount > 0 && (
								<span className="absolute -right-1.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[#e60000] px-1 py-0.5 text-[8px] font-bold leading-none text-white shadow-md ring-2 ring-[#f7f7f8]">
									{unreadCount > 9 ? '9+' : unreadCount}
								</span>
							)}
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
								Thông báo
							</span>
						</button>
					</div>

					<div className="flex items-center justify-end gap-5 md:gap-7 shrink-0 w-1/4">
						<nav className="hidden lg:flex items-center gap-6 text-[16px] leading-none font-semibold text-[#585861] whitespace-nowrap">
							<Link className={`w-full py-2 text-left text-[#3f4047] transition-colors ${isSupportActive ? 'text-[#3f4047]' : 'hover:text-[#e60000]'}`} href="/support">
									Hỗ trợ
								</Link>
							{isAdminUser && (
								<Link className="hover:text-[#e60000] transition-colors whitespace-nowrap" href="/admin">
									Quản trị hệ thống
								</Link>
							)}
						</nav>

						{user ? (
							<div className="hidden lg:flex items-center gap-3 whitespace-nowrap">
								<button 
									onClick={() => setIsProfileModalOpen(true)}
									className="flex items-center justify-center gap-2 sm:gap-2 text-[15px] font-semibold text-[#3f4047] hover:text-[#e60000] transition-colors"
								>
									<img 
										src={user.avatar || '/viettel-telecom-seeklogo.svg'} 
										alt="Avatar" 
										className="w-8 h-8 rounded-full object-cover border border-gray-300 bg-white min-w-8"
										onError={(e) => {
											e.currentTarget.onerror = null; 
											e.currentTarget.src = '/viettel-telecom-seeklogo.svg'; // Sử dụng tạm logo có sẵn trong máy làm avatar mặc định nếu ảnh kia lỗi
										}}
									/>
									<span className="hidden sm:block whitespace-nowrap">Hi, {user.tenDangNhap}</span>
								</button>
								<button
									onClick={handleLogout}
									className="hidden sm:block text-[16px] md:text-[16px] leading-none font-semibold text-[#e60000] hover:text-black transition-colors whitespace-nowrap"
								>
									Đăng xuất
								</button>
							</div>
						) : (
							<div className="hidden lg:flex items-center gap-3 whitespace-nowrap">
								<button 
									onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); }} 
									className="hidden sm:block text-[16px] md:text-[16px] leading-none font-semibold text-[#3f4047] hover:text-[#e60000] transition-colors whitespace-nowrap"
								>
									Đăng ký
								</button>
								<button 
									onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} 
									className="hidden sm:block text-[16px] md:text-[16px] leading-none font-semibold text-[#3f4047] hover:text-[#e60000] transition-colors whitespace-nowrap"
								>
									Đăng nhập
								</button>
							</div>
						)}

						{/* Mobile search icon (shows on small screens) */}
						<button
							onClick={() => setIsMobileSearchOpen(true)}
							type="button"
							aria-label="Open search"
							className="lg:hidden flex items-center justify-center w-8 h-8 mr-2"
						>
							<i className="fa-solid fa-magnifying-glass text-[18px] text-[#4a4a52]"></i>
						</button>

						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							type="button"
							aria-label="Open menu"
							className="lg:hidden flex flex-col justify-center gap-1 w-8 h-8 items-center"
						>
							<span className={`block w-6 h-[2px] bg-[#4a4a52] transition-transform duration-300 ${isMobileMenuOpen ? "rotate-45 translate-y-[6px]" : ""}`}></span>
							<span className={`block w-6 h-[2px] bg-[#4a4a52] transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-0" : ""}`}></span>
							<span className={`block w-6 h-[2px] bg-[#4a4a52] transition-transform duration-300 ${isMobileMenuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`}></span>
						</button>
						
					</div>
				</div>

				{/* Mobile Menu */}
				{isMobileMenuOpen && (
                    
					<div className="lg:hidden mt-2 pt-2 border-t border-gray-300 flex flex-col gap-0.5 text-[16px] font-semibold text-[#585861]">
						{user ? (
							<div className="mb-2 rounded-2xl bg-white/80 px-3 py-3 shadow-sm border border-gray-200">
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={() => { setIsProfileModalOpen(true); setIsMobileMenuOpen(false); }}
										className="flex items-center gap-3 text-left"
									>
										<img
											src={user.avatar || '/viettel-telecom-seeklogo.svg'}
											alt="Avatar"
											className="w-10 h-10 rounded-full object-cover border border-gray-300 bg-white"
											onError={(e) => {
												e.currentTarget.onerror = null;
												e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
											}}
										/>
										<div className="min-w-0">
											<div className="truncate text-sm font-semibold text-[#3f4047]">{user.tenDangNhap}</div>
											<div className="text-xs font-normal text-slate-500">Xem thông tin tài khoản</div>
										</div>
									</button>
								</div>
							</div>
						) : (
							<div className="mb-2 rounded-2xl bg-white/80 px-3 py-3 shadow-sm border border-gray-200">
								<div className="text-sm font-semibold text-[#3f4047]">Tài khoản</div>
								<div className="mt-3 flex items-center gap-3">
									<button
										type="button"
										onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
										className="rounded-xl bg-[#f3f4f6] px-3 py-2 text-sm font-semibold text-[#3f4047] hover:text-[#e60000]"
									>
										Đăng ký
									</button>
									<button
										type="button"
										onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }}
										className="rounded-xl bg-[#e60000] px-3 py-2 text-sm font-semibold text-white hover:bg-[#c80000]"
									>
										Đăng nhập
									</button>
								</div>
							</div>
						)}

						<Link className={`text-[#3f4047] transition-colors ${isSupportActive ? 'text-[#3f4047]' : 'hover:text-[#e60000]'}`} href="/support">
								Hỗ trợ
							</Link>
						{isAdminUser && (
							<Link className="hover:text-[#e60000] transition-colors whitespace-nowrap" href="/admin">
								Quản trị hệ thống
							</Link>
						)}
						<div className="sm:hidden mt-1 pt-1 border-t border-gray-200 flex flex-col gap-1">
							<button
								type="button"
								onClick={() => setExpandedUtility((prev) => (prev === 'utilities' ? null : 'utilities'))}
								className="text-[#3f4047] hover:text-[#e60000] transition-colors font-semibold text-left"
							>
								Tiện ích
							</button>

							{expandedUtility === 'utilities' && (
								<div className="pl-3 flex flex-col gap-1">
									<button
										type="button"
										onClick={() => { setIsProfileModalOpen(true); setExpandedUtility(null); setIsMobileMenuOpen(false); }}
										className="text-[#3f4047] hover:text-[#e60000] transition-colors text-sm text-left"
									>
										Đổi mật khẩu
									</button>
									<Link href="/support" className="text-[#3f4047] hover:text-[#e60000] transition-colors text-sm">Gửi hỗ trợ</Link>
								</div>
							)}

							{user ? (
								<button onClick={handleLogout} className="text-[#e60000] hover:text-black transition-colors font-semibold text-left">
									Đăng xuất ({user.tenDangNhap})
								</button>
							) : (
								<>
									<button onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="text-[#3f4047] hover:text-[#e60000] transition-colors font-semibold text-left">
										Đăng ký
									</button>
									<button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="text-[#3f4047] hover:text-[#e60000] transition-colors font-semibold text-left">
										Đăng nhập
									</button>
								</>
							)}
						</div>
					</div>
				)}
			</div>
			
			<AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authMode} />
			<UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
			{isMobileSearchOpen && (
				<UserSearch variant="overlay" autoFocus onClose={() => setIsMobileSearchOpen(false)} />
			)}
		</div>
	);
}
