import api from './api';

export const getConversations = () => api.get('/chat/conversations');
export const createConversation = (data) => api.post('/chat/conversations', data);
export const getMessages = (conversationId, cursor = null) => api.get(`/chat/conversations/${conversationId}/messages`, { params: { cursor } });
export const sendMessage = (conversationId, data) => api.post(`/chat/conversations/${conversationId}/messages`, data);
export const deleteConversation = (conversationId) => api.delete(`/chat/conversations/${conversationId}`);
export const searchUsers = (query) => api.get('/chat/search', { params: { query } });
export const getMembers = (conversationId) => api.get(`/chat/conversations/${conversationId}/members`);
export const addMember = (conversationId, targetUserId) => api.post(`/chat/conversations/${conversationId}/members`, { targetUserId });
export const removeMember = (conversationId, userId) => api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
