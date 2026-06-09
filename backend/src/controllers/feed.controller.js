import * as feedService from '../services/feed.service.js';
import { getPersonalNotificationFeed } from '../services/notification.service.js';
import { respondWithServerError } from '../utils/dbError.js';

const parseFeedQuery = (query) => {
    const limit = Number.parseInt(query.limit, 10);
    const offset = Number.parseInt(query.offset, 10);

    return {
        limit: Number.isFinite(limit) ? limit : 10,
        offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    };
};

export const getFeed = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const { limit, offset } = parseFeedQuery(req.query);
        const posts = await feedService.getFeed(userId, limit, offset);

        return res.status(200).json({
            success: true,
            message: 'Lấy feed thành công',
            data: posts,
        });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id;
        const limit = Number.parseInt(req.query.limit, 10);
        const notifications = await getPersonalNotificationFeed({
            userId,
            limit: Number.isFinite(limit) ? limit : 10,
        });

        return res.status(200).json({
            success: true,
            message: 'Lấy thông báo thành công',
            data: notifications,
        });
    } catch (error) {
        return respondWithServerError(res, error, 'Đã xảy ra lỗi hệ thống');
    }
};
