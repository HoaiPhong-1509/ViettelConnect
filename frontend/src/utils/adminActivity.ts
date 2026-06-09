export type ActivityEvent = {
    eventType: string;
    entityId: number;
    actorId: number;
    actorName?: string;
    actorEmail?: string;
    actorAvatarUrl?: string | null;
    title: string;
    detail: string;
    href?: string;
    occurredAt?: string;
};

export type ActivityTabKey = 'all' | 'post_created' | 'like_created' | 'comment_created' | 'report_created' | 'user_registered' | 'user_approved';

export type ActivityTabConfig = {
    key: ActivityTabKey;
    label: string;
    icon: string;
    href: string;
    eventTypes: string[];
    description: string;
};

export const ACTIVITY_META: Record<string, { label: string; icon: string; accent: string; badge: string }> = {
    post_liked: {
        label: 'Bài viết của bạn được thích',
        icon: 'fa-solid fa-heart',
        accent: 'from-pink-500 to-rose-500',
        badge: 'Bài viết',
    },
    post_commented: {
        label: 'Bình luận bài viết',
        icon: 'fa-solid fa-comment-dots',
        accent: 'from-amber-500 to-orange-500',
        badge: 'Bài viết',
    },
    conversation_added: {
        label: 'Được thêm vào cuộc trò chuyện',
        icon: 'fa-solid fa-comments',
        accent: 'from-sky-500 to-blue-600',
        badge: 'Tương tác',
    },
    post_created: {
        label: 'Bài đăng mới',
        icon: 'fa-solid fa-pen-to-square',
        accent: 'from-red-500 to-red-600',
        badge: 'Tạo bài',
    },
    like_created: {
        label: 'Lượt thích',
        icon: 'fa-solid fa-heart',
        accent: 'from-pink-500 to-rose-500',
        badge: 'Tương tác',
    },
    comment_created: {
        label: 'Bình luận',
        icon: 'fa-solid fa-comment-dots',
        accent: 'from-amber-500 to-orange-500',
        badge: 'Phản hồi',
    },
    report_created: {
        label: 'Báo cáo',
        icon: 'fa-solid fa-triangle-exclamation',
        accent: 'from-gray-700 to-gray-900',
        badge: 'Cảnh báo',
    },
    user_registered: {
        label: 'Người dùng mới',
        icon: 'fa-solid fa-user-plus',
        accent: 'from-sky-500 to-blue-600',
        badge: 'Đăng ký',
    },
    user_approved: {
        label: 'Tài khoản duyệt',
        icon: 'fa-solid fa-user-check',
        accent: 'from-emerald-500 to-green-600',
        badge: 'Xác nhận',
    },
};

export const ACTIVITY_TABS: ActivityTabConfig[] = [
    {
        key: 'all',
        label: 'Tất cả',
        icon: 'fa-solid fa-layer-group',
        href: '/admin/posts?tab=all',
        eventTypes: [],
        description: 'Xem toàn bộ sự kiện gần nhất theo thứ tự mới nhất lên đầu.',
    },
    {
        key: 'post_created',
        label: 'Bài viết',
        icon: 'fa-solid fa-pen-to-square',
        href: '/admin/posts?tab=all',
        eventTypes: ['post_created'],
        description: 'Các bài viết vừa được tạo trong hệ thống.',
    },
    {
        key: 'like_created',
        label: 'Tương tác',
        icon: 'fa-solid fa-heart',
        href: '/admin/posts?tab=all',
        eventTypes: ['like_created'],
        description: 'Các lượt thích mới nhất trên bài viết.',
    },
    {
        key: 'comment_created',
        label: 'Bình luận',
        icon: 'fa-solid fa-comment-dots',
        href: '/admin/posts?tab=all',
        eventTypes: ['comment_created'],
        description: 'Các bình luận mới nhất cần theo dõi.',
    },
    {
        key: 'report_created',
        label: 'Báo cáo',
        icon: 'fa-solid fa-triangle-exclamation',
        href: '/admin/posts?tab=reported',
        eventTypes: ['report_created'],
        description: 'Các báo cáo mới nhất của người dùng.',
    },
    {
        key: 'user_registered',
        label: 'Người dùng mới',
        icon: 'fa-solid fa-user-plus',
        href: '/admin/nguoidung',
        eventTypes: ['user_registered'],
        description: 'Tài khoản mới tạo trong thời gian gần đây.',
    },
    {
        key: 'user_approved',
        label: 'Duyệt tài khoản',
        icon: 'fa-solid fa-user-check',
        href: '/admin/nguoidung',
        eventTypes: ['user_approved'],
        description: 'Tài khoản vừa được kích hoạt hoặc duyệt.',
    },
];

export const getActivityMeta = (eventType?: string) => {
    return ACTIVITY_META[eventType || ''] || {
        label: 'Hoạt động',
        icon: 'fa-solid fa-bolt',
        accent: 'from-gray-500 to-gray-700',
        badge: 'Mới',
    };
};

export const getActivityTab = (tabKey: ActivityTabKey) => {
    return ACTIVITY_TABS.find((tab) => tab.key === tabKey) || ACTIVITY_TABS[0];
};

export const sortActivitiesDesc = (activities: ActivityEvent[]) => {
    return [...activities].sort((left, right) => {
        const leftTime = new Date(left.occurredAt || 0).getTime();
        const rightTime = new Date(right.occurredAt || 0).getTime();

        return rightTime - leftTime;
    });
};

export const getActivitiesForTab = (activities: ActivityEvent[], tabKey: ActivityTabKey) => {
    const sorted = sortActivitiesDesc(activities);

    if (tabKey === 'all') {
        return sorted;
    }

    const tab = getActivityTab(tabKey);
    return sorted.filter((activity) => tab.eventTypes.includes(activity.eventType));
};
