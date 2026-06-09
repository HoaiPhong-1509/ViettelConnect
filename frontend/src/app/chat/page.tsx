'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from '@/components/Chat/ChatSidebar';
import ChatArea from '@/components/Chat/ChatArea';
import ChatInfo from '@/components/Chat/ChatInfo';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { getConversations } from '@/services/chat.api';

export default function ChatPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const socket = useChatWebSocket();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [conversations, setConversations] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthReady && !user) {
      router.push('/login');
    }
  }, [isAuthReady, router, user]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      const convs = (res.data.data || []).map((c: any) => ({ ...c }));

      // annotate with unread by comparing last_message_time with per-conversation last-seen
      try {
        const annotated = convs.map((c: any) => {
          if (!c.last_message_time) return { ...c, unread: false };
          try {
            const key = `chat_last_seen_${user.id}_${c.id}`;
            const ls = localStorage.getItem(key);
            const lastSeen = ls ? new Date(ls).getTime() : 0;
            const lm = new Date(c.last_message_time).getTime();
            return { ...c, unread: lm > lastSeen };
          } catch (e) {
            return { ...c, unread: false };
          }
        });
        setConversations(annotated);
      } catch (e) {
        setConversations(convs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthReady && user) {
      loadConversations();
    }
  }, [isAuthReady, user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_message', (msg: any) => {
      // Reload or update last message in list
       loadConversations();
    });
    socket.on('conversation_deleted', () => {
       loadConversations();
       setSelectedChat(null);
    });
    return () => {
       socket.off('new_message');
       socket.off('conversation_deleted');
    };
  }, [socket]);

  if (!isAuthReady) return null;
  if (!user) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef1f5]">
      <Header />
      <div className="mx-auto flex w-full flex-1 max-w-[1320px] overflow-hidden px-4 pb-4 pt-4">
        <div className="flex w-full overflow-hidden rounded-[28px] bg-white/50 backdrop-blur-sm">
          {/* Sidebar (List chat, search) */}
          <div className={`w-full md:w-1/3 md:min-w-[300px] md:max-w-[400px] bg-[#f4f6f9] flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <ChatSidebar 
              conversations={conversations}
              selectedChat={selectedChat} 
              onSelectChat={setSelectedChat} 
              refreshConversations={loadConversations}
              currentUser={user}
            />
          </div>

          {/* Main Chat Area */}
          <div className={`relative flex flex-1 flex-col overflow-hidden bg-[#fbfcfe] ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {selectedChat ? (
              <ChatArea 
                chat={selectedChat} 
                onToggleInfo={() => setShowInfo(!showInfo)} 
                socket={socket}
                currentUser={user}
                refreshConversations={loadConversations}
                onBack={() => setSelectedChat(null)}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center bg-transparent text-gray-500">
                <i className="fa-regular fa-comments text-6xl mb-4 text-[#e60000]"></i>
                <h2 className="text-xl font-medium">Tin nhắn của bạn</h2>
                <p className="mt-2 text-sm">Gửi ảnh, video riêng tư và nhóm bạn bè.</p>
              </div>
            )}
          </div>

          {/* Chat Info (Group Management) */}
          {showInfo && selectedChat && (
            <div className="relative z-10 flex w-1/4 min-w-[280px] max-w-[320px] flex-col bg-[#f4f6f9]">
              <ChatInfo chat={selectedChat} onClose={() => setShowInfo(false)} currentUser={user} onChatDeleted={() => setSelectedChat(null)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
