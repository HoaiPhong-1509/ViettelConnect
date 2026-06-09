import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Cấu hình transporter với thông tin từ biến môi trường
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true cho 465, false cho các cổng khác
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Hàm gửi email chứa mã OTP
 * @param {string} toEmail Email người nhận
 * @param {string} otp Mã OTP
 */
export const sendOTPEmail = async (toEmail, otp) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Chưa cấu hình EMAIL_USER và EMAIL_PASS trong file .env. Email sẽ không được gửi.');
            return;
        }

        const mailOptions = {
            from: `"Viettel Connect" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Xác thực tài khoản Viettel Connect',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                    <h2>Xin chào,</h2>
                    <p>Cảm ơn bạn đã đăng ký tài khoản trên <strong>Viettel Connect</strong>.</p>
                    <p>Dưới đây là mã xác thực (OTP) của bạn để hoàn tất quá trình đăng ký:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #e60000;">${otp}</span>
                    </div>
                    <p style="color: #666; font-size: 14px;"><em>Lưu ý: Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</em></p>
                    <p>Trân trọng,<br>Ban quản trị Viettel Connect</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Đã gửi email OTP thành công: %s', info.messageId);
    } catch (error) {
        console.error('Lỗi khi gửi email OTP:', error);
        throw error;
    }
};

/**
 * Hàm gửi email thông báo trạng thái tài khoản

 * @param {string} toEmail Email người nhận
 * @param {string} status Trạng thái ('HoatDong', 'BiKhoa', v.v.)
 * @param {string} reason Lý do thay đổi (tùy chọn)
 */
export const sendStatusEmail = async (toEmail, status, reason = '') => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Chưa cấu hình EMAIL_USER và EMAIL_PASS trong file .env. Email sẽ không được gửi.');
            return;
        }

        let subject = '';
        let htmlBody = '';

        if (status === 'HoatDong') {
            subject = 'Thông báo: Tài khoản của bạn đã được duyệt';
            htmlBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Xin chào,</h2>
                    <p>Tài khoản của bạn trên <strong>Viettel Connect</strong> đã được quản trị viên duyệt thành công.</p>
                    <p>Bây giờ bạn có thể đăng nhập và sử dụng các tính năng của hệ thống.</p>
                    <p>Trân trọng,<br>Ban quản trị Viettel Connect</p>
                </div>
            `;
        } else if (status === 'BiKhoa') {
            subject = 'Thông báo: Tài khoản của bạn đã bị khóa';
            htmlBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Xin chào,</h2>
                    <p>Tài khoản của bạn trên <strong>Viettel Connect</strong> đã bị khóa bởi quản trị viên.</p>
                    ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
                    <p>Nếu bạn cho rằng đây là một sự nhầm lẫn, vui lòng liên hệ với ban quản trị để được hỗ trợ.</p>
                    <p>Trân trọng,<br>Ban quản trị Viettel Connect</p>
                </div>
            `;
        } else if (status === 'BiTuChoi') {
            subject = 'Thông báo: Yêu cầu đăng ký tài khoản của bạn bị từ chối';
            htmlBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Xin chào,</h2>
                    <p>Yêu cầu tạo tài khoản của bạn trên <strong>Viettel Connect</strong> đã bị từ chối bởi quản trị viên.</p>
                    ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
                    <p>Cảm ơn bạn đã quan tâm đến hệ thống của chúng tôi.</p>
                    <p>Trân trọng,<br>Ban quản trị Viettel Connect</p>
                </div>
            `;
        } else {
            // Không gửi email cho các trạng thái khác hoặc cấu hình thêm nếu cần
            return;
        }

        const mailOptions = {
            from: `"Viettel Connect" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Đã gửi email thành công: %s', info.messageId);
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
    }
};

/**
 * Gửi email hỗ trợ từ người dùng đến quản trị viên
 */
export const sendSupportEmail = async ({ toEmail, replyTo, senderName, senderEmail, subject, content }) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Chưa cấu hình EMAIL_USER và EMAIL_PASS trong file .env. Email sẽ không được gửi.');
            return;
        }

        const safeSubject = escapeHtml(subject);
        const safeContent = escapeHtml(content).replace(/\n/g, '<br>');
        const safeSenderName = escapeHtml(senderName || 'Người dùng');
        const safeSenderEmail = escapeHtml(senderEmail || 'Không xác định');

        const mailOptions = {
            from: `"Viettel Connect" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            replyTo: replyTo || senderEmail || process.env.EMAIL_USER,
            subject: `[Hỗ trợ] ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 720px; margin: 0 auto; color: #1f2937;">
                    <h2 style="margin-bottom: 12px; color: #e60000;">Yêu cầu hỗ trợ mới</h2>
                    <p style="margin: 0 0 8px;">Bạn nhận được một yêu cầu hỗ trợ từ hệ thống Viettel Connect.</p>
                    <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 8px;"><strong>Người gửi:</strong> ${safeSenderName}</p>
                        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${safeSenderEmail}</p>
                        <p style="margin: 0;"><strong>Tiêu đề:</strong> ${safeSubject}</p>
                    </div>
                    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
                        <p style="margin: 0 0 10px; font-weight: 700;">Nội dung</p>
                        <div style="white-space: pre-wrap; word-break: break-word;">${safeContent}</div>
                    </div>
                    <p style="margin-top: 20px; color: #6b7280; font-size: 13px;">Trả lời trực tiếp vào email này hoặc dùng chức năng reply của trình mail để phản hồi người dùng.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Đã gửi email hỗ trợ thành công: %s', info.messageId);
    } catch (error) {
        console.error('Lỗi khi gửi email hỗ trợ:', error);
        throw error;
    }
};
