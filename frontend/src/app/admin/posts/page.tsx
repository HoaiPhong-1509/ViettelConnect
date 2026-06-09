'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  approveAdminPostApi,
  deleteAdminPostApi,
  getAdminPostDetailApi,
  getAdminPostsApi,
  hideAdminPostApi,
} from '@/services/adminPost.api';

type TabKey = 'pending' | 'all' | 'reported';

type AdminPost = {
  Id: number;
  NguoiDungId: number;
  NoiDung: string;
  NgayTao: string;
  NgayCapNhat?: string;
  TrangThai: 'ChoDuyet' | 'DaDuyet' | 'BiAn' | 'BiXoa';
  SoLuotThich: number;
  SoBinhLuan: number;
  DiemFeed?: number;
  DaXoa?: number;
  TenDangNhap: string;
  Email?: string;
  AnhDaiDienUrl?: string | null;
  ReportCount?: number;
  LatestReportedAt?: string | null;
  LatestReporterName?: string | null;
  LatestReportReason?: string | null;
  Media?: Array<any>;
};

type AdminPostDetail = AdminPost & {
  Reports?: Array<{
    Id: number;
    BaiDangId: number;
    NguoiBaoCaoId: number;
    LyDo: string;
    NgayTao: string;
    TenDangNhap: string;
    Email?: string;
    AnhDaiDienUrl?: string | null;
  }>;
};

type FilterState = {
  search: string;
  from: string;
  to: string;
};

const TAB_META: Record<TabKey, { label: string; hint: string }> = {
  pending: { label: 'Chờ duyệt', hint: 'Bài mới tạo đang chờ admin xác nhận.' },
  all: { label: 'Tất cả bài viết', hint: 'Danh sách bài viết toàn hệ thống.' },
  reported: { label: 'Bài bị report', hint: 'Các bài viết đang có báo cáo từ người dùng.' },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const isVideoMedia = (media: any) => {
  const url = media?.ThumbnailUrl || media?.Url || '';
  return /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(url) || String(media?.LoaiMedia || '').toLowerCase().includes('video');
};

const toIsoDateTime = (value: string) => {
  if (!value) return '';
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? '' : dateValue.toISOString();
};

const isIdLikeSearch = (value: string) => /^#?\d+$/.test(value.trim());

export default function AdminPostsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [draftFilters, setDraftFilters] = useState<FilterState>({ search: '', from: '', to: '' });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ search: '', from: '', to: '' });
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [counts, setCounts] = useState<{ pending: number; all: number; reported: number }>({ pending: 0, all: 0, reported: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const requestSeqRef = useRef(0);

  const [selectedPost, setSelectedPost] = useState<AdminPostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actingPostId, setActingPostId] = useState<number | null>(null);

  const tabCounts = useMemo(() => ({
    pending: counts.pending,
    all: counts.all,
    reported: counts.reported,
  }), [counts]);

  const loadPosts = async () => {
    const requestSeq = ++requestSeqRef.current;
    setIsLoading(true);
    try {
      const response = await getAdminPostsApi({
        tab: activeTab,
        search: appliedFilters.search,
        from: toIsoDateTime(appliedFilters.from),
        to: toIsoDateTime(appliedFilters.to),
      });
      if (requestSeq !== requestSeqRef.current) {
        return;
      }

      setPosts(response.data || []);
      setCounts(response.counts || { pending: 0, all: 0, reported: 0 });
    } catch (error: any) {
      if (requestSeq !== requestSeqRef.current) {
        return;
      }

      console.error('Lỗi khi tải danh sách bài viết:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        setActionMsg('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
        localStorage.removeItem('userInfo');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        setActionMsg('Không thể tải danh sách bài viết.');
      }
    } finally {
      if (requestSeq !== requestSeqRef.current) {
        return;
      }

      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [activeTab, appliedFilters, reloadTick]);

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'pending' || tabParam === 'all' || tabParam === 'reported') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const refreshPosts = () => {
    setReloadTick((value) => value + 1);
  };

  const handleApplyFilters = () => {
    if (isIdLikeSearch(draftFilters.search)) {
      setActiveTab('all');
    }

    setAppliedFilters({ ...draftFilters });
  };

  const openDetail = async (postId: number) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await getAdminPostDetailApi(postId);
      setSelectedPost(response.data);
    } catch (error: any) {
      console.error('Lỗi khi lấy chi tiết bài viết:', error);
      setDetailError(error.response?.data?.message || 'Không thể tải chi tiết bài viết.');
      setSelectedPost(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (postId: number, action: 'approve' | 'hide' | 'delete') => {
    setActingPostId(postId);
    try {
      if (action === 'approve') {
        await approveAdminPostApi(postId);
        setActionMsg('Đã duyệt bài viết.');
      } else if (action === 'hide') {
        await hideAdminPostApi(postId);
        setActionMsg('Đã ẩn bài viết.');
      } else {
        await deleteAdminPostApi(postId);
        setActionMsg('Đã xóa bài viết.');
      }

      refreshPosts();
      if (selectedPost?.Id === postId) {
        await openDetail(postId);
      }
      setTimeout(() => setActionMsg(''), 2500);
    } catch (error: any) {
      console.error('Lỗi thao tác bài viết:', error);
      setActionMsg(error.response?.data?.message || 'Thao tác không thành công.');
    } finally {
      setActingPostId(null);
    }
  };

  const statusBadgeClass = (status: AdminPost['TrangThai']) => {
    if (status === 'DaDuyet') return 'bg-green-500/15 text-green-700 border-green-200';
    if (status === 'ChoDuyet') return 'bg-amber-500/15 text-amber-700 border-amber-200';
    if (status === 'BiAn') return 'bg-slate-500/15 text-slate-700 border-slate-200';
    return 'bg-red-500/15 text-red-700 border-red-200';
  };

  return (
    <div className="space-y-6 text-gray-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-400 font-semibold">Admin / Posts</p>
          <h1 className="text-3xl font-black text-gray-900 mt-1">Quản lý bài viết</h1>
          <p className="text-sm text-gray-500 mt-2">Duyệt bài mới, xem báo cáo và xử lý bài vi phạm trong cùng một nơi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TAB_META) as TabKey[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold border transition-all ${activeTab === tabKey ? 'bg-[#e60000] text-white border-[#e60000] shadow-lg shadow-red-200' : 'bg-white text-gray-700 border-gray-200 hover:border-[#e60000] hover:text-[#e60000]'}`}
            >
              {TAB_META[tabKey].label}
              <span className="ml-2 text-xs opacity-80">{tabCounts[tabKey]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Tìm kiếm
            <input
              value={draftFilters.search}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Tên tài khoản, email, nội dung hoặc #ID bài viết..."
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#e60000] focus:bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Từ ngày giờ
            <input
              type="datetime-local"
              value={draftFilters.from}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, from: e.target.value }))}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#e60000] focus:bg-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Đến ngày giờ
            <input
              type="datetime-local"
              value={draftFilters.to}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, to: e.target.value }))}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-[#e60000] focus:bg-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleApplyFilters}
              className="rounded-2xl bg-[#e60000] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:brightness-95"
            >
              Áp dụng
            </button>
            <button
              onClick={() => {
                setDraftFilters({ search: '', from: '', to: '' });
                setAppliedFilters({ search: '', from: '', to: '' });
              }}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
            >
              Xóa lọc
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {actionMsg}
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="text-sm text-gray-500">{TAB_META[activeTab].hint}</div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-500">Đang tải bài viết...</div>
        ) : posts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Không có bài viết phù hợp với bộ lọc hiện tại.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-4 py-4">Bài viết</th>
                  <th className="px-4 py-4">Tác giả</th>
                  <th className="px-4 py-4">Thời gian</th>
                  <th className="px-4 py-4">Trạng thái</th>
                  <th className="px-4 py-4">Báo cáo</th>
                  <th className="px-4 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.Id} className="border-t border-gray-100 align-top hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-4">
                      <div className="max-w-[420px] space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 text-gray-400">
                            {post.AnhDaiDienUrl ? (
                              <img src={post.AnhDaiDienUrl} alt={post.TenDangNhap} className="h-full w-full object-cover" />
                            ) : (
                              <i className="fa-regular fa-image"></i>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">#{post.Id}</div>
                            <div className="text-xs text-gray-500">{(post.NoiDung || '').trim().slice(0, 120) || 'Không có nội dung'}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="rounded-full bg-gray-100 px-2 py-1">{post.SoLuotThich} lượt thích</span>
                          <span className="rounded-full bg-gray-100 px-2 py-1">{post.SoBinhLuan} bình luận</span>
                          <span className="rounded-full bg-gray-100 px-2 py-1">{post.Media?.length || 0} media</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{post.TenDangNhap}</div>
                      <div className="text-xs text-gray-500">{post.Email}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDateTime(post.NgayTao)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(post.TrangThai)}`}>
                        {post.TrangThai}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold text-gray-900">{post.ReportCount || 0} báo cáo</div>
                        <div className="text-xs text-gray-500">{post.LatestReporterName ? `Mới nhất: ${post.LatestReporterName}` : 'Chưa có báo cáo'}</div>
                        {post.LatestReportReason && (
                          <div
                            className="text-xs text-gray-500"
                            style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                          >
                            {post.LatestReportReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => openDetail(post.Id)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#e60000] hover:text-[#e60000]"
                        >
                          Chi tiết
                        </button>
                        {post.TrangThai === 'ChoDuyet' && (
                          <button
                            onClick={() => runAction(post.Id, 'approve')}
                            disabled={actingPostId === post.Id}
                            className="rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            Duyệt
                          </button>
                        )}
                        {post.TrangThai !== 'BiXoa' && (
                          <button
                            onClick={() => runAction(post.Id, 'hide')}
                            disabled={actingPostId === post.Id}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
                          >
                            Ẩn
                          </button>
                        )}
                        <button
                          onClick={() => runAction(post.Id, 'delete')}
                          disabled={actingPostId === post.Id}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(selectedPost || detailLoading || detailError) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Chi tiết bài viết</p>
                <h2 className="mt-1 text-2xl font-black text-gray-900">#{selectedPost?.Id || '...'}</h2>
              </div>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setDetailError('');
                }}
                className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 transition hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>

            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-5">
              {detailLoading ? (
                <div className="py-16 text-center text-gray-500">Đang tải chi tiết bài viết...</div>
              ) : detailError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{detailError}</div>
              ) : selectedPost ? (
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedPost.AnhDaiDienUrl || '/viettel-telecom-seeklogo.svg'}
                          alt={selectedPost.TenDangNhap}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                        <div>
                          <div className="text-lg font-bold text-gray-900">{selectedPost.TenDangNhap}</div>
                          <div className="text-sm text-gray-500">{selectedPost.Email}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClass(selectedPost.TrangThai)}`}>
                              {selectedPost.TrangThai}
                            </span>
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                              {selectedPost.SoLuotThich} lượt thích
                            </span>
                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                              {selectedPost.SoBinhLuan} bình luận
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 text-gray-800 shadow-sm">
                        {selectedPost.NoiDung || 'Không có nội dung'}
                      </div>
                    </div>

                    {selectedPost.Media && selectedPost.Media.length > 0 && (
                      <div className="rounded-3xl border border-gray-200 bg-white p-4">
                        <h3 className="mb-4 text-lg font-bold text-gray-900">Media</h3>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          {selectedPost.Media.map((media: any) => (
                            <div key={media.Id} className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                              {isVideoMedia(media) ? (
                                <video src={media.ThumbnailUrl || media.Url} controls className="h-44 w-full object-cover" />
                              ) : (
                                <img src={media.ThumbnailUrl || media.Url} alt="media" className="h-44 w-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-bold text-gray-900">Thông tin bài viết</h3>
                      <div className="mt-3 space-y-2 text-sm text-gray-600">
                        <div><span className="font-semibold text-gray-900">Tạo lúc:</span> {formatDateTime(selectedPost.NgayTao)}</div>
                        <div><span className="font-semibold text-gray-900">Cập nhật:</span> {formatDateTime(selectedPost.NgayCapNhat)}</div>
                        <div><span className="font-semibold text-gray-900">DiemFeed:</span> {selectedPost.DiemFeed ?? 0}</div>
                        <div><span className="font-semibold text-gray-900">Báo cáo:</span> {selectedPost.ReportCount || 0}</div>
                        {selectedPost.LatestReporterName && <div><span className="font-semibold text-gray-900">Báo cáo gần nhất:</span> {selectedPost.LatestReporterName}</div>}
                        {selectedPost.LatestReportReason && <div className="whitespace-pre-wrap rounded-2xl bg-gray-50 p-3 text-gray-700">{selectedPost.LatestReportReason}</div>}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedPost.TrangThai === 'ChoDuyet' && (
                          <button onClick={() => runAction(selectedPost.Id, 'approve')} className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white">
                            Duyệt
                          </button>
                        )}
                        {selectedPost.TrangThai !== 'BiXoa' && (
                          <button onClick={() => runAction(selectedPost.Id, 'hide')} className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                            Ẩn
                          </button>
                        )}
                        <button onClick={() => runAction(selectedPost.Id, 'delete')} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                          Xóa
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-4">
                      <h3 className="text-lg font-bold text-gray-900">Người báo cáo</h3>
                      <div className="mt-3 space-y-3">
                        {selectedPost.Reports && selectedPost.Reports.length > 0 ? (
                          selectedPost.Reports.map((report) => (
                            <div key={report.Id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={report.AnhDaiDienUrl || '/viettel-telecom-seeklogo.svg'}
                                  alt={report.TenDangNhap}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                                <div>
                                  <div className="font-semibold text-gray-900">{report.TenDangNhap}</div>
                                  <div className="text-xs text-gray-500">{report.Email}</div>
                                </div>
                              </div>
                              <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{report.LyDo}</div>
                              <div className="mt-2 text-xs text-gray-500">{formatDateTime(report.NgayTao)}</div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-500">Bài viết này chưa có báo cáo.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
