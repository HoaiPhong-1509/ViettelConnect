const HOURS_DECAY_WEIGHT = 1.5;
const ROLE_WEIGHT = 2;
const LIKE_WEIGHT = 2;
const COMMENT_WEIGHT = 4;

const toFiniteNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};

export const calculateFeedScore = (post, now = new Date()) => {
    if (!post) {
        return 0;
    }

    const rolePriority = toFiniteNumber(post.rolePriority ?? post.DoUuTien ?? post.VaiTroDoUuTien);
    const likeCount = toFiniteNumber(post.SoLuotThich);
    const commentCount = toFiniteNumber(post.SoBinhLuan);
    const createdAt = post.NgayTao ? new Date(post.NgayTao) : now;
    const ageHours = Math.max(0, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));

    return (rolePriority * ROLE_WEIGHT)
        + (likeCount * LIKE_WEIGHT)
        + (commentCount * COMMENT_WEIGHT)
        - (ageHours * HOURS_DECAY_WEIGHT);
};
