import axios from 'axios';

// Tạo một instance (bản sao) của axios với cấu hình sẵn
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Địa chỉ Backend của chúng ta
    withCredentials: true // Cho phép gửi và nhận HttpOnly Cookie
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if ((status === 401 || status === 403) && typeof window !== 'undefined') {
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;

function getApiErrorMessage(err: any) {
    return err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || err.message;
}

// Authentication helpers expected by pages
export async function loginUser(payload: { email: string; matKhau: string }) {
    try {
        const res = await api.post('/auth/login', { email: payload.email, matKhau: payload.matKhau });
        return { success: true, data: res.data };
    } catch (err: any) {
        return { success: false, message: getApiErrorMessage(err) };
    }
}

export async function sendOtpEmail(email: string) {
    try {
        const res = await api.post('/auth/send-otp', { email });
        return { success: true, data: res.data };
    } catch (err: any) {
        return { success: false, message: getApiErrorMessage(err) };
    }
}

export async function registerUser(payload: { tenNguoiDung?: string; email?: string; matKhau: string; otp?: string }) {
    try {
        const res = await api.post('/auth/register', {
            tenDangNhap: payload.tenNguoiDung,
            email: payload.email,
            matKhau: payload.matKhau,
            otp: payload.otp
        });
        return { success: true, data: res.data };
    } catch (err: any) {
        return { success: false, message: getApiErrorMessage(err) };
    }
}

export async function sendSupportRequest(payload: { subject: string; content: string }) {
    try {
        const res = await api.post('/support/send', payload);
        return { success: true, data: res.data };
    } catch (err: any) {
        return { success: false, message: getApiErrorMessage(err) };
    }
}
