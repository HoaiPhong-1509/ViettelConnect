import { processAndUploadMedia } from '../services/media.service.js';

export const uploadMedia = async (req, res) => {
    try {
        const userId = req.user.Id || req.user.id; // Tùy thuộc vào payload trong JWT
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 file', code: 'NO_FILES_PROVIDED' });
        }

        const mediaIds = await processAndUploadMedia(userId, files);

        return res.status(200).json({
            success: true,
            data: { mediaIds }
        });
    } catch (error) {
        console.error('Lỗi khi upload media:', error);
        return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi hệ thống', code: 'INTERNAL_SERVER_ERROR' });
    }
};