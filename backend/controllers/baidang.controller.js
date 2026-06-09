import * as baidangService from '../services/baidang.service.js';
import {
    createPostCommentedNotification,
    createPostLikedNotification,
} from '../src/services/notification.service.js';
import { respondWithServerError } from '../src/utils/dbError.js';

const emitNotificationRefresh = (req) => {
    if (req.io) {
        req.io.emit('notification_created', {
            occurredAt: new Date().toISOString(),
        });
    }
};

export const createPost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const { content, mediaIds } = req.body;

        if (!content && (!mediaIds || mediaIds.length === 0)) {
            return res.status(400).json({ success: false, message: 'Bài viết không được để trống', code: 'EMPTY_POST' });
        }

        const created = await baidangService.createPost(userId, content || '', mediaIds || []);
        emitNotificationRefresh(req);
        return res.status(201).json({
            success: true,
            message: 'Đăng bài thành công. Bài viết đang chờ duyệt.',
            data: created,
        });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const getFeed = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const posts = await baidangService.getFeed(userId, limit, offset);
        return res.status(200).json({ success: true, message: 'Lấy feed thành công', data: posts });
    } catch (error) {
        console.error('Lỗi khi lấy feed:', error);
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const reportPost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;
        const { reason } = req.body;

        const report = await baidangService.reportPost(userId, postId, reason);
        return res.status(201).json({
            success: true,
            message: 'Đã gửi báo cáo bài viết.',
            data: report,
        });
    } catch (error) {
        if (error.message === 'EMPTY_REPORT_REASON') {
            return res.status(400).json({ success: false, message: 'Lý do báo cáo không được để trống', code: 'EMPTY_REPORT_REASON' });
        }
        if (error.message === 'SELF_REPORT_NOT_ALLOWED') {
            return res.status(400).json({ success: false, message: 'Không thể báo cáo bài viết của chính mình', code: 'SELF_REPORT_NOT_ALLOWED' });
        }
        if (error.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại', code: 'NOT_FOUND' });
        }
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const likePost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        await baidangService.likePost(userId, postId);
        void createPostLikedNotification({ actorId: userId, postId }).catch((error) => {
            console.error('Không thể tạo thông báo thích bài viết:', error);
        });
        emitNotificationRefresh(req);
        return res.status(200).json({ success: true, message: 'Thích bài viết thành công' });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const unlikePost = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const postId = req.params.id;

        await baidangService.unlikePost(userId, postId);
        return res.status(200).json({ success: true, message: 'Bỏ thích bài viết thành công' });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const getLikes = async (req, res) => {
    try {
        const postId = req.params.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const users = await baidangService.getLikes(postId, limit, offset);
        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        void createPostCommentedNotification({ actorId: userId, postId, commentContent: content }).catch((error) => {
            console.error('Không thể tạo thông báo bình luận bài viết:', error);
        });
        emitNotificationRefresh(req);
        return res.status(201).json({ success: true, data: { commentId } });
    } catch (error) {
        if (error.message === 'POST_NOT_FOUND') {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại', code: 'NOT_FOUND' });
        }
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        emitNotificationRefresh(req);
        return res.status(201).json({ success: true, data: { commentId } });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
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
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};