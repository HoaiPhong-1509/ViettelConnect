import api from './api';

export const getAdminPostsApi = async (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    const url = `/admin/posts${queryString ? `?${queryString}` : ''}`;

    const maxAttempts = 3;
    const baseDelay = 500; // ms

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await api.get(url);
            return res.data;
        } catch (err: any) {
            const status = err?.response?.status;
            const headers = err?.response?.headers || {};

            // If 429, respect Retry-After header if present, otherwise exponential backoff
            if (status === 429 && attempt < maxAttempts) {
                let waitMs = baseDelay * Math.pow(2, attempt - 1);
                const ra = headers['retry-after'] || headers['Retry-After'];
                if (ra) {
                    const raSec = Number(ra);
                    if (!Number.isNaN(raSec) && raSec > 0) {
                        waitMs = raSec * 1000;
                    }
                }
                // add jitter
                waitMs = Math.round(waitMs + Math.random() * 200);
                await new Promise((r) => setTimeout(r, waitMs));
                continue; // retry
            }

            // For other errors or last attempt, rethrow
            throw err;
        }
    }
    // should not reach here
    throw new Error('Failed to fetch admin posts after retries');
};

export const getAdminPostDetailApi = async (postId: string | number) => {
    const res = await api.get(`/admin/posts/${postId}`);
    return res.data;
};

export const approveAdminPostApi = async (postId: string | number) => {
    const res = await api.put(`/admin/posts/${postId}/approve`);
    return res.data;
};

export const hideAdminPostApi = async (postId: string | number) => {
    const res = await api.put(`/admin/posts/${postId}/hide`);
    return res.data;
};

export const deleteAdminPostApi = async (postId: string | number) => {
    const res = await api.delete(`/admin/posts/${postId}`);
    return res.data;
};
