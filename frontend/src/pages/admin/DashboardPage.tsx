import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import {
  BarChart3, TrendingUp, Search, Users, Gift,
  FileUp, Plane, Ship, Truck, Package, Eye, Activity,
  Sparkles, ArrowRight, Clock, MapPin, Loader2, FileText,
  Handshake, AlertTriangle, Bookmark, Globe,
} from 'lucide-react';
import TrialBanner from '../../components/admin/TrialBanner';
import ReferralBanner from '../../components/admin/ReferralBanner';
import InviteAgentCard from '../../components/admin/InviteAgentCard';
import RecommendPeerCard from '../../components/admin/RecommendPeerCard';

interface DashboardData {
  user: { display_name: string; company_name: string; role: string; avatar: string | null; trial_end: string | null; email: string | null; phone: string | null; is_newbie: boolean };
  globalStats: { totalUsers: number; availableCargos: number; regions: number; todayAir: number; todaySea: number; todayLand: number; todayExpress: number };
  myStats: { totalCargos: number; activeCargos: number; totalViews: number; totalInquiries: number; topRoutes: Array<{ origin_port: string; dest_port: string; region: string; view_count: number; inquiry_count: number }>; weeklyViews: Array<{ day: string; views: number }> };
  trending: Array<{ keyword: string; count: number }>;
  todayStats: { searches: number; inquiries: number; newUsers: number };
  couponInfo: null | { subscribed?: boolean; total?: number; available?: number; used?: number; sent?: number; total_issued?: number; current_month?: string };
  recentActivities: Array<{ keyword: string; company: string; name: string; time: string }>;
}

function timeAgo(timeStr: string) {
  const diff = Date.now() - new Date(timeStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function greet(lang: string) {
  const h = new Date().getHours();
  if (lang === 'en') {
    if (h < 6) return 'Good evening'; if (h < 12) return 'Good morning'; if (h < 14) return 'Good noon'; if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 6) return '🌅 夜深了'; if (h < 9) return '🌅 早上好'; if (h < 12) return '☀️ 上午好'; if (h < 14) return '🌤️ 中午好'; if (h < 18) return '🌇 下午好';
  return '🌃 晚上好';
}

/** 统一的 section 标题组件 */
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
      {icon}
      {title}
    </h2>
  );
}

/** 统计卡片 */
function StatCard({ value, label, icon, color }: { value: number | undefined; label: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all group cursor-default">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? '--'}</div>
    </div>
  );
}

/** 排行榜行 */
function RankRow({ rank, label, value, highlight }: { rank: number; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${rank < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{rank + 1}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-400">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => client.get('/dashboard').then((r) => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  const isForwarder = rc.isForwarder || rc.isAdmin;
  const isTrader = user?.role === 'trader';
  const isOverseasAgent = rc.isOverseasAgent;
  const roleLabel = isForwarder ? (lang === 'en' ? 'Forwarder' : '货代') : isTrader ? (lang === 'en' ? 'Trader' : '外贸') : isOverseasAgent ? (lang === 'en' ? 'Overseas Agent' : '海外代理') : rc.isLawyer ? (lang === 'en' ? 'Lawyer' : '律师') : user?.role || '';
  const greeting = greet(lang);

  const quickActions = [
    ...(isForwarder ? [{ to: '/admin/files?tab=entry', label: lang === 'en' ? 'Post Cargo' : '发布舱位', icon: <FileUp className="w-4 h-4 text-white" />, color: 'from-blue-500 to-blue-600' }, { to: '/admin/coupons', label: lang === 'en' ? 'Coupons' : '报关券', icon: <Gift className="w-4 h-4 text-white" />, color: 'from-pink-500 to-pink-600' }] : []),
    ...(isTrader ? [{ to: '/admin/files?tab=query', label: lang === 'en' ? 'Search Cargo' : '查舱位', icon: <Search className="w-4 h-4 text-white" />, color: 'from-blue-500 to-blue-600' }, { to: '/admin/coupon-wallet', label: lang === 'en' ? 'My Coupons' : '我的券包', icon: <Gift className="w-4 h-4 text-white" />, color: 'from-pink-500 to-pink-600' }] : []),
    { to: '/admin/price-tables', label: lang === 'en' ? 'Price Tables' : '价格表', icon: <FileText className="w-4 h-4 text-white" />, color: 'from-purple-500 to-purple-600' },
    { to: '/admin/port-services', label: lang === 'en' ? 'Port Services' : '口岸服务', icon: <Truck className="w-4 h-4 text-white" />, color: 'from-amber-500 to-amber-600' },
    ...(!isTrader ? [{ to: '/admin/dangerous-goods', label: lang === 'en' ? 'DG Agent' : '危险品代理', icon: <AlertTriangle className="w-4 h-4 text-white" />, color: 'from-red-500 to-red-600' }, { to: '/admin/overseas-partners', label: lang === 'en' ? 'Partners' : '海外合作商', icon: <Handshake className="w-4 h-4 text-white" />, color: 'from-green-500 to-green-600' }] : []),
    { to: '/admin/inbox', label: lang === 'en' ? 'Inbox' : '站内信', icon: <Package className="w-4 h-4 text-white" />, color: 'from-cyan-500 to-cyan-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* ═══ 欢迎横幅 ═══ */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 rounded-2xl shadow-md mb-6 p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold">{greeting}，{data?.user?.display_name || ''}</h1>
            <p className="text-sm text-white/70 mt-1 flex flex-wrap items-center gap-2">
              <span>{data?.user?.company_name || ''}</span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{roleLabel}</span>
              {data?.user?.is_newbie && <span className="text-[11px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full">{lang === 'en' ? 'Newbie' : '🌟 新手'}</span>}
            </p>
          </div>
          <div className="hidden sm:flex items-stretch gap-3">
            {[
              { value: data?.todayStats?.searches || 0, label: lang === 'en' ? 'Searches' : '今日搜索', icon: <Search className="w-3.5 h-3.5" /> },
              { value: data?.todayStats?.inquiries || 0, label: lang === 'en' ? 'Inquiries' : '今日询价', icon: <Activity className="w-3.5 h-3.5" /> },
              { value: data?.todayStats?.newUsers || 0, label: lang === 'en' ? 'New Users' : '新用户', icon: <Users className="w-3.5 h-3.5" /> },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center justify-center bg-white/10 backdrop-blur rounded-xl px-4 py-2 min-w-[80px]">
                <div className="flex items-center gap-1 text-white/60 text-[10px] mb-0.5">{s.icon} {s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 快捷入口 ═══ */}
      <div className="mb-4">
        <SectionTitle icon={<Sparkles className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Quick Actions' : '快捷入口'} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <button key={action.to} onClick={() => navigate(action.to)}
              className="group text-left p-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <div className="text-sm font-medium text-gray-800 leading-tight">{action.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 试用提醒 ═══ */}
      <div className="mb-4"><TrialBanner /></div>

      {/* ═══ 主内容: 两列 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* ─── 左列 ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* 我的数据统计 */}
          {(isForwarder || isOverseasAgent) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<BarChart3 className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'My Stats' : '我的数据'} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <StatCard value={data?.myStats?.activeCargos} label={lang === 'en' ? 'Active' : '有效舱位'} icon={<Package className="w-4 h-4 text-white" />} color="from-primary-500 to-primary-600" />
                <StatCard value={data?.myStats?.totalViews} label={lang === 'en' ? 'Views' : '被查看'} icon={<Eye className="w-4 h-4 text-white" />} color="from-green-500 to-green-600" />
                <StatCard value={data?.myStats?.totalInquiries} label={lang === 'en' ? 'Inquiries' : '被询价'} icon={<MessageSquare className="w-4 h-4 text-white" />} color="from-amber-500 to-amber-600" />
                <StatCard value={data?.myStats?.totalCargos} label={lang === 'en' ? 'Total' : '累计发布'} icon={<FileUp className="w-4 h-4 text-white" />} color="from-purple-500 to-purple-600" />
              </div>
              {data?.myStats?.topRoutes && data.myStats.topRoutes.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{lang === 'en' ? 'Top Routes' : '热门路线'} </div>
                  <div className="space-y-1">
                    {data.myStats.topRoutes.slice(0, 3).map((route, i) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700"><MapPin className="w-3 h-3 inline mr-1 text-primary-400" />{route.origin_port || '?'} → {route.dest_port || route.region || '?'}</span>
                        <span className="text-xs text-gray-400">👁 {route.view_count || 0} · 📩 {route.inquiry_count || 0}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 外贸用户：平台概览 */}
          {isTrader && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<Package className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Platform Overview' : '平台概览'} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={data?.globalStats?.availableCargos} label={lang === 'en' ? 'Cargos' : '可用舱位'} icon={<Plane className="w-4 h-4 text-white" />} color="from-primary-500 to-primary-600" />
                <StatCard value={data?.globalStats?.totalUsers} label={lang === 'en' ? 'Users' : '注册用户'} icon={<Users className="w-4 h-4 text-white" />} color="from-green-500 to-green-600" />
                <StatCard value={data?.couponInfo?.available} label={lang === 'en' ? 'Coupons' : '可用券'} icon={<Gift className="w-4 h-4 text-white" />} color="from-pink-500 to-pink-600" />
                <StatCard value={data?.globalStats?.regions} label={lang === 'en' ? 'Regions' : '覆盖地区'} icon={<Globe className="w-4 h-4 text-white" />} color="from-purple-500 to-purple-600" />
              </div>
            </div>
          )}

          {/* 海外代理 */}
          {isOverseasAgent && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<Globe className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Platform Overview' : '平台数据'} />
              <div className="grid grid-cols-3 gap-4 text-center">
                {[{ value: data?.globalStats?.totalUsers || 0, label: lang === 'en' ? 'Users' : '用户', icon: <Users className="w-4 h-4" />, color: 'text-primary-600' }, { value: data?.globalStats?.availableCargos || 0, label: lang === 'en' ? 'Cargos' : '舱位', icon: <Package className="w-4 h-4" />, color: 'text-green-600' }, { value: data?.globalStats?.regions || 0, label: lang === 'en' ? 'Regions' : '地区', icon: <MapPin className="w-4 h-4" />, color: 'text-amber-600' }].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">{s.icon} {s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 今日热搜 */}
          {data?.trending && data.trending.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<TrendingUp className="w-4 h-4 text-orange-500" />} title={lang === 'en' ? 'Trending Searches' : '今日热搜'} />
              <div className="space-y-1">
                {data.trending.slice(0, 6).map((item, i) => (
                  <RankRow key={i} rank={i} label={item.keyword} value={`${item.count}${lang === 'en' ? ' searches' : '次搜索'}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 右列 ─── */}
        <div className="space-y-5">
          {/* 平台数据 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <SectionTitle icon={<Activity className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Platform' : '平台数据'} />
            <div className="space-y-3">
              <StatRow icon={<Users className="w-3.5 h-3.5 text-gray-400" />} label={lang === 'en' ? 'Users' : '注册用户'} value={data?.globalStats?.totalUsers || 0} />
              <StatRow icon={<Package className="w-3.5 h-3.5 text-gray-400" />} label={lang === 'en' ? 'Available' : '可用舱位'} value={data?.globalStats?.availableCargos || 0} />
              <StatRow icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />} label={lang === 'en' ? 'Regions' : '覆盖地区'} value={data?.globalStats?.regions || 0} />
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="text-xs text-gray-500 mb-2">{lang === 'en' ? "Today's new" : '今日新发布'}</div>
                <div className="grid grid-cols-4 gap-2">
                  {[{ label: '✈️', value: data?.globalStats?.todayAir, bg: 'bg-sky-100 text-sky-700' }, { label: '🚢', value: data?.globalStats?.todaySea, bg: 'bg-blue-100 text-blue-700' }, { label: '🚚', value: data?.globalStats?.todayLand, bg: 'bg-amber-100 text-amber-700' }, { label: '📦', value: data?.globalStats?.todayExpress, bg: 'bg-green-100 text-green-700' }].map((s, i) => (
                    <div key={i} className={`rounded-lg p-2 text-center text-sm font-bold ${s.bg}`}>
                      <div>{s.label}</div>
                      <div className="text-xs opacity-80">{s.value || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 报关券 */}
          {data?.couponInfo && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<Gift className="w-4 h-4 text-pink-500" />} title={lang === 'en' ? 'Coupons' : '报关券'} />
              {'subscribed' in data.couponInfo ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{lang === 'en' ? 'Status' : '状态'}</span>
                    <span className={data.couponInfo.subscribed ? 'text-green-600 font-semibold' : 'text-gray-400'}>{data.couponInfo.subscribed ? (lang === 'en' ? '✅ Active' : '✅ 已订阅') : (lang === 'en' ? 'Not subscribed' : '未订阅')}</span>
                  </div>
                  {data.couponInfo.subscribed && (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">{lang === 'en' ? 'Issued' : '已发放'}</span><span className="font-semibold">{data.couponInfo.total_issued || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{lang === 'en' ? 'Sent' : '已赠送'}</span><span className="font-semibold text-pink-600">{data.couponInfo.sent || 0}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{lang === 'en' ? 'Used' : '已使用'}</span><span className="font-semibold text-green-600">{data.couponInfo.used || 0}</span></div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center"><span className="text-gray-500">{lang === 'en' ? 'Available' : '可用券'}</span><span className="text-xl font-bold text-pink-600">{data.couponInfo.available || 0}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">{lang === 'en' ? 'Used' : '已使用'}</span><span className="font-semibold">{data.couponInfo.used || 0}</span></div>
                </div>
              )}
            </div>
          )}

          {/* 实时动态 - 左右滚动 */}
          {data?.recentActivities && data.recentActivities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 overflow-hidden relative">
              <div className="flex items-center justify-between mb-3">
                <SectionTitle icon={<Activity className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Recent' : '实时动态'} />
                <span className="text-[10px] text-gray-300">{data.recentActivities.length}{lang === 'en' ? ' items' : '条'}</span>
              </div>
              <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)' }}>
                <style>{`
                  @keyframes scrollLeft {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                  .scroll-loop {
                    display: flex;
                    gap: 12px;
                    width: max-content;
                    animation: scrollLeft 40s linear infinite;
                  }
                  .scroll-loop:hover { animation-play-state: paused; }
                `}</style>
                <div className="scroll-loop">
                  {[...data.recentActivities, ...data.recentActivities].map((act, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-2.5 text-sm whitespace-nowrap flex-shrink-0 hover:shadow-sm transition-shadow">
                      <span className="text-xs font-medium text-blue-500 bg-white rounded-full px-2 py-0.5 shadow-sm border border-blue-100">⚡</span>
                      <span className="text-gray-700 font-medium">{act.company}</span>
                      <span className="text-gray-400">{lang === 'en' ? 'searched' : '查'}</span>
                      <span className="text-primary-600 font-semibold">「{act.keyword?.substring(0, 14)}」</span>
                      <span className="text-[10px] text-gray-300 ml-1">{timeAgo(act.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 社区推广 ═══ */}
      <div className="space-y-4 mb-6">
        <SectionTitle icon={<Users className="w-4 h-4 text-green-500" />} title={lang === 'en' ? 'Community Growth' : '社区推广'} />
        <ReferralBanner />
        {!(user?.role === 'trader') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InviteAgentCard />
            <RecommendPeerCard />
          </div>
        )}
      </div>
    </div>
  );
}

/** 统计行 */
function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 flex items-center gap-1.5">{icon} {label}</span>
      <span className="font-semibold text-gray-800">{value}</span>
    </div>
  );
}

/** 站内信图标修复 - 用于统计卡片 */
function MessageSquare(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
