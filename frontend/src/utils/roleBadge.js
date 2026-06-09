const ROLE_META_BY_CODE = {
    Admin: { label: 'Admin', priority: 100, toneClass: 'role-badge--admin' },
    TongGiamDoc: { label: 'Tổng giám đốc', priority: 90, toneClass: 'role-badge--executive' },
    PhoTongGiamDoc: { label: 'Phó tổng giám đốc', priority: 80, toneClass: 'role-badge--executive' },
    TruongBan_TCT: { label: 'Trưởng ban', priority: 70, toneClass: 'role-badge--executive' },
    GiamDocTrungTam: { label: 'Giám đốc trung tâm', priority: 60, toneClass: 'role-badge--management' },
    GiamDocChiNhanhTinh: { label: 'Giám đốc', priority: 50, toneClass: 'role-badge--management' },
    PhoGiamDocChiNhanhTinh: { label: 'Phó giám đốc', priority: 45, toneClass: 'role-badge--management' },
    GiamDocKhuVuc: { label: 'Giám đốc khu vực', priority: 40, toneClass: 'role-badge--management' },
    DoiTruong_CumTruong: { label: 'Đội trưởng', priority: 30, toneClass: 'role-badge--lead' },
    NhanVien: { label: 'Nhân viên', priority: 10, toneClass: 'role-badge--member' },
    CongTacVien: { label: 'Cộng tác viên', priority: 5, toneClass: 'role-badge--member' },
};

const DEFAULT_ROLE_META = { code: null, label: 'Người dùng', priority: 0, toneClass: 'role-badge--member' };

const getRoleMeta = (roleCode) => ({ code: roleCode || null, ...(ROLE_META_BY_CODE[roleCode] || { ...DEFAULT_ROLE_META, label: roleCode || DEFAULT_ROLE_META.label }) });

export const getPrimaryRoleMeta = (roles = []) => {
    const roleList = Array.isArray(roles) ? roles : [roles].filter(Boolean);

    if (roleList.length === 0) {
        return { code: null, ...DEFAULT_ROLE_META };
    }

    return roleList.reduce((bestRole, currentRole) => {
        const currentMeta = getRoleMeta(currentRole);
        return currentMeta.priority > bestRole.priority ? currentMeta : bestRole;
    }, { code: null, ...DEFAULT_ROLE_META });
};

export const getPostRoleMeta = (post) => {
    if (!post) {
        return DEFAULT_ROLE_META;
    }

    if (post.VaiTroTen) {
        return getRoleMeta(post.VaiTroTen);
    }

    if (post.roles || post.userRoles) {
        return getPrimaryRoleMeta(post.roles || post.userRoles);
    }

    return DEFAULT_ROLE_META;
};

export const shouldShowRoleBadge = (post) => {
    const roleMeta = getPostRoleMeta(post);
    return Boolean(roleMeta.code && roleMeta.code !== 'NhanVien');
};

export const getPostPriority = (post) => {
    if (!post) {
        return 0;
    }

    if (typeof post.VaiTroDoUuTien === 'number') {
        return post.VaiTroDoUuTien;
    }

    if (typeof post.VaiTroDoUuTien === 'string' && post.VaiTroDoUuTien.trim() !== '') {
        return Number(post.VaiTroDoUuTien) || 0;
    }

    return getPostRoleMeta(post).priority;
};

export const sortPostsByFeedScore = (posts = []) => {
    return [...posts].sort((leftPost, rightPost) => {
        const rightScore = Number(rightPost?.DiemFeed ?? 0);
        const leftScore = Number(leftPost?.DiemFeed ?? 0);
        const scoreDiff = rightScore - leftScore;
        if (scoreDiff !== 0) {
            return scoreDiff;
        }

        const leftTime = new Date(leftPost?.NgayTao || 0).getTime();
        const rightTime = new Date(rightPost?.NgayTao || 0).getTime();
        if (rightTime !== leftTime) {
            return rightTime - leftTime;
        }

        return Number(rightPost?.Id || 0) - Number(leftPost?.Id || 0);
    });
};

export const getRoleBadgeClassName = (post) => {
    return getPostRoleMeta(post).toneClass;
};