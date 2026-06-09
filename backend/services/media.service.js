import sharp from 'sharp';
import crypto from 'crypto';
import pool from '../db.js';
import { uploadToMinio } from './minio.service.js';

export const processAndUploadMedia = async (userId, files) => {
    const mediaIds = [];
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Chèn theo từng file để lấy order (thứ tự) tương ứng
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uuid = crypto.randomUUID();
        const isVideo = file.mimetype.startsWith('video/');

        if (isVideo) {
            const ext = file.originalname.split('.').pop() || 'mp4';
            const storageKey = `uploads/${userId}/${year}/${month}/${uuid}.${ext}`;
            const thumbnailKey = null;

            // Upload video trực tiếp (không dùng sharp)
            await uploadToMinio(storageKey, file.buffer, file.mimetype);

            // Lưu vào database
            const [result] = await pool.query(
                `INSERT INTO media 
                (NguoiDungId, LoaiMedia, StorageKey, ThumbnailKey, TenGoc, DinhDang, KichThuocBytes, ThuTu, TrangThai)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, 'VideoBaiDang', storageKey, thumbnailKey, file.originalname, ext, file.size, i, 'HoanThanh']
            );
            mediaIds.push(result.insertId);
        } else {
            // Xử lý ảnh gốc: resize tối đa 1920x1920 giữ tỉ lệ (tránh spam ảnh quá dài hoặc quá rộng)
            const processedImageBuffer = await sharp(file.buffer)
                .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();

            // Lấy metadata dimensions sau xử lý
            const metadata = await sharp(processedImageBuffer).metadata();

            // Xử lý thumbnail: crop center 300x300, convert WebP
            const thumbnailBuffer = await sharp(file.buffer)
                .resize(300, 300, { fit: sharp.fit.cover, position: sharp.strategy.center })
                .webp({ quality: 70 })
                .toBuffer();

            // Storage keys
            const storageKey = `uploads/${userId}/${year}/${month}/${uuid}.webp`;
            const thumbnailKey = `thumbs/${userId}/${year}/${month}/${uuid}_thumb.webp`;

            // Upload lên Minio
            await Promise.all([
                uploadToMinio(storageKey, processedImageBuffer, 'image/webp'),
                uploadToMinio(thumbnailKey, thumbnailBuffer, 'image/webp')
            ]);

            // Tính kích thước
            const sizeBytes = processedImageBuffer.length;

            // Lưu vào database
            const [result] = await pool.query(
                `INSERT INTO media 
                (NguoiDungId, LoaiMedia, StorageKey, ThumbnailKey, TenGoc, DinhDang, KichThuocBytes, ChieuRong, ChieuCao, ThuTu, TrangThai)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, 'AnhBaiDang', storageKey, thumbnailKey, file.originalname, 'webp', sizeBytes, metadata.width, metadata.height, i, 'HoanThanh']
            );

            mediaIds.push(result.insertId);
        }
    }

    return mediaIds;
};