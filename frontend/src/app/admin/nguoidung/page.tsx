'use client';

import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

const ROLES = [
    { Id: 1, TenVaiTro: 'Admin' },
    { Id: 2, TenVaiTro: 'GiamDocChiNhanhTinh' },
    { Id: 3, TenVaiTro: 'PhoGiamDocChiNhanhTinh' },
    { Id: 4, TenVaiTro: 'NhanVien' },
    { Id: 5, TenVaiTro: 'TongGiamDoc' },
    { Id: 6, TenVaiTro: 'PhoTongGiamDoc' },
    { Id: 7, TenVaiTro: 'TruongBan_TCT' },
    { Id: 8, TenVaiTro: 'GiamDocTrungTam' },
    { Id: 9, TenVaiTro: 'GiamDocKhuVuc' },
    { Id: 10, TenVaiTro: 'DoiTruong_CumTruong' },
    { Id: 11, TenVaiTro: 'CongTacVien' },
];

const DEFAULT_AVATAR = '/viettel-telecom-seeklogo.svg';

const getSafeAvatarSrc = (avatarUrl?: string | null) => {
    const normalizedUrl = avatarUrl?.trim();

    if (!normalizedUrl) {
        return DEFAULT_AVATAR;
    }

    if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('/')) {
        return normalizedUrl;
    }

    return DEFAULT_AVATAR;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [counts, setCounts] = useState<{ pending: number; all: number }>({ pending: 0, all: 0 });
    
    // Popup state
    const [editingUser, setEditingUser] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<number>(4);
    const [editEmail, setEditEmail] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editReason, setEditReason] = useState('');

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const endpoint = activeTab === 'pending' ? '/admin/nguoidung/pending' : '/admin/nguoidung';
            const response = await api.get(endpoint);
            setUsers(response.data || []);
        } catch (error: any) {
            console.error('Lỗi khi tải danh sách người dùng:', error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                setActionMsg('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
                localStorage.removeItem('userInfo');
                setTimeout(() => window.location.href = '/login', 2000);
            } else {
                setActionMsg('Không thể tải danh sách!');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [activeTab]);

    // load counts for tabs (pending and all)
    const loadCounts = async () => {
        try {
            const res = await api.get('/admin/nguoidung/counts');
            setCounts({ pending: res.data.pending || 0, all: res.data.all || 0 });
        } catch (err) {
            console.error('Không thể tải counts người dùng', err);
        }
    };

    useEffect(() => {
        loadCounts();
    }, []);

    // Modal states
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });
    const [promptModal, setPromptModal] = useState<{isOpen: boolean, message: string, onConfirm: (val: string) => void}>({ isOpen: false, message: '', onConfirm: () => {} });
    const [promptValue, setPromptValue] = useState('');

    const handleApprove = (id: number) => {
        setConfirmModal({
            isOpen: true,
            message: 'Bạn có chắc chắn muốn duyệt tài khoản này?',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.put(`/admin/nguoidung/${id}/approve`);
                    setActionMsg(`Đã duyệt tài khoản thành công!`);
                    loadUsers();
                    setTimeout(() => setActionMsg(''), 3000);
                } catch (error) {
                    console.error('Lỗi duyệt tài khoản:', error);
                    setActionMsg('Lỗi duyệt tài khoản!');
                }
            }
        });
    };

    const handleRejectUser = (id: number) => {
        setPromptValue('');
        setPromptModal({
            isOpen: true,
            message: 'Nhập lý do từ chối (có thể để trống để gửi mail mặc định):',
            onConfirm: async (reason: string) => {
                setPromptModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.put(`/admin/nguoidung/${id}`, { 
                        trangThai: 'BiTuChoi',
                        lyDo: reason
                    });
                    setActionMsg(`Đã từ chối tài khoản thành công!`);
                    loadUsers();
                    setTimeout(() => setActionMsg(''), 3000);
                } catch (error) {
                    console.error('Lỗi từ chối tài khoản:', error);
                    setActionMsg('Lỗi từ chối tài khoản!');
                }
            }
        });
    };

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setSelectedRole(user.VaiTroId || 4);
        setEditEmail(user.Email || '');
        setEditStatus(user.TrangThai || 'ChoDuyet');
        setEditReason('');
    };

    const handleSaveRole = async () => {
        if (!editingUser) return;
        try {
            await api.put(`/admin/nguoidung/${editingUser.Id}/role`, { vaiTroId: selectedRole });
            await api.put(`/admin/nguoidung/${editingUser.Id}`, { 
                email: editEmail, 
                trangThai: editStatus,
                lyDo: editReason
            });
            setActionMsg(`Đã cập nhật thông tin thành công!`);
            setEditingUser(null);
            loadUsers();
            setTimeout(() => setActionMsg(''), 3000);
        } catch (error: any) {
            console.error('Lỗi cập nhật người dùng:', error);
            setActionMsg(error.response?.data?.message || 'Lỗi cập nhật người dùng!');
        }
    };

    const handleDeleteUser = (id: number) => {
        setConfirmModal({
            isOpen: true,
            message: 'Bạn có chắc chắn muốn xóa (vô hiệu hóa) tài khoản này? Hành động này không thể hoàn tác thông thường.',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`/admin/nguoidung/${id}`);
                    setActionMsg(`Đã xóa tài khoản thành công!`);
                    loadUsers();
                    setTimeout(() => setActionMsg(''), 3000);
                } catch (error) {
                    console.error('Lỗi xóa tài khoản:', error);
                    setActionMsg('Lỗi xóa tài khoản!');
                }
            }
        });
    };

    const filteredUsers = useMemo(() => users.filter(u => 
        (u.TenDangNhap?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.Email?.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [users, searchQuery]);

    return (
        <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-gray-400 font-semibold">Admin / Users</p>
                    <h1 className="text-3xl font-black text-gray-900 mt-1">Quản lý người dùng</h1>
                    <p className="text-sm text-gray-500 mt-2">Duyệt tài khoản, phân quyền và xử lý vi phạm trong cùng một nơi.</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    {(['pending','all'] as ('pending'|'all')[]).map((tabKey) => (
                        <button
                            key={tabKey}
                            onClick={() => setActiveTab(tabKey)}
                            className={`rounded-2xl px-4 py-3 text-sm font-semibold border transition-all ${activeTab === tabKey ? 'bg-[#e60000] text-white border-[#e60000] shadow-lg shadow-red-200' : 'bg-white text-gray-700 border-gray-200 hover:border-[#e60000] hover:text-[#e60000]'}`}
                        >
                            {tabKey === 'pending' ? 'Chờ duyệt' : 'Tất cả'}
                            <span className="ml-2 text-xs opacity-80">{tabKey === 'pending' ? counts.pending : counts.all}</span>
                        </button>
                    ))}
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ml-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#e60000] focus:bg-white"
                    />
                    <button 
                        onClick={() => { loadUsers(); loadCounts(); }}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                    >
                        Tải lại
                    </button>
                </div>
            </div>

            {actionMsg && (
                <div className={`mb-6 p-4 rounded-lg font-medium ${actionMsg.includes('lỗi') || actionMsg.includes('Không') ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-green-500/20 border border-green-500/50 text-green-400'}`}>
                    {actionMsg}
                </div>
            )}

            <div className="mt-6 bg-white rounded-xl overflow-hidden border border-gray-200">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">Đang tải biểu mẫu...</div>
                ) : (
                    filteredUsers.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            Không tìm thấy người dùng phù hợp.
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full min-w-[800px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                                        <th className="p-4 font-semibold">Người dùng</th>
                                        <th className="p-4 font-semibold">Vai Trò</th>
                                        <th className="p-4 font-semibold">Trạng Thái</th>
                                        <th className="p-4 font-semibold text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.Id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-gray-400">
                                                        <img
                                                            src={getSafeAvatarSrc(user.AnhDaiDienUrl)}
                                                            alt={user.TenDangNhap}
                                                            className="h-full w-full object-cover"
                                                            onError={(event) => {
                                                                event.currentTarget.onerror = null;
                                                                event.currentTarget.src = DEFAULT_AVATAR;
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{user.TenDangNhap}</div>
                                                        <div className="text-xs text-gray-500">{user.Email || `#${user.Id}`}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-700">{user.TenVaiTro || 'Chưa có'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[12px] font-medium ${
                                                    (user.TrangThai || 'ChoDuyet') === 'HoatDong' ? 'bg-green-500/20 text-green-400' :
                                                    (user.TrangThai || 'ChoDuyet') === 'ChoDuyet' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-500'
                                                }`}>
                                                    {user.TrangThai || 'ChoDuyet'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center flex flex-col items-center gap-2">
                                                {(user.TrangThai || 'ChoDuyet') === 'ChoDuyet' && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleApprove(user.Id)}
                                                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors shadow-lg flex items-center space-x-2"
                                                        >
                                                            <span>Duyệt</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRejectUser(user.Id)}
                                                            className="bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors shadow-lg flex items-center space-x-2"
                                                        >
                                                            <span>Từ chối</span>
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'all' && (user.TrangThai || 'ChoDuyet') !== 'ChoDuyet' && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleEditClick(user)}
                                                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors shadow-lg flex items-center space-x-2"
                                                        >
                                                            <span>Sửa</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUser(user.Id)}
                                                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors shadow-lg flex items-center space-x-2"
                                                        >
                                                            <span>Xóa</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>

            {/* Edit Popup */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-400 mb-4">
                            Sửa thông tin tài khoản: {editingUser.TenDangNhap}
                        </h3>
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium text-sm mb-1">Email</label>
                            <input 
                                type="email" 
                                value={editEmail} 
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e60000] focus:border-[#e60000]" 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium text-sm mb-1">Trạng thái</label>
                            <select 
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e60000] focus:border-[#e60000]"
                            >
                                <option value="ChoDuyet">Chờ duyệt</option>
                                <option value="HoatDong">Hoạt động</option>
                                <option value="BiTuChoi">Bị từ chối</option>
                                <option value="BiKhoa">Bị khóa</option>
                            </select>
                        </div>

                        {(editStatus === 'BiKhoa' || editStatus === 'BiTuChoi') && (
                            <div className="mb-4">
                                <label className="block text-gray-700 font-medium text-sm mb-1">
                                    Lý do {editStatus === 'BiKhoa' ? 'khóa' : 'từ chối'} (tùy chọn)
                                </label>
                                <textarea 
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    placeholder={`Nhập lý do ${editStatus === 'BiKhoa' ? 'khóa tài khoản' : 'từ chối'} để gửi mail...`}
                                    className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e60000] focus:border-[#e60000] h-20 resize-none"
                                />
                            </div>
                        )}
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium text-sm mb-1">Phân quyền (Vai trò)</label>
                            <select 
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(Number(e.target.value))}
                                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#e60000] focus:border-[#e60000]"
                            >
                                {ROLES.map(role => (
                                    <option key={role.Id} value={role.Id}>{role.TenVaiTro}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button 
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200 transition"
                            >Hủy</button>
                            <button 
                                onClick={handleSaveRole}
                                className="px-4 py-2 rounded-lg bg-[#e60000] text-white hover:bg-red-600 transition shadow-lg shadow-red-500/30"
                            >Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Popup */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center text-xl mb-4">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận</h3>
                        <p className="text-gray-600 mb-6 text-sm">{confirmModal.message}</p>
                        <div className="flex justify-center gap-3">
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium w-full"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={confirmModal.onConfirm}
                                className="px-4 py-2 rounded-lg bg-[#e60000] text-white hover:bg-red-700 transition font-medium w-full"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Popup */}
            {promptModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-3">{promptModal.message}</h3>
                        <textarea 
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:border-[#e60000] focus:ring-[#e60000] h-20 resize-none mb-4"
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            placeholder="Nhập thông tin..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={() => promptModal.onConfirm(promptValue)}
                                className="px-4 py-2 rounded-lg bg-[#e60000] text-white hover:bg-red-700 transition font-medium"
                            >
                                Tiếp tục
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 
