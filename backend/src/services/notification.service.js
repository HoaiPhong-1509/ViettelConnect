import pool from '../../db.js';
import { getPresignedUrl } from '../../services/minio.service.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const DEFAULT_AVATAR_KEY = 'avatars/Default_Avatar.jpg';

const parseLimit = (value) => {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
        return DEFAULT_LIMIT;
    }

    return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const safeText = (value, fallback) => {
    const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    return text || fallback;
};

const truncate = (value, maxLength = 80) => {
    if (!value) {
        return '';
    }

    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

const getAvatarUrl = async (avatarUrl, avatarKey) => {
    if (avatarUrl && (/^(https?:)?\/\//i.test(avatarUrl) || avatarUrl.startsWith('/'))) {
        return avatarUrl;
    }

    if (avatarKey) {
        try {
            return await getPresignedUrl(avatarKey);
        } catch (error) {
            console.error('Không thể tạo presigned URL cho notification avatar:', error.message);
        }
    }

    if (avatarUrl) {
        return avatarUrl;
    }

    return await getPresignedUrl(DEFAULT_AVATAR_KEY);
};

const getUserSummary = async (userId) => {
    const [rows] = await pool.query(
        `SELECT Id, TenDangNhap, Email, AnhDaiDienUrl, AnhDaiDienKey
         FROM nguoidung
         WHERE Id = ? AND DaXoa = 0
         LIMIT 1`,
        [userId]
    );

    return rows[0] || null;
};

const insertNotification = async (payload) => {
    const [result] = await pool.query(
        `INSERT INTO thong_bao
            (NguoiNhanId, Loai, NguoiTaoId, BaiDangId, CuocTroChuyenId, TieuDe, NoiDung, Href)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.recipientId,
            payload.eventType,
            payload.actorId || null,
            payload.postId || null,
            payload.conversationId || null,
            payload.title,
            payload.detail,
            payload.href,
        ]
    );

    return result.insertId;
};

export const createPostLikedNotification = async ({ actorId, postId }) => {
    const [rows] = await pool.query(
        `SELECT
            b.Id AS postId,
            b.NguoiDungId AS recipientId,
            COALESCE(NULLIF(TRIM(LEFT(REPLACE(b.NoiDung, '\n', ' '), 80)), ''), CONCAT('bài viết #', b.Id)) AS postSummary,
            n.TenDangNhap AS actorName
         FROM baidang b
         JOIN nguoidung n ON n.Id = ?
         WHERE b.Id = ? AND b.DaXoa = 0
         LIMIT 1`,
        [actorId, postId]
    );

    const post = rows[0];
    if (!post || String(post.recipientId) === String(actorId)) {
        return null;
    }

    return await insertNotification({
        recipientId: post.recipientId,
        eventType: 'post_liked',
        actorId,
        postId,
        title: 'Bài viết của bạn vừa có lượt thích',
        detail: `${post.actorName} đã thích bài viết "${truncate(safeText(post.postSummary, `bài viết #${postId}`), 60)}" của bạn.`,
        href: `/?postId=${postId}`,
    });
};

export const createPostCommentedNotification = async ({ actorId, postId, commentContent }) => {
    const [rows] = await pool.query(
        `SELECT
            b.Id AS postId,
            b.NguoiDungId AS recipientId,
            COALESCE(NULLIF(TRIM(LEFT(REPLACE(b.NoiDung, '\n', ' '), 80)), ''), CONCAT('bài viết #', b.Id)) AS postSummary,
            n.TenDangNhap AS actorName
         FROM baidang b
         JOIN nguoidung n ON n.Id = ?
         WHERE b.Id = ? AND b.DaXoa = 0
         LIMIT 1`,
        [actorId, postId]
    );

    const post = rows[0];
    if (!post || String(post.recipientId) === String(actorId)) {
        return null;
    }

    return await insertNotification({
        recipientId: post.recipientId,
        eventType: 'post_commented',
        actorId,
        postId,
        title: 'Bài viết của bạn vừa có bình luận mới',
        detail: `${post.actorName} đã bình luận "${truncate(safeText(commentContent, 'một bình luận mới'), 70)}" trên bài viết "${truncate(safeText(post.postSummary, `bài viết #${postId}`), 60)}" của bạn.`,
        href: `/?postId=${postId}`,
    });
};

export const createConversationAddedNotification = async ({ actorId, recipientId, conversationId, conversationName }) => {
    if (!recipientId || String(recipientId) === String(actorId)) {
        return null;
    }

    const actor = await getUserSummary(actorId);
    if (!actor) {
        return null;
    }

    const safeConversationName = safeText(conversationName, 'cuộc trò chuyện');

    return await insertNotification({
        recipientId,
        eventType: 'conversation_added',
        actorId,
        conversationId,
        title: 'Bạn được thêm vào cuộc trò chuyện',
        detail: `${actor.TenDangNhap} đã thêm bạn vào cuộc trò chuyện "${truncate(safeConversationName, 60)}".`,
        href: '/chat',
    });
};

const hydrateNotificationRow = async (row) => ({
    eventType: row.eventType,
    entityId: row.entityId,
    actorId: row.actorId,
    actorName: row.actorName,
    actorEmail: row.actorEmail,
    actorAvatarUrl: await getAvatarUrl(row.actorAvatarUrl, row.actorAvatarKey),
    title: row.title,
    detail: row.detail,
    href: row.href,
    occurredAt: row.occurredAt,
});

export const getPersonalNotificationFeed = async ({ userId, limit = DEFAULT_LIMIT } = {}) => {
    const safeLimit = parseLimit(limit);
    const [rows] = await pool.query(
        `SELECT
            tb.Loai AS eventType,
            COALESCE(tb.BaiDangId, tb.CuocTroChuyenId, tb.Id) AS entityId,
            tb.NguoiTaoId AS actorId,
            actor.TenDangNhap AS actorName,
            actor.Email AS actorEmail,
            actor.AnhDaiDienUrl AS actorAvatarUrl,
            actor.AnhDaiDienKey AS actorAvatarKey,
            tb.TieuDe AS title,
            tb.NoiDung AS detail,
            tb.Href AS href,
            tb.NgayTao AS occurredAt
         FROM thong_bao tb
         LEFT JOIN nguoidung actor ON actor.Id = tb.NguoiTaoId
         WHERE tb.NguoiNhanId = ?
         ORDER BY tb.NgayTao DESC, tb.Id DESC
         LIMIT ?`,
        [userId, safeLimit]
    );

    return await Promise.all(rows.map((row) => hydrateNotificationRow(row)));
};
