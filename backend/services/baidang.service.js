import pool from '../db.js';
import { getPresignedUrl } from './minio.service.js';
import * as feedService from '../src/services/feed.service.js';

export const createPost = async (userId, content, mediaIds) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Tạo bài đăng mới
        const [postResult] = await connection.query(
            `INSERT INTO baidang (NguoiDungId, NoiDung, DaXoa, TrangThai) VALUES (?, ?, 0, 'ChoDuyet')`,
            [userId, content]
        );
        const postId = postResult.insertId;

        // 2. Cập nhật mediaId nếu có
        if (mediaIds && mediaIds.length > 0) {
            await connection.query(
                `UPDATE media SET BaiDangId = ? WHERE Id IN (?) AND NguoiDungId = ? AND DaXoa = 0`,
                [postId, mediaIds, userId]
            );
        }

        await feedService.updateFeedScore(postId, connection);

        await connection.commit();
        return {
            postId,
            post: {
                Id: postId,
                NguoiDungId: userId,
                NoiDung: content,
                TrangThai: 'ChoDuyet',
                SoLuotThich: 0,
                SoBinhLuan: 0,
                IsLiked: false,
                Media: [],
            },
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const getFeed = async (userId, limit = 10, offset = 0) => {
    return feedService.getFeed(userId, limit, offset);
};

export const getPostDetail = async (userId, postId) => {
    const [posts] = await pool.query(
        `SELECT b.Id, b.NoiDung, b.NgayTao, b.SoLuotThich, b.SoBinhLuan, 
          n.Id AS NguoiDungId, n.TenDangNhap, n.AnhDaiDienKey, n.AnhDaiDienUrl,
          IFNULL(ur.VaiTroTen, 'NhanVien') AS VaiTroTen,
          IFNULL(ur.DoUuTien, 0) AS VaiTroDoUuTien,
                (SELECT COUNT(*) FROM luotthich lt WHERE lt.BaiDangId = b.Id AND lt.NguoiDungId = ?) AS IsLiked
         FROM baidang b
         JOIN nguoidung n ON b.NguoiDungId = n.Id
      LEFT JOIN (
         SELECT nv.NguoiDungId,
             MAX(v.DoUuTien) AS DoUuTien,
             SUBSTRING_INDEX(GROUP_CONCAT(v.TenVaiTro ORDER BY v.DoUuTien DESC, v.Id ASC SEPARATOR ','), ',', 1) AS VaiTroTen
         FROM nguoidung_vaitro nv
         JOIN vaitro v ON v.Id = nv.VaiTroId
         GROUP BY nv.NguoiDungId
      ) ur ON ur.NguoiDungId = n.Id
         WHERE b.Id = ? AND b.DaXoa = 0 AND b.TrangThai = 'DaDuyet'`,
        [userId, postId]
    );

    if (posts.length === 0) return null;
    const post = posts[0];
    post.IsLiked = post.IsLiked > 0;

    if (post.AnhDaiDienKey) {
        post.AnhDaiDienUrl = await getPresignedUrl(post.AnhDaiDienKey);
    } else {
        post.AnhDaiDienUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
    }

    // Media
    const [mediaList] = await pool.query(
        `SELECT Id, StorageKey, ThumbnailKey, ThuTu, KichThuocBytes, ChieuRong, ChieuCao, LoaiMedia 
         FROM media 
         WHERE BaiDangId = ? AND DaXoa = 0 
         ORDER BY ThuTu ASC`,
        [postId]
    );

    post.Media = await Promise.all(mediaList.map(async (m) => ({
        Id: m.Id,
        ThuTu: m.ThuTu,
        Url: await getPresignedUrl(m.StorageKey),
        ThumbnailUrl: m.ThumbnailKey ? await getPresignedUrl(m.ThumbnailKey) : null,
        ChieuRong: m.ChieuRong,
        ChieuCao: m.ChieuCao,
        LoaiMedia: m.LoaiMedia
    })));

    return post;
};

export const reportPost = async (userId, postId, reason) => {
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
        throw new Error('EMPTY_REPORT_REASON');
    }

    const [postRows] = await pool.query(
        `SELECT Id, NguoiDungId, TrangThai, DaXoa FROM baidang WHERE Id = ? LIMIT 1`,
        [postId]
    );

    if (postRows.length === 0 || postRows[0].DaXoa === 1) {
        throw new Error('POST_NOT_FOUND');
    }

    if (String(postRows[0].NguoiDungId) === String(userId)) {
        throw new Error('SELF_REPORT_NOT_ALLOWED');
    }

    const [insertResult] = await pool.query(
        `INSERT INTO baidang_baocao (BaiDangId, NguoiBaoCaoId, LyDo)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE LyDo = VALUES(LyDo), TrangThai = 'ChoXuLy', NgayTao = CURRENT_TIMESTAMP, NguoiXuLyId = NULL, NgayXuLy = NULL, GhiChuXuLy = NULL`,
        [postId, userId, trimmedReason]
    );

    return {
        reportId: insertResult.insertId || null,
        postId,
        reason: trimmedReason,
    };
};

export const deletePost = async (userId, postId) => {
    const [result] = await pool.query(
        `UPDATE baidang SET DaXoa = 1 WHERE Id = ? AND NguoiDungId = ? AND DaXoa = 0`,
        [postId, userId]
    );
    return result.affectedRows > 0;
};

export const likePost = async (userId, postId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [insertResult] = await connection.query(
            `INSERT IGNORE INTO luotthich (NguoiDungId, BaiDangId) VALUES (?, ?)`,
            [userId, postId]
        );

        if (insertResult.affectedRows > 0) {
            await connection.query(
                `UPDATE baidang SET SoLuotThich = SoLuotThich + 1 WHERE Id = ? AND DaXoa = 0`,
                [postId]
            );
            await feedService.updateFeedScore(postId, connection);
        }

        await connection.commit();
        return insertResult.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const unlikePost = async (userId, postId) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [deleteResult] = await connection.query(
            `DELETE FROM luotthich WHERE NguoiDungId = ? AND BaiDangId = ?`,
            [userId, postId]
        );

        if (deleteResult.affectedRows > 0) {
            await connection.query(
                `UPDATE baidang SET SoLuotThich = SoLuotThich - 1 WHERE Id = ? AND SoLuotThich > 0 AND DaXoa = 0`,
                [postId]
            );
            await feedService.updateFeedScore(postId, connection);
        }

        await connection.commit();
        return deleteResult.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const getLikes = async (postId, limit = 20, offset = 0) => {
    const [users] = await pool.query(
        `SELECT n.Id, n.TenDangNhap, n.AnhDaiDienKey, n.AnhDaiDienUrl
         FROM luotthich lt
         JOIN nguoidung n ON lt.NguoiDungId = n.Id
         WHERE lt.BaiDangId = ?
         ORDER BY lt.NgayTao DESC
         LIMIT ? OFFSET ?`,
        [postId, limit, offset]
    );

    for (const user of users) {
        if (user.AnhDaiDienKey) {
            user.AnhDaiDienUrl = await getPresignedUrl(user.AnhDaiDienKey);
        } else {
            user.AnhDaiDienUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }
    }

    return users;
};

export const addComment = async (userId, postId, content, parentId = null) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Check xem bài đăng tồn tại không
        const [postExist] = await connection.query(`SELECT Id FROM baidang WHERE Id = ? AND DaXoa = 0`, [postId]);
        if (postExist.length === 0) throw new Error('POST_NOT_FOUND');

        const [result] = await connection.query(
            `INSERT INTO binhluan (BaiDangId, NguoiDungId, ParentId, NoiDung, DaXoa) VALUES (?, ?, ?, ?, 0)`,
            [postId, userId, parentId, content]
        );
        const commentId = result.insertId;

        await connection.query(
            `UPDATE baidang SET SoBinhLuan = SoBinhLuan + 1 WHERE Id = ?`,
            [postId]
        );

        await feedService.updateFeedScore(postId, connection);

        await connection.commit();
        return commentId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const getRootComments = async (postId, limit = 10, offset = 0) => {
    const [comments] = await pool.query(
        `SELECT c.Id, c.NoiDung, c.NgayTao, c.ParentId,
                n.Id AS NguoiDungId, n.TenDangNhap, n.AnhDaiDienKey, n.AnhDaiDienUrl,
                (SELECT COUNT(*) FROM binhluan r WHERE r.ParentId = c.Id AND r.DaXoa = 0) AS SoReply
         FROM binhluan c
         JOIN nguoidung n ON c.NguoiDungId = n.Id
         WHERE c.BaiDangId = ? AND c.ParentId IS NULL AND c.DaXoa = 0
         ORDER BY c.NgayTao ASC
         LIMIT ? OFFSET ?`,
        [postId, limit, offset]
    );

    for (const c of comments) {
        if (c.AnhDaiDienKey) {
            c.AnhDaiDienUrl = await getPresignedUrl(c.AnhDaiDienKey);
        } else {
            c.AnhDaiDienUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }
    }

    return comments;
};

export const getReplies = async (commentId, limit = 10, offset = 0) => {
    const [replies] = await pool.query(
        `SELECT c.Id, c.NoiDung, c.NgayTao, c.ParentId,
                n.Id AS NguoiDungId, n.TenDangNhap, n.AnhDaiDienKey, n.AnhDaiDienUrl
         FROM binhluan c
         JOIN nguoidung n ON c.NguoiDungId = n.Id
         WHERE c.ParentId = ? AND c.DaXoa = 0
         ORDER BY c.NgayTao ASC
         LIMIT ? OFFSET ?`,
        [commentId, limit, offset]
    );

    for (const r of replies) {
        if (r.AnhDaiDienKey) {
            r.AnhDaiDienUrl = await getPresignedUrl(r.AnhDaiDienKey);
        } else {
            r.AnhDaiDienUrl = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }
    }

    return replies;
};