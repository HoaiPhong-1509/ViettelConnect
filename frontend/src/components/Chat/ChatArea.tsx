'use client';
import { useState, useRef, useEffect } from 'react';
import { getMessages, sendMessage, getMembers } from '@/services/chat.api';

const POST_SHARE_PREFIX = '__POST_SHARE__';

const parseSharePayload = (content: any) => {
  if (typeof content !== 'string' || !content.startsWith(POST_SHARE_PREFIX)) return null;

  try {
    return JSON.parse(content.slice(POST_SHARE_PREFIX.length));
  } catch {
    return null;
  }
};

const isVideoUrl = (url: string) => /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url) || url.startsWith('data:video/');

export default function ChatArea({ chat, onToggleInfo, socket, currentUser, refreshConversations, onBack }: any) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});
  const [expandedShareMessages, setExpandedShareMessages] = useState<Record<string, boolean>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{ url: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    try {
      const res = await getMessages(chat.id);
      const fetched = res.data.data || [];

      // determine per-conversation last seen timestamp
      let lastSeen = 0;
      try {
        const key = `chat_last_seen_${currentUser?.id}_${chat.id}`;
        const ls = localStorage.getItem(key);
        lastSeen = ls ? new Date(ls).getTime() : 0;
      } catch (e) {}

      const annotated = fetched.map((m: any) => ({
        ...m,
        unread: m.created_at && new Date(m.created_at).getTime() > lastSeen,
      }));

      setMessages(annotated);

      // mark conversation as seen now
      try {
        const key = `chat_last_seen_${currentUser?.id}_${chat.id}`;
        localStorage.setItem(key, new Date().toISOString());
        localStorage.setItem('chat_unread', '0');
      } catch (e) {}
      scrollToBottom();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (chat && currentUser) {
      loadMessages();
      socket?.emit('join_conversation', chat.id);
      // (no global last-seen write here) per-conversation last-seen is handled in loadMessages
      if (chat.is_group) {
        getMembers(chat.id)
          .then((res) => {
            const map: Record<string, string> = {};
            (res.data.data || []).forEach((m: any) => {
              map[m.id] = m.username || m.tenDangNhap || m.username || `User ${m.id}`;
            });
            setMembersMap(map);
          })
          .catch(() => {});
      }
    }

    return () => {
      socket?.emit('leave_conversation', chat.id);
    };
  }, [chat?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMsg = (msg: any) => {
      if (msg.conversation_id === chat.id) {
        setMessages((prev) => {
          if (prev.find((p) => p.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      }
    };

    const handleTyping = (data: any) => {
      if (!data) return;
      const userId = data.userId;
      if (userId === currentUser?.id) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (prev.includes(userId)) return prev;
          return [...prev, userId];
        }
        return prev.filter((id: any) => id !== userId);
      });
    };

    socket.on('new_message', handleNewMsg);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMsg);
      socket.off('typing', handleTyping);
    };
  }, [socket, chat?.id]);

  const getMessageTime = (value: any) => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString();
    } catch {
      return '';
    }
  };

  const toggleShareDetails = (messageKey: string) => {
    setExpandedShareMessages((prev) => ({
      ...prev,
      [messageKey]: !prev[messageKey],
    }));
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      const data = { content: message, type: 'text' };
      const res = await sendMessage(chat.id, data);
      setMessage('');
      socket?.emit('typing', { conversationId: chat.id, isTyping: false });

      setMessages((prev) => {
        if (prev.find((p) => p.id === res.data.data.id)) return prev;
        return [...prev, res.data.data];
      });

      scrollToBottom();
      refreshConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const formData = new FormData();
      formData.append('media', e.target.files[0]);
      formData.append('type', e.target.files[0].type.startsWith('video') ? 'video' : 'image');

      try {
        const res = await sendMessage(chat.id, formData);
        setMessages((prev) => {
          if (prev.find((p) => p.id === res.data.data.id)) return prev;
          return [...prev, res.data.data];
        });
        scrollToBottom();
        refreshConversations();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const renderShareCard = (m: any, isMine: boolean, isExpanded: boolean, messageKey: string) => {
    const payload = parseSharePayload(m.content);
    if (!payload) return null;

    const previewMedia = Array.isArray(payload.media) ? payload.media.slice(0, 4) : [];
    const senderName = isMine
      ? 'Bạn'
      : chat.is_group
        ? membersMap[m.sender_id] || `Người dùng ${m.sender_id}`
        : chat.other_user_name || 'Người kia';

    return (
      <div className={`w-full max-w-[320px] overflow-hidden rounded-[22px] ${isMine ? 'bg-red-50' : 'bg-white/90'}`}>
        <button type="button" onClick={() => toggleShareDetails(messageKey)} className="block w-full text-left">
          <div className="p-3">
            <div className="text-xs font-semibold text-gray-500">{senderName} đã chia sẻ bài viết</div>
            <div className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">
              {payload.authorName ? `Bài viết của ${payload.authorName}` : `Bài viết #${payload.postId}`}
            </div>
            <div className="mt-1 text-[11px] text-gray-400">{getMessageTime(m.created_at)}</div>
          </div>

          {isExpanded && payload.text && <div className="px-3 py-2 text-xs whitespace-pre-wrap text-gray-600">{payload.text}</div>}

          {isExpanded && previewMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-1 bg-transparent p-1">
              {previewMedia.map((media: any, index: number) => {
                const mediaUrl = media.thumbnailUrl || media.url;
                const video = isVideoUrl(media.url);
                return (
                  <div key={`${media.url}-${index}`} className="aspect-square overflow-hidden bg-gray-100">
                    {video ? <video src={mediaUrl} muted playsInline className="h-full w-full object-cover" /> : <img src={mediaUrl} alt="shared media" className="h-full w-full object-cover" />}
                  </div>
                );
              })}
            </div>
          )}
        </button>

        <div className={`px-3 py-2 text-xs font-medium ${isMine ? 'text-red-700' : 'text-[#e60000]'}`}>
          <a href={payload.postUrl} className="inline-flex items-center gap-1" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            Mở bài viết
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-transparent">
      <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between bg-white/75 px-4 py-2 backdrop-blur-sm">
        <div className="flex min-w-0 items-center">
          {onBack && (
            <button onClick={onBack} className="mr-3 text-gray-500 hover:text-gray-700 focus:outline-none md:hidden">
              <i className="fa-solid fa-arrow-left text-xl"></i>
            </button>
          )}

          <div className="flex min-w-0 cursor-pointer items-center" onClick={onToggleInfo}>
            <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-gray-600">
              {!chat.is_group && chat.other_user_avatar ? (
                <img src={chat.other_user_avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : chat.is_group ? (
                <i className="fa-solid fa-users"></i>
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-semibold">{chat.is_group ? chat.name || 'Nhóm trò chuyện' : chat.other_user_name || 'Cuộc trò chuyện'}</h2>
              <p className="text-xs text-green-500">Đang hoạt động</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xl text-[#e60000]">
          <button className="transition hover:text-red-700" onClick={onToggleInfo} title="Thông tin">
            <i className="fa-solid fa-circle-info"></i>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-transparent p-4">
        {messages.map((m: any, index: number) => {
          const isMine = m.sender_id === currentUser?.id;
          const messageKey = String(m.id ?? index);
          const isExpanded = !!expandedShareMessages[messageKey];

          return (
            <div key={index} className={`flex max-w-[70%] items-end gap-2 ${isMine ? 'self-end flex-row-reverse' : 'self-start'}`}>
              {!isMine && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-300 text-xs">
                  {chat.is_group ? (
                    <img
                      src={m.sender_avatar || '/viettel-telecom-seeklogo.svg'}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                      }}
                    />
                  ) : chat.other_user_avatar ? (
                    <img
                      src={chat.other_user_avatar}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                      }}
                    />
                  ) : (
                    <i className="fa-solid fa-user"></i>
                  )}
                </div>
              )}

              {m.type === 'van_ban' || m.type === 'text' ? (
                parseSharePayload(m.content) ? (
                  renderShareCard(m, isMine, isExpanded, messageKey)
                ) : (
                  <div className="flex flex-col">
                    {!isMine && <div className="mb-1 text-xs font-semibold text-gray-700">{chat.is_group ? membersMap[m.sender_id] || `Người dùng ${m.sender_id}` : chat.other_user_name || 'Người kia'}</div>}
                    <div className={`rounded-2xl p-3 text-sm ${isMine ? 'rounded-br-sm bg-[#e60000] text-white' : 'rounded-bl-sm bg-white/90 text-gray-800'} ${!isMine && m.unread ? 'font-semibold' : ''}`}>{m.content}</div>
                    <div className="mt-1 text-[11px] text-gray-400">{getMessageTime(m.created_at)}</div>
                  </div>
                )
              ) : m.type === 'hinh_anh' || m.type === 'image' ? (
                <div className="flex flex-col">
                  {!isMine && <div className="mb-1 text-xs font-semibold text-gray-700">{chat.is_group ? membersMap[m.sender_id] || `Người dùng ${m.sender_id}` : chat.other_user_name || 'Người kia'}</div>}
                  <div
                    className={`cursor-pointer overflow-hidden rounded-2xl transition hover:opacity-90 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setLightboxMedia({ url: m.content, type: 'image' });
                    }}
                  >
                    <img
                      src={m.content !== 'media_mock_url' ? m.content : 'https://via.placeholder.com/300x200?text=Mock+Image'}
                      alt="sent content"
                      className="block h-auto max-h-64 w-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Error';
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">{getMessageTime(m.created_at)}</div>
                </div>
              ) : m.type === 'video' ? (
                <div className="flex flex-col">
                  {!isMine && <div className="mb-1 text-xs font-semibold text-gray-700">{chat.is_group ? membersMap[m.sender_id] || `Người dùng ${m.sender_id}` : chat.other_user_name || 'Người kia'}</div>}
                  <div
                    className={`cursor-pointer overflow-hidden rounded-2xl transition hover:opacity-90 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setLightboxMedia({ url: m.content, type: 'video' });
                    }}
                  >
                    <video src={m.content !== 'media_mock_url' ? m.content : ''} controls preload="metadata" playsInline className="block h-auto max-h-64 w-48 bg-black object-cover"></video>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-400">{getMessageTime(m.created_at)}</div>
                </div>
              ) : null}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 bg-white/75 p-4 backdrop-blur-sm">
        {typingUsers.length > 0 && (
          <div className="mb-2 text-sm text-gray-500">
            {(() => {
              const names = typingUsers.map((id: any) => membersMap[id] || (chat.other_user_name && id !== currentUser?.id ? chat.other_user_name : 'Người khác'));
              return `${names.join(', ')} đang nhập...`;
            })()}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 focus-within:bg-gray-50">
          <button className="shrink-0 text-xl text-gray-500 hover:text-[#e60000]" onClick={() => fileInputRef.current?.click()}>
            <i className="fa-regular fa-image"></i>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
          </button>

          <input
            type="text"
            placeholder="Nhắn tin..."
            className="flex-1 bg-transparent px-2 py-2 text-sm focus:outline-none"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              socket?.emit('typing', { conversationId: chat.id, isTyping: true });
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                socket?.emit('typing', { conversationId: chat.id, isTyping: false });
              }, 1200);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />

          {message.trim() && (
            <button onClick={handleSend} className="shrink-0 px-2 text-xl font-bold text-[#e60000] transition-transform hover:scale-110 hover:text-red-700">
              Gửi
            </button>
          )}
        </div>
      </div>

      {lightboxMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setLightboxMedia(null)}>
          <div className="absolute right-4 top-4 z-[110] cursor-pointer p-3 text-4xl font-light leading-none text-white hover:text-gray-300">&times;</div>
          <div className="relative flex max-h-[90vh] w-full max-w-5xl items-center justify-center p-4">
            {lightboxMedia.type === 'video' ? (
              <video src={lightboxMedia.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            ) : (
              <img src={lightboxMedia.url} alt="Fullscreen content" className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}