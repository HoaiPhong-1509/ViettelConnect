import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pool from './db.js';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import userRoutes from './user.js';
import postRoutes from './post.js';
import baidangRoutes from './routes/baidang.routes.js';
import mediaRoutes from './routes/media.routes.js';
import binhluanRoutes from './routes/binhluan.routes.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// 1. Áp dụng Helmet để che dấu thông tin Express và thêm Headers bảo mật (Chống Clickjacking, XSS,...)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Cấu hình CORS linh hoạt hơn
app.use(cors({
    origin: function (origin, callback) {
        // Cho phép mọi request cho múc đích dev (có thể sửa lại khi release)
        callback(null, true);
    },
    credentials: true // Cực kỳ quan trọng để cho phép Server nhận Cookie từ Frontend
}));

app.use(express.json());

// 3. Sử dụng Cookie-parser để hệ thống có thể đọc Token từ HttpOnly Cookie
app.use(cookieParser());

// 4. Thiết lập Rate Limiting (Bảo vệ Brute Force / Spam) đã có từ trước
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: { message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút!' }
});
app.use('/api/', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/baidang', baidangRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/binhluan', binhluanRoutes);

// Serve static files for uploads
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/nguoidung', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM nguoidung');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi kết nối Server' });
    }
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Backend đang chạy tại: http://localhost:${process.env.PORT || 5000}`);
});