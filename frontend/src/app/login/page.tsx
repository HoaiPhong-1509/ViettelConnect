'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser, registerUser, sendOtpEmail } from '@/services/api';

export default function LoginPage() {
    const { user, login } = useAuth();
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                const res = await loginUser({ email, matKhau: password });
                if (res.success) {
                    login(res.data.user);
                    router.push('/');
                } else {
                    setError(res.message || 'The login failed.');
                }
            } else {
                if (password !== confirmPassword) {
                    setError('Mật khẩu nhập lại không khớp.');
                    return;
                }

                if (!isOtpSent) {
                    setError('Vui lòng lấy mã OTP trước khi đăng ký.');
                    return;
                }

                if (otp.length !== 6) {
                    setError('Mã OTP phải gồm đúng 6 chữ số.');
                    return;
                }

                const res = await registerUser({ email, matKhau: password, tenNguoiDung: fullName, otp });
                if (res.success) {
                    setIsLogin(true);
                    setError('Đăng ký thành công. Vui lòng đăng nhập!');
                    setConfirmPassword('');
                    setOtp('');
                    setIsOtpSent(false);
                } else {
                    setError(res.message || 'Registration failed.');
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        }
    };

    const handleSendOtp = async () => {
        setError('');

        if (!email) {
            setError('Vui lòng nhập email trước khi lấy mã OTP.');
            return;
        }

        setIsSendingOtp(true);
        try {
            const res = await sendOtpEmail(email);
            if (res.success) {
                setIsOtpSent(true);
                return;
            }

            setError(res.message || 'Không thể gửi mã OTP.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#ff4d4d] via-[#d90000] to-[#7f0000] flex items-center justify-center lg:justify-end px-4 sm:px-6 md:px-10 lg:px-24">
            <div className="absolute inset-0 hidden lg:block bg-cover bg-center" style={{ backgroundImage: "url('/bg-login.png')" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff4d4d]/95 via-[#d90000]/92 to-[#7f0000]/96 lg:hidden" />

            <div className="relative z-10 w-full max-w-[420px] md:w-[420px] lg:w-[400px] xl:w-[420px] p-6 md:p-7 my-10 lg:my-0 flex flex-col justify-center mx-auto lg:mx-0 lg:mr-8 xl:mr-16">
                <style jsx>{`
                    .glass-input::placeholder {
                        color: rgba(255, 255, 255, 0.7);
                    }
                `}</style>
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md tracking-wide">
                        {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
                    </h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/80 text-white rounded-lg text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <input
                                type="text"
                                placeholder="Họ và tên"
                                className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {isLogin ? (
                        <div>
                            <input
                                type="password"
                                placeholder="Mật khẩu"
                                className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Mật khẩu"
                                        className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Nhập lại mật khẩu"
                                        className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={isSendingOtp || !email}
                                        className="shrink-0 px-4 py-3 rounded-xl bg-white/15 border border-white/25 text-white text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isSendingOtp ? 'Đang gửi...' : 'Lấy mã OTP'}
                                    </button>
                                    {isOtpSent && (
                                        <span className="text-sm text-white/80 leading-tight">
                                            Đã gửi mã OTP đến email của bạn.
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="Nhập mã OTP"
                                        className="glass-input w-full bg-white/10 border border-white/30 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e60000] focus:border-white/60 transition shadow-sm text-base md:text-[15px] placeholder:font-light tracking-[0.35em] text-center"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-[#e60000] to-[#cc0000] hover:to-[#990000] text-white font-bold rounded-xl transition duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 mt-6 text-base md:text-[15px] uppercase tracking-wider"
                    >
                        {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
                    </button>
                </form>

                <div className="mt-8 text-center text-white/90">
                    <p className="text-base font-light">
                        {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="ml-2 font-bold text-white hover:text-[#ffcccc] underline decoration-2 underline-offset-4 transition"
                        >
                            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}