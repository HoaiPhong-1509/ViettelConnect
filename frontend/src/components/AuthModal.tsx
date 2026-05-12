'use client';

import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    
    // Đồng bộ lại mode khi modal được mở ra với initialMode mới
    React.useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setTenDangNhap('');
            setEmail('');
            setMatKhau('');
            setXacNhanMatKhau('');
            setErrorMsg('');
            setSuccessMsg('');
        }
    }, [isOpen, initialMode]);

    const [tenDangNhap, setTenDangNhap] = useState('');
    const [email, setEmail] = useState('');
    const [matKhau, setMatKhau] = useState('');
    const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();

    if (!isOpen) return null;

    const resetForm = () => {
        setTenDangNhap('');
        setEmail('');
        setMatKhau('');
        setXacNhanMatKhau('');
        setOtp('');
        setIsOtpSent(false);
        setErrorMsg('');
        setSuccessMsg('');
    };

    const switchMode = (newMode: 'login' | 'register') => {
        setMode(newMode);
        resetForm();
    };

    const validateEmail = (email: string) => {
        // Biểu thức chính quy kiểm tra định dạng email chuẩn
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        // Ít nhất 8 ký tự, ít nhất 1 chữ hoa, 1 chữ thường, 1 số
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
        return passwordRegex.test(password);
    };

    const handleSendOtp = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        
        if (!validateEmail(email)) {
            setErrorMsg('Email không hợp lệ. Vui lòng kiểm tra lại định dạng email.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/auth/send-otp', { email });
            setSuccessMsg(response.data.message);
            setIsOtpSent(true);
        } catch (error: any) {
             setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi gửi mã OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (mode === 'register') {
            if (!isOtpSent) {
                setErrorMsg('Vui lòng lấy mã OTP trước.');
                return;
            }
            if (!otp || otp.length !== 6) {
                setErrorMsg('Vui lòng nhập mã OTP gồm 6 chữ số từ email của bạn.');
                return;
            }
            if (!validatePassword(matKhau)) {
                setErrorMsg('Mật khẩu yếu. Yêu cầu lớn hơn hoặc bằng 8 ký tự, có chứa chữ hoa, chữ thường và số.');
                return;
            }
            if (matKhau !== xacNhanMatKhau) {
                setErrorMsg('Mật khẩu nhập lại không khớp.');
                return;
            }
        }

        setIsLoading(true);

        try {
            if (mode === 'login') {
                const response = await api.post('/auth/login', { tenDangNhap, matKhau });
                setSuccessMsg(response.data.message);
                login(response.data.user);
                
                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 1000);

            } else {
                const response = await api.post('/auth/register', { tenDangNhap, email, matKhau, otp });
                setSuccessMsg(response.data.message);
                
                setTimeout(() => {
                    switchMode('login');
                }, 2000);
            }
        } catch (error: any) {
            if (error.response && error.response.data) {
                // Xử lý lỗi từ express-validator trả về
                if (error.response.data.errors) {
                    setErrorMsg(error.response.data.errors[0].msg);
                } else {
                    setErrorMsg(error.response.data.message || 'Có lỗi xảy ra');
                }
            } else {
                setErrorMsg('Không thể kết nối đến máy chủ.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#00000080] backdrop-blur-sm transition-all duration-300 p-4 sm:p-6">
            <div className={`bg-white rounded-[18px] shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-full p-6 sm:p-8 relative transition-all duration-300 ${mode === 'login' ? 'max-w-md' : 'max-w-2xl'}`}>
                {/* Nút đóng (X) */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 text-[#b0b0b0] hover:text-[#e60000] transition-colors"
                >
                    <i className="fa-solid fa-xmark text-[24px]"></i>
                </button>

                <div className="flex justify-center items-center mb-6">
                    <img src="/viettel-telecom-seeklogo.svg" alt="Logo" className="w-[120px] h-[30px] object-contain" />
                </div>

                <h2 className="text-[24px] font-bold text-center mb-2 text-[#3f4047]">
                    {mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký Tài Khoản'}
                </h2>

                <div className="min-h-[64px] flex items-center justify-center mb-2 w-full">
                    {errorMsg && <div className="w-full p-3 bg-red-50 text-[#e60000] border border-red-100 rounded-[8px] text-[13px] text-center font-medium leading-tight">{errorMsg}</div>}
                    {successMsg && <div className="w-full p-3 bg-green-50 text-[#16a34a] border border-green-100 rounded-[8px] text-[14px] text-center font-medium leading-tight">{successMsg}</div>}
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={mode === 'register' ? 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4' : ''}>
                        <div className={mode === 'login' ? 'mb-4' : ''}>
                            <label className="block text-[#585861] text-[15px] font-semibold mb-2">Tên đăng nhập</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-[#f7f7f8] border border-transparent rounded-[12px] focus:outline-none focus:border-[#e60000] focus:bg-white transition-all text-[#12121a] placeholder-[#a1a1aa]"
                                placeholder="Nhập tên đăng nhập..."
                                value={tenDangNhap}
                                onChange={(e) => setTenDangNhap(e.target.value)}
                                required
                            />
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-[#585861] text-[15px] font-semibold mb-2">Email</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="email" 
                                        className="flex-1 px-4 py-3 bg-[#f7f7f8] border border-transparent rounded-[12px] focus:outline-none focus:border-[#e60000] focus:bg-white transition-all text-[#12121a] placeholder-[#a1a1aa]"
                                        placeholder="nguyenvana@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isOtpSent}
                                        required={mode === 'register'}
                                    />
                                    {!isOtpSent && (
                                        <button 
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={isLoading || !email}
                                            className="whitespace-nowrap bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 rounded-[12px] transition-colors"
                                        >
                                            Lấy mã
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={mode === 'login' ? 'mb-6' : ''}>
                            <label className="block text-[#585861] text-[15px] font-semibold mb-2">Mật khẩu</label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-3 bg-[#f7f7f8] border border-transparent rounded-[12px] focus:outline-none focus:border-[#e60000] focus:bg-white transition-all text-[#12121a] placeholder-[#a1a1aa]"
                                placeholder="••••••••"
                                value={matKhau}
                                onChange={(e) => setMatKhau(e.target.value)}
                                required
                            />
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-[#585861] text-[15px] font-semibold mb-2">Nhập lại mật khẩu</label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-3 bg-[#f7f7f8] border border-transparent rounded-[12px] focus:outline-none focus:border-[#e60000] focus:bg-white transition-all text-[#12121a] placeholder-[#a1a1aa]"
                                    placeholder="••••••••"
                                    value={xacNhanMatKhau}
                                    onChange={(e) => setXacNhanMatKhau(e.target.value)}
                                    required={mode === 'register'}
                                />
                            </div>
                        )}

                        {mode === 'register' && isOtpSent && (
                            <div className="md:col-span-2">
                                <label className="block text-[#585861] text-[15px] font-semibold mb-2">Mã xác nhận (OTP)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-[#f7f7f8] border border-transparent rounded-[12px] focus:outline-none focus:border-[#e60000] focus:bg-white transition-all text-[#12121a] tracking-widest font-mono font-bold text-center placeholder-[#a1a1aa]"
                                    placeholder="••••••"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required={mode === 'register'}
                                />
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full bg-[#e60000] text-white font-bold text-[16px] py-3 px-4 rounded-[12px] hover:bg-[#cc0000] transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký')}
                    </button>
                </form>

                <div className="mt-6 text-center text-[15px] text-[#71717a]">
                    {mode === 'login' ? (
                        <p>Chưa có tài khoản? <button onClick={() => switchMode('register')} className="text-[#e60000] font-semibold hover:underline decoration-2 underline-offset-2">Đăng ký ngay</button></p>
                    ) : (
                        <p>Đã có tài khoản? <button onClick={() => switchMode('login')} className="text-[#e60000] font-semibold hover:underline decoration-2 underline-offset-2">Đăng nhập</button></p>
                    )}
                </div>
            </div>
        </div>
    );
}
