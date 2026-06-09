import pool from '../../db.js';
import { getPresignedUrl } from '../../services/minio.service.js';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;
const USER_NOTIFICATION_EVENT_TYPES = ['post_created', 'like_created', 'comment_created'];

const DEFAULT_AVATAR_KEY = 'avatars/Default_Avatar.jpg';

const parseLimit = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const safePresignedUrl = async (key) => {
    if (!key) {
        return null;
    }

    try {
        return await getPresignedUrl(key);
    } catch (error) {
        console.error('Không thể tạo presigned URL cho avatar activity:', key, error.message);
        return null;
    }
};

const hydrateAvatarUrl = async (avatarUrl, avatarKey) => {
    if (avatarUrl && (/^(https?:)?\/\//i.test(avatarUrl) || avatarUrl.startsWith('/'))) {
        return avatarUrl;
    }

    if (avatarKey) {
        return await safePresignedUrl(avatarKey);
    }

    if (avatarUrl) {
        return avatarUrl;
    }

    return await safePresignedUrl(DEFAULT_AVATAR_KEY);
};

const buildRecentActivityQuery = ({ recentWindowDays = 7, eventTypes = [], excludeActorId = null } = {}) => {
    const filters = ['occurredAt IS NOT NULL'];
    const params = [];

    if (recentWindowDays > 0) {
        filters.push(`occurredAt >= DATE_SUB(NOW(), INTERVAL ${recentWindowDays} DAY)`);
    }

    if (eventTypes.length > 0) {
        filters.push(`eventType IN (${eventTypes.map(() => '?').join(', ')})`);
        params.push(...eventTypes);
    }

    if (excludeActorId !== null && excludeActorId !== undefined) {
        filters.push('actorId <> ?');
        params.push(excludeActorId);
    }

    return {
        sql: `
    SELECT
        eventType,
        entityId,
        actorId,
        actorName,
        actorEmail,
        actorAvatarUrl,
        actorAvatarKey,
        title,
        detail,
        href,
        occurredAt
    FROM (
        SELECT
            'post_created' AS eventType,
            b.Id AS entityId,
            n.Id AS actorId,
            n.TenDangNhap AS actorName,
            n.Email AS actorEmail,
            n.AnhDaiDienUrl AS actorAvatarUrl,
            n.AnhDaiDienKey AS actorAvatarKey,
            CONCAT('Bài viết mới #', b.Id) AS title,
            COALESCE(NULLIF(TRIM(LEFT(REPLACE(b.NoiDung, '\n', ' '), 90)), ''), 'Bài đăng mới') AS detail,
            CONCAT('/admin/posts?tab=all') AS href,
            b.NgayTao AS occurredAt
        FROM baidang b
        INNER JOIN nguoidung n ON n.Id = b.NguoiDungId
        WHERE b.DaXoa = 0

        UNION ALL

        SELECT
            'like_created' AS eventType,
            lt.BaiDangId AS entityId,
            n.Id AS actorId,
            n.TenDangNhap AS actorName,
            n.Email AS actorEmail,
            n.AnhDaiDienUrl AS actorAvatarUrl,
            n.AnhDaiDienKey AS actorAvatarKey,
            CONCAT('Đã thích bài #', lt.BaiDangId) AS title,
            CONCAT('Thích bài đăng của ', author.TenDangNhap) AS detail,
            CONCAT('/admin/posts?tab=all') AS href,
            lt.NgayTao AS occurredAt
        FROM luotthich lt
        INNER JOIN nguoidung n ON n.Id = lt.NguoiDungId
        INNER JOIN baidang b ON b.Id = lt.BaiDangId
        INNER JOIN nguoidung author ON author.Id = b.NguoiDungId
        WHERE b.DaXoa = 0

        UNION ALL

        SELECT
            'comment_created' AS eventType,
            c.BaiDangId AS entityId,
            n.Id AS actorId,
            n.TenDangNhap AS actorName,
            n.Email AS actorEmail,
            n.AnhDaiDienUrl AS actorAvatarUrl,
            n.AnhDaiDienKey AS actorAvatarKey,
            CONCAT('Bình luận bài #', c.BaiDangId) AS title,
            COALESCE(NULLIF(TRIM(LEFT(REPLACE(c.NoiDung, '\n', ' '), 90)), ''), 'Vừa bình luận') AS detail,
            CONCAT('/admin/posts?tab=all') AS href,
            c.NgayTao AS occurredAt
        FROM binhluan c
        INNER JOIN nguoidung n ON n.Id = c.NguoiDungId
        INNER JOIN baidang b ON b.Id = c.BaiDangId
        WHERE c.DaXoa = 0 AND b.DaXoa = 0

        UNION ALL

        SELECT
            'report_created' AS eventType,
            bc.BaiDangId AS entityId,
            n.Id AS actorId,
            n.TenDangNhap AS actorName,
            n.Email AS actorEmail,
            n.AnhDaiDienUrl AS actorAvatarUrl,
            n.AnhDaiDienKey AS actorAvatarKey,
            CONCAT('Báo cáo bài #', bc.BaiDangId) AS title,
            COALESCE(NULLIF(TRIM(LEFT(REPLACE(bc.LyDo, '\n', ' '), 90)), ''), 'Có báo cáo mới') AS detail,
            CONCAT('/admin/posts?tab=reported') AS href,
            bc.NgayTao AS occurredAt
        FROM baidang_baocao bc
        INNER JOIN nguoidung n ON n.Id = bc.NguoiBaoCaoId
        INNER JOIN baidang b ON b.Id = bc.BaiDangId
        WHERE b.DaXoa = 0

        UNION ALL

        SELECT
            'user_registered' AS eventType,
            nd.Id AS entityId,
            nd.Id AS actorId,
            nd.TenDangNhap AS actorName,
            nd.Email AS actorEmail,
            nd.AnhDaiDienUrl AS actorAvatarUrl,
            nd.AnhDaiDienKey AS actorAvatarKey,
            'Tài khoản mới' AS title,
            CONCAT('Đăng ký mới: ', nd.Email) AS detail,
            CONCAT('/admin/nguoidung') AS href,
            nd.NgayTao AS occurredAt
        FROM nguoidung nd
        WHERE nd.DaXoa = 0

        UNION ALL

        SELECT
            'user_approved' AS eventType,
            nd.Id AS entityId,
            nd.Id AS actorId,
            nd.TenDangNhap AS actorName,
            nd.Email AS actorEmail,
            nd.AnhDaiDienUrl AS actorAvatarUrl,
            nd.AnhDaiDienKey AS actorAvatarKey,
            'Tài khoản được duyệt' AS title,
            CONCAT('Đã duyệt: ', nd.TenDangNhap) AS detail,
            CONCAT('/admin/nguoidung') AS href,
            nd.NgayDuyet AS occurredAt
        FROM nguoidung nd
        WHERE nd.DaXoa = 0
          AND nd.TrangThai = 'HoatDong'
          AND nd.NgayDuyet IS NOT NULL
    ) recent_activity
        WHERE ${filters.join('\n        AND ')}
    ORDER BY occurredAt DESC, entityId DESC
`,
        params,
    };
};

const fetchRecentActivityRows = async ({ limit, recentWindowDays, eventTypes = [], excludeActorId = null }) => {
    const { sql, params } = buildRecentActivityQuery({ recentWindowDays, eventTypes, excludeActorId });
    const [rows] = await pool.query(`${sql} LIMIT ?`, [...params, limit]);

    return rows;
};

const hydrateActivityRows = async (rows, { includeActorEmail = true } = {}) => Promise.all((rows || []).map(async (row) => ({
    eventType: row.eventType,
    entityId: row.entityId,
    actorId: row.actorId,
    actorName: row.actorName,
    ...(includeActorEmail ? { actorEmail: row.actorEmail } : {}),
    actorAvatarUrl: await hydrateAvatarUrl(row.actorAvatarUrl, row.actorAvatarKey),
    title: row.title,
    detail: row.detail,
    href: row.href,
    occurredAt: row.occurredAt,
})));

export const getRecentActivityFeed = async ({ limit = DEFAULT_LIMIT } = {}) => {
    const safeLimit = parseLimit(limit);
    let rows = await fetchRecentActivityRows({ limit: safeLimit, recentWindowDays: 7 });

    if (!rows.length) {
        rows = await fetchRecentActivityRows({ limit: safeLimit, recentWindowDays: 0 });
    }

    return await hydrateActivityRows(rows, { includeActorEmail: true });
};

export const getUserNotificationFeed = async ({ userId, limit = DEFAULT_LIMIT } = {}) => {
    const safeLimit = parseLimit(limit);
    let rows = await fetchRecentActivityRows({
        limit: safeLimit,
        recentWindowDays: 7,
        eventTypes: USER_NOTIFICATION_EVENT_TYPES,
        excludeActorId: userId,
    });

    if (!rows.length) {
        rows = await fetchRecentActivityRows({
            limit: safeLimit,
            recentWindowDays: 0,
            eventTypes: USER_NOTIFICATION_EVENT_TYPES,
            excludeActorId: userId,
        });
    }

    return await hydrateActivityRows(rows, { includeActorEmail: false });
};