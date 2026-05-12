import axios from 'axios';

// Tạo một instance (bản sao) của axios với cấu hình sẵn
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Địa chỉ Backend của chúng ta
    withCredentials: true // Cho phép gửi và nhận HttpOnly Cookie
});

export default api;
