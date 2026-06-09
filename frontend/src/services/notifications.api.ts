import api from './api';

export const getRecentNotificationsApi = async (limit = 10) => {
    const res = await api.get('/feed/notifications', {
        params: { limit },
    });

    return res.data;
};