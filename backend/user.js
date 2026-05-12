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
        let updateQuery = 'UPDATE nguoidung SET ';
        const queryParams = [];
        const updates = [];

        if (matKhau) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(matKhau, salt);
            updates.push('MatKhauHash = ?');
            queryParams.push(hashedPassword);
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