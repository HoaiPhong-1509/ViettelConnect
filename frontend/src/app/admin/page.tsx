'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import { getAdminRecentActivityApi } from '@/services/adminDashboard.api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RecentActivityModal from '@/components/AdminDashboard/RecentActivityModal';
import { getActivityMeta, sortActivitiesDesc, type ActivityEvent } from '@/utils/adminActivity';

type DashboardUser = {
    Id: number;
    TenDangNhap?: string;
    Email?: string;
    TrangThai?: string;
    NgayTao?: string;
    AnhDaiDienUrl?: string | null;
    AnhDaiDienKey?: string | null;
    TenVaiTro?: string;
    VaiTroId?: number;
};

const DEFAULT_AVATAR = '/viettel-telecom-seeklogo.svg';
const RECENT_ACTIVITY_LIMIT = 20;

const getSafeAvatarSrc = (avatarUrl?: string | null) => {
    const normalizedUrl = avatarUrl?.trim();

    if (!normalizedUrl) {
        return DEFAULT_AVATAR;
    }

    if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('/')) {
        return normalizedUrl;
    }

    return DEFAULT_AVATAR;
};

const formatCompactDate = (value?: string) => {
    if (!value) return 'Vừa xong';

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return 'Vừa xong';

    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateValue);
};

const formatRelativeCreatedAt = (value?: string) => {
    if (!value) return 'Vừa tạo';

    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return 'Vừa tạo';

    const diffMs = Date.now() - createdAt.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return 'Vừa tạo';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return formatCompactDate(value);
};

const normalizeRecentActivities = (payload: unknown): ActivityEvent[] => {
    if (Array.isArray(payload)) {
        return payload as ActivityEvent[];
    }

    if (payload && typeof payload === 'object') {
        const maybeData = (payload as { data?: unknown }).data;

        if (Array.isArray(maybeData)) {
            return maybeData as ActivityEvent[];
        }
    }

    return [];
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total: 0, pending: 0, approvalRate: '0.0' });
    const [postStats, setPostStats] = useState({ totalPosts: 0, todayPosts: 0, reportedTotal: 0, weeklyReported: [0,0,0,0,0,0,0] });
    const [users, setUsers] = useState<DashboardUser[]>([]);
    const [recentActivities, setRecentActivities] = useState<ActivityEvent[]>([]);
    const [recentUsersModalOpen, setRecentUsersModalOpen] = useState(false);
    const [recentActivityModalOpen, setRecentActivityModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        const storedUser = localStorage.getItem('userInfo');
        if (!storedUser) {
            router.push('/login'); // Redirect to login page for expired sessions
        }
    }, [router]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersResult, postsResult, activityResult] = await Promise.allSettled([
                    api.get('/admin/nguoidung'),
                    api.get('/admin/posts/summary'),
                    getAdminRecentActivityApi(RECENT_ACTIVITY_LIMIT),
                ]);

                if (usersResult.status === 'fulfilled') {
                    const fetchedUsers = usersResult.value.data || [];
                    const total = fetchedUsers.length;
                    const pending = fetchedUsers.filter((u: DashboardUser) => u.TrangThai === 'ChoDuyet').length;
                    const approved = fetchedUsers.filter((u: DashboardUser) => u.TrangThai === 'HoatDong').length;
                    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
                    setStats({ total, pending, approvalRate });
                    setUsers(fetchedUsers);
                }

                if (postsResult.status === 'fulfilled') {
                    const data = postsResult.value.data?.data || {};
                    setPostStats({
                        totalPosts: data.totalPosts || 0,
                        todayPosts: data.todayPosts || 0,
                        reportedTotal: data.reportedTotal || 0,
                        weeklyReported: Array.isArray(data.weeklyReported) && data.weeklyReported.length === 7 ? data.weeklyReported : [0,0,0,0,0,0,0]
                    });
                }

                if (activityResult.status === 'fulfilled') {
                    setRecentActivities(normalizeRecentActivities(activityResult.value.data));
                }
            } catch (err) {
                console.error('Failed to load stats:', err);
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        if (!recentActivityModalOpen) {
            return;
        }

        const refreshRecentActivities = async () => {
            try {
                const activityResult = await getAdminRecentActivityApi(RECENT_ACTIVITY_LIMIT);
                setRecentActivities(normalizeRecentActivities(activityResult.data));
            } catch (err) {
                console.error('Failed to refresh recent activities:', err);
            }
        };

        void refreshRecentActivities();
    }, [recentActivityModalOpen]);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const recentUsersIn7Days = useMemo(() => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        return [...users]
            .filter((user) => {
                if (!user?.NgayTao) return false;

                const createdAt = new Date(user.NgayTao).getTime();
                return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo;
            })
            .sort((left, right) => {
                const leftTime = new Date(left.NgayTao || 0).getTime();
                const rightTime = new Date(right.NgayTao || 0).getTime();
                return rightTime - leftTime;
            });
    }, [users]);

    const latestNewUsers = useMemo(() => recentUsersIn7Days.slice(0, 3), [recentUsersIn7Days]);
    const recentActivityPreview = useMemo(() => sortActivitiesDesc(recentActivities).slice(0, 3), [recentActivities]);

    if (!isMounted) return null;
    if (!user && !localStorage.getItem('userInfo')) return null;

    return (
        <div className="w-full flex flex-col space-y-8">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Hero Main Card */}
              <div className="lg:col-span-2 relative bg-gradient-to-br from-[#E60000] to-[#C40000] rounded-3xl p-8 text-white shadow-xl shadow-red-600/20 overflow-hidden flex flex-col justify-between min-h-[300px]">
                  {/* Background decoration elements */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-10 right-20 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
                  
                  <div className="relative z-10 w-full lg:w-3/4">
                      <p className="text-white font-semibold mb-2 drop-shadow-md text-xl">Tổng Số Người Dùng</p>
                      <h2 className="text-6xl sm:text-7xl lg:text-9xl font-extrabold mb-6 lg:mb-10 text-white drop-shadow-lg tracking-tight">{stats.total}</h2>
                      
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 lg:gap-6 text-sm">
                          <div className="flex items-center space-x-3 bg-white/20 rounded-xl px-4 py-3 backdrop-blur-md border border-white/30 shadow-lg w-full sm:w-auto">
                              <i className="fa-solid fa-user-clock text-white text-2xl drop-shadow-md"></i>
                              <div>
                                  <p className="text-white font-medium text-xs uppercase drop-shadow-md">Chờ xử lý</p>
                                  <p className="font-bold text-2xl text-white drop-shadow-md">{stats.pending}</p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-3 bg-white/20 rounded-xl px-4 py-3 backdrop-blur-md border border-white/30 shadow-lg w-full sm:w-auto">
                              <i className="fa-solid fa-chart-pie text-white text-2xl drop-shadow-md"></i>
                              <div>
                                  <p className="text-white font-medium text-xs uppercase drop-shadow-md">Tỉ lệ duyệt</p>
                                  <p className="font-bold text-2xl text-white drop-shadow-md">{stats.approvalRate}%</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Floating Action Button */}
                  <Link href="/admin/nguoidung" className="mt-6 lg:mt-0 self-start lg:absolute lg:bottom-6 lg:right-8 group bg-white/20 hover:bg-[#b30000] text-white hover:text-primary backdrop-blur-md border border-white/40 px-5 sm:px-6 lg:px-8 py-3 lg:py-4 rounded-3xl font-bold text-xs sm:text-sm tracking-widest shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(230,0,0,0.4)] flex items-center transition-all duration-300 hover:scale-105">
                      <span>XEM CHI TIẾT</span>
                      <div className="ml-3 w-8 h-8 rounded-full bg-white/30 group-hover:bg-primary text-white flex items-center justify-center transition-colors duration-300 shadow-inner">
                          <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform duration-300"></i>
                      </div>
                  </Link>
                  
                  {/* Illustration Placeholder */}
                  <div className="absolute right-0 bottom-0 h-[100%] w-1/2 opacity-90 pointer-events-none hidden lg:flex items-end justify-end">
                      {/* You can replace this with an actual SVG/img like the one in the original design */}
                      <i className="fa-solid fa-users-gear text-9xl text-white/20 mr-10 mb-10 transform -rotate-12"></i>
                  </div>
              </div>

              {/* Secondary Stats Card */}
              <div className="bg-red-50 rounded-3xl p-8 border border-red-100 shadow-sm relative flex flex-col justify-between">
                  <div>
                      <p className="text-gray-800 font-bold mb-4">Tổng Bài Đăng</p>
                      <div className="flex items-end space-x-2 mb-6">
                          <h2 className="text-6xl font-bold text-gray-900">{postStats.totalPosts}</h2>
                          <span className="text-primary text-sm font-bold bg-white px-2 py-1 rounded-full shadow-sm relative -top-6">+{postStats.todayPosts}</span>
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">
                          Hôm nay hệ thống ghi nhận thêm {postStats.todayPosts} bài mới. <span className="font-bold text-gray-800">Theo dõi chi tiết</span> để nắm nhịp nội dung đang tăng trưởng.
                      </p>
                  </div>

                  <Link href="/admin/posts?tab=all" className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex items-center space-x-3 text-sm">
                          <i className="fa-solid fa-paper-plane text-primary bg-red-50 p-2 rounded-full transform group-hover:translate-x-1 transition-transform"></i>
                          <span className="text-gray-600 font-semibold">Xem chi tiết</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-0.5 transition-transform"></i>
                      </div>
                  </Link>
              </div>
          </div>
          
          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              
              {/* Chart Placeholder (Finance Perfomance -> Activity) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Số bài viết bị báo cáo</h3>
                  <div className="flex items-center space-x-4 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 text-white flex items-center justify-center shadow-md">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                      </div>
                      <div>
                          <p className="font-bold text-xl text-gray-900">{postStats.reportedTotal.toLocaleString()}</p>
                          <p className="text-xs text-gray-400 font-medium">Tổng số bài bị báo cáo</p>
                      </div>
                      <div className="ml-auto">
                          <Link href="/admin/posts?tab=reported" className="text-sm font-semibold text-primary bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">Chi tiết</Link>
                      </div>
                  </div>

                  {/* Compact SVG Chart: X = Mon..Sun, Y = counts */}
                  <div className="mt-4">
                      {(() => {
                          const labels = ['Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy','Chủ Nhật'];
                          const values = postStats.weeklyReported || [0,0,0,0,0,0,0];
                          const maxVal = Math.max(...values, 1);

                          const svgW = 420;
                          const svgH = 160;
                          const margin = { top: 12, right: 12, bottom: 36, left: 36 };
                          const chartW = svgW - margin.left - margin.right;
                          const chartH = svgH - margin.top - margin.bottom;
                          const gap = chartW / labels.length;
                          const barWidth = Math.min(32, gap * 0.6);

                          // y ticks: 0, mid, max
                          const ticks = [0, Math.ceil(maxVal / 2), Math.ceil(maxVal)];

                          return (
                              <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="120" role="img" aria-label="Biểu đồ số bài bị báo cáo trong tuần">
                                  {/* Y axis ticks and labels */}
                                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                                      <line x1={0} y1={0} x2={0} y2={chartH} stroke="#E5E7EB" />
                                      {ticks.map((t, idx) => {
                                          const y = chartH - (t / Math.max(maxVal,1)) * chartH;
                                          return (
                                              <g key={idx}>
                                                  <line x1={-6} x2={chartW} y1={y} y2={y} stroke={idx === 0 ? '#F3F4F6' : '#E5E7EB'} strokeDasharray={idx === 0 ? 'none' : '4 4'} />
                                                  <text x={-10} y={y + 4} fontSize={10} fill="#6B7280" textAnchor="end">{t}</text>
                                              </g>
                                          );
                                      })}

                                      {/* Bars */}
                                      {labels.map((lab, i) => {
                                          const val = values[i] || 0;
                                          const x = i * gap + (gap - barWidth) / 2;
                                          const h = val > 0 ? (val / Math.max(maxVal,1)) * chartH : 2;
                                          const y = chartH - h;
                                          const barColor = val === 0 ? '#E5E7EB' : (i === 6 ? '#E60000' : '#7693A1');
                                          return (
                                              <g key={lab} transform={`translate(${x},0)`}> 
                                                  <rect x={0} y={y} width={barWidth} height={Math.max(2, h)} rx={4} fill={barColor} />
                                                  <text x={barWidth / 2} y={chartH + 16} fontSize={10} fill="#9CA3AF" textAnchor="middle">{lab}</text>
                                              </g>
                                          );
                                      })}

                                      {/* X axis line */}
                                      <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#E5E7EB" />
                                  </g>
                              </svg>
                          );
                      })()}
                  </div>
              </div>
              
              {/* Top Performers (Recent Users) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-6">
                      <div>
                          <h3 className="font-bold text-gray-800">Người Dùng Mới</h3>
                          <p className="text-sm text-gray-500 mt-1">Hiển thị 3 tài khoản tạo mới nhất trong 7 ngày gần đây.</p>
                      </div>
                      <button
                          onClick={() => setRecentUsersModalOpen(true)}
                          className="text-sm font-semibold text-primary bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                          Chi tiết
                      </button>
                  </div>

                  <div className="flex-1 flex flex-col space-y-4">
                      {latestNewUsers.length > 0 ? (
                          latestNewUsers.map((user) => (
                              <div key={user.Id} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-3 py-3 shadow-sm transition hover:border-red-100 hover:bg-red-50/40">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-gray-400">
                                      <img
                                          src={getSafeAvatarSrc(user.AnhDaiDienUrl)}
                                          alt={user.TenDangNhap || 'Người dùng mới'}
                                          className="h-full w-full object-cover"
                                          onError={(event) => {
                                              event.currentTarget.onerror = null;
                                              event.currentTarget.src = DEFAULT_AVATAR;
                                          }}
                                      />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-bold text-gray-800">{user.TenDangNhap || 'Người dùng mới'}</p>
                                      <p className="mt-1 text-xs text-gray-500">
                                          Tạo lúc {formatCompactDate(user.NgayTao)} · {formatRelativeCreatedAt(user.NgayTao)}
                                      </p>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                              Chưa có tài khoản nào được tạo trong 7 ngày gần đây.
                          </div>
                      )}
                  </div>
              </div>
              
              {/* Mini Activity Feed */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col max-h-[520px] min-h-0">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-emerald-500"></div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                          <h3 className="font-bold text-gray-800">Hoạt Động Gần Đây</h3>
                          <p className="text-sm text-gray-500 mt-1">Tổng hợp các tương tác mới nhất từ bài viết, bình luận và tài khoản.</p>
                      </div>
                      <button
                          onClick={() => setRecentActivityModalOpen(true)}
                          className="text-sm font-semibold text-primary bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                          Mở rộng
                      </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-2">
                      {recentActivities.length > 0 ? (
                          recentActivityPreview.map((activity) => {
                              const meta = getActivityMeta(activity.eventType);

                              return (
                                  <div
                                      key={`${activity.eventType}-${activity.entityId}-${activity.occurredAt}`}
                                      className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-gray-50 px-3 py-2.5 shadow-sm transition hover:border-red-100 hover:shadow-md"
                                  >
                                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white shadow-lg shadow-black/10`}>
                                          <i className={`${meta.icon} text-[11px]`} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0">
                                                  <p className="truncate text-[13px] font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                      {activity.title}
                                                  </p>
                                                  <p className="mt-1 line-clamp-2 text-[11px] text-gray-500 leading-relaxed">{activity.detail}</p>
                                              </div>
                                              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">
                                                  {meta.badge}
                                              </span>
                                          </div>
                                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                                              <span>{activity.actorName || 'Hệ thống'}</span>
                                              <span>{formatRelativeCreatedAt(activity.occurredAt)}</span>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })
                      ) : (
                          <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                              Chưa ghi nhận hoạt động mới trong thời gian gần đây.
                          </div>
                      )}
                  </div>

                  <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                      Card này chỉ hiển thị 3 hoạt động mới nhất. Bấm mở rộng để xem theo tab và đi tới trang quản lý tương ứng.
                  </div>
              </div>
          </div>

          <RecentActivityModal
              open={recentActivityModalOpen}
              activities={recentActivities}
              onClose={() => setRecentActivityModalOpen(false)}
          />

          {recentUsersModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
                  <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                      <div className="flex items-start justify-between border-b border-gray-100 p-5">
                          <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Người Dùng Mới</p>
                              <h2 className="mt-1 text-2xl font-black text-gray-900">Tài khoản tạo trong 7 ngày gần đây</h2>
                              <p className="mt-2 text-sm text-gray-500">
                                  Danh sách này giúp bạn theo dõi các tài khoản vừa đăng ký gần đây. Các mục được sắp xếp từ mới đến cũ để dễ kiểm tra.
                              </p>
                          </div>
                          <button
                              onClick={() => setRecentUsersModalOpen(false)}
                              className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 transition hover:bg-gray-200"
                          >
                              Đóng
                          </button>
                      </div>

                      <div className="max-h-[calc(90vh-92px)] overflow-y-auto p-5">
                          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-gray-700">
                              Chỉ các tài khoản có ngày tạo trong vòng 7 ngày gần nhất được hiển thị bên dưới. Bạn có thể dùng danh sách này để kiểm tra nhanh mức độ tăng trưởng tài khoản mới.
                          </div>

                          {recentUsersIn7Days.length > 0 ? (
                              <div className="grid gap-3 md:grid-cols-2">
                                  {recentUsersIn7Days.map((user) => (
                                      <div key={user.Id} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-gray-400 shadow-sm">
                                              <img
                                                  src={getSafeAvatarSrc(user.AnhDaiDienUrl)}
                                                  alt={user.TenDangNhap || 'Người dùng'}
                                                  className="h-full w-full object-cover"
                                                  onError={(event) => {
                                                      event.currentTarget.onerror = null;
                                                      event.currentTarget.src = DEFAULT_AVATAR;
                                                  }}
                                              />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                              <div className="flex items-start justify-between gap-3">
                                                  <div className="min-w-0">
                                                      <p className="truncate font-bold text-gray-900">{user.TenDangNhap || 'Người dùng mới'}</p>
                                                      <p className="truncate text-sm text-gray-500">{user.Email || 'Không có email'}</p>
                                                  </div>
                                                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                                                      {formatRelativeCreatedAt(user.NgayTao)}
                                                  </span>
                                              </div>
                                              <p className="mt-2 text-xs text-gray-500">
                                                  Tạo ngày {formatCompactDate(user.NgayTao)} {user.TenVaiTro ? `· Vai trò: ${user.TenVaiTro}` : ''}
                                              </p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                                  Hiện chưa có tài khoản mới nào trong 7 ngày gần đây.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}
          
      </div>
  );
}