import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400 space-x-4">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
          鲁ICP备2026037717号-1
        </a>
        <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37018102001003" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
          鲁公网安备37018102001003号
        </a>
      </footer>
    </div>
  );
}
