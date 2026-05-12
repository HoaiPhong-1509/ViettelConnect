'use client';

import React, { useState, useEffect } from 'react';
import api from '@/services/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total: 0, pending: 0, approvalRate: '0.0' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/nguoidung');
                const users = res.data;
                const total = users.length;
                const pending = users.filter((u: any) => u.TrangThai === 'ChoDuyet').length;
                const approved = users.filter((u: any) => u.TrangThai === 'HoatDong').length;
                const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
                
                setStats({ total, pending, approvalRate });
            } catch (err) {
                console.error('Failed to load stats:', err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="w-full flex flex-col space-y-8">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Hero Main Card */}
              <div className="lg:col-span-2 relative bg-gradient-to-br from-primary to-red-400 rounded-3xl p-8 text-white shadow-xl shadow-red-500/20 overflow-hidden flex flex-col justify-between min-h-[300px]">
                  {/* Background decoration elements */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-10 right-20 w-32 h-32 bg-yellow-300/20 rounded-full blur-xl"></div>
                  
                  <div className="relative z-10 w-3/4">
                      <p className="text-white font-semibold mb-2 drop-shadow-md text-xl">Tổng Số Người Dùng</p>
                      <h2 className="text-9xl font-extrabold mb-10 text-white drop-shadow-lg tracking-tight">{stats.total}</h2>
                      
                      <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-3 bg-white/20 rounded-xl px-4 py-3 backdrop-blur-md border border-white/30 shadow-lg">
                              <i className="fa-solid fa-user-clock text-white text-2xl drop-shadow-md"></i>
                              <div>
                                  <p className="text-white font-medium text-xs uppercase drop-shadow-md">Chờ xử lý</p>
                                  <p className="font-bold text-2xl text-white drop-shadow-md">{stats.pending}</p>
                              </div>
                          </div>
                          <div className="flex items-center space-x-3 bg-white/20 rounded-xl px-4 py-3 backdrop-blur-md border border-white/30 shadow-lg">
                              <i className="fa-solid fa-chart-pie text-white text-2xl drop-shadow-md"></i>
                              <div>
                                  <p className="text-white font-medium text-xs uppercase drop-shadow-md">Tỉ lệ duyệt</p>
                                  <p className="font-bold text-2xl text-white drop-shadow-md">{stats.approvalRate}%</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Floating Action Button */}
                  <button className="absolute bottom-6 right-8 group bg-white/20 hover:bg-[#b30000] text-white hover:text-primary backdrop-blur-md border border-white/40 px-8 py-4 rounded-3xl font-bold text-sm tracking-widest shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(230,0,0,0.4)] flex items-center transition-all duration-300 hover:scale-105">
                      <span>XEM CHI TIẾT</span>
                      <div className="ml-3 w-8 h-8 rounded-full bg-white/30 group-hover:bg-primary text-white flex items-center justify-center transition-colors duration-300 shadow-inner">
                          <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform duration-300"></i>
                      </div>
                  </button>
                  
                  {/* Illustration Placeholder */}
                  <div className="absolute right-0 bottom-0 h-[100%] w-1/2 opacity-90 pointer-events-none flex items-end justify-end">
                      {/* You can replace this with an actual SVG/img like the one in the original design */}
                      <i className="fa-solid fa-users-gear text-9xl text-white/20 mr-10 mb-10 transform -rotate-12"></i>
                  </div>
              </div>

              {/* Secondary Stats Card */}
              <div className="bg-red-50 rounded-3xl p-8 border border-red-100 shadow-sm relative flex flex-col justify-between">
                  <div>
                      <p className="text-gray-800 font-bold mb-4">Tổng Bài Đăng</p>
                      <div className="flex items-end space-x-2 mb-6">
                          <h2 className="text-6xl font-bold text-gray-900">87</h2>
                          <span className="text-primary text-sm font-bold bg-white px-2 py-1 rounded-full shadow-sm relative -top-6">+2</span>
                      </div>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">
                          Số lượng bài đăng đã tăng từ tuần trước. <span className="font-bold text-gray-800">Tiếp tục phát huy</span> và giữ vững để cộng đồng sôi động hơn!
                      </p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow group">
                      <div className="flex items-center space-x-3 text-sm">
                          <i className="fa-solid fa-paper-plane text-primary bg-red-50 p-2 rounded-full transform group-hover:translate-x-1 transition-transform"></i>
                          <span className="text-gray-600 font-semibold">Xem thống kê nội dung</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-play text-xs ml-0.5"></i>
                      </div>
                  </div>
                  
                  <div className="absolute top-10 right-8 w-16 h-16 border-4 border-red-200 border-t-transparent rounded-full transform rotate-45 opacity-50"></div>
              </div>
          </div>
          
          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              
              {/* Chart Placeholder (Finance Perfomance -> Activity) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Báo Cáo Vi Phạm</h3>
                  <div className="flex items-center space-x-4 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-gray-800 text-white flex items-center justify-center shadow-md">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                      </div>
                      <div>
                          <p className="font-bold text-xl text-gray-900">12 841</p>
                          <p className="text-xs text-gray-400 font-medium">Total reports</p>
                      </div>
                      <div className="ml-auto w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors">
                          <i className="fa-regular fa-calendar"></i>
                      </div>
                  </div>
                  
                  {/* Mock Bar Chart */}
                  <div className="flex items-end justify-between h-32 mt-4">
                      {['DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY'].map((month, i) => (
                          <div key={month} className="flex flex-col items-center justify-end h-full">
                              <div className={`w-3 rounded-full ${i === 5 ? 'bg-primary' : 'bg-[#7693A1]'} hover:opacity-80 cursor-pointer transition-opacity`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
                              <span className="text-[10px] text-gray-400 font-medium mt-3 uppercase">{month}</span>
                          </div>
                      ))}
                  </div>
              </div>
              
              {/* Top Performers (Recent Users) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6">Người Dùng Mới</h3>
                  
                  <div className="flex-1 flex flex-col space-y-4">
                      {/* User Item */}
                      <div className="flex items-center border-b border-gray-50 pb-4">
                          <img src="https://i.pravatar.cc/100?img=5" className="w-10 h-10 rounded-full" alt="User" />
                          <div className="ml-4 flex-1">
                              <p className="text-sm font-bold text-gray-800">Bessie Cooper</p>
                              <div className="flex items-center text-[10px] text-gray-400 mt-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Online
                              </div>
                          </div>
                          <span className="text-red-400 font-bold bg-red-50 px-2 py-1 rounded text-sm">4.3</span>
                      </div>
                      {/* User Item */}
                      <div className="flex items-center border-b border-gray-50 pb-4">
                          <img src="https://i.pravatar.cc/100?img=11" className="w-10 h-10 rounded-full" alt="User" />
                          <div className="ml-4 flex-1">
                              <p className="text-sm font-bold text-gray-800">Albert Flores</p>
                              <div className="flex items-center text-[10px] text-gray-400 mt-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Online
                              </div>
                          </div>
                          <span className="text-blue-400 font-bold bg-blue-50 px-2 py-1 rounded text-sm">4.7</span>
                      </div>
                      {/* User Item */}
                      <div className="flex items-center pt-2">
                          <img src="https://i.pravatar.cc/100?img=12" className="w-10 h-10 rounded-full" alt="User" />
                          <div className="ml-4 flex-1">
                              <p className="text-sm font-bold text-gray-800">Guy Hawkins</p>
                              <p className="text-[10px] text-gray-400 mt-1">2 minutes ago</p>
                          </div>
                          <span className="text-orange-400 font-bold bg-orange-50 px-2 py-1 rounded text-sm">4.4</span>
                      </div>
                  </div>
              </div>
              
              {/* Targeting by Region (Map) */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6">Truy Tác Gần Đây</h3>
                  
                  <div className="flex-1 bg-gray-50 rounded-2xl relative flex items-center justify-center p-4">
                      {/* Placeholder for map */}
                      <div className="opacity-20 grid grid-cols-12 gap-1 w-full h-full">
                          {/* Dot matrix map simulation */}
                          {Array.from({ length: 96 }).map((_, i) => (
                              <div key={i} className={`w-1 h-1 rounded-full bg-gray-800 ${Math.random() > 0.6 ? 'opacity-0' : 'opacity-100'}`}></div>
                          ))}
                      </div>
                      
                      {/* Popover like map pin */}
                      <div className="absolute top-1/3 left-1/2 bg-white rounded-lg shadow-lg p-3 flex items-center z-10 animate-bounce">
                          <img src="https://flagcdn.com/w40/vn.png" className="w-8 h-5 object-cover rounded shadow-sm" alt="VN" />
                          <div className="ml-3">
                              <p className="text-xs font-bold text-gray-800">Việt Nam</p>
                              <p className="text-[10px] text-primary font-bold">23.03%  <i className="fa-solid fa-caret-up"></i> 4.7</p>
                          </div>
                      </div>
                      
                      {/* Pin dots */}
                      <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <div className="absolute bottom-1/4 right-1/4 w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                  </div>
              </div>
          </div>
          
      </div>
  );
}