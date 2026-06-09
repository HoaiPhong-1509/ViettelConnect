import api from './api';

export const getAdminRecentActivityApi = async (limit = 6) => {
    const res = await api.get('/admin/activity/recent', {
        params: { limit },
    });

    return res.data;
};