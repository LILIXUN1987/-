import { useState, useEffect, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import {
  BarChart3, TrendingUp, Search, Users, Gift,
  FileUp, Plane, Truck, Package, Eye, Activity,
  Sparkles, MapPin, Loader2, FileText,
  Handshake, AlertTriangle, Bookmark, Globe,
  Shield, Mail, MessageSquare, Scale, Star,
  Zap, Ship,
  Building2,
} from 'lucide-react';
import TrialBanner from '../../components/admin/TrialBanner';
import { useUnreadStore } from '../../store/unreadStore';
import { FEATURES } from '../../config/features';
import BusinessScopeModal from '../../components/admin/BusinessScopeModal';

interface DashboardData {
  user: { display_name: string; company_name: string; role: string; avatar: string | null; trial_end: string | null; email: string | null; phone: string | null; is_newbie: boolean; is_verified_company?: boolean; company_license?: string | null; business_scope?: string | null };
  globalStats: { totalUsers: number; availableCargos: number; regions: number; todayAir: number; todaySea: number; todayLand: number; todayExpress: number };
  myStats: { totalCargos: number; activeCargos: number; totalViews: number; totalInquiries: number; topRoutes: Array<{ origin_port: string; dest_port: string; region: string; view_count: number; inquiry_count: number }>; weeklyViews: Array<{ day: string; views: number }> };
  trending: Array<{ keyword: string; count: number }>;
  todayStats: { searches: number; inquiries: number; newUsers: number };
  couponInfo: null | { subscribed?: boolean; total?: number; available?: number; used?: number; sent?: number; total_issued?: number; current_month?: string };
  recentActivities: Array<{ keyword: string; company: string; name: string; time: string }>;
  pulse?: { searches: number; matches: number; newCargo: number; hotKeywords: string[] };
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

const BANNER_COLORS: Record<string, string> = {
  blue: 'from-blue-600 to-blue-500', emerald: 'from-emerald-600 to-emerald-500',
  orange: 'from-orange-600 to-orange-500', indigo: 'from-indigo-600 to-indigo-500',
  teal: 'from-teal-600 to-teal-500', sky: 'from-sky-600 to-sky-500',
  amber: 'from-amber-600 to-amber-500', pink: 'from-pink-600 to-pink-500',
  red: 'from-red-600 to-red-500', purple: 'from-purple-600 to-purple-500',
  violet: 'from-violet-600 to-violet-500', fuchsia: 'from-fuchsia-600 to-fuchsia-500',
  cyan: 'from-cyan-600 to-cyan-500', rose: 'from-rose-600 to-rose-500',
  green: 'from-green-600 to-green-500',
};

function BannerCard({ icon: Icon, title, subtitle, badge, color, onClick }: {
  icon: any; title: string; subtitle: string; badge: string; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`w-full h-full group text-left relative overflow-hidden bg-gradient-to-r ${BANNER_COLORS[color] || 'from-gray-600 to-gray-500'} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="relative p-5 flex items-center gap-4 min-h-[90px]">
        <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black text-white drop-shadow-sm tracking-wide">{title}</div>
          <div className="text-sm text-white/80 mt-1">{subtitle}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full">{badge}</span>
          </div>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:translate-x-1 transition-all">
          <span className="text-white text-xl font-bold">→</span>
        </div>
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);
  const unreadCount = useUnreadStore((s) => s.count);

  const { data, isLoading, isError, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => client.get('/dashboard').then((r) => r.data),
    refetchInterval: 120000,
    retry: 3,
    retryDelay: 2000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [latestItems, setLatestItems] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  const [probation, setProbation] = useState<any>(null);

  useEffect(() => {
    client.get("/cargo-spaces/trending").then(r => {
      const d = r.data as any;
      if (d) { setLatestItems(d.latest || []); setRecentSearches(d.recentSearches || []); }
    }).catch(() => {});
    client.get("/plans/probation").then(r => { if (r.data?.enrolled) setProbation(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try { const res = await client.get("/cargo-spaces/search-users", { params: { q } }); setSearchResults(res.data.data || []); setSearched(true); }
      catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Activity className="w-12 h-12 mb-4 text-gray-200" />
        <p className="text-sm mb-1">{lang === 'en' ? 'Failed to load dashboard' : '加载失败'}</p>
        <p className="text-xs text-gray-300 mb-4">{lang === 'en' ? 'Check your network or try again' : '请检查网络连接后重试'}</p>
        <button className="px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all" onClick={() => refetch()}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
          {lang === 'en' ? 'Retry' : '重新加载'}
        </button>
      </div>
    );
  }

  const isForwarder = rc.isForwarder;
  const isBroker = rc.isBroker;
  const isForwarderOrBroker = isForwarder || isBroker; // 报关行也看到货运代理界面
  const isAdmin = rc.isAdmin;
  const isTrader = user?.role === 'trader';
  const isLawyer = rc.isLawyer;
  const isRestricted = rc.isRestricted;
  const isOverseasAgent = rc.isOverseasAgent;
  const isOtherRole = !isForwarder && !isAdmin && !isTrader && !isOverseasAgent && !isLawyer && !isRestricted;
  const roleLabel = isForwarder ? (lang === 'en' ? 'Forwarder' : '货代') : isTrader ? (lang === 'en' ? 'Trader' : '外贸') : isOverseasAgent ? (lang === 'en' ? 'Overseas Agent' : '海外代理') : rc.isLawyer ? (lang === 'en' ? 'Lawyer' : '律师') : user?.role || '';
  const greeting = greet(lang);

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

      {/* ═══ 今日热搜（置顶） ═══ */}
      {data?.trending && data.trending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold text-gray-700">{lang === 'en' ? '🔥 Trending Searches' : '🔥 今日热搜'}</h2>
            <span className="text-[10px] text-gray-400 ml-auto">{lang === 'en' ? 'Real-time community searches' : '社区实时搜索趋势'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {data.trending.slice(0, 6).map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 hover:bg-orange-50 transition-colors cursor-pointer">
                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${i < 3 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{item.keyword}</div>
                  <div className="text-[10px] text-gray-400">{item.count}{lang === 'en' ? ' searches' : '次搜索'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 管理中心Banner（管理员专属） ═══ */}
      {isAdmin && (
        <button
          onClick={() => navigate('/admin/admin-center')}
          className="w-full group relative overflow-hidden rounded-2xl mb-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-gray-800 to-zinc-900" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 40% 30%, white 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
          <div className="absolute -top-16 right-10 w-48 h-48 bg-purple-500 rounded-full blur-[100px] opacity-15 group-hover:opacity-25 transition-opacity" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-amber-400 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity" />

          <div className="relative p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-xl shadow-purple-500/30 group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                <span className="text-[10px] font-bold bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full">管理中心</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {lang === 'en' ? 'Admin Control Center' : '🛠️ 后台管理中心'}
              </h2>
              <p className="text-sm text-gray-400 mt-1.5 max-w-2xl">
                {lang === 'en'
                  ? 'User management · Company verification · Audit logs · Broker management · Stats dashboard — everything in one place.'
                  : '运营看板 · 用户管理 · 企业认证 · 审核日志 · 报关行管理 · 数据看板 —— 一站式后台管理。'}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white font-bold text-sm group-hover:bg-white/20 transition-all">
              <span>{lang === 'en' ? 'Enter' : '进入'}</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </button>
      )}

      {/* ═══ 货代舱位大Banner（管理员专属） ═══ */}
      {isAdmin && (
        <button
          onClick={() => navigate('/admin/files?tab=query')}
          className="w-full group relative overflow-hidden rounded-2xl mb-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
        >
          {/* 背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-blue-950 to-indigo-950" />
          {/* 纹理 */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
          {/* 光效 */}
          <div className="absolute -top-10 right-20 w-40 h-40 bg-blue-400 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />
          <div className="absolute bottom-0 left-10 w-32 h-32 bg-indigo-400 rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity" />

          {/* 内容 */}
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-5">
            {/* 图标 */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300">
              <Package className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>

            {/* 文字 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {lang === 'en' ? 'Admin Panel' : '管理员面板'}
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {lang === 'en' ? 'Forwarder Cargo Spaces & Promotions' : '货代发布舱位与特价'}
              </h2>
              <p className="text-sm text-blue-200/80 mt-1.5 max-w-2xl">
                {lang === 'en'
                  ? 'Browse all cargo spaces published by forwarders. Search by airline, port, or route. View inquiry history and trending searches.'
                  : '浏览所有货代发布的舱位与特价信息。按航司、港口、航线搜索，查看询价记录和热门搜索趋势。'}
              </p>

              {/* 统计数据行 */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white">{data?.globalStats?.availableCargos || 0}</span>
                  <span>{lang === 'en' ? 'available spaces' : '可用舱位'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-bold text-white">{data?.globalStats?.todayAir || 0}</span>
                  <span>{lang === 'en' ? 'air today' : '今日空运'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="font-bold text-white">{data?.globalStats?.todaySea || 0}</span>
                  <span>{lang === 'en' ? 'sea today' : '今日海运'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/70 text-xs">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="font-bold text-white">{data?.globalStats?.regions || 0}</span>
                  <span>{lang === 'en' ? 'regions covered' : '覆盖地区'}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 backdrop-blur border border-white/10 text-white font-bold text-sm group-hover:bg-white/25 transition-all">
              <span>{lang === 'en' ? 'View All' : '查看全部'}</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </button>
      )}

      {/* ═══ 今日社区动态（货代可见） ═══ */}
      {(isForwarder || isAdmin) && data?.pulse && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-sm">📊</span>
              <h3 className="text-sm font-bold">{lang === 'en' ? 'Community Pulse Today' : '今日社区动态'}</h3>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">LIVE</span>
            </div>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <div className="text-lg font-black text-blue-600">{data.pulse.searches}</div>
                <div className="text-[10px] text-blue-500">{lang === 'en' ? 'Searches' : '今日搜索'}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-center">
                <div className="text-lg font-black text-amber-600">{data.pulse.matches}</div>
                <div className="text-[10px] text-amber-500">{lang === 'en' ? 'Inquiries' : '已推送询价'}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center">
                <div className="text-lg font-black text-emerald-600">{data.pulse.newCargo}</div>
                <div className="text-[10px] text-emerald-500">{lang === 'en' ? 'New Cargo' : '新增舱位'}</div>
              </div>
            </div>
            {data.pulse.hotKeywords?.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] mt-2">
                <span className="text-gray-400 flex-shrink-0">🔥</span>
                <div className="flex flex-wrap gap-1">
                  {data.pulse.hotKeywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ 企业认证提醒（仅货代可见） ═══ */}
      {isForwarder && !data?.user?.is_verified_company && !data?.user?.company_license && (
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 shadow-lg">
          {/* 装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-300/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative p-5 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* 图标 */}
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <span className="text-2xl">🏢</span>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {lang === 'en' ? 'Recommended' : '推荐'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-900">
                  {lang === 'en' ? 'Verify Your Company' : '上传营业执照，获得企业认证标识'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {lang === 'en'
                    ? 'Upload your business license to get the verified badge. Verified companies rank higher in search results.'
                    : '认证后可获得 🏢 标识，搜索结果中优先展示，客户更信任'}
                </p>

                {/* 好处列表 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                  {[
                    { icon: '🏢', zh: '搜索结果中显示「🏢 认证企业」标识，客户一眼看到', en: 'Show verified badge in search results' },
                    { icon: '📈', zh: '认证企业在搜索结果中排名靠前，获得更多曝光', en: 'Rank higher in search results, get more exposure' },
                    { icon: '🤝', zh: '客户更愿意联系认证企业，提升询价转化率', en: 'Build trust with clients, increase inquiry conversion' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/70 rounded-xl p-3 border border-amber-100">
                      <span className="text-base flex-shrink-0">{item.icon}</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{lang === 'en' ? item.en : item.zh}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate('/admin/profile')}
                className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
              >
                <span>{lang === 'en' ? 'Go Verify →' : '立即认证 →'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {latestItems.length > 0 && (
        <div className="mb-4"><div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-0">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LIVE</span>
            <span className="text-[10px] text-gray-400 font-medium ml-auto">{latestItems.length}{lang === 'en' ? ' posts' : '条舱位'}</span>
          </div>
          <div className="relative overflow-hidden py-3 px-2">
            <style>{'@keyframes m-scroll{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}.m-track{display:flex;animation:m-scroll 120s linear infinite;width:max-content}.m-track:hover{animation-play-state:paused}.m-track-slow{display:flex;animation:m-scroll 160s linear infinite;width:max-content}.m-track-slow:hover{animation-play-state:paused}'}</style>
            <div className="m-track gap-4">
              {[...latestItems, ...latestItems].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-gradient-to-r from-gray-50 to-white rounded-xl px-3.5 py-2 border border-gray-100 shadow-sm whitespace-nowrap flex-shrink-0 hover:border-primary-300 hover:shadow-md transition-all">
                  <span>{item.airline_code ? '✈️' : item.notes?.includes('DDP') ? '🌍' : '🚢'}</span>
                  <span className="text-sm font-bold">{item.origin_port||'?'}<span className="text-gray-300 mx-1">→</span>{item.dest_port||'?'}</span>
                  {item.company_name && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.company_name.substring(0, 8)}{item.company_name.length > 8 ? '…' : ''}</span>}
                  {item.price_per_cbm && <span className="text-xs font-bold text-emerald-600">¥{item.price_per_cbm}/CBM</span>}
                  <span className="text-[10px] text-gray-400">{item.created_at?.substring(5,10)||''}</span>
                  {item.is_newbie && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">NEW</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500" />
        </div></div>
      )}

      {recentSearches.length > 0 && (
        <div className="mb-4"><div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-0">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">INQUIRIES</span>
            <span className="text-[10px] text-gray-400 font-medium ml-auto">{recentSearches.length}{lang === 'en' ? ' inquiries' : '条实时需求'}</span>
          </div>
          <div className="relative overflow-hidden py-3 px-2">
            <div className="m-track-slow gap-4">
              {[...recentSearches, ...recentSearches].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-white rounded-xl px-3.5 py-2 border border-amber-100 shadow-sm">
                  {item.company_name && <span className="text-xs font-bold text-gray-800 bg-amber-100 px-2 py-0.5 rounded-full">🏢 {item.company_name.substring(0,10)}{item.company_name.length>10?'…':''}</span>}
                  <span className="text-sm font-bold text-gray-900">{item.keyword||'?'}</span>
                  <span className="text-[10px] text-gray-400">{item.created_at?.substring(5,10)||''}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-400" />
        </div></div>
      )}


      {/* ── 搜索面板 ── */}
      <div id="search-sec" className="mb-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-800">{lang === 'en' ? '🔍 Find Partners' : '🔍 搜同行 · 找公司'}</h2>
            <span className="text-[10px] text-gray-400 ml-auto">{lang === 'en' ? 'Search company or name' : '输入公司名或姓名'}</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-gray-50 focus:bg-white transition-colors"
              placeholder={lang === 'en' ? 'Search company or contact...' : '搜公司名、联系人...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary-500" />}
          </div>
          <div className="relative mt-3" style={{ minHeight: 60 }}>
            <div style={{ visibility: !searched ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              <div className="flex flex-wrap gap-2">
                {(lang === 'en' ? ['Logistics', 'Forwarders', 'Trade', 'Supply Chain', 'Shipping'] : ['物流', '货运代理', '进出口', '供应链', '贸易']).map((s, i) => (
                  <button key={i} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-50 hover:text-primary-700 border border-transparent hover:border-primary-200 transition-all" onClick={() => setSearchQuery(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ visibility: searched && searchResults.length > 0 ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              <div className="space-y-2">
                {searchResults.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all">
                    <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 ' + (u.role === 'forwarder' ? 'bg-blue-500' : u.role === 'trader' ? 'bg-emerald-500' : u.role === 'lawyer' ? 'bg-amber-500' : u.role === 'overseas_agent' ? 'bg-purple-500' : u.role === 'inspector' ? 'bg-teal-500' : u.role === 'insurer' ? 'bg-rose-500' : 'bg-gray-500')}>
                      {u.display_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={`/company/${u.id}`} target="_blank" className="font-bold text-sm text-gray-900 hover:text-primary-600 hover:underline truncate block">{u.company_name || u.display_name}</a>
                      <div className="text-[10px] text-gray-400">
                        {u.role === 'forwarder' ? (lang === 'en' ? 'Forwarder' : '货代') : u.role === 'trader' ? (lang === 'en' ? 'Trader' : '外贸') : u.role === 'lawyer' ? (lang === 'en' ? 'Lawyer' : '律师') : u.role === 'overseas_agent' ? (lang === 'en' ? 'Overseas' : '海外代理') : u.role === 'inspector' ? (lang === 'en' ? 'Inspector' : '检测认证') : u.role === 'insurer' ? (lang === 'en' ? 'Insurer' : '运输保险') : u.role}
                        {u.is_newbie ? ' · NEW' : ''}
                      </div>
                    </div>
                    <button onClick={async () => { const msg = prompt(lang === 'en' ? `Send message to ${u.display_name}:` : `发站内信给 ${u.display_name}：`); if (!msg?.trim()) return; try { await client.post('/messages', { receiver_id: u.id, content: msg.trim() }); alert('✅ ' + (lang === 'en' ? 'Sent' : '已发送')); } catch { alert(lang === 'en' ? 'Failed' : '发送失败'); } }}
                      className="flex-shrink-0 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-3 py-1.5 border border-primary-200 transition-colors">
                      <MessageSquare className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Contact' : '联系'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ visibility: searched && searchResults.length === 0 ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              <div className="text-center py-8 text-gray-400 text-sm">
                <Search className="w-6 h-6 mx-auto mb-1 opacity-50" />
                {lang === 'en' ? 'No results found' : '没有找到匹配的公司或联系人'}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ── 核心业务：3列大Banner ── */}
      {(isForwarder || !isOverseasAgent) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {(isForwarder || isAdmin) && (
            <BannerCard icon={FileUp} title={lang === 'en' ? 'Post Cargo' : '发布舱位'}
              subtitle={lang === 'en' ? 'AI auto-parses, 3 seconds' : 'AI一键录入，3秒搞定'}
              badge={lang === 'en' ? 'Free' : '免费'} color="blue"
              onClick={() => navigate('/admin/files?tab=entry')} />
          )}
          {!isOverseasAgent && (
            <BannerCard icon={Search} title={lang === 'en' ? 'Search Cargo' : '查舱位'}
              subtitle={lang === 'en' ? 'Enter port code, instant results' : '输入港口代码，秒查全球舱位'}
              badge={lang === 'en' ? 'Free' : '免费'} color="emerald"
              onClick={() => navigate('/admin/files?tab=query')} />
          )}
          {!isOverseasAgent && !(FEATURES.AUDIT_MODE && !rc.isAdmin) && (
            <BannerCard icon={MessageSquare} title={lang === 'en' ? 'Inquire' : '物流询价'}
              subtitle={lang === 'en' ? 'Forwarders quote directly' : '货代在线报价，比打电话快10倍'}
              badge={lang === 'en' ? 'Free' : '免费'} color="orange"
              onClick={() => navigate('/admin/quote')} />
          )}
        </div>
      )}

      {/* ═══ 全部功能快捷入口 ═══ */}
      <div className="mb-6 space-y-4">
        <SectionTitle icon={<Sparkles className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'All Features' : '全部功能'} />

        {/* ── 货代/管理员 ── */}
        {(isForwarder || isAdmin) && (
          <>
            {!isLawyer && !isRestricted && !isOverseasAgent && <TrialBanner />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BannerCard icon={MessageSquare} title={lang === 'en' ? 'Inquiries' : '询盘管理'} subtitle={lang === 'en' ? 'Manage trader inquiries' : '统一管理外贸询价'} badge="📋" color="indigo" onClick={() => navigate('/admin/inquiries')} />
              <BannerCard icon={Users} title={lang === 'en' ? 'Customers' : '客户关系'} subtitle={lang === 'en' ? 'Track relationships' : '收券/询价客户追踪'} badge="👥" color="teal" onClick={() => navigate('/admin/customer-relations')} />
              <BannerCard icon={FileUp} title={lang === 'en' ? 'My Posts' : '我的发布'} subtitle={lang === 'en' ? 'Published cargo spaces' : '查看已发布舱位记录'} badge="📦" color="sky" onClick={() => navigate('/admin/my-posts')} />
              <BannerCard icon={Star} title={lang === 'en' ? 'Partners' : '常往来合作商'} subtitle={lang === 'en' ? 'Frequent partners' : '报关行/代理快速联系'} badge="⭐" color="amber" onClick={() => navigate('/admin/frequent-partners')} />
              <BannerCard icon={Gift} title={lang === 'en' ? 'Coupons' : '报关券'} subtitle={lang === 'en' ? 'Customs clearance coupons' : '赠送报关券给合作报关行'} badge="🎫" color="pink" onClick={() => navigate('/admin/coupons')} />
              <BannerCard icon={Truck} title={lang === 'en' ? 'Port Services' : '口岸服务'} subtitle={lang === 'en' ? 'Trucking, warehousing & more' : '拖车·仓储·报关·熏蒸'} badge="🚚" color="orange" onClick={() => navigate('/admin/port-services')} />
              <BannerCard icon={Globe} title={lang === 'en' ? 'DDP' : '海外DDP'} subtitle={lang === 'en' ? 'Door-to-door overseas' : '海外代理门到门报价'} badge="🌍" color="indigo" onClick={() => navigate('/admin/ddp')} />
              <BannerCard icon={Handshake} title={lang === 'en' ? 'Partners' : '海外合作商'} subtitle={lang === 'en' ? 'Overseas partners network' : '管理和对接海外代理'} badge="🤝" color="green" onClick={() => navigate('/admin/overseas-partners')} />
              <BannerCard icon={AlertTriangle} title={lang === 'en' ? 'DG Agent' : '危险品代理'} subtitle={lang === 'en' ? 'Dangerous goods specialists' : '危品运输专家入驻'} badge="☣️" color="red" onClick={() => navigate('/admin/dg-become-agent')} />
              <BannerCard icon={FileText} title={lang === 'en' ? 'Price Tables' : '价格表'} subtitle={lang === 'en' ? 'Download & compare rates' : '下载运价表对比报价'} badge="📊" color="purple" onClick={() => navigate('/admin/price-tables')} />
              <BannerCard icon={Bookmark} title={lang === 'en' ? 'Directory' : '展会通讯录'} subtitle={lang === 'en' ? '3000+ contacts' : '3000+ 同行名录'} badge="📇" color="violet" onClick={() => navigate('/admin/card-directory')} />
              <BannerCard icon={Gift} title={lang === 'en' ? 'Subscribe' : '开通月费'} subtitle={lang === 'en' ? '19.9/mo' : '19.9/月 报关券+更多权益'} badge="💳" color="fuchsia" onClick={() => navigate('/admin/subscribe')} />
              <BannerCard icon={Mail} title={lang === 'en' ? 'Inbox' : '站内信'} subtitle={lang === 'en' ? 'Real-time messages' : '实时沟通与报价回复'} badge={unreadCount > 0 ? String(unreadCount) : '📩'} color="cyan" onClick={() => navigate('/admin/inbox')} />
              <BannerCard icon={Shield} title={lang === 'en' ? 'Company Lookup' : '货代避雷针'} subtitle={lang === 'en' ? 'Check reviews' : '合作前查口碑'} badge="🆓" color="rose" onClick={() => navigate('/admin/complaints')} />
              <BannerCard icon={Bookmark} title={lang === 'en' ? 'Tools' : '工具箱'} subtitle={lang === 'en' ? 'HS code, exchange rate & more' : '海关编码·汇率·时差查询'} badge="🔧" color="teal" onClick={() => navigate('/admin/tools')} />
              <BannerCard icon={MapPin} title={lang === 'en' ? 'Port & City Setup' : '口岸城市设置'} subtitle={lang === 'en' ? 'Set your ports to be found by overseas agents' : '设置你的口岸与城市，可被海外代理搜到'} badge="📍" color="blue" onClick={() => navigate('/admin/profile')} />
              <BannerCard icon={Search} title={lang === 'en' ? 'Find Partners' : '搜同行 · 找公司'} subtitle={lang === 'en' ? 'Search companies & contacts in the community' : '搜公司名、联系人，直达同行主页'} badge="🔍" color="indigo" onClick={() => { const el = document.getElementById('search-sec'); if (el) { el.scrollIntoView({ behavior: 'smooth' }); } }} />
            </div>
          </>
        )}

        {/* ── 外贸用户 ── */}
        {isTrader && (
          <>
            {!isLawyer && !isRestricted && !isOverseasAgent && <TrialBanner />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <BannerCard icon={Gift} title={lang === 'en' ? 'My Coupons' : '我的券包'} subtitle={lang === 'en' ? 'Coupons from forwarders' : '货代送的报关券'} badge="🎫" color="pink" onClick={() => navigate('/admin/coupon-wallet')} />
              <BannerCard icon={Scale} title={lang === 'en' ? 'Port Lawyers' : '口岸律师'} subtitle={lang === 'en' ? 'Legal services for logistics' : '合同审核·货代纠纷·法律咨询'} badge="⚖️" color="amber" onClick={() => navigate('/admin/lawyers')} />
              <BannerCard icon={Search} title={lang === 'en' ? 'Inspection & Cert' : '检测认证'} subtitle={lang === 'en' ? 'Inspection & compliance' : '验货·质检·合规认证'} badge="🔬" color="teal" onClick={() => navigate('/admin/inspector-directory')} />
              <BannerCard icon={Shield} title={lang === 'en' ? 'Cargo Insurance' : '运输保险'} subtitle={lang === 'en' ? 'Cargo & liability insurance' : '货运险·责任险·在线投保'} badge="🛡️" color="rose" onClick={() => navigate('/admin/insurer-directory')} />
              <BannerCard icon={Mail} title={lang === 'en' ? 'Inbox' : '站内信'} subtitle={lang === 'en' ? 'Real-time messages' : '实时沟通与报价回复'} badge={unreadCount > 0 ? String(unreadCount) : '📩'} color="cyan" onClick={() => navigate('/admin/inbox')} />
              <BannerCard icon={Shield} title={lang === 'en' ? 'Company Lookup' : '货代避雷针'} subtitle={lang === 'en' ? 'Check reviews' : '合作前查口碑'} badge="🆓" color="rose" onClick={() => navigate('/admin/complaints')} />
              <BannerCard icon={FileText} title={lang === 'en' ? 'Price Tables' : '价格表'} subtitle={lang === 'en' ? 'Download & compare rates' : '下载运价表对比报价'} badge="📊" color="purple" onClick={() => navigate('/admin/price-tables')} />
              <BannerCard icon={Bookmark} title={lang === 'en' ? 'Directory' : '展会通讯录'} subtitle={lang === 'en' ? '3000+ contacts' : '3000+ 同行名录'} badge="📇" color="violet" onClick={() => navigate('/admin/card-directory')} />
              <BannerCard icon={Bookmark} title={lang === 'en' ? 'Tools' : '工具箱'} subtitle={lang === 'en' ? 'HS code, exchange rate & more' : '海关编码·汇率·时差查询'} badge="🔧" color="teal" onClick={() => navigate('/admin/tools')} />
              <BannerCard icon={MapPin} title={lang === 'en' ? 'Port & City Setup' : '口岸城市设置'} subtitle={lang === 'en' ? 'Set your ports to be found by overseas agents' : '设置你的口岸与城市，可被海外代理搜到'} badge="📍" color="blue" onClick={() => navigate('/admin/profile')} />
              <BannerCard icon={Search} title={lang === 'en' ? 'Find Partners' : '搜同行 · 找公司'} subtitle={lang === 'en' ? 'Search companies & contacts in the community' : '搜公司名、联系人，直达同行主页'} badge="🔍" color="indigo" onClick={() => { const el = document.getElementById('search-sec'); if (el) { el.scrollIntoView({ behavior: 'smooth' }); } }} />
            </div>
          </>
        )}

        {/* ── 海外代理 ── */}
        {isOverseasAgent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BannerCard icon={Globe} title={lang === 'en' ? 'DDP Inquiries' : 'DDP询价'} subtitle={lang === 'en' ? 'Receive DDP inquiries' : '接收中国货代DDP询价'} badge="📬" color="indigo" onClick={() => navigate('/admin/ddp')} />
            <BannerCard icon={Handshake} title={lang === 'en' ? 'My Partners' : '我的合作商'} subtitle={lang === 'en' ? 'Manage partners' : '管理与货代的合作关系'} badge="🤝" color="green" onClick={() => navigate('/admin/overseas-partners')} />
            <BannerCard icon={Mail} title={lang === 'en' ? 'Inbox' : '站内信'} subtitle={lang === 'en' ? 'Real-time messages' : '实时沟通与报价回复'} badge={unreadCount > 0 ? String(unreadCount) : '📩'} color="cyan" onClick={() => navigate('/admin/inbox')} />
            <BannerCard icon={Shield} title={lang === 'en' ? 'Company Lookup' : '货代避雷针'} subtitle={lang === 'en' ? 'Check reviews' : '合作前查口碑'} badge="🆓" color="rose" onClick={() => navigate('/admin/complaints')} />
            <BannerCard icon={Bookmark} title={lang === 'en' ? 'Tools' : '工具箱'} subtitle={lang === 'en' ? 'HS code, exchange rate & more' : '海关编码·汇率·时差查询'} badge="🔧" color="teal" onClick={() => navigate('/admin/tools')} />
          </div>
        )}

        {/* ── 律师 ── */}
        {isLawyer && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BannerCard icon={Scale} title={lang === 'en' ? 'Consultations' : '咨询管理'} subtitle={lang === 'en' ? 'Manage legal consultations' : '查看和回复法律咨询'} badge="📋" color="amber" onClick={() => navigate('/admin/lawyer-consults')} />
            <BannerCard icon={Mail} title={lang === 'en' ? 'Inbox' : '站内信'} subtitle={lang === 'en' ? 'Real-time messages' : '实时沟通'} badge={unreadCount > 0 ? String(unreadCount) : '📩'} color="cyan" onClick={() => navigate('/admin/inbox')} />
            <BannerCard icon={Building2} title={lang === 'en' ? 'Company Page' : '公司主页'} subtitle={lang === 'en' ? 'Your public profile' : '编辑公开的公司主页'} badge="🏢" color="indigo" onClick={() => navigate('/admin/company-profile')} />
            <BannerCard icon={Building2} title={lang === 'en' ? 'Brokers' : '报关行'} subtitle={lang === 'en' ? 'Customs broker directory' : '查找合作报关行'} badge="🏢" color="teal" onClick={() => navigate('/admin/broker-directory')} />
            <BannerCard icon={Search} title={lang === 'en' ? 'Inspection' : '检测认证'} subtitle={lang === 'en' ? 'Inspection services' : '验货·质检服务商'} badge="🔬" color="teal" onClick={() => navigate('/admin/inspector-directory')} />
            <BannerCard icon={Shield} title={lang === 'en' ? 'Insurance' : '运输保险'} subtitle={lang === 'en' ? 'Cargo insurance' : '货运险服务商'} badge="🛡️" color="rose" onClick={() => navigate('/admin/insurer-directory')} />
            <BannerCard icon={Bookmark} title={lang === 'en' ? 'Tools' : '工具箱'} subtitle={lang === 'en' ? 'HS code, exchange rate & more' : '海关编码·汇率·时差查询'} badge="🔧" color="teal" onClick={() => navigate('/admin/tools')} />
          </div>
        )}

        {/* ── 检测/保险 ── */}
        {isRestricted && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BannerCard icon={MessageSquare} title={lang === 'en' ? 'Consultations' : (user?.role === 'inspector' ? '检测咨询' : '保险咨询')} subtitle={lang === 'en' ? 'Client consultations' : '查看客户咨询'} badge="📋" color="indigo" onClick={() => navigate('/admin/service-consults')} />
            <BannerCard icon={Mail} title={lang === 'en' ? 'Inbox' : '站内信'} subtitle={lang === 'en' ? 'Real-time messages' : '实时沟通'} badge={unreadCount > 0 ? String(unreadCount) : '📩'} color="cyan" onClick={() => navigate('/admin/inbox')} />
            <BannerCard icon={Bookmark} title={lang === 'en' ? 'Tools' : '工具箱'} subtitle={lang === 'en' ? 'HS code, exchange rate & more' : '海关编码·汇率·时差查询'} badge="🔧" color="teal" onClick={() => navigate('/admin/tools')} />
          </div>
        )}
      </div>

      {/* ═══ 数据查询：6大分类（货代/外贸可见） ═══ */}
      {!isOverseasAgent && !isLawyer && !isRestricted && (
        <div className="mb-6 space-y-4">
          <SectionTitle icon={<Search className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? '📊 Data Query' : '📊 数据查询'} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BannerCard icon={Zap} title={lang === 'en' ? 'Express Inquiry' : '快速询价'}
              subtitle={lang === 'en' ? 'AI-powered instant rate inquiry' : '输入需求，AI秒级匹配舱位报价'}
              badge="⚡" color="orange"
              onClick={() => navigate('/admin/files?tab=query')} />
            <BannerCard icon={Plane} title={lang === 'en' ? 'Air Export' : '空运出口'}
              subtitle={lang === 'en' ? 'Air freight cargo spaces' : '查看空运舱位与特价信息'}
              badge="✈️" color="sky"
              onClick={() => navigate('/admin/files?tab=query')} />
            <BannerCard icon={Ship} title={lang === 'en' ? 'Sea Export' : '海运出口'}
              subtitle={lang === 'en' ? 'Sea freight cargo spaces' : '查看海运舱位与特价信息'}
              badge="🚢" color="blue"
              onClick={() => navigate('/admin/files?tab=query')} />
            <BannerCard icon={Truck} title={lang === 'en' ? 'Land Export' : '陆运出口'}
              subtitle={lang === 'en' ? 'Land freight cargo spaces' : '查看陆运舱位与特价信息'}
              badge="🚛" color="amber"
              onClick={() => navigate('/admin/files?tab=query')} />
            <BannerCard icon={Globe} title={lang === 'en' ? 'Trader Version' : '空运外贸版'}
              subtitle={lang === 'en' ? 'Trader-oriented air freight' : '外贸用户专属空运报价展示'}
              badge="🌍" color="emerald"
              onClick={() => navigate('/admin/files?tab=query')} />
            {isTrader ? (
              <BannerCard icon={TrendingUp} title={lang === 'en' ? 'Hot Searches' : '热门搜索排行'}
                subtitle={lang === 'en' ? 'Trending search keywords' : '查看社区热搜关键词趋势'}
                badge="🔥" color="pink"
                onClick={() => navigate('/admin/files?tab=query')} />
            ) : (
              <BannerCard icon={Search} title={lang === 'en' ? 'Other Services' : '其他服务'}
                subtitle={lang === 'en' ? 'Express, rail & multimodal' : '快递·铁路·多式联运服务'}
                badge="🔍" color="purple"
                onClick={() => navigate('/admin/files?tab=query')} />
            )}
          </div>
        </div>
      )}

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

          {/* 货代考核进度（仅考核中用户可见） */}
          {isForwarder && probation?.current && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm p-5">
              <SectionTitle icon={<TrendingUp className="w-4 h-4 text-orange-500" />} title={lang === 'en' ? '📋 Monthly Targets' : '📋 考核进度'} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">
                  {lang === 'en' ? `Month ${probation.current.monthNumber}/3` : `第 ${probation.current.monthNumber}/3 个月`}
                  <span className="ml-2 text-[10px] text-orange-500 font-medium">
                    {probation.current.status === 'active' ? (lang === 'en' ? 'In Progress' : '考核中') : ''}
                  </span>
                </span>
                <span className="text-[10px] text-gray-400">{probation.current.probationMonth}</span>
              </div>
              {/* 发布舱位进度 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">📦 {lang === 'en' ? 'Cargo Posts' : '发布舱位'}</span>
                  <span className="text-xs font-bold">{probation.current.actualCargos} <span className="text-gray-400 font-normal">/ {probation.current.targetCargos}</span></span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                  <div className={`h-full rounded-full transition-all ${probation.current.progress.cargosPct >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                    style={{ width: `${probation.current.progress.cargosPct}%` }} />
                </div>
              </div>
              {/* 查询舱位进度 */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">🔍 {lang === 'en' ? 'Cargo Queries' : '查询舱位'}</span>
                  <span className="text-xs font-bold">{probation.current.actualQueries} <span className="text-gray-400 font-normal">/ {probation.current.targetQueries}</span></span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-200">
                  <div className={`h-full rounded-full transition-all ${probation.current.progress.queriesPct >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                    style={{ width: `${probation.current.progress.queriesPct}%` }} />
                </div>
              </div>
              {/* 下月目标预告 */}
              {probation.current.monthNumber < 3 && (
                <div className="text-[10px] text-gray-400 bg-white/70 rounded-lg p-2 mt-1">
                  {lang === 'en'
                    ? `Next month: ${probation.current.monthNumber === 1 ? 25 : 35} posts + ${probation.current.monthNumber === 1 ? 30 : 40} queries → Free for another month`
                    : `下月目标：${probation.current.monthNumber === 1 ? 25 : 35}条舱位 + ${probation.current.monthNumber === 1 ? 30 : 40}次查询 → 继续赠送标准版`}
                </div>
              )}
              {/* 历史记录 */}
              {probation.history?.length > 0 && probation.history.map((h: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 text-[10px] mt-1 px-2 py-1 rounded ${h.status === 'passed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {h.status === 'passed' ? '✅' : '❌'} {lang === 'en' ? `Month ${h.monthNumber}` : `第${h.monthNumber}月`}: {h.actualCargos}/{h.targetCargos} + {h.actualQueries}/{h.targetQueries} {h.status === 'passed' ? (lang === 'en' ? 'PASS' : '达标') : (lang === 'en' ? 'FAIL' : '未达标')}
                </div>
              ))}
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

          
          {/* 律师：咨询概览 */}
          {isLawyer && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<Scale className="w-4 h-4 text-amber-500" />} title={lang === 'en' ? 'My Consultations' : '我的咨询概览'} />
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{lang === 'en' ? 'Inbox + Consult Management' : '前往咨询管理查看咨询列表'}</span>
                  <button onClick={() => navigate('/admin/lawyer-consults')} className="text-amber-600 hover:text-amber-700 font-medium text-xs underline">
                    {lang === 'en' ? 'View →' : '查看 →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 检测/保险：平台概览 */}
          {isOtherRole && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <SectionTitle icon={<Package className="w-4 h-4 text-primary-500" />} title={lang === 'en' ? 'Platform Overview' : '平台概览'} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={data?.globalStats?.availableCargos} label={lang === 'en' ? 'Cargos' : '可用舱位'} icon={<Plane className="w-4 h-4 text-white" />} color="from-primary-500 to-primary-600" />
                <StatCard value={data?.globalStats?.totalUsers} label={lang === 'en' ? 'Users' : '注册用户'} icon={<Users className="w-4 h-4 text-white" />} color="from-green-500 to-green-600" />
                <StatCard value={data?.globalStats?.regions} label={lang === 'en' ? 'Regions' : '覆盖地区'} icon={<Globe className="w-4 h-4 text-white" />} color="from-purple-500 to-purple-600" />
                <StatCard value={data?.globalStats?.todayAir} label={lang === 'en' ? 'New Today' : '今日新发布'} icon={<TrendingUp className="w-4 h-4 text-white" />} color="from-amber-500 to-amber-600" />
              </div>
            </div>
          )}


          {/* 新手业务选择弹窗 */}
          {!isLawyer && !isRestricted && data?.user?.is_newbie && !data?.user?.business_scope && (
            <BusinessScopeModal onDone={() => {}} />
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
