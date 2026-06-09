'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { sendSupportRequest } from '@/services/api';

export default function SupportPage() {
    const { user, isAuthReady } = useAuth();
    const router = useRouter();
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthReady && !user) {
            router.push('/login');
        }
    }, [isAuthReady, router, user]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!subject.trim() || !content.trim()) {
            setError('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
            return;
        }

        setIsSending(true);
        try {
            const response = await sendSupportRequest({
                subject: subject.trim(),
                content: content.trim(),
            });

            if (!response.success) {
                setError(response.message || 'Không thể gửi yêu cầu hỗ trợ.');
                return;
            }

            setMessage('Đã gửi yêu cầu hỗ trợ đến quản trị viên.');
            setSubject('');
            setContent('');
        } finally {
            setIsSending(false);
        }
    };

    if (!isAuthReady || !user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f3f4f6_38%,#e9edf3_100%)] text-slate-900">
            <Header />
            <main className="mx-auto w-full max-w-[1100px] px-4 py-10 lg:px-6">
                <div className="grid gap-10 lg:grid-cols-[0.95fr_1.3fr]">
                    <section className="border-b border-slate-200/80 pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#e60000] ring-1 ring-slate-200">
                                <i className="fa-solid fa-headset"></i>
                                Hỗ trợ người dùng
                        </div>

                        <h1 className="mt-6 max-w-xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                            Gửi yêu cầu hỗ trợ trực tiếp cho quản trị viên.
                        </h1>

                        <div className="mt-8 space-y-4">
                            <div className="border-l-2 border-[#e60000] pl-4">
                                <p className="text-sm font-semibold text-slate-500">Người gửi</p>
                                <p className="mt-1 text-base font-bold text-slate-900">{user.tenDangNhap}</p>
                                <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                            </div>

                            <div className="border-l-2 border-slate-300 pl-4">
                                <p className="text-sm font-semibold text-slate-500">Mẹo gửi nhanh</p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Hãy mô tả lỗi, thời điểm xảy ra và ảnh chụp màn hình nếu có. Tiêu đề ngắn gọn sẽ giúp quản trị viên xử lý nhanh hơn.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="py-1">
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Tiêu đề</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(event) => setSubject(event.target.value)}
                                    placeholder="Ví dụ: Không đăng nhập được tài khoản"
                                    className="w-full border-b border-slate-300 bg-transparent px-0 py-3 text-[15px] text-slate-900 outline-none transition focus:border-[#e60000]"
                                    maxLength={120}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Nội dung</label>
                                <textarea
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    placeholder="Mô tả vấn đề bạn đang gặp, các bước đã thử, thời điểm lỗi xảy ra..."
                                    className="min-h-[240px] w-full border border-slate-300 bg-transparent px-4 py-3 text-[15px] leading-7 text-slate-900 outline-none transition focus:border-[#e60000]"
                                    maxLength={5000}
                                />
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Mỗi yêu cầu sẽ được gửi qua email và lưu trong hộp thư quản trị viên.
                                </p>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="inline-flex items-center justify-center border-b-2 border-[#e60000] px-0 py-2 text-sm font-bold text-[#e60000] transition hover:text-[#c40000] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSending ? 'Đang gửi...' : 'Gửi hỗ trợ'}
                                </button>
                            </div>

                            {message && (
                                <div className="border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {error}
                                </div>
                            )}
                        </form>
                    </section>
                </div>
            </main>
        </div>
    );
}