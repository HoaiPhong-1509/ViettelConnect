import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import pool from './db.js';
import { verifyToken } from './middleware/authMiddleware.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatar/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.put('/profile', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { matKhau } = req.body;
        
        // Fetch current user details
        const [userRows] = await pool.query('SELECT NgayDoiMatKhau FROM nguoidung WHERE Id = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const currentUser = userRows[0];

        let updateQuery = 'UPDATE nguoidung SET ';
        const queryParams = [];
        const updates = [];

        if (matKhau) {
            // Password Validation (8 chars, 1 uppercase, 1 lowercase, 1 number)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
            if (!passwordRegex.test(matKhau)) {
                return res.status(400).json({ message: 'Mật khẩu yếu. Yêu cầu lớn hơn hoặc bằng 8 ký tự, có chứa chữ hoa, chữ thường và số.' });
            }

            // Check if 7 days have passed since last change
            if (currentUser.NgayDoiMatKhau) {
                const lastChange = new Date(currentUser.NgayDoiMatKhau);
                const now = new Date();
                const diffTime = Math.abs(now - lastChange);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                if (diffDays <= 7) {
                    return res.status(400).json({ message: `Bạn chỉ được đổi mật khẩu mỗi 7 ngày. Lần đổi gần nhất là ngày ${lastChange.toLocaleDateString('vi-VN')}` });
                }
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(matKhau, salt);
            updates.push('MatKhauHash = ?');
            queryParams.push(hashedPassword);
            
            updates.push('NgayDoiMatKhau = NOW()');
        }

        if (req.file) {
            updates.push('AnhDaiDienUrl = ?');
            queryParams.push('/uploads/avatar/' + req.file.filename);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No data to update' });
        }

        updateQuery += updates.join(', ') + ' WHERE Id = ?';
        queryParams.push(userId);

        await pool.query(updateQuery, queryParams);

        // Fetch updated user info
        const [users] = await pool.query('SELECT Id, TenDangNhap, Email, AnhDaiDienUrl FROM nguoidung WHERE Id = ?', [userId]);

        res.json({ message: 'Cập nhật thành công', user: users[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

export default router;