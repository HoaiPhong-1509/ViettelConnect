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
import feedRoutes from './src/routes/feed.routes.js';
import baidangRoutes from './routes/baidang.routes.js';
import mediaRoutes from './routes/media.routes.js';
import binhluanRoutes from './routes/binhluan.routes.js';
import chatRoutes from './routes/chat.routes.js';
import supportRoutes from './routes/support.routes.js';
import initSocket from './socket.js';
import http from 'http';
import dotenv from 'dotenv';
import { respondWithServerError } from './src/utils/dbError.js';
dotenv.config();

const app = express();
const server = http.createServer(app);

// Khởi tạo Socket.io
const io = initSocket(server);

// Truyền io vào request để controller dùng lại
app.use((req, res, next) => {
    req.io = io;
    next();
});

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
app.use('/api/auth', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/baidang', baidangRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/support', supportRoutes);

app.use('/api/media', mediaRoutes);
app.use('/api/binhluan', binhluanRoutes);

const port = process.env.PORT || 5000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Backend đang chạy tại: http://localhost:${port}`);
});

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
        respondWithServerError(res, err, 'Lỗi kết nối Server');
    }
});

// Note: server is started above with `server.listen` to support Socket.io