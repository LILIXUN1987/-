import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnreadStore } from '../../store/unreadStore';
import GlobalNotification from '../../components/admin/GlobalNotification';
import OnboardingGuide from '../../components/admin/OnboardingGuide';
import client from '../../api/client';
import { t, AdminT } from '../../i18n';
import { getRoleChecks } from '../../types';
import { ToastContainer } from '../../components/common/Toast';
import { FEATURES } from '../../config/features';
import {
  Shield,
  FileUp,
  User,
  MessageSquare,
  PenSquare,
  Mail,
  LogOut,
  Menu,
  X,
  Ship,
  BarChart3,
  CreditCard,
  HelpCircle,
  Send,
  Loader2,
  Building2,
  FileText,
  Scale,
  AlertTriangle,
  Bookmark,
  Handshake,
  ClipboardList,
  Users,
  Camera,
  ChevronDown,
  Gift,
  FileSpreadsheet,
  Globe,
  Truck,
  Languages,
  Key,
  Bot,
} from 'lucide-react';

function useNavItems() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const role = user?.role || '';
  const rc = getRoleChecks(role);
  const isRestricted = rc.isRestricted;
  const isOverseasAgent = rc.isOverseasAgent;
  const label = isOverseasAgent
    ? (lang === 'en' ? 'Publish Services' : '发布服务')
    : (lang === 'en' ? 'Post Cargo Space' : '货代发布舱位与特价');

  const mainItems = isRestricted ? [
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isOverseasAgent ? [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    { to: '/admin/ai-ask', label: lang === 'en' ? '🤖 AI Ask' : '🤖 AI 问答', icon: Bot },
    { to: '/admin/files', label, icon: FileUp },
    { to: '/admin/overseas-center', label: lang === 'en' ? '📊 My Dashboard' : '📊 我的工作台', icon: BarChart3 },
    { to: '/admin/price-tables', label: lang === 'en' ? 'Price Tables' : '货代价格表', icon: FileText },
    { to: '/admin/port-services', label: lang === 'en' ? '🚛 Port Services' : '🚛 口岸服务', icon: Truck },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe },
    { to: '/admin/overseas-partners', label: lang === 'en' ? 'My Partners' : '我的合作商', icon: Handshake },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    { to: '/admin/ai-ask', label: lang === 'en' ? '🤖 AI Ask' : '🤖 AI 问答', icon: Bot },
    { to: '/admin/files', label, icon: FileUp },
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/subscribe', label: lang === 'en' ? '💳 Subscribe' : '💳 开通月费', icon: Gift }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/coupons', label: lang === 'en' ? '🎫 Coupons' : '🎫 报关券', icon: Gift }] : []),
    { to: '/admin/api-keys', label: lang === 'en' ? '🔑 API Keys' : '🔑 API 密钥', icon: Key },
    { to: '/admin/price-tables', label: lang === 'en' ? 'Price Tables' : '货代价格表', icon: FileText },
    { to: '/admin/tools', label: lang === 'en' ? '★ My Navigation' : '★ 我的导航库（提交有奖）', icon: Bookmark },
    { to: '/admin/port-services', label: lang === 'en' ? '🚛 Port Services' : '🚛 口岸服务', icon: Truck },
    { to: '/admin/dangerous-goods', label: lang === 'en' ? 'Dangerous Goods' : '寻找危险品代理', icon: AlertTriangle },
    { to: '/admin/overseas-partners', label: lang === 'en' ? 'Overseas Partners' : '我的海外合作商', icon: Handshake },
    { to: '/admin/recommend', label: lang === 'en' ? 'Invite Colleagues' : '推荐国内同行', icon: Users },
    { to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe },
    { to: '/admin/card-directory', label: lang === 'en' ? 'Directory' : '展会通讯录', icon: Users },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
];

  const forwarderItems: any[] = rc.isTrader ? [
    { to: '/admin/coupon-wallet', label: lang === 'en' ? '🎫 My Coupons' : '🎫 我的券包', icon: Gift },
  ] : [];

  const communityItems = FEATURES.AUDIT_MODE ? [] : [
    { to: '/admin/complaints', label: lang === 'en' ? '🛡️ Blacklist' : '🛡️ 货代避雷针', icon: MessageSquare, yellow: true },
    { to: '/admin/suggestions', label: lang === 'en' ? 'Suggestions' : '群友建议与问题解答', icon: PenSquare },
  ];

  const adminItems = rc.isAdmin ? [
    { to: '/admin/admin-center', label: '🏢 ' + (lang === 'en' ? 'Admin Center' : '管理中心'), icon: BarChart3 },
    { to: '/admin/broker-management', label: lang === 'en' ? 'Broker Mgmt' : '报关行管理', icon: Gift },
    { to: '/admin/raw-records', label: lang === 'en' ? 'Raw Records' : '数据录入原始记录', icon: FileText },
    { to: '/admin/batch-import', label: lang === 'en' ? 'Import Directory' : '通讯录导入', icon: FileSpreadsheet },
  ] : [];

  // 网安审核模式：非管理员精简菜单（只保留查看类功能）
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    const keepPaths = ['/admin/dashboard', '/admin/ai-ask', '/admin/files', '/admin/api-keys', '/admin/price-tables', '/admin/card-directory', '/admin/recommend', '/admin/subscribe', '/admin/coupons', '/admin/coupon-wallet', '/admin/port-services'];
    return {
      mainItems: mainItems.filter((item: any) => keepPaths.includes(item.to)),
      forwarderItems: forwarderItems.filter((item: any) => keepPaths.includes(item.to)),
      communityItems: [],
      adminItems: [],
    };
  }

  return { mainItems, forwarderItems, communityItems, adminItems };
}

function DgPendingBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-4 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full">{count > 99 ? '99+' : count}</span>;
}

function UnreadBadge() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">{count > 99 ? '99+' : count}</span>;
}

/** 移动端底部导航未读红点 */
function MobileUnreadDot() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />;
}

/** 可折叠侧边栏分区 */
function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mt-2 hover:text-gray-600 transition-colors rounded-xl hover:bg-gray-50"
      >
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
        {title}
      </button>
      {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, lang, setLang } = useAuthStore();
  const role = user?.role || '';
  const navigate = useNavigate();
  const location = useLocation();
  const { mainItems, forwarderItems, communityItems, adminItems } = useNavItems();

  const [dgPendingCount, setDgPendingCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [air, sea, land] = await Promise.all([
          client.get('/dg/stats', { params: { type: 'air' } }),
          client.get('/dg/stats', { params: { type: 'sea' } }),
          client.get('/dg/stats', { params: { type: 'land' } }),
        ]);
        const total = (air.data.cases.pending || 0) + (air.data.agents.pending || 0) + (air.data.faqs.pending || 0)
          + (sea.data.cases.pending || 0) + (sea.data.agents.pending || 0) + (sea.data.faqs.pending || 0)
          + (land.data.cases.pending || 0) + (land.data.agents.pending || 0) + (land.data.faqs.pending || 0);
        setDgPendingCount(total);
      } catch {}
    };
    fetchCount();
    const timer = setInterval(fetchCount, 60000);
    return () => clearInterval(timer);
  }, []);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  // ── 检测认证 / 运输保险 咨询 ──
  const [serviceConsult, setServiceConsult] = useState<{ role: string; label: string } | null>(null);
  const [serviceText, setServiceText] = useState('');
  const [serviceSending, setServiceSending] = useState(false);
  const [serviceSent, setServiceSent] = useState(false);

  const handleServiceConsultSend = async () => {
    if (!serviceText.trim() || !serviceConsult) return;
    setServiceSending(true);
    try {
      await client.post(`/messages/service-consult/${serviceConsult.role}`, { content: serviceText.trim() });
      setServiceSent(true);
      setServiceText('');
      setTimeout(() => { setServiceConsult(null); setServiceSent(false); }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setServiceSending(false);
  };

  const handleContactSend = async () => {
    if (!contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages/contact-admin', { content: contactText.trim() });
      setContactSent(true);
      setContactText('');
      setTimeout(() => { setContactOpen(false); setContactSent(false); }, 2000);
    } catch { alert(lang === 'en' ? 'Send failed, please retry' : '发送失败，请重试'); }
    setContactSending(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 shadow-sm transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}
      >
        {/* ═══ 侧边栏头部 ═══ */}
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
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <CollapsibleSection title={t(AdminT.sectionMain, lang)} defaultOpen={true}>
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
              }
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                item.to === '/admin/dashboard' ? 'bg-gradient-to-br from-primary-500 to-indigo-500 text-white shadow-sm' :
                item.to === '/admin/ai-ask' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm' :
                item.to === '/admin/files' ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm' :
                'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
              }`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
              {item.to === '/admin/inbox' && <UnreadBadge />}
            </NavLink>
          ))}
          </CollapsibleSection>

          {forwarderItems.length > 0 && (
            <CollapsibleSection title={t(AdminT.sectionForwarder, lang)} defaultOpen={true}>
            {forwarderItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                  (isActive
                    ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
                }
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                  item.to === '/admin/coupon-wallet' ? 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-sm' :
                  'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
                {item.to === '/admin/dg-review' && <DgPendingBadge count={dgPendingCount} />}
              </NavLink>
            ))}
            </CollapsibleSection>
          )}

          <CollapsibleSection title={t(AdminT.sectionCommunity, lang)} defaultOpen={true}>
          {communityItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 shadow-sm border border-orange-100'
                  : 'text-orange-600 hover:text-orange-700 hover:bg-white hover:shadow-sm hover:border hover:border-orange-200 border border-transparent')
              }
            >
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-500 group-hover:bg-orange-200 flex items-center justify-center flex-shrink-0 transition-all duration-150">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
          </CollapsibleSection>

          {adminItems.length > 0 && (
            <CollapsibleSection title={t(AdminT.sectionAdmin, lang)} defaultOpen={true}>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                  (isActive
                    ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
                }
              >
                <div className={`w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-all duration-150`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
            </CollapsibleSection>
          )}

          <button
            onClick={() => { setContactOpen(true); setContactSent(false); setContactText(''); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border hover:border-blue-200 border border-transparent transition-all duration-150 mt-4"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            {t(AdminT.contactAdmin, lang)}
          </button>
          {role !== 'overseas_agent' && (<>
          </>)}
        </nav>

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

      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactOpen(false); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">{t(AdminT.contactModalTitle, lang)}</h3>
              <button onClick={() => { setContactOpen(false); setContactSent(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">{t(AdminT.contactModalSent, lang)}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">{t(AdminT.contactModalDesc, lang)}</p>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3" placeholder={t(AdminT.contactModalPlaceholder, lang)} value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t(AdminT.contactModalBtn, lang)}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════ 检测认证 / 运输保险 咨询弹窗 ════ */}
      {serviceConsult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!serviceSending) setServiceConsult(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-teal-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                {serviceConsult.role === 'inspector' ? '🔬' : '🛡️'}
                {serviceConsult.label} {lang === 'en' ? 'Consultation' : '咨询'}
              </h3>
              <button onClick={() => { setServiceConsult(null); setServiceSent(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {serviceSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">{t(AdminT.consultSent, lang)}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {lang === 'en'
                    ? `You will be connected to a ${serviceConsult.label} provider via internal message. The first inquiry will also be sent by email.`
                    : `系统将随机为您联系一位${serviceConsult.label}服务人员，通过站内信沟通。首次咨询将同步发送邮件通知对方。`}
                </p>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder={lang === 'en' ? `Enter your ${serviceConsult.label} requirements...` : `请输入您的${serviceConsult.label}需求...`}
                  value={serviceText} onChange={e => setServiceText(e.target.value)} disabled={serviceSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleServiceConsultSend} disabled={serviceSending || !serviceText.trim()}>
                  {serviceSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? `Submit ${serviceConsult.label} Inquiry` : `提交${serviceConsult.label}咨询`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
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
        {/* 右上角语言切换（桌面端） */}
        <button
          className="fixed top-3 right-4 z-30 hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:shadow-md transition-all shadow-sm"
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
        >
          <Languages className="w-3.5 h-3.5" />
          <span className="font-semibold">{lang === 'zh' ? 'EN' : '中文'}</span>
        </button>
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* ── 移动端底部导航栏（角色感知） ── */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 lg:hidden flex safe-area-bottom">
          {(() => {
            const r = user?.role || '';
            const rc2 = getRoleChecks(r);
            const isAdmin = rc2.isAdmin;
            const isForwarder = rc2.isForwarder;
            const isRestricted = rc2.isRestricted;
            const isOverseasAgent = rc2.isOverseasAgent;

            const inboxLabel = t(AdminT.mobileInbox, lang);
            const profileLabel = t(AdminT.mobileProfile, lang);

            if (isRestricted) {
              return [
                { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true as const },
                { to: '/admin/profile', label: profileLabel, icon: User },
              ];
            }
            if (isOverseasAgent) {
              return [
                { to: '/admin/files', label: lang === 'en' ? 'Post' : '录数据', icon: Ship },
                { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true as const },
                { to: '/admin/profile', label: profileLabel, icon: User },
              ];
            }
            if (isAdmin) {
              return [
                { to: '/admin/files', label: lang === 'en' ? 'Home' : '首页', icon: Ship },
                { to: '/admin/expo-quick', label: lang === 'en' ? 'Scan' : '录入', icon: Camera },
                { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true as const },
                { to: '/admin/stats', label: lang === 'en' ? 'Stats' : '看板', icon: BarChart3 },
                { to: '/admin/profile', label: profileLabel, icon: User },
              ];
            }
            return [
              { to: '/admin/files', label: isForwarder ? (lang === 'en' ? 'Post' : '录数据') : (lang === 'en' ? 'Search' : '查舱位'), icon: Ship },
              { to: '/admin/dangerous-goods', label: lang === 'en' ? 'DG Agents' : '找代理', icon: AlertTriangle },
              { to: '/admin/inbox', label: inboxLabel, icon: Mail, badge: true as const },
              { to: '/admin/lawyers', label: lang === 'en' ? 'Lawyers' : '律师', icon: Scale },
              { to: '/admin/profile', label: profileLabel, icon: User },
            ];
          })().map((item: any) => {
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
                  {(item as any).badge && <MobileUnreadDot />}
                </div>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      {FEATURES.INBOX && <GlobalNotification />}
      <OnboardingGuide />
      <ToastContainer />
    </div>
  );
}
