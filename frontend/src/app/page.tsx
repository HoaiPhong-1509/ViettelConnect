'use client';
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Feed from "../pages/Feed/Feed";
import NotificationPanel from "@/components/Notifications/NotificationPanel";
import UserProfileModal from "@/components/UserProfileModal";

function HomeContent() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetPostId = searchParams?.get('postId') ?? undefined;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (isAuthReady && !user) {
      router.push('/login');
    }
  }, [isAuthReady, router, user]);

  if (!isAuthReady) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-gray-900">
      <Header />
      <div className="relative mx-auto w-full max-w-[1320px] px-4 py-8 text-gray-800 lg:px-6">
        {!isProfileModalOpen && (
          <>
            <aside className="pointer-events-auto hidden w-[390px] xl:fixed xl:left-6 xl:top-[120px] xl:z-[120] xl:block">
            <div className="overflow-hidden rounded-[28px] bg-[#f4f5f7]">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef0f3] text-[#e60000]">
                  <i className="fa-solid fa-screwdriver-wrench text-lg"></i>
                </div>
                <div>
                  <h2 className="text-[17px] font-extrabold leading-tight text-slate-800">Góc tiện ích</h2>
                </div>
              </div>

              <div className="space-y-3 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-3xl bg-[#eef0f3] p-4 text-left transition hover:bg-[#e9ebef]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7f8fa] text-[#e60000]">
                    <i className="fa-solid fa-key"></i>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-slate-800">Đổi mật khẩu</span>
                    <span className="block text-[12px] leading-snug text-slate-500">Cập nhật mật khẩu ngay trong hồ sơ cá nhân.</span>
                  </span>
                </button>

                <Link
                  href="/support"
                  className="flex items-center gap-3 rounded-3xl bg-[#eef0f3] p-4 transition hover:bg-[#e9ebef]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7f8fa] text-[#ff7a00]">
                    <i className="fa-solid fa-headset"></i>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold text-slate-800">Cần hỗ trợ</span>
                    <span className="block text-[12px] leading-snug text-slate-500">Gửi email hỗ trợ đến quản trị viên của hệ thống.</span>
                  </span>
                </Link>
              </div>
            </div>
          </aside>

            {/* Mobile utility moved to Header component to use header's hamburger */}
          </>
        )}

        <div className="mx-auto min-w-0 max-w-[680px]">
          {/* Render danh sách Feed mới xây dựng bằng CSS thuần */}
          <Feed targetPostId={targetPostId} />
        </div>

        <NotificationPanel />
      </div>
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}