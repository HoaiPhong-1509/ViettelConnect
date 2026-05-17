import express from 'express';
import pool from './db.js';
import { verifyToken } from './middleware/authMiddleware.js';

const router = express.Router();

// Lấy danh sách bài viết trên trang Feed (sắp xếp độ ưu tiên theo chức vụ, sau đó tính theo thời gian tạo mới nhất)
router.get('/', verifyToken, async (req, res) => {
    try {
        const query = `
            SELECT b.*, n.TenDangNhap, n.AnhDaiDienUrl, 
                   IFNULL(MAX(v.DoUuTien), 0) as MaxUuTien
            FROM baidang b
            JOIN nguoidung n ON b.NguoiDungId = n.Id
            LEFT JOIN nguoidung_vaitro nv ON n.Id = nv.NguoiDungId
            LEFT JOIN vaitro v ON nv.VaiTroId = v.Id
            WHERE b.DaXoa = 0 AND n.TrangThai = 'HoatDong'
            GROUP BY b.Id
            ORDER BY MaxUuTien DESC, b.NgayTao DESC
            LIMIT 50
        `;
        const [posts] = await pool.query(query);
        res.json(posts);
    } catch (err) {
        console.error('Lỗi khi lấy feed:', err);
        res.status(500).json({ message: 'Lỗi server khi lấy bài viết' });
    }
});

// Đăng bài viết mới
router.post('/', verifyToken, async (req, res) => {
    const { noiDung, anhUrl } = req.body;
    
    if (!noiDung || !noiDung.trim()) {
        return res.status(400).json({ message: 'Nội dung bài viết không được để trống' });
    }

    try {
        const userId = req.user.id;
        const insertQuery = `INSERT INTO baidang (NguoiDungId, NoiDung, AnhUrl) VALUES (?, ?, ?)`;
        const [result] = await pool.query(insertQuery, [userId, noiDung.trim(), anhUrl || null]);
        
        // Trả về dữ liệu bài post vừa tạo để hiển thị ngay trên UI
        const [newPost] = await pool.query(`
            SELECT b.*, n.TenDangNhap, n.AnhDaiDienUrl 
            FROM baidang b 
            JOIN nguoidung n ON b.NguoiDungId = n.Id 
            WHERE b.Id = ?
        `, [result.insertId]);

        // Gán MaxUuTien tĩnh dựa vào query user nếu muốn đầy đủ, 
        // nhưng với frontend trả về thế này đủ để unshift lên đầu mảng posts hiện tại.
        res.status(201).json(newPost[0]);
    } catch (err) {
        console.error('Lỗi khi đăng bài:', err);
        res.status(500).json({ message: 'Lỗi server khi đăng bài' });
    }
});

export default router;