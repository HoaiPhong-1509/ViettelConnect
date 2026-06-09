import { calculateFeedScore } from '../utils/feedScore.js';
import * as feedRepository from '../repositories/feed.repository.js';
import { getPresignedUrl } from '../../services/minio.service.js';
import pool from '../../db.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

export const sanitizePagination = (limit = DEFAULT_LIMIT, offset = 0) => {
    const safeLimit = Number.parseInt(limit, 10);
    const safeOffset = Number.parseInt(offset, 10);

    return {
        limit: Number.isFinite(safeLimit) ? Math.min(Math.max(safeLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT,
        offset: Number.isFinite(safeOffset) && safeOffset >= 0 ? safeOffset : 0,
    };
};

export const updateFeedScore = async (postId, connection = null) => {
    const scoreSource = await feedRepository.fetchFeedScoreSourceById(postId, connection);

    if (!scoreSource) {
        return null;
    }

    const score = calculateFeedScore(scoreSource);
    await feedRepository.persistFeedScore(postId, score, connection);

    return score;
};

export const hydrateFeedRow = async (row) => {
    if (!row) {
        return null;
    }

    const avatarUrl = row.AnhDaiDienKey
        ? await safePresignedUrl(row.AnhDaiDienKey)
        : await safePresignedUrl('avatars/Default_Avatar.jpg');

    return {
        Id: row.Id,
        NguoiDungId: row.NguoiDungId,
        NoiDung: row.NoiDung,
        NgayTao: row.NgayTao,
        NgayCapNhat: row.NgayCapNhat,
        SoLuotThich: row.SoLuotThich,
        SoBinhLuan: row.SoBinhLuan,
        IsLiked: Boolean(row.IsLiked),
        DiemFeed: Number(row.ComputedDiemFeed ?? row.DiemFeed ?? 0),
        NgayTangTuongTacCuoi: row.NgayTangTuongTacCuoi,
        TrangThai: row.TrangThai,
        TenDangNhap: row.TenDangNhap,
        Email: row.Email,
        AnhDaiDienUrl: avatarUrl,
        AnhDaiDienKey: row.AnhDaiDienKey,
        NguoiDungTrangThai: row.NguoiDungTrangThai,
        VaiTroTen: row.VaiTroTen,
        RolePriority: Number(row.RolePriority || 0),
        Media: [],
    };
};

export const getFeed = async (userId, limit = DEFAULT_LIMIT, offset = 0, connection = null) => {
    const { limit: safeLimit, offset: safeOffset } = sanitizePagination(limit, offset);
    const rows = await feedRepository.fetchFeedRows(userId, safeLimit, safeOffset, connection);

    const posts = [];
    for (const row of rows) {
        posts.push(await hydrateFeedRow(row));
    }

    if (posts.length === 0) {
        return posts;
    }

    const postIds = posts.map((post) => post.Id);
    const executor = connection || pool;
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

export const getFeedPostById = async (userId, postId, connection = null) => {
    const row = await feedRepository.fetchFeedRowById(userId, postId, connection);
    return hydrateFeedRow(row);
};
