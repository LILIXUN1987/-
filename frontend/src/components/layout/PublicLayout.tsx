import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-lg font-bold text-primary-700">
            🚢 123共享外贸物流社区
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/chat" className="text-gray-600 hover:text-primary-600 transition-colors">
              查询货舱
            </a>
            <a href="/login" className="text-gray-600 hover:text-primary-600 transition-colors">
              登录
            </a>
            <a href="/register" className="text-gray-600 hover:text-primary-600 transition-colors">
              注册
            </a>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
