import api from './api';

export type UserSearchResult = {
    id: number;
    tenDangNhap?: string;
    avatar?: string;
    email?: string;
};

export async function searchUsers(q: string) {
    // Prefer dedicated user search endpoint, but fallback to chat search if not available
    try {
        const res = await api.get('/user/search', { params: { q } });
        return res.data?.users || res.data?.data || res.data || [];
    } catch (err: any) {
        // If endpoint not found, try chat search which returns { data: { users, groups } }
        if (err?.response?.status === 404) {
            try {
                const res2 = await api.get('/chat/search', { params: { query: q } });
                return res2.data?.data?.users || res2.data?.users || res2.data || [];
            } catch (e) {
                console.error('Fallback chat search failed', e);
                return [];
            }
        }

        console.error('User search failed', err);
        return [];
    }
}

export default {
    searchUsers,
};
