'use client';
import { useState, useEffect } from 'react';
import { deleteConversation, getMembers, addMember, searchUsers } from '@/services/chat.api';

export default function ChatInfo({ chat, onClose, currentUser, onChatDeleted }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Modal/Alert states
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });
  const [alertMessage, setAlertMessage] = useState('');

  const loadMembers = async () => {
    if(!chat.is_group) return;
    try {
      const res = await getMembers(chat.id);
      setMembers(res.data.data);
    } catch(e) {
      console.error("Lỗi khi load danh sách thành viên", e);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [chat.id]);

  const isOwner = chat.is_group && members.some(m => m.id === currentUser.id && m.role === 'chu_nhom');

  const handleDelete = () => {
    setConfirmModal({
      isOpen: true,
      message: chat.is_group ? 'Bạn có chắc chắn muốn xóa nhóm này?' : 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteConversation(chat.id);
          onChatDeleted();
        } catch(e) {
          console.error("Xóa thất bại", e);
          setAlertMessage('Xóa thất bại, có thể bạn không có quyền.');
        }
      }
    });
  };

  const handleSearch = async (val: string) => {
    setSearch(val);
    if(val.length > 1) {
      try {
        const res = await searchUsers(val);
        // Filter out existing members
        const results = res.data.data.users.filter((user: any) => !members.some(m => m.id === user.id));
        setSearchResults(results);
      } catch(e) {}
    } else {
      setSearchResults([]);
    }
  };

  const submitAddMember = async (user: any) => {
    try {
      await addMember(chat.id, user.id);
      setAlertMessage(`Đã thêm ${user.username || user.TenDangNhap} vào nhóm!`);
      setSearch('');
      setSearchResults([]);
      setShowAddMember(false);
      loadMembers();
    } catch(e) {
      console.error("Thêm thành viên thất bại", e);
      setAlertMessage("Thêm thành viên thất bại!");
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-transparent">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-semibold text-lg">Chi tiết</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-gray-300 text-gray-500 flex items-center justify-center text-3xl mb-3 overflow-hidden">
          {!chat.is_group && chat.other_user_avatar ? (
            <img src={chat.other_user_avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            chat.is_group ? <i className="fa-solid fa-users"></i> : <i className="fa-solid fa-user"></i>
          )}
        </div>
        <h3 className="font-bold text-lg">{chat.is_group ? (chat.name || "Nhóm trò chuyện") : (chat.other_user_name || "Cuộc trò chuyện")}</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Nếu là nhóm thì hiện danh sách thành viên */}
        {chat.is_group && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-700 text-sm">Thành viên ({members.length})</h4>
              {isOwner && (
                <button 
                  onClick={() => setShowAddMember(true)}
                  className="text-[#e60000] hover:bg-red-50 p-1 rounded-full w-7 h-7 flex flex-col items-center justify-center transition"
                  title="Thêm thành viên"
                >
                  <i className="fa-solid fa-user-plus text-sm"></i>
                </button>
              )}
            </div>

            <div className="space-y-3 mt-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden shrink-0">
                    <img 
                      src={member.avatar || '/viettel-telecom-seeklogo.svg'} 
                      alt="member avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.username}</p>
                    <p className="text-xs text-gray-500">{member.role === 'chu_nhom' ? 'Quản trị viên' : 'Thành viên'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 p-4">
          {chat.is_group ? (
            <button onClick={handleDelete} className="w-full text-left p-2 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition">
               <i className="fa-solid fa-trash mr-2"></i> Xóa nhóm chat
            </button>
          ) : (
            <button onClick={handleDelete} className="w-full text-left p-2 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition">
              <i className="fa-solid fa-trash mr-2"></i> Xóa đoạn chat
            </button>
          )}
          
          {!chat.is_group && (
            <button className="w-full text-left p-2 text-gray-700 hover:bg-gray-100 rounded text-sm font-medium transition">
              <i className="fa-solid fa-ban mr-2"></i> Chặn người dùng
            </button>
          )}
        </div>
      </div>

      {/* Popup Thêm Thành Viên */}
      {showAddMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-[24px] bg-white/95 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Thêm người vào nhóm</h3>
              <button onClick={() => {setShowAddMember(false); setSearch(''); setSearchResults([]);}} className="text-gray-500 hover:text-red-500">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input 
                type="text" 
                placeholder="Tìm kiếm tên người dùng..."
                className="w-full rounded-full bg-gray-100 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#e60000]/30"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[150px]">
              {searchResults.length > 0 ? (
                searchResults.map((su: any) => {
                  const avatar = su.avatar || su.AnhDaiDien || su.Avatar;
                  const username = su.username || su.TenDangNhap || su.Username || 'User';

                  return (
                    <div 
                      key={su.id} 
                      onClick={() => submitAddMember(su)}
                      className="flex cursor-pointer items-center rounded-2xl p-3 transition-colors hover:bg-black/5"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                          {avatar ? <img 
                                      src={avatar} 
                                      alt="avt" 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => {
                                          e.currentTarget.onerror = null; 
                                          e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                      }}
                                    /> : <i className="fa-solid fa-user text-gray-500"></i>}
                      </div>
                      <div className="ml-3 font-medium text-sm text-gray-800">{username}</div>
                      <div className="ml-auto text-[#e60000]">
                        <i className="fa-solid fa-plus"></i>
                      </div>
                    </div>
                  );
                })
              ) : search.trim().length > 1 ? (
                <div className="text-center text-sm text-gray-500 py-4">Không tìm thấy hoặc người dùng đã trong nhóm.</div>
              ) : (
                <div className="text-center text-sm text-gray-400 py-4">Nhập tên để tìm...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Popup (Xóa) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white/95 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa</h3>
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
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Alert Thông báo */}
      {alertMessage && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white/95 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#e60000] mx-auto flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-bell"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thông báo</h3>
            <p className="text-gray-600 mb-6 text-sm">{alertMessage}</p>
            <button 
              onClick={() => setAlertMessage('')}
              className="w-full py-2 rounded-lg bg-[#e60000] text-white hover:bg-red-700 font-medium transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
