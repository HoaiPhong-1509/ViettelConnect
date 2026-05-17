import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import pool from './db.js';
import { verifyToken } from './middleware/authMiddleware.js';
import { uploadToMinio, getPresignedUrl } from './services/minio.service.js';

const router = express.Router();

const storage = multer.memoryStorage();
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

        let avatarUrl = null;
        if (req.file) {
            const uuid = crypto.randomUUID();
            const ext = path.extname(req.file.originalname) || '.jpg';
            const key = `avatars/${userId}-${uuid}${ext}`;
            
            await uploadToMinio(key, req.file.buffer, req.file.mimetype);
            
            updates.push('AnhDaiDienKey = ?');
            queryParams.push(key);
            
            // Xóa luôn AnhDaiDienUrl cũ vì ta xài Key rồi
            updates.push('AnhDaiDienUrl = NULL');
            
            // Render URL mới báo về Frontend
            avatarUrl = await getPresignedUrl(key);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No data to update' });
        }

        updateQuery += updates.join(', ') + ' WHERE Id = ?';
        queryParams.push(userId);

        await pool.query(updateQuery, queryParams);

        // Fetch updated user info
        const [users] = await pool.query('SELECT Id, TenDangNhap, Email, AnhDaiDienKey, AnhDaiDienUrl FROM nguoidung WHERE Id = ?', [userId]);
        const updatedUser = users[0];
        
        if (!avatarUrl && updatedUser.AnhDaiDienKey) {
            avatarUrl = await getPresignedUrl(updatedUser.AnhDaiDienKey);
        } else if (!avatarUrl) {
            avatarUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }
        updatedUser.AnhDaiDienUrl = avatarUrl; // map lại cho đồng bộ

        res.json({ message: 'Cập nhật thành công', user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

export default router;