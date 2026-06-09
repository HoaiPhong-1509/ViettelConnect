'use client';
import { useState } from 'react';
import { searchUsers, createConversation } from '@/services/chat.api';

export default function ChatSidebar({ conversations, selectedChat, onSelectChat, refreshConversations, currentUser }: any) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: any[]; groups: any[] }>({ users: [], groups: [] });
  
  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const handleSearch = async (val: string) => {
    setSearch(val);
    if(val.length > 1) {
      try {
        const res = await searchUsers(val);
        setSearchResults({
          users: res.data.data.users || [],
          groups: res.data.data.groups || []
        });
      } catch(e) {}
    } else {
      setSearchResults({ users: [], groups: [] });
    }
  }

  const startNewChat = async (user: any) => {
    try {
      const res = await createConversation({ isGroup: false, name: '', memberIds: [user.id] });
      setSearch('');
      setSearchResults({ users: [], groups: [] });
      refreshConversations();
      onSelectChat(res.data.data);
    } catch(e) {
      console.error(e);
    }
  }

  const openGroupChat = async (group: any) => {
    try {
      setSearch('');
      setSearchResults({ users: [], groups: [] });
      onSelectChat(group);
    } catch(e) {
      console.error(e);
    }
  }

  const handleCreateGroup = () => {
    setGroupNameInput('');
    setShowGroupModal(true);
  }

  const submitCreateGroup = async () => {
    if (!groupNameInput || groupNameInput.trim() === '') return;
    try {
      const res = await createConversation({ isGroup: true, name: groupNameInput.trim(), memberIds: [] });
      refreshConversations();
      onSelectChat(res.data.data);
      setShowGroupModal(false);
    } catch(e) {
      console.error(e);
      setAlertMessage('Tạo nhóm thất bại!');
      setShowGroupModal(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-xl font-bold">Tin nhắn</h1>
        <button 
          title="Tạo nhóm mới"
          onClick={handleCreateGroup}
          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-[#e60000]"
        >
          <i className="fa-solid fa-users"></i>
        </button>
      </div>

      <div className="relative p-3">
        <div className="relative z-10">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input 
            type="text" 
            placeholder="Tìm kiếm đoạn chat, người dùng hoặc nhóm..."
            className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#e60000]"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        
        {(searchResults.users.length > 0 || searchResults.groups.length > 0) && search && (
          <div className="absolute left-3 right-3 top-14 z-20 overflow-hidden rounded-[20px] bg-white/95 backdrop-blur-sm">
             {searchResults.groups.length > 0 && (
               <div>
                 <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-black/5">Nhóm chat</div>
                 {searchResults.groups.map((group: any) => (
                   <div key={`group-${group.id}`} onClick={() => openGroupChat(group)} className="flex cursor-pointer items-center p-3 hover:bg-black/5">
                     <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden shrink-0 text-gray-500">
                       <i className="fa-solid fa-users"></i>
                     </div>
                     <div className="ml-3 min-w-0 flex-1">
                       <div className="font-medium text-sm truncate">{group.name || 'Nhóm trò chuyện'}</div>
                       <div className="text-xs text-gray-500 truncate">{group.last_message || 'Nhóm chat'}</div>
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {searchResults.users.length > 0 && (
               <div>
                 <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 bg-black/5">Người dùng</div>
                 {searchResults.users.map((su: any) => {
                    const avatar = su.avatar || su.AnhDaiDien || su.Avatar;
                    const username = su.username || su.TenDangNhap || su.Username || 'User';

                    return (
                      <div key={su.id} onClick={() => startNewChat(su)} className="flex cursor-pointer items-center p-3 hover:bg-black/5">
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
                        <div className="ml-3 font-medium text-sm truncate">{username}</div>
                      </div>
                    )
                 })}
               </div>
             )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((chat: any) => (
          <div 
            key={chat.id}
            onClick={() => {
              try {
                const userId = currentUser?.id;
                if (userId) {
                  const key = `chat_last_seen_${userId}_${chat.id}`;
                  localStorage.setItem(key, new Date().toISOString());
                }
              } catch (e) {}
              onSelectChat(chat);
              refreshConversations();
            }}
            className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedChat?.id === chat.id ? 'bg-gray-100' : ''}`}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 overflow-hidden">
                {!chat.is_group && chat.other_user_avatar ? (
                  <img src={chat.other_user_avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  chat.is_group ? <i className="fa-solid fa-users"></i> : <i className="fa-solid fa-user"></i>
                )}
              </div>
            </div>
            
            <div className="ml-3 flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline">
                <h3 className={`text-sm truncate ${chat.unread ? 'font-semibold text-gray-900' : 'font-normal text-gray-600'}`}>{chat.is_group ? (chat.name || "Nhóm trò chuyện") : (chat.other_user_name || "Cuộc trò chuyện")}</h3>
                <div className="flex items-center gap-2">
                  {chat.unread && (
                    <span className="inline-block w-2 h-2 rounded-full bg-[#e60000]" />
                  )}
                  <span className="text-xs text-gray-500">{chat.last_message_time ? new Date(chat.last_message_time).toLocaleDateString() : ''}</span>
                </div>
              </div>
              <p className="text-sm truncate text-gray-500">
                {chat.last_message ? chat.last_message : 'Bắt đầu trò chuyện'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Popup Prompt Tạo Nhóm */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-[24px] bg-white/95 p-6 transition-all">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tạo nhóm mới</h3>
            <input 
              type="text" 
              placeholder="Nhập tên nhóm..." 
              className="mb-6 w-full rounded-full bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#e60000]/30"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreateGroup()}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowGroupModal(false)}
                className="rounded-full px-4 py-2 font-medium text-gray-600 transition hover:bg-black/5"
              >
                Hủy
              </button>
              <button 
                onClick={submitCreateGroup}
                disabled={!groupNameInput.trim()}
                className="rounded-full bg-[#e60000] px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tạo nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Alert Thông báo */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-[24px] bg-white/95 p-6 text-center transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 mx-auto flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thông báo</h3>
            <p className="text-gray-600 mb-6">{alertMessage}</p>
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
