import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { body, validationResult } from 'express-validator';
import { sendOTPEmail } from './mailer.js';

const router = express.Router();

// Bộ nhớ tạm lưu trữ OTP (Sử dụng Map: email -> { otp, expiry })
const otpStore = new Map();

// API: Yêu cầu gửi mã OTP để đăng ký
router.post('/send-otp', [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;
    try {
        // Kiểm tra xem email đã được đăng ký chưa
        const [existingUser] = await pool.query('SELECT Id FROM nguoidung WHERE Email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email này đã được sử dụng!' });
        }

        // Tạo mã OTP 6 chữ số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Lưu vào bộ nhớ tạm (Hết hạn sau 5 phút)
        otpStore.set(email, {
            otp,
            expiry: Date.now() + 5 * 60 * 1000 // 5 phút
        });

        // Tự động xóa khỏi bộ nhớ sau 5 phút
        setTimeout(() => {
            if (otpStore.has(email) && otpStore.get(email).otp === otp) {
                otpStore.delete(email);
            }
        }, 5 * 60 * 1000);

        // Gửi email
        await sendOTPEmail(email, otp);

        res.json({ message: 'Đã gửi mã OTP đến email của bạn. Mã có hiệu lực 5 phút.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi gửi mã xác thực' });
    }
});

// LỚP BẢO MẬT 5: Input Validation cho API Đăng ký
router.post('/register', [
    body('email').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),
    body('tenDangNhap').isLength({ min: 3 }).withMessage('Tên đăng nhập phải chứa ít nhất 3 ký tự').trim().escape(),
    body('matKhau').isLength({ min: 6 }).withMessage('Mật khẩu phải chứa ít nhất 6 ký tự'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('Mã OTP phải gồm 6 chữ số')
], async (req, res) => {
    // Kiểm tra xem Validation có bắt được lỗi nào không
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { tenDangNhap, email, matKhau, otp } = req.body;
    try {
        // Kiểm tra OTP
        const storedOTPData = otpStore.get(email);
        if (!storedOTPData) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }
        if (storedOTPData.otp !== otp) {
            return res.status(400).json({ message: 'Mã OTP không khớp, vui lòng thử lại.' });
        }

        const [existingUser] = await pool.query('SELECT * FROM nguoidung WHERE Email = ? OR TenDangNhap = ?', [email, tenDangNhap]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email hoặc Tên đăng nhập đã tồn tại' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(matKhau, salt);

        const [result] = await pool.query(
            'INSERT INTO nguoidung (TenDangNhap, Email, MatKhauHash, TrangThai) VALUES (?, ?, ?, "ChoDuyet")',
            [tenDangNhap, email, hashedPassword]
        );
        const newUserId = result.insertId;

        await pool.query('INSERT INTO nguoidung_vaitro (NguoiDungId, VaiTroId) VALUES (?, ?)', [newUserId, 4]);

        // Đăng ký thành công thì xóa OTP
        otpStore.delete(email);

        res.status(201).json({ message: 'Xác thực & Đăng ký thành công. Vui lòng chờ admin duyệt!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// LỚP BẢO MẬT 5: Input Validation cho API Đăng nhập
router.post('/login', [
    body('tenDangNhap').notEmpty().withMessage('Tên đăng nhập không được bỏ trống').trim().escape(),
    body('matKhau').notEmpty().withMessage('Mật khẩu không được bỏ trống')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { tenDangNhap, matKhau } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM nguoidung WHERE TenDangNhap = ?', [tenDangNhap]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }
        
        const user = users[0];

        const validPassword = await bcrypt.compare(matKhau, user.MatKhauHash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }

        if (user.TrangThai === 'ChoDuyet') {
            return res.status(403).json({ message: 'Tài khoản của bạn đang chờ Admin duyệt.' });
        }
        if (user.TrangThai !== 'HoatDong') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa hoặc từ chối.' });
        }

        const [roles] = await pool.query(`
            SELECT v.TenVaiTro 
            FROM vaitro v 
            JOIN nguoidung_vaitro nv ON v.Id = nv.VaiTroId 
            WHERE nv.NguoiDungId = ?
        `, [user.Id]);
        const userRoles = roles.map(r => r.TenVaiTro);

        const token = jwt.sign(
            { id: user.Id, roles: userRoles }, 
            process.env.JWT_SECRET || 'secret_key_tam_thoi', 
            { expiresIn: '1d' }
        );

        // LỚP BẢO MẬT 6: Trả Token dạng HttpOnly Cookie thay vì trả về res.json
        res.cookie('token', token, {
            httpOnly: true, // Javascript Frontend không thể đọc được
            secure: process.env.NODE_ENV === 'production', // Nếu lên server thật (HTTPS) thì mới gửi Cookie này
            sameSite: 'strict', // Ngăn chặn CSRF
            maxAge: 24 * 60 * 60 * 1000 // 1 ngày
        });

        // Không gửi Token về nữa, chỉ gửi tin báo và info user
        res.json({ message: 'Đăng nhập thành công', user: { id: user.Id, tenDangNhap: user.TenDangNhap, email: user.Email, roles: userRoles, avatar: user.AnhDaiDienUrl } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API Đăng xuất (xóa Cookie)
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Đăng xuất thành công' });
});

export default router;