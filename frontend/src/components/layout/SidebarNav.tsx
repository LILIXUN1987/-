import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnreadStore } from '../../store/unreadStore';
import { t, AdminT } from '../../i18n';
import { getRoleChecks } from '../../types';
import { FEATURES } from '../../config/features';
import {
  Shield, FileUp, User, MessageSquare, Mail, LayoutDashboard, Globe,
  BarChart3, CreditCard, Bookmark, Building2, Star,
  Handshake, Users, Gift, Search, ChevronDown, Key, FileText, Scale, FileSpreadsheet,
} from 'lucide-react';

export function useNavItems() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const role = user?.role || '';
  const rc = getRoleChecks(role);
  const isRestricted = rc.isRestricted;
  const isOverseasAgent = rc.isOverseasAgent;
  const isBroker = rc.isBroker;
  const isLawyer = rc.isLawyer;
  const isBountyHunter = rc.isBountyHunter;

  const restrictedItems: any[] = isRestricted ? [
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: Search },
  ] : [];

  const mainItems = isRestricted ? [
    { to: '/admin/dashboard', label: lang === 'en' ? 'Dashboard' : '首页', icon: LayoutDashboard },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    ...restrictedItems,
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isBroker ? [
    { to: '/admin/broker-console', label: lang === 'en' ? 'Broker Console' : '报关行工作台', icon: BarChart3 },
    { to: '/admin/dashboard', label: lang === 'en' ? 'Forwarder View' : '货代界面', icon: LayoutDashboard },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: Search },
    { to: '/admin/company-profile', label: lang === 'en' ? 'Company Page' : '公司主页', icon: Building2 },
    { to: '/admin/tools', label: lang === 'en' ? 'Tools' : '工具箱', icon: Bookmark },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isLawyer ? [
    { to: '/admin/dashboard', label: lang === 'en' ? 'Dashboard' : '首页', icon: LayoutDashboard },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: Search },
    { to: '/admin/company-profile', label: lang === 'en' ? 'Company Page' : '公司主页', icon: Building2 },
    { to: '/admin/tools', label: lang === 'en' ? 'Tools' : '工具箱', icon: Bookmark },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isOverseasAgent ? [
    { to: '/admin/dashboard', label: lang === 'en' ? 'Dashboard' : '首页', icon: LayoutDashboard },
    { to: '/admin/subscribe', label: lang === 'en' ? 'Subscribe' : '开通月费', icon: CreditCard },
    { to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe },
    { to: '/admin/overseas-partners', label: lang === 'en' ? 'Partners' : '我的合作商', icon: Handshake },
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: Search },
    { to: '/admin/company-profile', label: lang === 'en' ? 'Company Page' : '公司主页', icon: Building2 },
    { to: '/admin/tools', label: lang === 'en' ? 'Tools' : '工具箱', icon: Bookmark },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : isBountyHunter ? [
    { to: '/admin/dashboard', label: lang === 'en' ? '🎯 Bounty' : '🎯 悬赏中心', icon: LayoutDashboard },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ] : [
    { to: '/admin/dashboard', label: lang === 'en' ? 'Dashboard' : '首页', icon: LayoutDashboard },
    ...(FEATURES.INBOX ? [{ to: '/admin/inbox', label: t(AdminT.inbox, lang), icon: Mail }] : []),
    { to: '/admin/files', label: lang === 'en' ? 'Cargo Spaces' : '舱位管理', icon: FileUp },
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/subscribe', label: lang === 'en' ? 'Subscribe' : '开通月费', icon: CreditCard }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/consignee-pool', label: lang === 'en' ? 'Direct Customers' : '海外直客唤醒', icon: Globe }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [{ to: '/admin/coupons', label: lang === 'en' ? 'Coupons' : '报关券', icon: Gift }] : []),
    ...(rc.isForwarder || rc.isAdmin ? [
      { to: '/admin/inquiries', label: lang === 'en' ? 'Inquiries' : '询盘管理', icon: MessageSquare },
      { to: '/admin/customer-relations', label: lang === 'en' ? 'Customers' : '客户关系', icon: Users },
      { to: '/admin/my-posts', label: lang === 'en' ? 'My Posts' : '我的发布', icon: FileUp },
      { to: '/admin/frequent-partners', label: lang === 'en' ? 'Partners' : '常往来合作商', icon: Star },
    ] : []),
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: Search },
    ...(rc.isTrader ? [] : [{ to: '/admin/overseas-partners', label: lang === 'en' ? 'Overseas' : '海外合作商', icon: Handshake }]),
    ...(rc.isTrader ? [] : [{ to: '/admin/ddp', label: t(AdminT.ddp, lang), icon: Globe }]),
    { to: '/admin/company-profile', label: lang === 'en' ? 'Company Page' : '公司主页', icon: Building2 },
    { to: '/admin/profile', label: t(AdminT.profile, lang), icon: User },
  ];

  const toolsItems = [{ to: '/admin/tools', label: lang === 'en' ? 'Tools' : '工具箱', icon: Bookmark }];

  const forwarderItems: any[] = rc.isTrader ? [
    { to: '/admin/coupon-wallet', label: lang === 'en' ? 'My Coupons' : '我的券包', icon: Gift },
  ] : [];

  const communityItems = FEATURES.AUDIT_MODE ? [] : [
    ...(isOverseasAgent ? [] : [{ to: '/admin/complaints', label: lang === 'en' ? 'Company Lookup' : '货代避雷针', icon: Shield }]),
  ];

  const adminItems = rc.isAdmin ? [
    { to: '/admin/admin-center', label: lang === 'en' ? 'Admin Center' : '管理中心', icon: BarChart3 },
    { to: '/admin/api-keys', label: lang === 'en' ? 'API Keys' : 'API 密钥', icon: Key },
    { to: '/admin/broker-management', label: lang === 'en' ? 'Broker Mgmt' : '报关行管理', icon: Users },
    { to: '/admin/raw-records', label: lang === 'en' ? 'Raw Records' : '数据录入记录', icon: FileText },
    { to: '/admin/batch-import', label: lang === 'en' ? 'Import' : '通讯录导入', icon: FileSpreadsheet },
    { to: '/admin/complaint-appeals', label: lang === 'en' ? 'Appeals' : '申诉管理', icon: Scale },
  ] : [];

  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    const keepPaths = ['/admin/dashboard', '/admin/files', '/admin/subscribe', '/admin/coupons', '/admin/coupon-wallet'];
    return {
      mainItems: mainItems.filter((item: any) => keepPaths.includes(item.to)),
      forwarderItems: forwarderItems.filter((item: any) => keepPaths.includes(item.to)),
      communityItems: [],
      adminItems: [],
      toolsItems: [],
    };
  }

  return { mainItems, forwarderItems, communityItems, adminItems, toolsItems };
}

function UnreadBadge() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1.5 shadow-sm shadow-red-200">{count > 99 ? '99+' : count}</span>;
}

export function MobileUnreadDot() {
  const count = useUnreadStore((s) => s.count);
  if (count === 0) return null;
  return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />;
}

/* ── 可折叠分区 ── */
function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors">
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
        {title}
      </button>
      {open && <div className="space-y-0.5 ml-1">{children}</div>}
    </div>
  );
}

/* ── 导航项 ── */
function NavItem({ item, onCloseMobile }: { item: any; onCloseMobile: () => void }) {
  return (
    <NavLink
      key={item.to} to={item.to} onClick={onCloseMobile}
      className={({ isActive }) =>
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ' +
        (isActive
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:text-white hover:bg-white/5')
      }
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        item.to === '/admin/inbox' ? 'bg-indigo-500/20 text-indigo-300' :
        item.to === '/admin/dashboard' ? 'bg-blue-500/20 text-blue-300' :
        item.to === '/admin/consignee-pool' ? 'bg-amber-500/20 text-amber-300' :
        'bg-white/5 text-slate-300 group-hover:bg-white/10'
      }`}>
        <item.icon className="w-4 h-4" />
      </div>
      <span className="truncate flex-1">{item.label}</span>
      {item.to === '/admin/inbox' && <UnreadBadge />}
    </NavLink>
  );
}

interface SidebarNavProps { onCloseMobile: () => void; }

export function SidebarNavContent({ onCloseMobile }: SidebarNavProps) {
  const lang = useAuthStore((s) => s.lang);
  const { mainItems, forwarderItems, communityItems, adminItems, toolsItems } = useNavItems();

  return (
    <>
      <NavSection title={lang === 'en' ? 'Main' : '主要功能'}>
        {mainItems.map((item: any) => <NavItem key={item.to} item={item} onCloseMobile={onCloseMobile} />)}
      </NavSection>

      {forwarderItems.length > 0 && (
        <NavSection title={lang === 'en' ? 'Trader Zone' : '货代专区'}>
          {forwarderItems.map((item: any) => <NavItem key={item.to} item={item} onCloseMobile={onCloseMobile} />)}
        </NavSection>
      )}

      {communityItems.length > 0 && (
        <NavSection title={lang === 'en' ? 'Community' : '社区'}>
          {communityItems.map((item: any) => <NavItem key={item.to} item={item} onCloseMobile={onCloseMobile} />)}
        </NavSection>
      )}

      {toolsItems.length > 0 && (
        <NavSection title={lang === 'en' ? 'Tools' : '工具'}>
          {toolsItems.map((item: any) => <NavItem key={item.to} item={item} onCloseMobile={onCloseMobile} />)}
        </NavSection>
      )}

      {adminItems.length > 0 && (
        <NavSection title={lang === 'en' ? 'Admin' : '管理'}>
          {adminItems.map((item: any) => <NavItem key={item.to} item={item} onCloseMobile={onCloseMobile} />)}
        </NavSection>
      )}
    </>
  );
}
