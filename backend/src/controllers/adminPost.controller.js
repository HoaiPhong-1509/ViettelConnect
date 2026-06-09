import * as adminPostService from '../services/adminPost.service.js';

const parseFilters = (query) => ({
    tab: query.tab || 'all',
    search: query.search || '',
    from: query.from || null,
    to: query.to || null,
    postId: query.postId || null,
    limit: query.limit || 20,
    offset: query.offset || 0,
});

export const listPosts = async (req, res) => {
    try {
        const result = await adminPostService.listPosts(parseFilters(req.query));
        return res.status(200).json({ success: true, data: result.posts, counts: result.counts });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài viết admin:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export const getDashboardSummary = async (req, res) => {
    try {
        const summary = await adminPostService.getDashboardSummary();
        return res.status(200).json({ success: true, data: summary });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê dashboard bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export const getPostDetail = async (req, res) => {
    try {
        const post = await adminPostService.getPostDetail(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Bài viết không tồn tại', code: 'NOT_FOUND' });
        }

        return res.status(200).json({ success: true, data: post });
    } catch (error) {
        console.error('Lỗi khi lấy chi tiết bài viết admin:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export const approvePost = async (req, res) => {
    try {
        const adminId = req.user.Id || req.user.id;
        const success = await adminPostService.approvePost(req.params.id, adminId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cần duyệt' });
        }

        return res.status(200).json({ success: true, message: 'Đã duyệt bài viết.' });
    } catch (error) {
        console.error('Lỗi duyệt bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export const hidePost = async (req, res) => {
    try {
        const adminId = req.user.Id || req.user.id;
        const success = await adminPostService.hidePost(req.params.id, adminId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cần ẩn' });
        }

        return res.status(200).json({ success: true, message: 'Đã ẩn bài viết.' });
    } catch (error) {
        console.error('Lỗi ẩn bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};

export const deletePost = async (req, res) => {
    try {
        const adminId = req.user.Id || req.user.id;
        const success = await adminPostService.deletePost(req.params.id, adminId);
        if (!success) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bài viết cần xóa' });
        }

        return res.status(200).json({ success: true, message: 'Đã xóa bài viết.' });
    } catch (error) {
        console.error('Lỗi xóa bài viết:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', error: error.message });
    }
};
