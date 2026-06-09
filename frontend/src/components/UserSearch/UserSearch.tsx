"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchUsers, UserSearchResult } from '../../services/user.api';

type Props = {
    variant?: 'inline' | 'overlay';
    autoFocus?: boolean;
    onClose?: () => void;
};

export default function UserSearch({ variant = 'inline', autoFocus = false, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
        if (!query) {
            setResults([]);
            setOpen(false);
            return;
        }

        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await searchUsers(query.trim());
                setResults(res || []);
                setOpen(true);
                setActive(-1);
            } catch (e) {
                setResults([]);
                setOpen(false);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(t);
    }, [query]);

    useEffect(() => {
        const handler = (ev: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(ev.target as Node)) {
                setOpen(false);
            }
        };
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    const goToUser = (u: UserSearchResult) => {
        setOpen(false);
        setQuery('');
        router.push(`/user/${u.id}`);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active >= 0 && results[active]) {
                goToUser(results[active]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const inputEl = (
        <div className="relative w-full max-w-[420px]">
            <div className="relative">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Tìm người dùng..."
                    aria-label="Tìm người dùng"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#e60000] focus:ring-2 focus:ring-[#e60000]/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                </span>
            </div>

            {open && results.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-lg z-50">
                    {results.map((r, idx) => (
                        <button
                            key={r.id}
                            onClick={() => goToUser(r)}
                            onMouseEnter={() => setActive(idx)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-slate-50 ${active === idx ? 'bg-slate-50' : ''}`}
                        >
                            <img src={r.avatar || '/viettel-telecom-seeklogo.svg'} alt="avatar" className="h-8 w-8 rounded-full object-cover" onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src='/viettel-telecom-seeklogo.svg'}} />
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{r.tenDangNhap || r.email || `#${r.id}`}</div>
                                {r.email && <div className="text-xs text-slate-500 truncate">{r.email}</div>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    if (variant === 'overlay') {
        return (
            <div className="fixed top-0 left-0 right-0 z-[240] bg-white px-4 py-3 shadow-md">
                <div className="max-w-[1320px] mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">{inputEl}</div>
                        <button
                            aria-label="Đóng tìm kiếm"
                            onClick={() => {
                                setOpen(false);
                                setQuery('');
                                onClose && onClose();
                            }}
                            className="text-slate-600 p-2 rounded-md hover:bg-slate-100"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef}>{inputEl}</div>
    );
}
