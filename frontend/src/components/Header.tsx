"use client";
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';
import api from '../services/api';

export default function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
	const { user, logout } = useAuth();
	
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

	return (
		<div className="w-full flex justify-center mt-4 px-4">
			<div className="w-full max-w-[1320px] bg-[#f7f7f8] rounded-[18px] px-5 md:px-7 lg:px-10 py-2.5 flex flex-col shadow-[0_6px_18px_rgba(18,18,26,0.4)] relative">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3 shrink-0 w-1/4">
						<img
							src="/viettel-telecom-seeklogo.svg"
							alt="Viettel Logo"
							className="w-25 h-5 object-contain"
						/>
					</div>

					<div className="flex items-center justify-center gap-6 md:gap-10 sm:gap-6 shrink-0 w-2/4">
						{/* Home */}
						<div className="relative">
							<button
								onClick={() => setIsHomeMenuOpen(!isHomeMenuOpen)}
								className="group flex flex-col items-center gap-2 hover:text-[#e60000] transition-colors relative text-[16px] md:text-[18px] text-[#3f4047]"
							>
								<i className="fa-solid fa-house"></i>

								{/* Tooltip */}
								<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
									Bảng tin
								</span>
							</button>

							{/* Submenu */}
							{isHomeMenuOpen && (	
								<div className="absolute top-10 left-1/2 -translate-x-1/2 w-52 bg-white shadow-lg rounded-md overflow-hidden border z-50">
									<a href="#" className="block px-4 py-2 hover:bg-[#e60000] hover:text-white text-[#3f4047] transition text-sm">
										Bảng tin tổng
									</a>
									<a href="#" className="block px-4 py-2 hover:bg-[#e60000] hover:text-white text-[#3f4047] transition text-sm">
										Bảng tin chi nhánh
									</a>
									<a href="#" className="block px-4 py-2 hover:bg-[#e60000] hover:text-white text-[#3f4047] transition text-sm">
										Bảng tin khu vực
									</a>
								</div>
							)}
						</div>

						{/* Messages */}
						<button
							type="button"
							aria-label="Messages"
							className="group relative flex flex-col items-center justify-center text-[16px] md:text-[18px] text-[#3f4047] hover:text-[#e60000] transition-colors"
						>
							<i className="fa-solid fa-message"></i>
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
								Tin nhắn
							</span>
						</button>

						{/* Notifications */}
						<button
							type="button"
							aria-label="Notifications"
							className="group relative flex flex-col items-center justify-center text-[16px] md:text-[18px] text-[#3f4047] hover:text-[#e60000] transition-colors"
						>
							<i className="fa-solid fa-bell"></i>
							<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[12px] font-normal px-2 py-1 rounded opacity-0 lg:group-hover:opacity-100 transition whitespace-nowrap z-10 w-max hidden lg:block">
								Thông báo
							</span>
						</button>
					</div>

					<div className="flex items-center justify-end gap-5 md:gap-7 shrink-0 w-1/4">
						<nav className="hidden lg:flex items-center gap-6 text-[16px] leading-none font-semibold text-[#585861]">
							<a className="hover:text-[#e60000] transition-colors" href="#">Support</a>
						</nav>

						{user ? (
							<div className="flex items-center gap-3 whitespace-nowrap">
								<button 
									onClick={() => setIsProfileModalOpen(true)}
									className="flex items-center justify-center gap-2 sm:gap-2 text-[15px] font-semibold text-[#3f4047] hover:text-[#e60000] transition-colors"
								>
									<img 
										src={user.avatar || 'http://localhost:5000/uploads/avatar/Default_Avatar.jpg'} 
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
							<div className="flex items-center gap-3 whitespace-nowrap">
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
					
					<div className="lg:hidden mt-4 pt-4 border-t border-gray-300 flex flex-col gap-4 text-[16px] font-semibold text-[#585861]">
						<a className="hover:text-[#e60000] transition-colors" href="#">Support</a>
						<div className="sm:hidden mt-2 pt-2 border-t border-gray-200 flex gap-4">
							{user ? (
								<button onClick={handleLogout} className="text-[#e60000] hover:text-black transition-colors font-semibold">
									Đăng xuất ({user.tenDangNhap})
								</button>
							) : (
								<>
									<button onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="text-[#3f4047] hover:text-[#e60000] transition-colors font-semibold">
										Đăng ký
									</button>
									<button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="text-[#3f4047] hover:text-[#e60000] transition-colors font-semibold">
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
		</div>
	);
}
