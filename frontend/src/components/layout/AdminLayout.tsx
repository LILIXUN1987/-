import { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import { t, AdminT } from '../../i18n';
import client from '../../api/client';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import GlobalNotification from '../../components/admin/GlobalNotification';
import OnboardingGuide, { OnboardingFloatingGuide } from '../../components/admin/OnboardingGuide';
import { ToastContainer } from '../../components/common/Toast';
import { FEATURES } from '../../config/features';
import { SidebarNavContent, MobileUnreadDot } from './SidebarNav';
import ContactAdminModal from './ContactAdminModal';
import ServiceConsultModal from './ServiceConsultModal';
import {
  User, Mail, LogOut, Menu, X, Ship, BarChart3, Scale,
  HelpCircle, Languages, AlertTriangle, Camera,
  MessageSquare, Building2, Gift, Globe,
} from 'lucide-react';

// ════════════════════════════════════════════
// AdminLayout — 管理后台主布局（重构后）
// ════════════════════════════════════════════
export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, lang, setLang } = useAuthStore();
  const role = user?.role || '';
  const navigate = useNavigate();
  const location = useLocation();

  const [planStatus, setPlanStatus] = useState<{ tier: string; isExpired: boolean; trialEnd: string | null } | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [serviceConsult, setServiceConsult] = useState<{ role: string; label: string } | null>(null);

  useEffect(() => {
    client.get('/plans/info').then(r => {
      const d = r.data as any;
      setPlanStatus({ tier: d.tier, isExpired: d.isExpired, trialEnd: d.trialEnd });
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isForwarder = role === 'forwarder' || role === 'admin';

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ═══ 移动端遮罩 ═══ */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ 侧边栏 ═══ */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 shadow-sm transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}
      >
        {/* 侧边栏头部 */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner flex-shrink-0">
              {user?.avatar ? (
                <img src={`/api/uploads/${user.avatar.replace(/^uploads[/\\]/, '')}`} alt="头像" className="w-9 h-9 rounded-xl object-cover" />
              ) : (
                <Ship className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{t(AdminT.siteName, lang)}</div>
              <div className="text-[11px] text-white/80 truncate mt-0.5">{user?.display_name || t(AdminT.adminPlaceholder, lang)}</div>
            </div>
            <button
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              title={lang === 'zh' ? 'English' : '中文'}
            >
              <Languages className="w-3.5 h-3.5" />
            </button>
            <button className="lg:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0" onClick={() => setSidebarOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
              {user?.role === 'admin' ? t(AdminT.roleLabelAdmin, lang) :
               user?.role === 'forwarder' ? t(AdminT.roleLabelForwarder, lang) :
               user?.role === 'trader' ? t(AdminT.roleLabelTrader, lang) :
               user?.role === 'lawyer' ? t(AdminT.roleLabelLawyer, lang) :
               user?.role === 'inspector' ? t(AdminT.roleLabelInspector, lang) :
               user?.role === 'insurer' ? t(AdminT.roleLabelInsurer, lang) :
               user?.role === 'overseas_agent' ? t(AdminT.roleLabelOverseasAgent, lang) : ''}
            </span>
            {user?.is_newbie && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-200 font-medium">{t(AdminT.newbieBadge, lang)}</span>
            )}
            {planStatus && (
              <span className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                planStatus.tier !== 'free' && !planStatus.isExpired
                  ? 'bg-green-500 text-white border-green-300 shadow-sm'
                  : planStatus.isExpired
                    ? 'bg-red-500 text-white border-red-300 shadow-sm'
                    : 'bg-gray-500 text-white border-gray-400 shadow-sm'
              }`}>
                {planStatus.tier !== 'free' && !planStatus.isExpired ? (
                  <><span className="text-xs">✅</span>{planStatus.tier}</>
                ) : planStatus.isExpired ? (
                  <><span className="text-xs">🔴</span>{lang === 'en' ? 'Expired' : '已过期'}</>
                ) : (
                  <><span className="text-xs">⚪</span>{lang === 'en' ? 'Free' : '免费'}</>
                )}
              </span>
            )}
          </div>
        </div>

        {/* 侧边栏导航 */}
        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <SidebarNavContent onCloseMobile={() => setSidebarOpen(false)} />

          <button
            onClick={() => setContactOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border hover:border-blue-200 border border-transparent transition-all duration-150 mt-4"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            {t(AdminT.contactAdmin, lang)}
          </button>
        </nav>

        {/* 退出登录 */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border hover:border-red-200 border border-transparent transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            {t(AdminT.logout, lang)}
          </button>
        </div>
      </aside>

      {/* ═══ 联系管理员弹窗 ═══ */}
      <ContactAdminModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* ═══ 服务咨询弹窗 ═══ */}
      <ServiceConsultModal
        open={!!serviceConsult}
        role={serviceConsult?.role || ''}
        label={serviceConsult?.label || ''}
        onClose={() => setServiceConsult(null)}
      />

      {/* ═══ 主内容区 ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶栏 */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center lg:hidden sticky top-0 z-10">
          <button className="p-1 text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 font-semibold text-gray-900">{t(AdminT.mobileTitle, lang)}</span>
          <button
            className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-amber-300 bg-amber-50 text-amber-700"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Languages className="w-3 h-3" />
            <span>{lang === 'zh' ? 'EN' : '中文'}</span>
          </button>
        </header>

        {/* 桌面端右上角语言切换 */}
        <button
          className="fixed top-3 right-4 z-30 hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow-md transition-all shadow-sm"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          <Languages className="w-3.5 h-3.5" />
          <span className="font-semibold">{lang === 'zh' ? 'EN' : '中文'}</span>
        </button>

        {/* 页面内容（路由级错误隔离） */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 lg:pb-6">
          <ErrorBoundary>
            <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
          <div className="mt-8 text-center text-[10px] text-gray-300 space-x-4">
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">
              鲁ICP备2026037717号-1
            </a>
            <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37018102001003" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">
              鲁公网安备37018102001003号
            </a>
          </div>
        </main>

        {/* ═══ 移动端底部导航 ═══ */}
        <MobileBottomNav location={location} lang={lang} isForwarder={isForwarder} />
      </div>

      {FEATURES.INBOX && <GlobalNotification />}
      <OnboardingGuide />
      <OnboardingFloatingGuide />
      <ToastContainer />
    </div>
  );
}

// ════════════════════════════════════════════
// 移动端底部导航栏（角色感知）
// ════════════════════════════════════════════
function MobileBottomNav({ location, lang, isForwarder }: { location: any; lang: string; isForwarder: boolean }) {
  const user = useAuthStore((s) => s.user);
  const r = user?.role || '';
  const rc2 = getRoleChecks(r);

  const inboxLabel = lang === 'en' ? 'Inbox' : '收件箱';
  const profileLabel = lang === 'en' ? 'Profile' : '我的';

  let items: any[];

  if (rc2.isRestricted) {
    items = [
      { to: '/admin/service-consults', label: lang === 'en' ? 'Consults' : '咨询', icon: MessageSquare },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else if (rc2.isLawyer) {
    items = [
      { to: '/admin/lawyer-consults', label: lang === 'en' ? 'Consults' : '咨询', icon: Scale },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/company-profile', label: lang === 'en' ? 'Page' : '主页', icon: Building2 },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else if (rc2.isBroker) {
    items = [
      { to: '/admin/broker-console', label: lang === 'en' ? 'Console' : '工作台', icon: BarChart3 },
      { to: '/admin/broker-directory', label: lang === 'en' ? 'Brokers' : '报关行', icon: Building2 },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else if (rc2.isOverseasAgent) {
    items = [
      { to: '/admin/ddp', label: 'DDP', icon: Globe },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else if (rc2.isAdmin) {
    items = [
      { to: '/admin/files', label: lang === 'en' ? 'Home' : '首页', icon: Ship },
      { to: '/admin/expo-quick', label: lang === 'en' ? 'Scan' : '录入', icon: Camera },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/stats', label: lang === 'en' ? 'Stats' : '看板', icon: BarChart3 },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else if (rc2.isTrader) {
    items = [
      { to: '/admin/files', label: lang === 'en' ? 'Search' : '查舱位', icon: Ship },
      { to: '/admin/coupon-wallet', label: lang === 'en' ? 'Coupons' : '券包', icon: Gift },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/lawyers', label: lang === 'en' ? 'Lawyers' : '律师', icon: Scale },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  } else {
    items = [
      { to: '/admin/files', label: isForwarder ? (lang === 'en' ? 'Post' : '录数据') : (lang === 'en' ? 'Search' : '查舱位'), icon: Ship },
      { to: '/admin/dg-agent-directory', label: lang === 'en' ? 'DG Agents' : '找代理', icon: AlertTriangle },
      { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true },
      { to: '/admin/lawyers', label: lang === 'en' ? 'Lawyers' : '律师', icon: Scale },
      { to: '/admin/profile', label: profileLabel, icon: User },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 lg:hidden flex safe-area-bottom">
      {items.map((item: any) => {
        const Icon = item.icon;
        const isActive = location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative ${
              isActive ? 'text-primary-600' : 'text-gray-500'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge && <MobileUnreadDot />}
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
