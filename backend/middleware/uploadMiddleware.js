import multer from 'multer';

// Storage in memory
const storage = multer.memoryStorage();

// File filter (images and videos)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};

export const uploadMediaMiddleware = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB (tăng lên để hỗ trợ video)
        files: 10 // Max 10 files
    },
    fileFilter
});

export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'Kích thước file vượt quá giới hạn (10MB)', code: 'FILE_TOO_LARGE' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, message: 'Số lượng file vượt quá giới hạn (tối đa 10)', code: 'TOO_MANY_FILES' });
        }
        return res.status(400).json({ success: false, message: 'Lỗi upload file: ' + err.message, code: err.code });
    } else if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ success: false, message: 'Định dạng file không được hỗ trợ', code: 'INVALID_FILE_TYPE' });
        }
        return res.status(500).json({ success: false, message: 'Lỗi server khi upload file', code: 'INTERNAL_SERVER_ERROR' });
    }
    next();
};