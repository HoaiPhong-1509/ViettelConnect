import jwt from 'jsonwebtoken';

// Middleware kiểm tra JWT Token
export const verifyToken = (req, res, next) => {
    // Ưu tiên đọc Token từ HttpOnly Cookie do đã bật cookie-parser
    let token = req.cookies?.token;
    
    // Fallback: để cho mục đích dùng Postman/Thunder Client dễ test, nếu không có cookie thì lấy từ Header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
        return res.status(401).json({ message: 'Không tìm thấy token hoặc bạn chưa đăng nhập.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_tam_thoi');
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Lỗi xác thực: Token không hợp lệ hoặc đã hết hạn.' });
    }
};

// Middleware kiểm tra Admin
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.roles && req.user.roles.includes('Admin')) {
        next();
    } else {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập. Yêu cầu quyền Admin.' });
    }
};