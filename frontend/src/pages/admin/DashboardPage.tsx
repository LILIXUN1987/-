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
  Target,
  Building2,
} from 'lucide-react';
import { useUnreadStore } from '../../store/unreadStore';
import { FEATURES } from '../../config/features';
import BusinessScopeModal from '../../components/admin/BusinessScopeModal';
import RadarWins from '../../components/admin/RadarWins';

interface DashboardData {
  user: { display_name: string; company_name: string; role: string; avatar: string | null; trial_end: string | null; email: string | null; phone: string | null; is_newbie: boolean; is_verified_company?: boolean; company_license?: string | null; business_scope?: string | null };
  globalStats: { totalUsers: number; availableCargos: number; regions: number; todayAir: number; todaySea: number; todayLand: number; todayExpress: number };
  myStats: { totalCargos: number; activeCargos: number; totalViews: number; totalInquiries: number; topRoutes: Array<{ origin_port: string; dest_port: string; region: string; view_count: number; inquiry_count: number }>; weeklyViews: Array<{ day: string; views: number }> };
  todayStats: { searches: number; inquiries: number; newUsers: number };
  couponInfo: null | { subscribed?: boolean; total?: number; available?: number; used?: number; sent?: number; total_issued?: number; current_month?: string };
  recentActivities: Array<{ keyword: string; company: string; name: string; user_id: string; time: string }>;
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

function Shortcut({ label, to, icon, badge, highlight, onClick }: { label: string; to: string; icon?: string; badge?: string; highlight?: boolean; onClick?: () => void }) {
  const navigate = useNavigate();
  const handleClick = () => { if (onClick) onClick(); else if (to.startsWith('#')) { const el = document.getElementById(to.slice(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); } else navigate(to); };
  return (
    <button onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border text-left
        ${highlight ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:shadow-sm'}`}
    >
      {icon && <span className="text-sm">{icon}</span>}
      <span className="truncate flex-1">{label}</span>
      {badge && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1">{badge}</span>}
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
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<any>(null);
  const [cargoPaused, setCargoPaused] = useState(false);

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
test
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
