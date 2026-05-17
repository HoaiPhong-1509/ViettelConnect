'use client';
import Header from "@/components/Header";
import Feed from "../pages/Feed/Feed";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f0f2f5] text-gray-900">
      <Header />
      
      <div className="max-w-2xl mx-auto py-8 text-gray-800">
        
        {/* Render danh sách Feed mới xây dựng bằng CSS thuần */}
        <Feed />
      </div>
    </div>
  );
}