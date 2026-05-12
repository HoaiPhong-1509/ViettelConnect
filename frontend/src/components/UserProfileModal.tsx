"use client";
import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function UserProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user, login } = useAuth(); // Assuming login or setUser function updates auth context; we might just reload or assume it updates. Wait, login(newUser, roles)? We can use window.location.reload() for simplicity.
    const [matKhau, setMatKhau] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData();
        if (matKhau) formData.append('matKhau', matKhau);
        if (avatar) formData.append('avatar', avatar);

        try {
            const res = await api.put('/user/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('Cập nhật thành công!');
            // Cập nhật lại thông tin user trong context nếu backend trả về (ví dụ avatar mới)
            if (res.data && res.data.user) {
                const updatedUser = {
                    ...user,
                    ...res.data.user,
                    avatar: res.data.user.AnhDaiDienUrl ? res.data.user.AnhDaiDienUrl : (user as any).avatar
                };
                login(updatedUser as any);
            }
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 100);
        } catch (error: any) {
            setMessage(error.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition"
                >
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Cập nhật hồ sơ</h2>

                {message && (
                    <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${message.includes('thành công') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#e60000]'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới (để trống nếu không đổi)</label>
                        <input 
                            type="password" 
                            value={matKhau}
                            onChange={(e) => setMatKhau(e.target.value)}
                            className="w-full border-gray-300 rounded-lg px-4 py-2 border focus:ring-[#e60000] focus:border-[#e60000]"
                            placeholder="Nhập mật khẩu mới..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setAvatar(e.target?.files?.[0] || null)}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#e60000]/10 file:text-[#e60000] hover:file:bg-[#e60000]/20 transition"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#e60000] text-white py-2.5 rounded-lg font-bold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                    </button>
                </form>
            </div>
        </div>
    );
}