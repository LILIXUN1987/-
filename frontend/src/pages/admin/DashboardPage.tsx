import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import {
  BarChart3, TrendingUp, Search, Users, MessageSquare, Gift,
  FileUp, Plane, Ship, Truck, Package, Eye, Inbox, Activity,
  Sparkles, ArrowRight, Clock, MapPin, Loader2, FileText,
  Handshake, AlertTriangle, Bookmark, Globe, FileSpreadsheet,
} from 'lucide-react';

interface DashboardData {
  user: {
    display_name: string;
    company_name: string;
    role: string;
    avatar: string | null;
    trial_end: string | null;
    email: string | null;
    phone: string | null;
    is_newbie: boolean;
  };
  globalStats: {
    totalUsers: number;
    availableCargos: number;
    regions: number;
    todayAir: number;
    todaySea: number;
    todayLand: number;
    todayExpress: number;
  };
  myStats: {
    totalCargos: number;
    activeCargos: number;
    totalViews: number;
    totalInquiries: number;
    topRoutes: Array<{
      origin_port: string;
      dest_port: string;
      region: string;
      view_count: number;
      inquiry_count: number;
    }>;
    weeklyViews: Array<{ day: string; views: number }>;
  };
  trending: Array<{ keyword: string; count: number }>;
  todayStats: { searches: number; inquiries: number; newUsers: number };
  couponInfo: null | {
    subscribed?: boolean;
    total?: number;
    available?: number;
    used?: number;
    sent?: number;
    total_issued?: number;
    current_month?: string;
  };
  recentActivities: Array<{
    keyword: string;
    company: string;
    name: string;
    time: string;
  }>;
}

// Helper：时间格式化
function timeAgo(timeStr: string) {
  const diff = Date.now() - new Date(timeStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

// 根据时间段打招呼
function greet(lang: string) {
  const h = new Date().getHours();
  if (lang === 'en') {
    if (h < 6) return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 14) return 'Good noon';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }
  if (h < 6) return '🌅 夜深了';
  if (h < 9) return '🌅 早上好';
  if (h < 12) return '☀️ 上午好';
  if (h < 14) return '🌤️ 中午好';
  if (h < 18) return '🌇 下午好';
  return '🌃 晚上好';
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
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isForwarder = rc.isForwarder || rc.isAdmin;
  const isTrader = user?.role === 'trader';
  const isOverseasAgent = rc.isOverseasAgent;
  const isLawyer = rc.isLawyer;

  const greeting = greet(lang);
  const roleLabel = isForwarder ? (lang === 'en' ? 'Forwarder' : '货代')
    : isTrader ? (lang === 'en' ? 'Trader' : '外贸')
    : isOverseasAgent ? (lang === 'en' ? 'Overseas Agent' : '海外代理')
    : isLawyer ? (lang === 'en' ? 'Lawyer' : '律师')
    : user?.role || '';

  // ── 快捷入口 ──
  const quickActions = [
    ...(isForwarder ? [
      { to: '/admin/files?tab=entry', label: lang === 'en' ? '✏️ Post Cargo' : '✏️ 发布舱位', color: 'from-blue-500 to-blue-600', desc: lang === 'en' ? 'AI text input' : 'AI文字录入' },
      { to: '/admin/coupons', label: lang === 'en' ? '🎫 Coupons' : '🎫 报关券', color: 'from-pink-500 to-pink-600', desc: lang === 'en' ? 'Send to traders' : '赠送外贸客户' },
    ] : []),
    ...(isTrader ? [
      { to: '/admin/files?tab=query', label: lang === 'en' ? '🔍 Search Cargo' : '🔍 查舱位', color: 'from-blue-500 to-blue-600', desc: lang === 'en' ? 'Find space' : '查找运价' },
      { to: '/admin/coupon-wallet', label: lang === 'en' ? '🎫 My Coupons' : '🎫 我的券包', color: 'from-pink-500 to-pink-600', desc: lang === 'en' ? 'Use coupon' : '使用报关券' },
    ] : []),
    { to: '/admin/price-tables', label: lang === 'en' ? '📄 Price Tables' : '📄 价格表', color: 'from-purple-500 to-purple-600', desc: lang === 'en' ? 'Download rates' : '下载运价表' },
    { to: '/admin/port-services', label: lang === 'en' ? '🚛 Port Services' : '🚛 口岸服务', color: 'from-amber-500 to-amber-600', desc: lang === 'en' ? 'Port info' : '港口服务信息' },
    ...(!isTrader ? [
      { to: '/admin/dangerous-goods', label: lang === 'en' ? '⚠️ DG Agent' : '⚠️ 危险品代理', color: 'from-red-500 to-red-600', desc: lang === 'en' ? 'Find DG agent' : '找危险品代理' },
      { to: '/admin/overseas-partners', label: lang === 'en' ? '🤝 Partners' : '🤝 海外合作商', color: 'from-green-500 to-green-600', desc: lang === 'en' ? 'Overseas partners' : '管理合作商' },
    ] : []),
    { to: '/admin/inbox', label: lang === 'en' ? '💬 Inbox' : '💬 站内信', color: 'from-cyan-500 to-cyan-600', desc: lang === 'en' ? 'Messages' : '查看消息' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ═══ 欢迎横幅 ═══ */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold">
              {greeting}，{data?.user?.display_name || ''}
            </h1>
            <p className="text-sm text-white/70 mt-1 flex flex-wrap items-center gap-2">
              <span>{data?.user?.company_name || ''}</span>
              <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{roleLabel}</span>
              {data?.user?.is_newbie && (
                <span className="text-[11px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full">
                  {lang === 'en' ? 'Newbie' : '🌟 新手'}
                </span>
              )}
            </p>
          </div>
          {/* 今日概览小标签 */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-center px-3 py-1.5 bg-white/10 rounded-lg">
              <div className="font-bold text-lg">{data?.todayStats?.searches || 0}</div>
              <div className="text-[10px] text-white/60">{lang === 'en' ? 'Searches' : '今日搜索'}</div>
            </div>
            <div className="text-center px-3 py-1.5 bg-white/10 rounded-lg">
              <div className="font-bold text-lg">{data?.todayStats?.inquiries || 0}</div>
              <div className="text-[10px] text-white/60">{lang === 'en' ? 'Inquiries' : '今日询价'}</div>
            </div>
            <div className="text-center px-3 py-1.5 bg-white/10 rounded-lg">
              <div className="font-bold text-lg">{data?.todayStats?.newUsers || 0}</div>
              <div className="text-[10px] text-white/60">{lang === 'en' ? 'New Users' : '新用户'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 快捷入口 ═══ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary-500" />
          {lang === 'en' ? 'Quick Actions' : '🚀 快捷入口'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.to}
              onClick={() => navigate(action.to)}
              className="relative group text-left p-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white text-sm mb-2`}>
                {action.label.split(' ')[0]}
              </div>
              <div className="text-sm font-medium text-gray-800 leading-tight">
                {action.label.substring(action.label.indexOf(' ') + 1)}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{action.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ 主内容: 两列布局 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ─── 左侧：我的数据/趋势 ─── */}
        <div className="lg:col-span-2 space-y-5">

          {/* 我的统计卡片 */}
          {(isForwarder || isOverseasAgent) && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? 'My Stats' : '📊 我的数据'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{data?.myStats?.activeCargos || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Active Cargos' : '有效舱位'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{data?.myStats?.totalViews || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Total Views' : '被查看'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data?.myStats?.totalInquiries || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Inquiries' : '被询价'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{data?.myStats?.totalCargos || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Total Posted' : '累计发布'}</div>
                </div>
              </div>

              {/* 热门路线 */}
              {data?.myStats?.topRoutes && data.myStats.topRoutes.length > 0 && (
                <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    {lang === 'en' ? '🔥 Popular Routes' : '🔥 热门路线'}
                  </h3>
                  <div className="space-y-1.5">
                    {data.myStats.topRoutes.slice(0, 3).map((route, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {route.origin_port || '?'} → {route.dest_port || route.region || '?'}
                        </span>
                        <span className="text-xs text-gray-400">
                          👁 {route.view_count || 0} · 📩 {route.inquiry_count || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 外贸用户：显示平台热度和券包 */}
          {isTrader && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? 'Platform Overview' : '📦 平台概览'}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{data?.globalStats?.availableCargos || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Cargos Available' : '可用舱位'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{data?.globalStats?.totalUsers || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Total Users' : '注册用户'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data?.couponInfo?.available || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Coupons Available' : '可用券'}</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{data?.globalStats?.regions || 0}</div>
                  <div className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'Regions' : '覆盖地区'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 海外代理 */}
          {isOverseasAgent && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                {lang === 'en' ? '🌍 Platform Stats' : '🌍 平台数据'}
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-primary-600">{data?.globalStats?.totalUsers || 0}</div>
                  <div className="text-[11px] text-gray-500">{lang === 'en' ? 'Users' : '用户'}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{data?.globalStats?.availableCargos || 0}</div>
                  <div className="text-[11px] text-gray-500">{lang === 'en' ? 'Cargos' : '舱位'}</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-amber-600">{data?.globalStats?.regions || 0}</div>
                  <div className="text-[11px] text-gray-500">{lang === 'en' ? 'Regions' : '地区'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 今日热搜 */}
          {data?.trending && data.trending.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? '🔥 Trending Searches' : '🔥 今日热搜'}
              </h2>
              <div className="space-y-2">
                {data.trending.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        i < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <span className="text-sm text-gray-700">{item.keyword}</span>
                    </div>
                    <span className="text-xs text-gray-400">{item.count}{lang === 'en' ? ' searches' : '次搜索'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── 右侧：动态 + 全局统计 ─── */}
        <div className="space-y-5">

          {/* 平台全局统计 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary-500" />
              {lang === 'en' ? 'Platform Stats' : '📈 平台数据'}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" /> {lang === 'en' ? 'Users' : '注册用户'}
                </span>
                <span className="font-semibold">{data?.globalStats?.totalUsers || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-gray-400" /> {lang === 'en' ? 'Available' : '可用舱位'}
                </span>
                <span className="font-semibold">{data?.globalStats?.availableCargos || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> {lang === 'en' ? 'Regions' : '覆盖地区'}
                </span>
                <span className="font-semibold">{data?.globalStats?.regions || 0}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="text-xs text-gray-500 mb-2">{lang === 'en' ? 'Today\'s new cargos' : '今日新发布'}</div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-sky-50 rounded-lg p-2">
                    <div className="font-bold text-sky-700">{data?.globalStats?.todayAir || 0}</div>
                    <div className="text-sky-500">✈️</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="font-bold text-blue-700">{data?.globalStats?.todaySea || 0}</div>
                    <div className="text-blue-500">🚢</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <div className="font-bold text-amber-700">{data?.globalStats?.todayLand || 0}</div>
                    <div className="text-amber-500">🚚</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="font-bold text-green-700">{data?.globalStats?.todayExpress || 0}</div>
                    <div className="text-green-500">📦</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 报关券信息 */}
          {data?.couponInfo && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-500" />
                {lang === 'en' ? 'Coupons' : '🎫 报关券'}
              </h2>
              {'subscribed' in data.couponInfo ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{lang === 'en' ? 'Status' : '订阅状态'}</span>
                    <span className={data.couponInfo.subscribed ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                      {data.couponInfo.subscribed ? (lang === 'en' ? '✅ Active' : '✅ 已订阅') : (lang === 'en' ? 'Not subscribed' : '未订阅')}
                    </span>
                  </div>
                  {data.couponInfo.subscribed && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{lang === 'en' ? 'Issued' : '已发放'}</span>
                        <span className="font-semibold">{data.couponInfo.total_issued || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{lang === 'en' ? 'Sent' : '已赠送'}</span>
                        <span className="font-semibold text-pink-600">{data.couponInfo.sent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{lang === 'en' ? 'Used' : '已使用'}</span>
                        <span className="font-semibold text-green-600">{data.couponInfo.used || 0}</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{lang === 'en' ? 'Available' : '可用券'}</span>
                    <span className="font-bold text-lg text-pink-600">{data.couponInfo.available || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{lang === 'en' ? 'Used' : '已使用'}</span>
                    <span className="font-semibold">{data.couponInfo.used || 0}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 实时动态 */}
          {data?.recentActivities && data.recentActivities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? 'Recent Activity' : '⚡ 实时动态'}
              </h2>
              <div className="space-y-2.5">
                {data.recentActivities.slice(0, 5).map((act, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Search className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-gray-700">{act.company}</span>
                      <span className="text-gray-400"> {lang === 'en' ? 'searched' : '查询了'}</span>
                      <span className="text-primary-600 font-medium">「{act.keyword?.substring(0, 20)}」</span>
                      <div className="text-[10px] text-gray-300 mt-0.5">{timeAgo(act.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
