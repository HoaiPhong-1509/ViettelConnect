import api from './api';

export const uploadMediaApi = async (files, onUploadProgress) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    const res = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress
    });
    return res.data;
};

export const createPostApi = async (content, mediaIds) => {
    const res = await api.post('/baidang', { content, mediaIds });
    return res.data;
};

export const getFeedApi = async (limit = 10, offset = 0) => {
    const res = await api.get(`/feed?limit=${limit}&offset=${offset}`);
    return res.data;
};

export const getPostDetailApi = async (postId) => {
    const res = await api.get(`/baidang/${postId}`);
    return res.data;
};

export const likePostApi = async (postId) => {
    const res = await api.post(`/baidang/${postId}/thich`);
    return res.data;
};

export const unlikePostApi = async (postId) => {
    const res = await api.delete(`/baidang/${postId}/thich`);
    return res.data;
};

export const deletePostApi = async (postId) => {
    const res = await api.delete(`/baidang/${postId}`);
    return res.data;
};

export const reportPostApi = async (postId, reason) => {
    const res = await api.post(`/baidang/${postId}/report`, { reason });
    return res.data;
};

export const getLikesApi = async (postId, limit = 20, offset = 0) => {
    const res = await api.get(`/baidang/${postId}/thich?limit=${limit}&offset=${offset}`);
    return res.data;
};

export const getCommentsApi = async (postId, limit = 10, offset = 0) => {
    const res = await api.get(`/baidang/${postId}/binhluan?limit=${limit}&offset=${offset}`);
    return res.data;
};

export const addCommentApi = async (postId, content) => {
    const res = await api.post(`/baidang/${postId}/binhluan`, { content });
    return res.data;
};

export const getRepliesApi = async (commentId, limit = 10, offset = 0) => {
    const res = await api.get(`/binhluan/${commentId}/reply?limit=${limit}&offset=${offset}`);
    return res.data;
};

export const addReplyApi = async (commentId, postId, content) => {
    const res = await api.post(`/binhluan/${commentId}/reply`, { content, postId });
    return res.data;
};