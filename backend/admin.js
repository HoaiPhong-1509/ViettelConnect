import express from 'express';
import pool from './db.js';
import { verifyToken, isAdmin } from './middleware/authMiddleware.js';
import { sendStatusEmail } from './mailer.js';
import * as adminPostController from './src/controllers/adminPost.controller.js';
import { getRecentActivityFeed } from './src/services/adminActivity.service.js';
import { getPresignedUrl } from './services/minio.service.js';

const router = express.Router();

router.use(verifyToken, isAdmin);

const hydrateUserAvatar = async (user) => {
    if (!user) {
        return null;
    }

    if (user.AnhDaiDienKey) {
        return {
            ...user,
            AnhDaiDienUrl: await getPresignedUrl(user.AnhDaiDienKey),
        };
    }

    if (user.AnhDaiDienUrl) {
        return user;
    }

    return {
        ...user,
        AnhDaiDienUrl: await getPresignedUrl('avatars/Default_Avatar.jpg'),
    };
};

const hydrateUserAvatars = async (rows) => Promise.all((rows || []).map(hydrateUserAvatar));

router.get('/team', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT nd.Id, nd.TenDangNhap, nd.Email, nd.TrangThai, nd.NgayTao, nd.AnhDaiDienUrl, nd.AnhDaiDienKey, v.TenVaiTro, nv.VaiTroId
            FROM nguoidung nd
            INNER JOIN nguoidung_vaitro nv ON nd.Id = nv.NguoiDungId
            INNER JOIN vaitro v ON nv.VaiTroId = v.Id
            WHERE nd.DaXoa = 0 AND v.TenVaiTro = 'Admin'
            ORDER BY nd.Id DESC
        `);

        res.json(await hydrateUserAvatars(rows));
    } catch (err) {
        console.error('Lỗi khi lấy danh sách admin team:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 1. API: Lấy DS chờ duyệt
router.get('/nguoidung/pending', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT Id, TenDangNhap, Email, NgayTao, AnhDaiDienUrl, AnhDaiDienKey FROM nguoidung WHERE TrangThai = "ChoDuyet" AND DaXoa = 0');
        res.json(await hydrateUserAvatars(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API: Lấy tất cả người dùng
router.get('/nguoidung', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT nd.Id, nd.TenDangNhap, nd.Email, nd.TrangThai, nd.NgayTao, nd.AnhDaiDienUrl, nd.AnhDaiDienKey, v.TenVaiTro, nv.VaiTroId 
            FROM nguoidung nd 
            LEFT JOIN nguoidung_vaitro nv ON nd.Id = nv.NguoiDungId
            LEFT JOIN vaitro v ON nv.VaiTroId = v.Id
            WHERE nd.DaXoa = 0 ORDER BY nd.Id DESC
        `);
        res.json(await hydrateUserAvatars(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API: Lấy counts cho bảng người dùng (pending/all)
router.get('/nguoidung/counts', async (req, res) => {
    try {
        const [[{ pending }]] = await pool.query('SELECT COUNT(*) AS pending FROM nguoidung WHERE TrangThai = "ChoDuyet" AND DaXoa = 0');
        const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM nguoidung WHERE DaXoa = 0');
        res.json({ pending: Number(pending || 0), all: Number(total || 0) });
    } catch (err) {
        console.error('Lỗi khi lấy counts người dùng:', err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 2. API: Duyệt tài khoản
router.put('/nguoidung/:id/approve', async (req, res) => {
    const userId = req.params.id;
    const adminId = req.user.id; 
    
    try {
        const [result] = await pool.query(
            'UPDATE nguoidung SET TrangThai = "HoatDong", NguoiDuyetId = ?, NgayDuyet = NOW() WHERE Id = ? AND TrangThai = "ChoDuyet"',
            [adminId, userId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản hoặc không ở trạng thái Chờ duyệt.' });
        }
        
        // Lấy thông tin email để gửi thông báo
        const [users] = await pool.query('SELECT Email FROM nguoidung WHERE Id = ?', [userId]);
        if (users.length > 0 && users[0].Email) {
            await sendStatusEmail(users[0].Email, 'HoatDong');
        }
        
        res.json({ message: 'Đã duyệt tài khoản thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 3. API: Cấp vai trò
router.put('/nguoidung/:id/role', async (req, res) => {
    const userId = req.params.id;
    const { vaiTroId } = req.body; 

    try {
        const [roles] = await pool.query('SELECT * FROM vaitro WHERE Id = ?', [vaiTroId]);
        if (roles.length === 0) {
            return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
        }

        await pool.query('DELETE FROM nguoidung_vaitro WHERE NguoiDungId = ?', [userId]);
        await pool.query('INSERT INTO nguoidung_vaitro (NguoiDungId, VaiTroId) VALUES (?, ?)', [userId, vaiTroId]);
        
        res.json({ message: 'Cấp vai trò mới thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 4. API: Cập nhật thông tin (Email, trạng thái) 
router.put('/nguoidung/:id', async (req, res) => {
    const userId = req.params.id;
    const { email, trangThai, lyDo } = req.body;
    
    try {
        // Kiểm tra xem email có bị trùng lặp ở user khác không
        if (email) {
            const [exist] = await pool.query('SELECT Id FROM nguoidung WHERE Email = ? AND Id != ? AND DaXoa = 0', [email, userId]);
            if (exist.length > 0) {
                return res.status(400).json({ message: 'Email này đã được sử dụng bởi người dùng khác.' });
            }
        }

        // Lấy thông tin trạng thái cũ để kiểm tra xem có thay đổi trạng thái không
        const [oldUsers] = await pool.query('SELECT Email, TrangThai FROM nguoidung WHERE Id = ?', [userId]);

        await pool.query(
            'UPDATE nguoidung SET Email = COALESCE(?, Email), TrangThai = COALESCE(?, TrangThai) WHERE Id = ?',
            [email, trangThai, userId]
        );

        // Nếu trạng thái bị thay đổi, gửi email thông báo
        if (oldUsers.length > 0 && trangThai && oldUsers[0].TrangThai !== trangThai) {
            const userEmail = email || oldUsers[0].Email;
            if (userEmail) {
                await sendStatusEmail(userEmail, trangThai, lyDo);
            }
        }

        res.json({ message: 'Cập nhật thông tin thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 5. API: Xóa (mềm) tài khoản
router.delete('/nguoidung/:id', async (req, res) => {
    const userId = req.params.id;
    const currentAdminId = req.user.id;

    try {
        // 1. Không cho phép tự xóa chính mình
        if (userId == currentAdminId) {
            return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình.' });
        }

        // 2. Bảo vệ tuyệt đối tài khoản Root Admin (Id = 1)
        if (userId == 1) {
            return res.status(403).json({ message: 'Không thể xóa tài khoản Root Admin gốc của hệ thống.' });
        }

        // 3. Xử lý logic xóa Admin khác: Chỉ Root Admin (Id = 1) mới được quyền xóa các Admin khác
        if (currentAdminId != 1) {
            const [targetRoles] = await pool.query('SELECT VaiTroId FROM nguoidung_vaitro WHERE NguoiDungId = ?', [userId]);
            const isTargetAdmin = targetRoles.some(r => r.VaiTroId === 1);
            
            if (isTargetAdmin) {
                return res.status(403).json({ message: 'Chỉ Root Admin mới có quyền xóa tài khoản Quản trị viên (Admin) khác.' });
            }
        }

        await pool.query('UPDATE nguoidung SET DaXoa = 1 WHERE Id = ?', [userId]);
        res.json({ message: 'Đã xóa người dùng thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// 6. API: Quản lý bài viết
router.get('/posts/summary', adminPostController.getDashboardSummary);
router.get('/posts', adminPostController.listPosts);
router.get('/posts/:id', adminPostController.getPostDetail);
router.put('/posts/:id/approve', adminPostController.approvePost);
router.put('/posts/:id/hide', adminPostController.hidePost);
router.delete('/posts/:id', adminPostController.deletePost);

router.get('/activity/recent', async (req, res) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 6;
        const activity = await getRecentActivityFeed({ limit });
        res.json({ success: true, data: activity });
    } catch (err) {
        console.error('Lỗi khi lấy activity feed dashboard:', err);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
});

export default router;