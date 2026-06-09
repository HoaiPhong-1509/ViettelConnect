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

let ensureProfileCooldownColumnPromise = null;

const ensureProfileCooldownColumn = async () => {
    if (!ensureProfileCooldownColumnPromise) {
        ensureProfileCooldownColumnPromise = (async () => {
            const [columns] = await pool.query(
                `SELECT COUNT(*) AS total
                 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = 'nguoidung'
                   AND COLUMN_NAME = 'NgayDoiTen'`
            );

            if (!columns[0]?.total) {
                await pool.query('ALTER TABLE nguoidung ADD COLUMN NgayDoiTen datetime DEFAULT NULL AFTER TenDangNhap');
            }
        })();
    }

    return ensureProfileCooldownColumnPromise;
};

router.put('/profile', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { matKhau, tenDangNhap } = req.body;

        await ensureProfileCooldownColumn();
        
        // Fetch current user details
        const [userRows] = await pool.query('SELECT TenDangNhap, NgayDoiTen, NgayDoiMatKhau FROM nguoidung WHERE Id = ?', [userId]);
        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const currentUser = userRows[0];

        let updateQuery = 'UPDATE nguoidung SET ';
        const queryParams = [];
        const updates = [];

        if (tenDangNhap !== undefined) {
            const normalizedTenDangNhap = String(tenDangNhap).trim();

            if (normalizedTenDangNhap.length < 3) {
                return res.status(400).json({ message: 'Tên tài khoản phải chứa ít nhất 3 ký tự.' });
            }

            if (normalizedTenDangNhap !== currentUser.TenDangNhap) {
                if (currentUser.NgayDoiTen) {
                    const lastChange = new Date(currentUser.NgayDoiTen);
                    const cooldownMs = 3 * 24 * 60 * 60 * 1000;

                    if (Date.now() - lastChange.getTime() < cooldownMs) {
                        return res.status(400).json({ message: `Bạn chỉ được đổi tên tài khoản mỗi 3 ngày. Lần đổi gần nhất là ngày ${lastChange.toLocaleDateString('vi-VN')}` });
                    }
                }

                const [existingUsers] = await pool.query(
                    'SELECT Id FROM nguoidung WHERE TenDangNhap = ? AND Id <> ? LIMIT 1',
                    [normalizedTenDangNhap, userId]
                );

                if (existingUsers.length > 0) {
                    return res.status(409).json({ message: 'Tên tài khoản này đã được sử dụng.' });
                }

                updates.push('TenDangNhap = ?');
                queryParams.push(normalizedTenDangNhap);
                updates.push('NgayDoiTen = NOW()');
            }
        }

        if (matKhau) {
            // Password Validation (8 chars, 1 uppercase, 1 lowercase, 1 number)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
            if (!passwordRegex.test(matKhau)) {
                return res.status(400).json({ message: 'Mật khẩu yếu. Yêu cầu lớn hơn hoặc bằng 8 ký tự, có chứa chữ hoa, chữ thường và số.' });
            }

            // Check if 7 days have passed since last password change
            if (currentUser.NgayDoiMatKhau) {
                const lastChange = new Date(currentUser.NgayDoiMatKhau);
                const cooldownMs = 7 * 24 * 60 * 60 * 1000;

                if (Date.now() - lastChange.getTime() < cooldownMs) {
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
        const [users] = await pool.query('SELECT Id, TenDangNhap, Email, AnhDaiDienKey, AnhDaiDienUrl, NgayTao FROM nguoidung WHERE Id = ?', [userId]);
        const updatedUser = users[0];
        
        if (!avatarUrl && updatedUser.AnhDaiDienKey) {
            avatarUrl = await getPresignedUrl(updatedUser.AnhDaiDienKey);
        } else if (!avatarUrl) {
            avatarUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }
        updatedUser.AnhDaiDienUrl = avatarUrl; // map lại cho đồng bộ

        res.json({
            message: 'Cập nhật thành công',
            user: {
                id: updatedUser.Id,
                tenDangNhap: updatedUser.TenDangNhap,
                email: updatedUser.Email,
                avatar: updatedUser.AnhDaiDienUrl,
                createdAt: updatedUser.NgayTao,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Simple user search endpoint used by frontend autocomplete
router.get('/search', verifyToken, async (req, res) => {
    try {
        const q = (req.query.q || '').toString().trim();
        if (!q) return res.json({ users: [] });

        const like = `%${q}%`;
        const [rows] = await pool.query(
            `SELECT Id, TenDangNhap, Email, AnhDaiDienKey, AnhDaiDienUrl
             FROM nguoidung
             WHERE TenDangNhap LIKE ? OR Email LIKE ?
             LIMIT 12`,
            [like, like]
        );

        const users = await Promise.all(rows.map(async (r) => {
            let avatarUrl = r.AnhDaiDienUrl || null;
            try {
                if (!avatarUrl) {
                    if (r.AnhDaiDienKey) avatarUrl = await getPresignedUrl(r.AnhDaiDienKey);
                    else avatarUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
                }
            } catch (e) {
                avatarUrl = null;
            }

            return {
                id: r.Id,
                tenDangNhap: r.TenDangNhap,
                email: r.Email,
                avatar: avatarUrl,
            };
        }));

        res.json({ users });
    } catch (err) {
        console.error('User search error', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

export default router;