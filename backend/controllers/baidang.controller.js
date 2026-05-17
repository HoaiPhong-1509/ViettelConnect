import * as baidangService from '../services/baidang.service.js';

export const createPost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const { content, mediaIds } = req.body;

        if (!content && (!mediaIds || mediaIds.length === 0)) {
            return res.status(400).json({ success: false, message: 'Bài viết không được để trống', code: 'EMPTY_POST' });
        }

        const postId = await baidangService.createPost(userId, content || '', mediaIds || []);
        return res.status(201).json({ success: true, data: { postId } });
    } catch (error) {
        console.error('Lỗi khi tạo bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const getFeed = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const posts = await baidangService.getFeed(userId, limit, offset);
        return res.status(200).json({ success: true, data: posts });
    } catch (error) {
        console.error('Lỗi khi lấy feed:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const getPostDetail = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        const post = await baidangService.getPostDetail(userId, postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại', code: 'NOT_FOUND' });
        }

        return res.status(200).json({ success: true, data: post });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const deletePost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        const isDeleted = await baidangService.deletePost(userId, postId);
        if (!isDeleted) {
            return res.status(403).json({ success: false, message: 'Không thể xóa bài viết này (hoặc bài viết không tồn tại)', code: 'FORBIDDEN_OR_NOT_FOUND' });
        }

        return res.status(200).json({ success: true, message: 'Xóa bài viết thành công' });
    } catch (error) {
        console.error('Lỗi khi xóa bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const likePost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        await baidangService.likePost(userId, postId);
        return res.status(200).json({ success: true, message: 'Thích bài viết thành công' });
    } catch (error) {
        console.error('Lỗi khi thích bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const unlikePost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        await baidangService.unlikePost(userId, postId);
        return res.status(200).json({ success: true, message: 'Bỏ thích bài viết thành công' });
    } catch (error) {
        console.error('Lỗi khi bỏ thích bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const addComment = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung bình luận không được để trống', code: 'EMPTY_CONTENT' });
        }

        const commentId = await baidangService.addComment(userId, postId, content, null);
        return res.status(201).json({ success: true, data: { commentId } });
    } catch (error) {
        if (error.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại', code: 'NOT_FOUND' });
        }
        console.error('Lỗi khi bình luận:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const getRootComments = async (req, res) => {
    try {
        const postId = req.params.id;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const comments = await baidangService.getRootComments(postId, limit, offset);
        return res.status(200).json({ success: true, data: comments });
    } catch (error) {
        console.error('Lỗi khi lấy bình luận:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const applyReply = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const parentId = req.params.commentId;
        const { content, postId } = req.body; // Cần gửi postId từ frontend để trigger SoBinhLuan + 1 dễ dàng

        if (!content || content.trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống', code: 'EMPTY_CONTENT' });
        }
        if (!postId) {
            return res.status(400).json({ success: false, message: 'Thiếu postId', code: 'MISSING_POST_ID' });
        }

        const commentId = await baidangService.addComment(userId, postId, content, parentId);
        return res.status(201).json({ success: true, data: { commentId } });
    } catch (error) {
        console.error('Lỗi khi phản hồi bình luận:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};

export const getReplies = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const replies = await baidangService.getReplies(commentId, limit, offset);
        return res.status(200).json({ success: true, data: replies });
    } catch (error) {
        console.error('Lỗi khi lấy reply:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};