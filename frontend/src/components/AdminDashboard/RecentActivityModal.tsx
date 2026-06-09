'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ACTIVITY_TABS, getActivityMeta, getActivityTab, getActivitiesForTab, sortActivitiesDesc, type ActivityEvent, type ActivityTabKey } from '@/utils/adminActivity';

type RecentActivityModalProps = {
    open: boolean;
    activities: ActivityEvent[];
    onClose: () => void;
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

export default function RecentActivityModal({ open, activities, onClose }: RecentActivityModalProps) {
    const [activeTab, setActiveTab] = useState<ActivityTabKey>('all');

    const sortedActivities = useMemo(() => sortActivitiesDesc(activities), [activities]);
    const activeTabConfig = getActivityTab(activeTab);
    const visibleActivities = useMemo(
        () => getActivitiesForTab(sortedActivities, activeTab),
        [sortedActivities, activeTab]
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4">
            <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 lg:px-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 font-semibold">Hoạt động gần đây</p>
                        <h2 className="mt-1 text-xl font-black text-gray-900 lg:text-2xl">Tất cả sự kiện theo từng nhóm hoạt động</h2>
                        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
                            Mỗi tab là một loại hoạt động riêng. Danh sách luôn được sắp xếp từ mới nhất xuống cũ hơn để bạn kiểm tra nhanh.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
                    >
                        Đóng
                    </button>
                </div>

                <div className="border-b border-gray-100 px-5 pt-4 lg:px-6">
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {ACTIVITY_TABS.map((tab) => {
                            const isActive = tab.key === activeTab;
                            const count = tab.key === 'all'
                                ? sortedActivities.length
                                : sortedActivities.filter((activity) => tab.eventTypes.includes(activity.eventType)).length;

                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition ${isActive
                                        ? 'border-[#E60000] bg-[#E60000] text-white shadow-lg shadow-red-200'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:bg-red-50/60'
                                    }`}
                                >
                                    <i className={`${tab.icon} text-xs`} />
                                    <div>
                                        <p className="text-xs font-bold leading-tight lg:text-sm">{tab.label}</p>
                                        <p className={`text-[10px] lg:text-[11px] ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                                            {count} mục
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
                    <div className="flex h-full min-h-0 flex-col lg:flex-row">
                        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
                            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm lg:px-5">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400 font-semibold">{activeTabConfig.label}</p>
                                    <h3 className="mt-1 text-base font-black text-gray-900 lg:text-lg">{activeTabConfig.description}</h3>
                                </div>
                                <Link
                                    href={activeTabConfig.href}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-[#E60000] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#C40000]"
                                >
                                    <i className="fa-solid fa-arrow-right" />
                                    Đi đến quản lý
                                </Link>
                            </div>

                            {visibleActivities.length > 0 ? (
                                <div className="grid gap-3 lg:grid-cols-2">
                                    {visibleActivities.map((activity) => {
                                        const meta = getActivityMeta(activity.eventType);

                                        return (
                                            <div
                                                key={`${activity.eventType}-${activity.entityId}-${activity.occurredAt}`}
                                                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-red-100 hover:shadow-md"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-white shadow-lg shadow-black/10`}>
                                                        <i className={`${meta.icon} text-xs`} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-extrabold text-gray-900 lg:text-base">{activity.title}</p>
                                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 lg:text-sm">{activity.detail}</p>
                                                            </div>
                                                            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                                                {meta.badge}
                                                            </span>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                            <div className="text-[11px] text-gray-500">
                                                                <p className="font-semibold text-gray-700">{activity.actorName || 'Hệ thống'}</p>
                                                                <p>{formatCompactDate(activity.occurredAt)}</p>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={activity.href || activeTabConfig.href}
                                                                    className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-red-200 hover:bg-red-50 lg:text-sm"
                                                                >
                                                                    Mở trang quản lý
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white px-6 text-center text-sm text-gray-500 shadow-sm">
                                    Chưa có hoạt động nào thuộc tab này trong 7 ngày gần đây.
                                </div>
                            )}
                        </div>

                        <aside className="w-full border-t border-gray-200 bg-white px-5 py-4 lg:max-w-sm lg:border-l lg:border-t-0">
                            <div className="rounded-3xl bg-gray-50 p-4">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Tóm tắt tab</p>
                                <h3 className="mt-2 text-lg font-black text-gray-900">{activeTabConfig.label}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">{activeTabConfig.description}</p>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}