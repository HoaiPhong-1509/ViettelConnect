import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { sendSupportEmail } from '../mailer.js';

const router = express.Router();

let supportMailLogTableReady = null;

const ensureSupportMailLogTable = () => {
    if (!supportMailLogTableReady) {
        supportMailLogTableReady = pool.query(`
            CREATE TABLE IF NOT EXISTS support_mail_logs (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                UserId INT NOT NULL,
                Subject VARCHAR(120) NOT NULL,
                CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_support_mail_logs_user_created (UserId, CreatedAt)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    return supportMailLogTableReady;
};

router.post('/send', verifyToken, [
    body('subject').trim().isLength({ min: 3, max: 120 }).withMessage('Tiêu đề phải có từ 3 đến 120 ký tự.'),
    body('content').trim().isLength({ min: 10, max: 5000 }).withMessage('Nội dung phải có từ 10 đến 5000 ký tự.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const subject = String(req.body.subject || '').trim();
    const content = String(req.body.content || '').trim();

    try {
        await ensureSupportMailLogTable();

        const [users] = await pool.query(
            'SELECT Id, TenDangNhap, Email FROM nguoidung WHERE Id = ? LIMIT 1',
            [req.user.id]
        );

        if (!users.length) {
            return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        }

        const sender = users[0];
        const recipientEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

        if (!recipientEmail) {
            return res.status(500).json({ message: 'Chưa cấu hình email nhận hỗ trợ cho hệ thống.' });
        }

        const [recentRequests] = await pool.query(
            `SELECT Id, CreatedAt
             FROM support_mail_logs
             WHERE UserId = ? AND CreatedAt >= (NOW() - INTERVAL 1 DAY)
             ORDER BY CreatedAt DESC
             LIMIT 1`,
            [sender.Id]
        );

        if (recentRequests.length > 0) {
            return res.status(429).json({
                message: 'Bạn chỉ có thể gửi yêu cầu hỗ trợ một lần trong 24 giờ. Vui lòng thử lại sau.'
            });
        }

        await sendSupportEmail({
            toEmail: recipientEmail,
            replyTo: sender.Email,
            senderName: sender.TenDangNhap,
            senderEmail: sender.Email,
            subject,
            content,
        });

        await pool.query(
            'INSERT INTO support_mail_logs (UserId, Subject) VALUES (?, ?)',
            [sender.Id, subject]
        );

        return res.json({ message: 'Đã gửi yêu cầu hỗ trợ đến quản trị viên.' });
    } catch (error) {
        console.error('Lỗi khi gửi email hỗ trợ:', error);
        return res.status(500).json({ message: 'Không thể gửi yêu cầu hỗ trợ lúc này. Vui lòng thử lại sau.' });
    }
});

export default router;