import Header from "@/components/Header";

export default async function Home() {
  const apiUrl = 'http://localhost:5000/api/nguoidung';

  let users = [];
  try {
    const response = await fetch(apiUrl, {cache: 'no-store'});
    users = await response.json();
  } catch (error) {
    console.error('không gọi được Backend:', error);
  }
  return (
    <div className="min-h-screen text-white">
      <Header />

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 py-10 text-center w-full overflow-hidden">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-400 mb-10">ViettelConnect</h1>
        
        <div className="w-full max-w-4xl bg-gray-800/50 rounded-xl p-4 sm:p-6 shadow-xl border border-gray-700/50">
          <h2 className="text-2xl font-semibold mb-6 text-left">Danh sách người dùng</h2>
          {users && users.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[500px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="p-3">ID</th>
                    <th className="p-3">Tên Đăng Nhập</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: any) => (
                    <tr key={user.Id} className="border-b border-gray-800 hover:bg-gray-800/80 transition-colors">
                      <td className="p-3">{user.Id}</td>
                      <td className="p-3 font-medium">{user.TenDangNhap}</td>
                      <td className="p-3 text-gray-300">{user.Email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.TrangThai === 'HoatDong' ? 'bg-green-500/20 text-green-400' :
                          user.TrangThai === 'ChoDuyet' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {user.TrangThai || 'Không rõ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 py-8 text-center italic">Không có dữ liệu hoặc lỗi kết nối.</p>
          )}
        </div>
      </div>
      
    </div>
  );
}