import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnreadStore } from '../../store/unreadStore';
import { t, AdminT } from '../../i18n';
import { getRoleChecks } from '../../types';
import { FEATURES } from '../../config/features';
import {
  Shield, FileUp, User, MessageSquare, PenSquare, Mail, Ship,
  BarChart3, CreditCard, Bookmark, Building2, FileText, Scale,
  AlertTriangle, Handshake, Users, FileSpreadsheet, Globe, Gift,
  ChevronDown, Star, Key, Search,
} from 'lucide-react';

// ════════════════════════════════════════════
// 导航项生成 Hook
// ════════════════════════════════════════════
export function useNavItems() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const role = user?.role || '';
  const rc = getRoleChecks(role);
  const isRestricted = rc.isRestricted;
  const isOverseasAgent = rc.isOverseasAgent;
  const isBroker = rc.isBroker;
  const label = isOverseasAgent
    ? (lang === 'en' ? 'Publish Services' : '发布服务')
    : rc.isTrader
      ? (lang === 'en' ? 'Search Cargo' : '查舱位')
      : (lang === 'en' ? 'Post Cargo Space' : '货代发布舱位与特价');

  const restrictedItems: any[] = isRestricted ? [
    { to: '/admin/service-consults', label: lang === 'en'
      ? (role === 'inspector' ? '📋 Consultations' : '📋 Consultations')
      : (role === 'inspector' ? '📋 检测咨询' : '📋 保险咨询'), icon: MessageSquare },
  ] : [];

  const mainItems = isRestricted ? [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    ...restrictedItems,
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isBroker ? [
    { to: '/admin/broker-console', label: lang === 'en' ? '📊 Broker Console' : '📊 报关行工作台', icon: BarChart3 },
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 货运代理界面', icon: BarChart3 },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/company-profile', label: lang === 'en' ? '🏢 Company Page' : '🏢 公司主页', icon: Building2 },
    { to: '/admin/inspector-directory', label: lang === 'en' ? '🔬 Inspection' : '🔬 检测认证', icon: Search },
    { to: '/admin/insurer-directory', label: lang === 'en' ? '🛡️ Insurance' : '🛡️ 运输保险', icon: Shield },
    { to: '/admin/tools', label: lang === 'en' ? '🔧 Toolbox' : '🔧 工具箱', icon: Bookmark },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : rc.isLawyer ? [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/company-profile', label: lang === 'en' ? '🏢 Company Page' : '🏢 公司主页', icon: Building2 },
    { to: '/admin/broker-directory', label: lang === 'en' ? '🏢 Brokers' : '🏢 报关行', icon: Building2 },
    { to: '/admin/inspector-directory', label: lang === 'en' ? '🔬 Inspection' : '🔬 检测认证', icon: Search },
    { to: '/admin/insurer-directory', label: lang === 'en' ? '🛡️ Insurance' : '🛡️ 运输保险', icon: Shield },
    { to: '/admin/tools', label: lang === 'en' ? '🔧 Toolbox' : '🔧 工具箱', icon: Bookmark },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isOverseasAgent ? [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    { to: '/admin/subscribe', label: lang === 'en' ? '💳 Subscribe' : '💳 开通月费', icon: Gift },
    { to: '/admin/renew', label: lang === 'en' ? '🔄 Renew' : '🔄 续期', icon: CreditCard },
    { to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe },
    { to: '/admin/overseas-partners', label: lang === 'en' ? 'My Partners' : '我的合作商', icon: Handshake },
    { to: '/admin/company-profile', label: lang === 'en' ? '🏢 Company Page' : '🏢 公司主页', icon: Building2 },
    { to: '/admin/broker-directory', label: lang === 'en' ? '🏢 Brokers' : '🏢 报关行', icon: Building2 },
    { to: '/admin/inspector-directory', label: lang === 'en' ? '🔬 Inspection' : '🔬 检测认证', icon: Search },
    { to: '/admin/insurer-directory', label: lang === 'en' ? '🛡️ Insurance' : '🛡️ 运输保险', icon: Shield },
    { to: '/admin/tools', label: lang === 'en' ? '🔧 Toolbox' : '🔧 工具箱', icon: Bookmark },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : [
    { to: '/admin/dashboard', label: lang === 'en' ? '🏠 Dashboard' : '🏠 首页', icon: BarChart3 },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/files', label, icon: FileUp },
    ...(rc.isForwarder || rc.isAdmin || rc.isLawyer || rc.isInspector || rc.isInsurer ? [{ to: '/admin/subscribe', label: lang === 'en' ? '💳 Subscribe' : '💳 开通月费', icon: Gift }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/coupons', label: lang === 'en' ? '🎫 Coupons' : '🎫 报关券', icon: Gift }] : []),
    ...(rc.isForwarder || rc.isAdmin || rc.isTrader ? [{ to: '/admin/broker-directory', label: lang === 'en' ? '🏢 Brokers' : '🏢 报关行', icon: Building2 }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [
      { to: '/admin/inquiries', label: lang === 'en' ? '📋 Inquiries' : '📋 询盘管理', icon: MessageSquare },
      { to: '/admin/customer-relations', label: lang === 'en' ? '👥 Customers' : '👥 客户关系', icon: Users },
      { to: '/admin/my-posts', label: lang === 'en' ? '📦 My Posts' : '📦 我的发布', icon: FileUp },
      { to: '/admin/frequent-partners', label: lang === 'en' ? '⭐ Partners' : '⭐ 常往来合作商', icon: Star },
    ] : []),
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/dg-become-agent', label: lang === 'en' ? '☣️ Become DG Agent' : '☣️ 成为危险品代理', icon: AlertTriangle }] : []),
    { to: '/admin/dg-agent-directory', label: lang === 'en' ? '🏢 DG Agent Directory' : '🏢 危险品代理黄页', icon: Building2 },
    { to: '/admin/inspector-directory', label: lang === 'en' ? '🔬 Inspection' : '🔬 检测认证', icon: Search },
    { to: '/admin/insurer-directory', label: lang === 'en' ? '🛡️ Insurance' : '🛡️ 运输保险', icon: Shield },
    ...(rc.isTrader ? [] : [{ to: '/admin/overseas-partners', label: lang === 'en' ? 'Overseas Partners' : '我的海外合作商', icon: Handshake }]),
    ...(rc.isTrader ? [] : [{ to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe }]),
    ...(rc.isTrader ? [] : [{ to: '/admin/card-directory', label: lang === 'en' ? 'Directory' : '展会通讯录', icon: Users }]),
    { to: '/admin/company-profile', label: lang === 'en' ? '🏢 Company Page' : '🏢 公司主页', icon: Building2 },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ];

  const toolsItems = rc.isLawyer ? [] : [
    { to: "/admin/price-tables", label: rc.isTrader ? (lang === "en" ? "Price Table" : "运价表") : (lang === "en" ? "Price Tables" : "货代价格表"), icon: FileText },
    { to: "/admin/tools", label: lang === "en" ? "🔧 Toolbox" : "🔧 工具箱", icon: Bookmark },
    { to: "/admin/card-directory", label: lang === "en" ? "Directory" : "展会通讯录", icon: Users },
  ];

  const forwarderItems: any[] = rc.isTrader ? [
    { to: '/admin/coupon-wallet', label: lang === 'en' ? '🎫 My Coupons' : '🎫 我的券包', icon: Gift },
  ] : [];

  const lawyerItems: any[] = rc.isLawyer ? [
    { to: '/admin/lawyer-consults', label: lang === 'en' ? '📋 Consultations' : '📋 咨询管理', icon: MessageSquare },
  ] : [];

  const communityItems = FEATURES.AUDIT_MODE ? [] : [
    ...(isOverseasAgent ? [] : [{ to: '/admin/complaints', label: lang === 'en' ? '🔍 Company Lookup' : '🛡️ 货代避雷针', icon: MessageSquare, yellow: true }]),
    { to: '/admin/suggestions', label: lang === 'en' ? 'Suggestions' : '群友建议与问题解答', icon: PenSquare },
  ];

  const adminItems = rc.isAdmin ? [
    { to: '/admin/admin-center', label: '🏢 ' + (lang === 'en' ? 'Admin Center' : '管理中心'), icon: BarChart3 },
    { to: '/admin/api-keys', label: lang === 'en' ? '🔑 API Keys' : '🔑 API 密钥', icon: Key },
    { to: '/admin/broker-management', label: lang === 'en' ? 'Broker Mgmt' : '报关行管理', icon: Gift },
    { to: '/admin/raw-records', label: lang === 'en' ? 'Raw Records' : '数据录入原始记录', icon: FileText },
    { to: '/admin/batch-import', label: lang === 'en' ? 'Import Directory' : '通讯录导入', icon: FileSpreadsheet },
    { to: '/admin/complaint-appeals', label: lang === 'en' ? '📋 Appeal Mgmt' : '📋 申诉管理', icon: Scale },
  ] : [];

  // 网安审核模式
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    const keepPaths = ['/admin/dashboard', '/admin/files', '/admin/price-tables', '/admin/card-directory', '/admin/subscribe', '/admin/coupons', '/admin/coupon-wallet'];
    return {
      mainItems: mainItems.filter((item: any) => keepPaths.includes(item.to)),
      forwarderItems: forwarderItems.filter((item: any) => keepPaths.includes(item.to)),
      lawyerItems: [],
      communityItems: [],
      adminItems: [],
      toolsItems: [],
    };
  }

  return { mainItems, forwarderItems, lawyerItems, communityItems, adminItems, toolsItems };
}

// ════════════════════════════════════════════
// 未读角标
// ════════════════════════════════════════════
function UnreadBadge() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">{count > 99 ? '99+' : count}</span>;
}

/** 移动端底部导航未读红点 */
export function MobileUnreadDot() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />;
}

/** 可折叠侧边栏分区 */
export function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
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

// ════════════════════════════════════════════
// 侧边栏导航主体
// ════════════════════════════════════════════
interface SidebarNavProps {
  onCloseMobile: () => void;
}

export function SidebarNavContent({ onCloseMobile }: SidebarNavProps) {
  const lang = useAuthStore((s) => s.lang);
  const { mainItems, forwarderItems, lawyerItems, communityItems, adminItems, toolsItems } = useNavItems();

  const iconBg = (to: string) => {
    const map: Record<string, string> = {
      '/admin/dashboard': 'bg-gradient-to-br from-primary-500 to-indigo-500 text-white shadow-sm',
      '/admin/files': 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm',
      '/admin/coupon-wallet': 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-sm',
    };
    return map[to] || 'bg-gray-100 text-gray-500 group-hover:bg-gray-200';
  };

  return (
    <>
      <CollapsibleSection title={lang === 'en' ? 'Main Menu' : '主要功能'} defaultOpen={true}>
        {mainItems.map((item: any) => (
          <NavLink
            key={item.to} to={item.to} onClick={onCloseMobile}
            className={({ isActive }) =>
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
              (isActive
                ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
            }
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${iconBg(item.to)}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="truncate">{item.label}</span>
            {item.to === '/admin/inbox' && <UnreadBadge />}
          </NavLink>
        ))}
      </CollapsibleSection>

      {forwarderItems.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'Forwarder Zone' : '货代专区'} defaultOpen={true}>
          {forwarderItems.map((item: any) => (
            <NavLink key={item.to} to={item.to} onClick={onCloseMobile}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
              }
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 ${iconBg(item.to)}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>
      )}

      {lawyerItems.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? '⚖️ Lawyer Work' : '⚖️ 律师工作'} defaultOpen={true}>
          {lawyerItems.map((item: any) => (
            <NavLink key={item.to} to={item.to} onClick={onCloseMobile}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-sm border border-amber-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
              }
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 shadow-sm flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>
      )}

      <CollapsibleSection title={lang === 'en' ? 'Community' : '社区互动'} defaultOpen={true}>
        {communityItems.map((item: any) => (
          <NavLink key={item.to} to={item.to} onClick={onCloseMobile}
            className={({ isActive }) =>
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
              (isActive
                ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 shadow-sm border border-orange-100'
                : 'text-orange-600 hover:text-orange-700 hover:bg-white hover:shadow-sm hover:border hover:border-orange-200 border border-transparent')
            }
          >
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-500 group-hover:bg-orange-200 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4" />
            </div>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </CollapsibleSection>

      {toolsItems.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? '📋 More Tools' : '📋 更多工具'} defaultOpen={true}>
          {toolsItems.map((item: any) => (
            <NavLink key={item.to} to={item.to} onClick={onCloseMobile}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
              }
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>
      )}

      {adminItems.length > 0 && (
        <CollapsibleSection title={lang === 'en' ? 'System' : '系统管理'} defaultOpen={true}>
          {adminItems.map((item: any) => (
            <NavLink key={item.to} to={item.to} onClick={onCloseMobile}
              className={({ isActive }) =>
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ' +
                (isActive
                  ? 'bg-gradient-to-r from-primary-50 to-indigo-50 text-primary-700 shadow-sm border border-primary-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm hover:border hover:border-gray-200 border border-transparent')
              }
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4" />
              </div>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>
      )}
    </>
  );
}
