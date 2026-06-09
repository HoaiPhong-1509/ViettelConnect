export const isDatabaseConnectionError = (error) => {
    const code = error?.code || error?.cause?.code;
    return code === 'ECONNREFUSED' || code === 'ER_ACCESS_DENIED_ERROR' || error?.fatal === true;
};

export const respondWithServerError = (res, error, fallbackMessage = 'Lỗi server') => {
    if (isDatabaseConnectionError(error)) {
        console.error('Cơ sở dữ liệu hiện không khả dụng:', error?.message || 'ECONNREFUSED');
        return res.status(503).json({ success: false, message: 'Cơ sở dữ liệu hiện không khả dụng, vui lòng thử lại sau.' });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: fallbackMessage });
};