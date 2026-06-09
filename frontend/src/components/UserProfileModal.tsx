"use client";
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AVATAR_CROP_LIMIT = 512;
const AVATAR_CROP_BOX_SIZE = 360;
const AVATAR_CROP_OUTPUT_SIZE = 512;
const AVATAR_MIN_ZOOM = 1;
const AVATAR_MAX_ZOOM = 3;

type ProfileDetails = {
    id?: number;
    tenDangNhap?: string;
    email?: string;
    roles?: string[];
    avatar?: string;
    createdAt?: string;
};

type AvatarCropSource = {
    file: File;
    objectUrl: string;
    width: number;
    height: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getImageDimensions = (file: File) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
        const imageUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
            URL.revokeObjectURL(imageUrl);
        };

        image.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Không thể đọc ảnh đã chọn.'));
        };

        image.src = imageUrl;
    });

const loadImageElement = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Không thể tải ảnh crop.'));
        image.src = url;
    });

function AvatarCropModal({
    source,
    onCancel,
    onConfirm,
}: {
    source: AvatarCropSource;
    onCancel: () => void;
    onConfirm: (file: File) => void;
}) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

    useEffect(() => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setDragging(false);
        dragStartRef.current = null;
    }, [source.objectUrl]);

    const baseScale = Math.max(AVATAR_CROP_BOX_SIZE / source.width, AVATAR_CROP_BOX_SIZE / source.height);
    const displayWidth = source.width * baseScale * zoom;
    const displayHeight = source.height * baseScale * zoom;
    const maxOffsetX = Math.max(0, (displayWidth - AVATAR_CROP_BOX_SIZE) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - AVATAR_CROP_BOX_SIZE) / 2);

    const clampOffset = (nextOffsetX: number, nextOffsetY: number) => ({
        x: clamp(nextOffsetX, -maxOffsetX, maxOffsetX),
        y: clamp(nextOffsetY, -maxOffsetY, maxOffsetY),
    });

    useEffect(() => {
        if (!dragging) return;

        const handlePointerMove = (event: PointerEvent) => {
            const dragStart = dragStartRef.current;
            if (!dragStart) return;

            const nextOffset = clampOffset(
                dragStart.offsetX + (event.clientX - dragStart.x),
                dragStart.offsetY + (event.clientY - dragStart.y)
            );

            setOffset(nextOffset);
        };

        const handlePointerUp = () => {
            setDragging(false);
            dragStartRef.current = null;
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [dragging, maxOffsetX, maxOffsetY]);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);

        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
        };

        setDragging(true);
    };

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        const zoomDelta = event.deltaY < 0 ? 0.06 : -0.06;
        setZoom((currentZoom) => clamp(Number((currentZoom + zoomDelta).toFixed(2)), AVATAR_MIN_ZOOM, AVATAR_MAX_ZOOM));
    };

    const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setZoom(clamp(Number(event.target.value), AVATAR_MIN_ZOOM, AVATAR_MAX_ZOOM));
    };

    const handleConfirm = async () => {
        const image = await loadImageElement(source.objectUrl);
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_CROP_OUTPUT_SIZE;
        canvas.height = AVATAR_CROP_OUTPUT_SIZE;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Không thể khởi tạo vùng crop ảnh.');
        }

        const scale = baseScale * zoom;
        const topLeftX = (AVATAR_CROP_BOX_SIZE - displayWidth) / 2 + offset.x;
        const topLeftY = (AVATAR_CROP_BOX_SIZE - displayHeight) / 2 + offset.y;

        const sourceX = clamp((-topLeftX) / scale, 0, source.width);
        const sourceY = clamp((-topLeftY) / scale, 0, source.height);
        const sourceWidth = Math.min(source.width - sourceX, AVATAR_CROP_BOX_SIZE / scale);
        const sourceHeight = Math.min(source.height - sourceY, AVATAR_CROP_BOX_SIZE / scale);

        if (source.file.type !== 'image/png') {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const outputType = source.file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        const croppedBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Không thể tạo ảnh đã crop.'));
                    return;
                }

                resolve(blob);
            }, outputType, outputType === 'image/jpeg' ? 0.92 : undefined);
        });

        const extension = outputType === 'image/png' ? 'png' : 'jpg';
        const baseName = source.file.name.replace(/\.[^.]+$/, '') || 'avatar';
        const croppedFile = new File([croppedBlob], `${baseName}-cropped.${extension}`, { type: outputType });

        onConfirm(croppedFile);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-md"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
        >
            <div className="w-full max-w-3xl md:max-w-4xl lg:max-w-4xl max-h-[96vh] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Cắt ảnh đại diện</p>
                        <h4 className="mt-1 text-xl font-black text-slate-900">Kéo để canh ảnh, dùng con lăn để phóng to</h4>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                        <div
                            className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[420px] overflow-hidden rounded-[34px] bg-slate-950 touch-none"
                            onPointerDown={handlePointerDown}
                            onWheel={handleWheel}
                            style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                        >
                            <img
                                src={source.objectUrl}
                                alt="Preview crop"
                                draggable={false}
                                className="absolute select-none object-cover"
                                style={{
                                    width: `${displayWidth}px`,
                                    height: `${displayHeight}px`,
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                                }}
                            />

                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0_59%,rgba(2,6,23,0.35)_59%)]"></div>
                            <div className="pointer-events-none absolute inset-0 rounded-[34px] ring-1 ring-white/15"></div>

                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="h-[78%] w-[78%] rounded-full border-[3px] border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.28)]"></div>
                            </div>
                        </div>

                        <p className="mx-auto max-w-[420px] text-sm leading-6 text-slate-500">
                            Giữ chuột và kéo ảnh để canh đúng vị trí trong khung. Có thể lăn chuột hoặc kéo thanh phóng to để điều chỉnh.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Phóng to</p>
                                    <p className="mt-1 text-sm text-slate-500">Giữ tâm ảnh ở vị trí bạn muốn hiển thị.</p>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                    {Math.round(zoom * 100)}%
                                </span>
                            </div>

                            <input
                                type="range"
                                min={AVATAR_MIN_ZOOM}
                                max={AVATAR_MAX_ZOOM}
                                step="0.01"
                                value={zoom}
                                onChange={handleZoomChange}
                                className="mt-4 w-full accent-[#e60000]"
                            />

                            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                <span>1x</span>
                                <span>3x</span>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#e60000]">
                                    <i className="fa-solid fa-image text-xl"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">Ảnh gốc</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {source.width} × {source.height}px
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirm()}
                                    className="flex-1 rounded-2xl bg-[#e60000] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#e60000]/20 transition hover:bg-red-600"
                                >
                                    Dùng ảnh này
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function UserProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { user, login } = useAuth();
    const [tenDangNhap, setTenDangNhap] = useState('');
    const [matKhau, setMatKhau] = useState('');
    const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [avatarCropSource, setAvatarCropSource] = useState<AvatarCropSource | null>(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [profileDetails, setProfileDetails] = useState<ProfileDetails>({});
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const toggleSection = (id: string) => {
        setExpandedSection((prev) => (prev === id ? null : id));
    };

    useEffect(() => {
        if (!avatar) {
            setAvatarPreviewUrl(null);
            return;
        }

        const objectUrl = URL.createObjectURL(avatar);
        setAvatarPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [avatar]);

    useEffect(() => {
        return () => {
            if (avatarCropSource?.objectUrl) {
                URL.revokeObjectURL(avatarCropSource.objectUrl);
            }
        };
    }, [avatarCropSource]);

    useEffect(() => {
        if (!isOpen || !user) return;

        let isMounted = true;

        const loadProfileDetails = async () => {
            setDetailLoading(true);

            try {
                const response = await api.get('/auth/me');
                if (!isMounted) return;

                setProfileDetails(response.data?.user ?? {});
            } catch {
                if (!isMounted) return;

                setProfileDetails({
                    tenDangNhap: user.tenDangNhap,
                    email: user.email,
                    roles: user.roles,
                    avatar: user.avatar,
                    createdAt: user.createdAt,
                });
            } finally {
                if (isMounted) {
                    setDetailLoading(false);
                }
            }
        };

        setMessage('');
        setTenDangNhap(user.tenDangNhap);
        setMatKhau('');
        setXacNhanMatKhau('');
        setAvatar(null);
        setAvatarPreviewUrl(null);
        if (avatarCropSource?.objectUrl) {
            URL.revokeObjectURL(avatarCropSource.objectUrl);
        }
        setAvatarCropSource(null);
        setProfileDetails({
            tenDangNhap: user.tenDangNhap,
            email: user.email,
            roles: user.roles,
            avatar: user.avatar,
            createdAt: user.createdAt,
        });

        void loadProfileDetails();

        return () => {
            isMounted = false;
        };
    }, [isOpen, user]);

    if (!isOpen || !user) return null;

    const validatePassword = (password: string) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
        return passwordRegex.test(password);
    };

    const formatDate = (value?: string) => {
        if (!value) return 'Chưa cập nhật';

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

        return date.toLocaleString('vi-VN', {
            dateStyle: 'long',
            timeStyle: 'short',
        });
    };

    const displayName = profileDetails.tenDangNhap || user.tenDangNhap;
    const displayEmail = profileDetails.email || user.email;
    const displayAvatar = profileDetails.avatar || user.avatar || '/viettel-telecom-seeklogo.svg';
    const resolvedAvatarSrc = avatarPreviewUrl || displayAvatar;
    const displayRoles = profileDetails.roles || user.roles || [];
    const createdAtLabel = formatDate(profileDetails.createdAt);

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (!selectedFile) return;

        try {
            const dimensions = await getImageDimensions(selectedFile);

            if (dimensions.width > AVATAR_CROP_LIMIT || dimensions.height > AVATAR_CROP_LIMIT) {
                const objectUrl = URL.createObjectURL(selectedFile);

                if (avatarCropSource?.objectUrl) {
                    URL.revokeObjectURL(avatarCropSource.objectUrl);
                }

                setAvatarCropSource({
                    file: selectedFile,
                    objectUrl,
                    width: dimensions.width,
                    height: dimensions.height,
                });

                return;
            }

            setAvatar(selectedFile);
        } catch {
            setMessage('Không thể đọc ảnh đã chọn.');
        }
    };

    const handleAvatarCropConfirm = (croppedAvatar: File) => {
        setAvatar(croppedAvatar);

        if (avatarCropSource?.objectUrl) {
            URL.revokeObjectURL(avatarCropSource.objectUrl);
        }

        setAvatarCropSource(null);
    };

    const handleAvatarCropCancel = () => {
        if (avatarCropSource?.objectUrl) {
            URL.revokeObjectURL(avatarCropSource.objectUrl);
        }

        setAvatar(null);
        setAvatarCropSource(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (matKhau) {
            if (!validatePassword(matKhau)) {
                setMessage('Mật khẩu yếu. Yêu cầu lớn hơn hoặc bằng 8 ký tự, có chứa chữ hoa, chữ thường và số.');
                return;
            }
            if (matKhau !== xacNhanMatKhau) {
                setMessage('Mật khẩu nhập lại không khớp.');
                return;
            }
        }

        setLoading(true);
        setMessage('');

        const formData = new FormData();
        const normalizedTenDangNhap = tenDangNhap.trim();
        if (normalizedTenDangNhap && normalizedTenDangNhap !== displayName) {
            formData.append('tenDangNhap', normalizedTenDangNhap);
        }
        if (matKhau) formData.append('matKhau', matKhau);
        if (avatar) formData.append('avatar', avatar);

        try {
            const res = await api.put('/user/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('Cập nhật thành công!');
            // Cập nhật lại thông tin user trong context nếu backend trả về (ví dụ avatar mới)
            if (res.data && res.data.user) {
                const updatedUser = {
                    ...user,
                    ...res.data.user,
                    avatar: res.data.user.avatar || (user as any).avatar,
                };
                login(updatedUser as any);
            }
            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 100);
        } catch (error: any) {
            setMessage(error.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="relative w-full max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[96vh] overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
                <button 
                    onClick={onClose} 
                    className="absolute right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-500 shadow-md transition hover:text-gray-800"
                    aria-label="Đóng"
                >
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.35fr] max-h-[90vh] overflow-auto lg:overflow-visible">
                    <aside className="relative overflow-hidden bg-gradient-to-br from-[#e60000] via-[#bf0000] to-[#7f0000] px-4 py-6 sm:px-6 sm:py-8 text-white lg:px-8">
                        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/10 blur-2xl z-0"></div>
                        <div className="absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-black/10 blur-3xl z-0"></div>

                        <div className="relative z-10 flex flex-col gap-6">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-white/75">Hồ sơ cá nhân</p>
                                <h2 className="mt-2 text-3xl font-black leading-tight">{displayName}</h2>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-white/85">
                                    Xem nhanh thông tin tài khoản, ngày tạo nick và vai trò hiện tại trước khi cập nhật mật khẩu hoặc ảnh đại diện.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                                <div className="relative">
                                    <img
                                        src={resolvedAvatarSrc}
                                        alt="Avatar"
                                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl border border-white/20 object-cover shadow-xl"
                                        onError={(event) => {
                                            event.currentTarget.onerror = null;
                                            event.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                        }}
                                    />
                                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-emerald-500 text-[11px] text-white shadow-lg">
                                        <i className="fa-solid fa-circle-check"></i>
                                    </span>
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">Tài khoản</p>
                                    <p className="mt-1 truncate text-lg font-bold">{displayEmail}</p>
                                    <p className="mt-1 text-sm text-white/75">
                                        {detailLoading ? 'Đang tải thông tin...' : `Đã tạo nick: ${createdAtLabel}`}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">Tên tài khoản</p>
                                    <p className="mt-2 text-[15px] font-semibold">{displayName}</p>
                                </div>
                                <div className="rounded-[20px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">Vai trò</p>
                                    <p className="mt-2 text-[15px] font-semibold">{displayRoles.length ? displayRoles.join(' · ') : 'Người dùng'}</p>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">Thông tin cá nhân</p>
                                <div className="mt-4 space-y-4 text-sm text-white/88">
                                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                                        <span className="text-white/70">Email</span>
                                        <span className="text-right font-semibold">{displayEmail}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
                                        <span className="text-white/70">Ngày tạo nick</span>
                                        <span className="text-right font-semibold">{createdAtLabel}</span>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-white/70">Trạng thái</span>
                                        <span className="text-right font-semibold">Đang hoạt động</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="lg:max-h-[90vh] lg:overflow-y-auto bg-slate-50 px-6 py-8 lg:px-8">
                        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Cập nhật hồ sơ</p>
                                <h3 className="mt-2 text-2xl font-black text-slate-900">Điều chỉnh tên tài khoản, bảo mật và ảnh đại diện</h3>
                            </div>

                            {message && (
                                <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${message.includes('thành công') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-[#e60000]'}`}>
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div>
                                                <h4 className="text-base font-bold text-slate-900">Tên tài khoản</h4>
                                                <p className="mt-1 text-xs text-slate-500">Cập nhật tên hiển thị chính của tài khoản.</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="hidden text-xs text-slate-500 lg:block truncate">{tenDangNhap || displayName}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSection('account')}
                                                    className="ml-2 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:hidden whitespace-nowrap"
                                                    aria-expanded={expandedSection === 'account'}
                                                >
                                                    <span className="inline-block">{expandedSection === 'account' ? 'Thu gọn' : 'Chi tiết'}</span>
                                                    <i className={`fa-solid fa-chevron-${expandedSection === 'account' ? 'up' : 'down'} ml-1 text-[10px]`}></i>
                                                </button>
                                            </div>
                                    </div>

                                    <div className={`${expandedSection === 'account' ? 'block' : 'hidden'} mt-5 lg:block`}>
                                        <label className="mb-2 block text-sm font-semibold text-slate-700">Tên tài khoản mới</label>
                                        <input 
                                            type="text" 
                                            value={tenDangNhap}
                                            onChange={(e) => setTenDangNhap(e.target.value)}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e60000] focus:bg-white focus:ring-4 focus:ring-[#e60000]/10"
                                            placeholder="Nhập tên tài khoản mới"
                                        />
                                        <p className="mt-2 text-xs text-slate-500">Tên tài khoản phải có ít nhất 3 ký tự và không trùng với người dùng khác.</p>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900">Ảnh đại diện</h4>
                                            <p className="mt-1 text-xs text-slate-500">Chọn ảnh mới để làm mới hồ sơ cá nhân.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="hidden items-center gap-2 lg:flex">
                                                <img src={resolvedAvatarSrc} alt="avatar-sm" className="h-8 w-8 rounded-xl object-cover border" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleSection('avatar')}
                                                className="ml-2 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:hidden whitespace-nowrap"
                                                aria-expanded={expandedSection === 'avatar'}
                                            >
                                                <span className="inline-block">{expandedSection === 'avatar' ? 'Thu gọn' : 'Chi tiết'}</span>
                                                <i className={`fa-solid fa-chevron-${expandedSection === 'avatar' ? 'up' : 'down'} ml-1 text-[10px]`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`${expandedSection === 'avatar' ? 'block' : 'hidden'} mt-4 lg:block`}>
                                        <label className="mt-1 flex w-full cursor-pointer items-center gap-4 rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-[#e60000]/35 hover:bg-[#e60000]/5">
                                            {resolvedAvatarSrc ? (
                                                <img
                                                    src={resolvedAvatarSrc}
                                                    alt="Avatar preview"
                                                    className="h-12 w-12 rounded-2xl border border-white/70 object-cover shadow-sm"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#e60000] shadow-sm">
                                                    <i className="fa-solid fa-camera text-xl"></i>
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{resolvedAvatarSrc ? 'Ảnh đại diện đã chọn' : 'Tải ảnh đại diện mới'}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500 truncate">PNG, JPG hoặc JPEG. Nên chọn ảnh vuông để hiển thị đẹp hơn.</p>
                                            </div>
                                            <span className="rounded-full bg-[#e60000] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                                                Chọn
                                            </span>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleAvatarFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {avatar && (
                                            <p className="mt-3 text-xs font-medium text-slate-500 truncate max-w-full overflow-hidden">
                                                Đã chọn: {avatar.name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-bold text-slate-900">Bảo mật</h4>
                                            <p className="mt-1 text-xs text-slate-500">Chỉ nhập mật khẩu mới khi bạn muốn đổi.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleSection('security')}
                                            className="ml-2 inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:hidden whitespace-nowrap"
                                            aria-expanded={expandedSection === 'security'}
                                        >
                                            <span className="inline-block">{expandedSection === 'security' ? 'Thu gọn' : 'Chi tiết'}</span>
                                            <i className={`fa-solid fa-chevron-${expandedSection === 'security' ? 'up' : 'down'} ml-1 text-[10px]`}></i>
                                        </button>
                                    </div>

                                    <div className={`${expandedSection === 'security' ? 'block' : 'hidden'} mt-5 lg:block`}>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu mới</label>
                                                <input 
                                                    type="password" 
                                                    value={matKhau}
                                                    onChange={(e) => setMatKhau(e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e60000] focus:bg-white focus:ring-4 focus:ring-[#e60000]/10"
                                                    placeholder="Để trống nếu không đổi mật khẩu"
                                                />
                                            </div>

                                            {matKhau && (
                                                <div>
                                                    <label className="mb-2 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
                                                    <input 
                                                        type="password" 
                                                        value={xacNhanMatKhau}
                                                        onChange={(e) => setXacNhanMatKhau(e.target.value)}
                                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#e60000] focus:bg-white focus:ring-4 focus:ring-[#e60000]/10"
                                                        placeholder="Nhập lại mật khẩu mới"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e60000] px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-[#e60000]/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <i className="fa-solid fa-floppy-disk"></i>
                                    {loading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </div>
            {avatarCropSource && (
                <AvatarCropModal
                    source={avatarCropSource}
                    onCancel={handleAvatarCropCancel}
                    onConfirm={handleAvatarCropConfirm}
                />
            )}
        </div>,
        document.body
    );
}