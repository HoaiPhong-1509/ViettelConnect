import pool from '../../db.js';

const getExecutor = (connection) => connection || pool;

const FEED_BASE_SELECT = `
    SELECT
        b.Id,
        b.NguoiDungId,
        b.NoiDung,
        b.NgayTao,
        b.NgayCapNhat,
        b.SoLuotThich,
        b.SoBinhLuan,
        b.DiemFeed,
        b.NgayTangTuongTacCuoi,
        b.TrangThai,
        n.TenDangNhap,
        n.Email,
        n.AnhDaiDienUrl,
        n.AnhDaiDienKey,
        n.TrangThai AS NguoiDungTrangThai,
        COALESCE(roleAgg.VaiTroTen, 'NhanVien') AS VaiTroTen,
        COALESCE(roleAgg.DoUuTien, 0) AS RolePriority,
        CASE WHEN likedByUser.NguoiDungId IS NULL THEN 0 ELSE 1 END AS IsLiked,
        (
            (COALESCE(roleAgg.DoUuTien, 0) * 5)
            + (b.SoLuotThich * 2)
            + (b.SoBinhLuan * 4)
            - ((TIMESTAMPDIFF(MINUTE, b.NgayTao, NOW()) / 60.0) * 1.5)
        ) AS ComputedDiemFeed
    FROM baidang b
    INNER JOIN nguoidung n ON n.Id = b.NguoiDungId
    LEFT JOIN (
        SELECT
            nv.NguoiDungId,
            MAX(v.DoUuTien) AS DoUuTien,
            SUBSTRING_INDEX(
                GROUP_CONCAT(v.TenVaiTro ORDER BY v.DoUuTien DESC, v.Id ASC SEPARATOR ','),
                ',',
                1
            ) AS VaiTroTen
        FROM nguoidung_vaitro nv
        INNER JOIN vaitro v ON v.Id = nv.VaiTroId
        GROUP BY nv.NguoiDungId
    ) roleAgg ON roleAgg.NguoiDungId = b.NguoiDungId
    LEFT JOIN luotthich likedByUser ON likedByUser.BaiDangId = b.Id AND likedByUser.NguoiDungId = ?
    WHERE b.DaXoa = 0 AND b.TrangThai = 'DaDuyet'
`;

export const fetchFeedRows = async (userId, limit, offset, connection = null) => {
    const executor = getExecutor(connection);
    const [rows] = await executor.query(
        `${FEED_BASE_SELECT}
         ORDER BY ComputedDiemFeed DESC, b.NgayTao DESC, b.Id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );

    return rows;
};

export const fetchFeedRowById = async (userId, postId, connection = null) => {
    const executor = getExecutor(connection);
    const [rows] = await executor.query(
        `${FEED_BASE_SELECT}
         AND b.Id = ?
         LIMIT 1`,
        [userId, postId]
    );

    return rows[0] || null;
};

export const fetchFeedScoreSourceById = async (postId, connection = null) => {
    const executor = getExecutor(connection);
    const [rows] = await executor.query(
        `SELECT
            b.Id,
            b.NgayTao,
            b.SoLuotThich,
            b.SoBinhLuan,
            COALESCE(roleAgg.DoUuTien, 0) AS rolePriority
         FROM baidang b
         LEFT JOIN (
            SELECT
                nv.NguoiDungId,
                MAX(v.DoUuTien) AS DoUuTien
            FROM nguoidung_vaitro nv
            INNER JOIN vaitro v ON v.Id = nv.VaiTroId
            GROUP BY nv.NguoiDungId
         ) roleAgg ON roleAgg.NguoiDungId = b.NguoiDungId
         WHERE b.Id = ? AND b.DaXoa = 0
         LIMIT 1`,
        [postId]
    );

    return rows[0] || null;
};

export const persistFeedScore = async (postId, score, connection = null) => {
    const executor = getExecutor(connection);
    const [result] = await executor.query(
        `UPDATE baidang
         SET DiemFeed = ?, NgayTangTuongTacCuoi = NOW()
         WHERE Id = ? AND DaXoa = 0`,
        [score, postId]
    );

    return result.affectedRows > 0;
};
