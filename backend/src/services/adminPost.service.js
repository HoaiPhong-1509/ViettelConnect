import pool from '../../db.js';
import { getPresignedUrl } from '../../services/minio.service.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const getExecutor = (connection) => connection || pool;

const safePresignedUrl = async (key) => {
    if (!key) {
        return null;
    }

    try {
        return await getPresignedUrl(key);
    } catch (error) {
        console.error('Không thể tạo presigned URL:', key, error.message);
        return null;
    }
};

const parseLimit = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_LIMIT;
    }
    return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const parseOffset = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeDateFilter = (value) => {
    if (!value) {
        return null;
    }

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return null;
    }

    return dateValue;
};

const normalizeSearchQuery = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const extractSearchId = (value) => {
    const normalized = normalizeSearchQuery(value);
    if (!normalized) {
        return null;
    }

    const numeric = normalized.startsWith('#') ? normalized.slice(1).trim() : normalized;
    if (!/^\d+$/.test(numeric)) {
        return null;
    }

    const parsed = Number.parseInt(numeric, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const buildSearchClause = (search) => {
    const normalizedSearch = normalizeSearchQuery(search);

    if (!normalizedSearch) {
        return { clause: null, params: [] };
    }

    const keyword = `%${normalizedSearch}%`;
    const params = [keyword, keyword, keyword];

    const idValue = extractSearchId(normalizedSearch);
    if (idValue) {
        params.push(idValue, idValue, `%#${idValue}%`, `%${idValue}%`);
        return {
            clause: '(b.NoiDung LIKE ? OR n.TenDangNhap LIKE ? OR n.Email LIKE ? OR b.Id = ? OR CAST(b.Id AS CHAR) LIKE ? OR CONCAT(\'#\', b.Id) LIKE ? OR CONCAT(\'#\', CAST(b.Id AS CHAR)) LIKE ?)',
            params,
        };
    }

    return {
        clause: '(b.NoiDung LIKE ? OR n.TenDangNhap LIKE ? OR n.Email LIKE ?)',
        params,
    };
};

const buildWhereClause = ({ tab, search, fromDate, toDate }) => {
    const clauses = ['b.DaXoa = 0'];
    const params = [];

    if (tab === 'pending') {
        clauses.push("b.TrangThai = 'ChoDuyet'");
    } else if (tab === 'reported') {
        clauses.push('EXISTS (SELECT 1 FROM baidang_baocao bc WHERE bc.BaiDangId = b.Id)');
    } else if (tab === 'published') {
        clauses.push("b.TrangThai = 'DaDuyet'");
    }

    if (fromDate) {
        clauses.push('b.NgayTao >= ?');
        params.push(fromDate);
    }

    if (toDate) {
        clauses.push('b.NgayTao <= ?');
        params.push(toDate);
    }

    const searchClause = buildSearchClause(search);
    if (searchClause.clause) {
        clauses.push(searchClause.clause);
        params.push(...searchClause.params);
    }

    return { clauses, params };
};

// Build filter-only WHERE clause (without tab-specific filters) so we can
// compute aggregate counts that respect date/search filters but ignore the
// active tab selection.
const buildFilterOnlyClause = ({ search, fromDate, toDate }) => {
    const clauses = ['b.DaXoa = 0'];
    const params = [];

    if (fromDate) {
        clauses.push('b.NgayTao >= ?');
        params.push(fromDate);
    }

    if (toDate) {
        clauses.push('b.NgayTao <= ?');
        params.push(toDate);
    }

    const searchClause = buildSearchClause(search);
    if (searchClause.clause) {
        clauses.push(searchClause.clause);
        params.push(...searchClause.params);
    }

    return { clauses, params };
};

const hydrateAuthorAvatar = async (post) => {
    if (!post) {
        return null;
    }

    return {
        ...post,
        AnhDaiDienUrl: post.AnhDaiDienKey
            ? await safePresignedUrl(post.AnhDaiDienKey)
            : await safePresignedUrl('avatars/Default_Avatar.jpg'),
    };
};

const attachMediaToPosts = async (posts, connection = null) => {
    if (!posts.length) {
        return posts;
    }

    const executor = getExecutor(connection);
    const postIds = posts.map((post) => post.Id);
    const [mediaRows] = await executor.query(
        `SELECT Id, BaiDangId, StorageKey, ThumbnailKey, ThuTu, KichThuocBytes, ChieuRong, ChieuCao, LoaiMedia
         FROM media
         WHERE BaiDangId IN (?) AND DaXoa = 0
         ORDER BY BaiDangId ASC, ThuTu ASC, Id ASC`,
        [postIds]
    );

    const mediaByPostId = new Map();
    for (const mediaRow of mediaRows) {
        if (!mediaByPostId.has(mediaRow.BaiDangId)) {
            mediaByPostId.set(mediaRow.BaiDangId, []);
        }
        mediaByPostId.get(mediaRow.BaiDangId).push(mediaRow);
    }

    for (const post of posts) {
        const postMedia = mediaByPostId.get(post.Id) || [];
        post.Media = await Promise.all(postMedia.map(async (mediaRow) => ({
            Id: mediaRow.Id,
            ThuTu: mediaRow.ThuTu,
            Url: mediaRow.StorageKey ? await safePresignedUrl(mediaRow.StorageKey) : null,
            ThumbnailUrl: mediaRow.ThumbnailKey ? await safePresignedUrl(mediaRow.ThumbnailKey) : null,
            KichThuocBytes: mediaRow.KichThuocBytes ?? 0,
            ChieuRong: mediaRow.ChieuRong ?? null,
            ChieuCao: mediaRow.ChieuCao ?? null,
            LoaiMedia: mediaRow.LoaiMedia,
        })));
    }

    return posts;
};

const attachReportsToPosts = async (posts, connection = null) => {
    if (!posts.length) {
        return posts;
    }

    const executor = getExecutor(connection);
    const postIds = posts.map((post) => post.Id);
    const [reportRows] = await executor.query(
        `SELECT bc.Id, bc.BaiDangId, bc.NguoiBaoCaoId, bc.LyDo, bc.NgayTao,
                reporter.TenDangNhap, reporter.Email, reporter.AnhDaiDienKey, reporter.AnhDaiDienUrl
         FROM baidang_baocao bc
         INNER JOIN nguoidung reporter ON reporter.Id = bc.NguoiBaoCaoId
         WHERE bc.BaiDangId IN (?)
         ORDER BY bc.NgayTao DESC, bc.Id DESC`,
        [postIds]
    );

    const reportByPostId = new Map();
    for (const reportRow of reportRows) {
        if (!reportByPostId.has(reportRow.BaiDangId)) {
            reportByPostId.set(reportRow.BaiDangId, []);
        }
        reportByPostId.get(reportRow.BaiDangId).push({
            Id: reportRow.Id,
            BaiDangId: reportRow.BaiDangId,
            NguoiBaoCaoId: reportRow.NguoiBaoCaoId,
            LyDo: reportRow.LyDo,
            NgayTao: reportRow.NgayTao,
            TenDangNhap: reportRow.TenDangNhap,
            Email: reportRow.Email,
            AnhDaiDienKey: reportRow.AnhDaiDienKey,
            AnhDaiDienUrl: reportRow.AnhDaiDienUrl,
        });
    }

    for (const post of posts) {
        post.Reports = reportByPostId.get(post.Id) || [];
        post.ReportCount = post.Reports.length;
    }

    return posts;
};

export const listPosts = async ({ tab = 'all', search, from, to, limit = DEFAULT_LIMIT, offset = 0 }) => {
    const safeLimit = parseLimit(limit);
    const safeOffset = parseOffset(offset);
    const fromDate = normalizeDateFilter(from);
    const toDate = normalizeDateFilter(to);

    const { clauses, params } = buildWhereClause({ tab, search, fromDate, toDate });

    const [rows] = await pool.query(
        `SELECT
            b.Id,
            b.NguoiDungId,
            b.NoiDung,
            b.NgayTao,
            b.NgayCapNhat,
            b.TrangThai,
            b.SoLuotThich,
            b.SoBinhLuan,
            b.DiemFeed,
            b.DaXoa,
            n.TenDangNhap,
            n.Email,
            n.AnhDaiDienUrl,
            n.AnhDaiDienKey,
            COALESCE(reportAgg.ReportCount, 0) AS ReportCount,
            reportAgg.LatestReportedAt,
            reportAgg.LatestReporterName,
            reportAgg.LatestReportReason
         FROM baidang b
         INNER JOIN nguoidung n ON n.Id = b.NguoiDungId
         LEFT JOIN (
            SELECT
                bc.BaiDangId,
                COUNT(*) AS ReportCount,
                MAX(bc.NgayTao) AS LatestReportedAt,
                SUBSTRING_INDEX(GROUP_CONCAT(reporter.TenDangNhap ORDER BY bc.NgayTao DESC, bc.Id DESC SEPARATOR '||'), '||', 1) AS LatestReporterName,
                SUBSTRING_INDEX(GROUP_CONCAT(bc.LyDo ORDER BY bc.NgayTao DESC, bc.Id DESC SEPARATOR '||'), '||', 1) AS LatestReportReason
            FROM baidang_baocao bc
            INNER JOIN nguoidung reporter ON reporter.Id = bc.NguoiBaoCaoId
            GROUP BY bc.BaiDangId
         ) reportAgg ON reportAgg.BaiDangId = b.Id
         WHERE ${clauses.join(' AND ')}
         ORDER BY b.NgayTao DESC, b.Id DESC
         LIMIT ? OFFSET ?`,
        [...params, safeLimit, safeOffset]
    );

    const posts = [];
    for (const row of rows) {
        posts.push(await hydrateAuthorAvatar(row));
    }

    const hydratedPosts = await attachMediaToPosts(posts);

    // Compute aggregate counts (respecting filters search/from/to but ignoring the tab)
    const { clauses: filterClauses, params: filterParams } = buildFilterOnlyClause({ search, fromDate, toDate });
    const whereFilterSql = filterClauses.join(' AND ');

    const [[pendingRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM baidang b INNER JOIN nguoidung n ON n.Id = b.NguoiDungId WHERE ${whereFilterSql} AND b.TrangThai = 'ChoDuyet'`,
        [...filterParams]
    );

    const [[allRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM baidang b INNER JOIN nguoidung n ON n.Id = b.NguoiDungId WHERE ${whereFilterSql}`,
        [...filterParams]
    );

    const [[reportedRow]] = await pool.query(
        `SELECT COUNT(DISTINCT b.Id) AS cnt FROM baidang b INNER JOIN nguoidung n ON n.Id = b.NguoiDungId WHERE ${whereFilterSql} AND EXISTS (SELECT 1 FROM baidang_baocao bc WHERE bc.BaiDangId = b.Id)`,
        [...filterParams]
    );

    const counts = {
        pending: Number(pendingRow?.cnt || 0),
        all: Number(allRow?.cnt || 0),
        reported: Number(reportedRow?.cnt || 0),
    };

    return { posts: hydratedPosts, counts };
};

export const getPostDetail = async (postId) => {
    const [rows] = await pool.query(
        `SELECT
            b.Id,
            b.NguoiDungId,
            b.NoiDung,
            b.NgayTao,
            b.NgayCapNhat,
            b.TrangThai,
            b.SoLuotThich,
            b.SoBinhLuan,
            b.DiemFeed,
            b.DaXoa,
            n.TenDangNhap,
            n.Email,
            n.AnhDaiDienUrl,
            n.AnhDaiDienKey,
            COALESCE(reportAgg.ReportCount, 0) AS ReportCount,
            reportAgg.LatestReportedAt,
            reportAgg.LatestReporterName,
            reportAgg.LatestReportReason
         FROM baidang b
         INNER JOIN nguoidung n ON n.Id = b.NguoiDungId
         LEFT JOIN (
            SELECT
                bc.BaiDangId,
                COUNT(*) AS ReportCount,
                MAX(bc.NgayTao) AS LatestReportedAt,
                SUBSTRING_INDEX(GROUP_CONCAT(reporter.TenDangNhap ORDER BY bc.NgayTao DESC, bc.Id DESC SEPARATOR '||'), '||', 1) AS LatestReporterName,
                SUBSTRING_INDEX(GROUP_CONCAT(bc.LyDo ORDER BY bc.NgayTao DESC, bc.Id DESC SEPARATOR '||'), '||', 1) AS LatestReportReason
            FROM baidang_baocao bc
            INNER JOIN nguoidung reporter ON reporter.Id = bc.NguoiBaoCaoId
            GROUP BY bc.BaiDangId
         ) reportAgg ON reportAgg.BaiDangId = b.Id
         WHERE b.Id = ? AND b.DaXoa = 0
         LIMIT 1`,
        [postId]
    );

    if (rows.length === 0) {
        return null;
    }

    const post = await hydrateAuthorAvatar(rows[0]);
    const [mediaRows] = await pool.query(
        `SELECT Id, StorageKey, ThumbnailKey, ThuTu, KichThuocBytes, ChieuRong, ChieuCao, LoaiMedia
         FROM media
         WHERE BaiDangId = ? AND DaXoa = 0
         ORDER BY ThuTu ASC, Id ASC`,
        [postId]
    );

    post.Media = await Promise.all(mediaRows.map(async (mediaRow) => ({
        Id: mediaRow.Id,
        ThuTu: mediaRow.ThuTu,
        Url: mediaRow.StorageKey ? await safePresignedUrl(mediaRow.StorageKey) : null,
        ThumbnailUrl: mediaRow.ThumbnailKey ? await safePresignedUrl(mediaRow.ThumbnailKey) : null,
        KichThuocBytes: mediaRow.KichThuocBytes ?? 0,
        ChieuRong: mediaRow.ChieuRong ?? null,
        ChieuCao: mediaRow.ChieuCao ?? null,
        LoaiMedia: mediaRow.LoaiMedia,
    })));

    const [reportRows] = await pool.query(
        `SELECT bc.Id, bc.BaiDangId, bc.NguoiBaoCaoId, bc.LyDo, bc.NgayTao,
                reporter.TenDangNhap, reporter.Email, reporter.AnhDaiDienKey, reporter.AnhDaiDienUrl
         FROM baidang_baocao bc
         INNER JOIN nguoidung reporter ON reporter.Id = bc.NguoiBaoCaoId
         WHERE bc.BaiDangId = ?
         ORDER BY bc.NgayTao DESC, bc.Id DESC`,
        [postId]
    );

    post.Reports = await Promise.all(reportRows.map(async (reportRow) => ({
        Id: reportRow.Id,
        BaiDangId: reportRow.BaiDangId,
        NguoiBaoCaoId: reportRow.NguoiBaoCaoId,
        LyDo: reportRow.LyDo,
        NgayTao: reportRow.NgayTao,
        TenDangNhap: reportRow.TenDangNhap,
        Email: reportRow.Email,
        AnhDaiDienKey: reportRow.AnhDaiDienKey,
        AnhDaiDienUrl: reportRow.AnhDaiDienKey
            ? await safePresignedUrl(reportRow.AnhDaiDienKey)
            : await safePresignedUrl('avatars/Default_Avatar.jpg'),
    })));
    post.ReportCount = post.Reports.length;

    return post;
};

export const getDashboardSummary = async () => {
    const [[totalRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM baidang WHERE DaXoa = 0`
    );

    const [[todayRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM baidang
         WHERE DaXoa = 0
           AND NgayTao >= CURDATE()
           AND NgayTao < DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
    );

    // Count distinct reported posts overall
    const [[reportedRow]] = await pool.query(
        `SELECT COUNT(DISTINCT b.Id) AS cnt
         FROM baidang b
         WHERE b.DaXoa = 0
           AND EXISTS (SELECT 1 FROM baidang_baocao bc WHERE bc.BaiDangId = b.Id)`
    );

    // Compute current week's Monday..Sunday range (server local time)
    const now = new Date();
    const weekday = now.getDay(); // 0 (Sun) .. 6 (Sat)
    // Compute Monday (day 1). If today is Sunday (0), previous Monday is 6 days before.
    const daysFromMonday = (weekday === 0) ? 6 : (weekday - 1);
    const monday = new Date(now);
    monday.setHours(0,0,0,0);
    monday.setDate(monday.getDate() - daysFromMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (d) => d.toISOString().slice(0,10);
    const mondayStr = formatDate(monday);
    const sundayStr = formatDate(sunday);

    // Get counts of distinct reported posts per day within this week
    const [rows] = await pool.query(
        `SELECT DATE(bc.NgayTao) AS d, COUNT(DISTINCT bc.BaiDangId) AS cnt
         FROM baidang_baocao bc
         WHERE DATE(bc.NgayTao) BETWEEN ? AND ?
         GROUP BY DATE(bc.NgayTao)`,
        [mondayStr, sundayStr]
    );

    // Map dates to counts
    const countsByDate = new Map();
    for (const r of rows) {
        const key = r.d instanceof Date ? r.d.toISOString().slice(0,10) : String(r.d);
        countsByDate.set(key, Number(r.cnt || 0));
    }

    // Build array for Monday..Sunday
    const weeklyReported = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const key = formatDate(d);
        weeklyReported.push(countsByDate.get(key) || 0);
    }

    return {
        totalPosts: Number(totalRow?.cnt || 0),
        todayPosts: Number(todayRow?.cnt || 0),
        reportedTotal: Number(reportedRow?.cnt || 0),
        weeklyReported // array of 7 numbers Monday..Sunday
    };
};
export const approvePost = async (postId, adminId) => {
    const [result] = await pool.query(
        `UPDATE baidang
         SET TrangThai = 'DaDuyet', NgayCapNhat = NOW()
         WHERE Id = ? AND DaXoa = 0 AND TrangThai = 'ChoDuyet'`,
        [postId]
    );

    return result.affectedRows > 0;
};

export const hidePost = async (postId, adminId) => {
    const [result] = await pool.query(
        `UPDATE baidang
         SET TrangThai = 'BiAn', NgayCapNhat = NOW()
         WHERE Id = ? AND DaXoa = 0`,
        [postId]
    );

    return result.affectedRows > 0;
};

export const deletePost = async (postId, adminId) => {
    const [result] = await pool.query(
        `UPDATE baidang
         SET DaXoa = 1, TrangThai = 'BiXoa', NgayCapNhat = NOW()
         WHERE Id = ? AND DaXoa = 0`,
        [postId]
    );

    return result.affectedRows > 0;
};
