import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TextCargoInput from '../../components/admin/TextCargoInput';
import { cargoApi } from '../../api/cargo.api';
import { getRoleChecks } from '../../types';
import {
  CheckCircle, MapPin, Users, Plane, Ship, Truck, Package, AlertTriangle,
  Search, Zap, Sparkles, Loader2, Globe, Shield, BarChart3,
  ArrowRight, Compass, TrendingUp, Award,
} from 'lucide-react';
import CategoryQueryPanel from '../../components/admin/CategoryQueryPanel';
import TraderGuide from '../../components/admin/TraderGuide';
import TraderTrending from '../../components/admin/TraderTrending';
import ExpressInquiryPanel from '../../components/admin/ExpressInquiryPanel';
import ActivityFeed from '../../components/admin/ActivityFeed';
import { useAuthStore } from '../../store/authStore';
import QuotePage from './QuotePage';
import { rawMessagesApi, RawMessage } from '../../api/rawMessages.api';
import { formatTime } from '../../utils/time';
import { FileT, t } from '../../i18n';
import { FEATURES } from '../../config/features';

type TabKey = 'overview' | 'entry' | 'query' | 'quote';

export default function FileUploadPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);
  const isTrader = user?.role === 'trader';
  const isForwarder = user?.role === 'forwarder';
  const isExpiredForwarder = isForwarder && user?.trial_end
    ? new Date(user.trial_end + 'T23:59:59') < new Date()
    : false;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showTabHint, setShowTabHint] = useState(true);

  // 读取 URL 参数中的 tab，支持 ?tab=entry / ?tab=query / ?tab=quote 直接跳转
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabKey | null;
    if (tabParam && ['overview', 'entry', 'query', 'quote'].includes(tabParam)) {
      setActiveTab(tabParam);
      setShowTabHint(false);
    }
  }, []);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setShowTabHint(false);
    navigate(`/admin/files?tab=${tab}`, { replace: true });
  };

  const { data: stats } = useQuery({
    queryKey: ['cargo-stats'],
    queryFn: () => cargoApi.stats(),
    refetchInterval: 30000,
  });

  const handleTextInserted = () => {
    queryClient.invalidateQueries({ queryKey: ['cargo-stats'] });
  };

  const statCards = [
    { label: t(FileT.statGroupUsers, lang), value: stats?.users, icon: Users, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
    { label: t(FileT.statAvailable, lang), value: stats?.available, icon: CheckCircle, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
    { label: t(FileT.statRegions, lang), value: stats?.regions, icon: MapPin, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
    { label: t(FileT.statAir, lang), value: stats?.categories?.air, icon: Plane, color: 'from-sky-500 to-sky-600', bg: 'bg-sky-50' },
    { label: t(FileT.statSea, lang), value: stats?.categories?.sea, icon: Ship, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: t(FileT.statLand, lang), value: stats?.categories?.land, icon: Truck, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
  ];

  const tabs = [
    { key: 'overview' as const, label: '① 📊 ' + t(FileT.tabOverview, lang), desc: t(FileT.tabDescOverview, lang) },
    ...(!isTrader && !(FEATURES.AUDIT_MODE && !rc.isAdmin) ? [{ key: 'entry' as const, label: '② ✏️ ' + t(FileT.tabEntry, lang), desc: t(FileT.tabDescEntry, lang) }] : []),
    { key: 'query' as const, label: '③ 🔍 ' + t(FileT.tabQuery, lang), desc: t(FileT.tabDescQuery, lang) },
    ...(!(FEATURES.AUDIT_MODE && !rc.isAdmin) ? [{ key: 'quote' as const, label: '④ 💬 ' + t(FileT.tabQuote, lang), desc: t(FileT.tabDescQuote, lang) }] : []),
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── 顶部欢迎区 ── */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 rounded-2xl shadow-lg mb-6 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {isForwarder ? t(FileT.welcomeForwarder, lang) : isTrader ? t(FileT.welcomeTrader, lang) : rc.isLawyer ? t(FileT.welcomeLawyer, lang) : rc.isOverseasAgent ? t(FileT.welcomeAgent, lang) : t(FileT.welcomeAdmin, lang)}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              {user?.display_name} · {user?.company_name || ''}
              {user?.is_newbie && <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">{t(FileT.badgeNewbie, lang)}</span>}
            </p>
          </div>
          {/* 快捷统计 */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center px-3">
              <div className="text-2xl font-bold">{stats?.users || 0}</div>
              <div className="text-[10px] text-white/60">注册用户</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-bold">{stats?.available || 0}</div>
              <div className="text-[10px] text-white/60">可用仓位</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-bold">{stats?.regions || 0}</div>
              <div className="text-[10px] text-white/60">覆盖地区</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 功能入口卡片导航（4大模块） ── */}
      {showTabHint && (
        <div className="mb-4 p-4 bg-gradient-to-r from-primary-500 via-primary-600 to-indigo-600 rounded-2xl shadow-lg text-white text-center animate-pulse cursor-pointer"
          onClick={() => { handleTabChange('overview'); setShowTabHint(false); }}>
          <div className="text-2xl mb-1">👆 点击下方任意功能开始使用</div>
          <div className="text-sm text-white/80">根据您的需求选择对应入口</div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          // 从标签中提取编号、图标、标题
          // 格式: "① 📊 总览" → num="①", icon="📊", title="总览"
          const num = t.label.substring(0, 1);
          const iconAndTitle = t.label.substring(2).trim(); // "📊 总览"
          const icon = iconAndTitle.split(' ')[0]; // "📊"
          const title = iconAndTitle.substring(iconAndTitle.indexOf(' ') + 1); // "总览"
          return (
            <button key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100 scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* 编号 */}
              <div className={`text-2xl font-black mb-1.5 ${isActive ? 'text-orange-500' : 'text-orange-300'}`}>{num}</div>
              {/* Emoji 图标 */}
              <div className={`text-2xl mb-2 ${isActive ? '' : 'opacity-80'}`}>{icon}</div>
              {/* 标题 */}
              <div className={`text-sm font-bold leading-tight ${isActive ? 'text-primary-800' : 'text-gray-800'}`}>
                {title}
              </div>
              {/* 描述 */}
              <div className={`text-[11px] mt-1 ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                {t.desc}
              </div>
              {/* 选中指示器 */}
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>


      {/* ════════════════════════════════════════ */}
      {/* 📊 总览 */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all group cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-medium">{c.label}</span>
                  <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <c.icon className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{c.value ?? '--'}</div>
              </div>
            ))}
          </div>

          {/* 实时动态（放在显眼位置） */}
          <ActivityFeed />

          {/* 外贸热门搜索 */}
          {isTrader && <TraderTrending />}

          {/* 外贸专属引导 */}
          {isTrader && <TraderGuide />}
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* 🤝 航线资源互换站 */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'entry' && (
        <>
          {/* ── 顶部 KPI 驾驶舱 ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-200">
                  <span className="text-xl">📡</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {lang === 'en' ? '🤝 Route Exchange Hub' : '🤝 航线资源互换站'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {lang === 'en' ? 'Share what you have, get what you need — routes for leads, capacity for customers' : '你出运力，我出直客——每条优势航线都换来真实商机，共建共享共赢'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />JC TRANS
                </span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />WCA
                </span>
              </div>
            </div>
            {/* KPI 卡片 */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: '378', l: lang === 'en' ? 'Partners in Network' : '共建伙伴', s: '与你互换资源', c: 'text-indigo-600' },
                { v: '39', l: lang === 'en' ? 'Active Swaps Today' : '今日互换成功', s: '↑ 5%', c: 'text-emerald-600' },
                { v: '23', l: lang === 'en' ? 'Certified Partners' : '认证盟友', s: 'JC/WCA', c: 'text-amber-600' },
              ].map((k, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className={`text-xl font-black ${k.c}`}>{k.v}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{k.l}</div>
                  <div className="text-[10px] text-slate-400">{k.s}</div>
                </div>
              ))}
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入区域 */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI 智能录入卡片 */}
            <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg shadow-indigo-50 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-5 py-3.5 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="font-black text-base">{lang === 'en' ? '🤝 Share Your Routes' : '🤝 亮出你的优势航线'}</h2>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">以航线换商机</span>
                </div>
                <p className="text-xs text-indigo-100 mt-1">
                  {lang === 'en'
                    ? 'Paste your cargo info — AI parses it instantly. Your route enters the exchange pool and gets matched with real customers.'
                    : '粘贴你的舱位信息，AI 秒级解析。你的航线进入互换池，系统自动匹配真实直客——你出运力，平台出客户。'}
                </p>
              </div>
              <div className="p-5">
                <div className="relative">
                  {isExpiredForwarder && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl cursor-pointer"
                      onClick={() => alert('⚠️ 体验期已结束，数据录入功能已暂停。\n\n请联系管理员续期以恢复全部功能。')}>
                      <div className="text-center p-6"><p className="text-sm font-bold text-red-800">体验期已结束</p><p className="text-xs text-red-600 mt-1">点击此处查看续期方式</p></div>
                    </div>
                  )}
                  <div className={isExpiredForwarder ? 'pointer-events-none select-none' : ''}>
                    <TextCargoInput onInserted={handleTextInserted} />
                  </div>
                </div>
              </div>
            </div>

            {/* 快速录入示例 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3">{lang === 'en' ? '📋 Quick Examples — click to copy' : '📋 快速录入示例——点击复制'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { text: '深圳LAX空运 500kg 5cbm 每周135航班 EK航空', label: t(FileT.exAirExport, lang) },
                  { text: '宁波到洛杉矶海运 20GP 本周四截关 限重22吨', label: t(FileT.exSeaExport, lang) },
                  { text: '广州到河内陆运 每周3班 可接带电货', label: t(FileT.exLandExport, lang) },
                  { text: '深圳进口清关 普货 3工作日 包税', label: t(FileT.exImport, lang) },
                ].map((ex, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                    onClick={() => { navigator.clipboard.writeText(ex.text); alert('✅ 已复制，请在输入框中粘贴 (Ctrl+V)'); }}>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">{ex.label}</span>
                    <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 group-hover:text-slate-900">{ex.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：联盟特权 + 录入历史 */}
          <div className="space-y-4">
            {/* 联盟特权说明 */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />{lang === 'en' ? 'How It Works' : '互换规则——共建共赢'}
              </h3>
              <ul className="text-xs space-y-2">
                {[
                  { icon: '🤝', zh: '你出运力：录入优势航线 → 进入互换池', en: 'You share routes → enters exchange pool' },
                  { icon: '🎯', zh: '平台出客户：精准匹配搜索者 → 推送给你', en: 'Platform matches searchers → pushes to you' },
                  { icon: '📡', zh: '有人搜索即通知：站内信+邮件双通道', en: 'Instant alerts on searches — inbox + email' },
                  { icon: '🏆', zh: '共建共赢：每条航线都是商机入口', en: 'Win-win: every route is a lead magnet' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-amber-800">
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="leading-relaxed">{lang === 'en' ? item.en : item.zh}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 实时动态跑马灯 */}
            <div className="bg-slate-900 rounded-xl p-3 text-white overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'en' ? 'Live Feed' : '实时动态'}</span>
              </div>
              <div className="text-[10px] text-slate-400 space-y-1.5">
                <p>🟢 深圳天运刚用 JFK 航线换到一个直客询盘</p>
                <p>🟡 济南佑田的 LAX 航线正在被 3 个客户同时查看</p>
                <p>🔴 广州万邦刚亮出 FRA 运力，立即收到 2 条报价请求</p>
              </div>
            </div>

            {/* 情报录入历史 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">{lang === 'en' ? '📋 My Swap History' : '📋 我的互换记录'}</h3>
                <a href="/admin/raw-records" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">{lang === 'en' ? 'View All →' : '查看全部 →'}</a>
              </div>
              <RawRecordsMini />
            </div>
          </div>
        </div>
        </>
      )}

      {/* ════════════════════════════════════════ */}
      {/* 👁 实时监控——看看谁在搜索你的航线 */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'query' && (
        <div className="space-y-6">
          {/* ═══ Hero Header ═══ */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-3xl shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.06)_0%,transparent_60%)]" />
            <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 flex items-center justify-center shadow-xl shadow-blue-500/30 ring-4 ring-white/10 flex-shrink-0">
                  <Compass className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                      {t(FileT.queryHeroTitle, lang)}
                    </h1>
                    <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-[11px] font-bold text-white/80 border border-white/10">
                      🔍 {t(FileT.queryHeroBadge, lang)}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-white/60 mt-1.5 max-w-2xl leading-relaxed">
                    {t(FileT.queryHeroDesc, lang)}
                  </p>
                  {/* Stats row */}
                  <div className="flex items-center gap-4 sm:gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                        <Package className="w-4 h-4 text-white/80" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{stats?.available || 0}</div>
                        <div className="text-[10px] text-white/50">{t(FileT.statAvailable, lang)}</div>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                        <Globe className="w-4 h-4 text-white/80" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{stats?.regions || 0}</div>
                        <div className="text-[10px] text-white/50">{t(FileT.statRegions, lang)}</div>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                        <Users className="w-4 h-4 text-white/80" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{stats?.users || 0}</div>
                        <div className="text-[10px] text-white/50">{t(FileT.statGroupUsers, lang)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ 业务流程（紧凑） ═══ */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 px-4 py-3 mb-6 text-center">
            <p className="text-sm font-bold text-blue-800">
              {lang === 'en'
                ? '📡 ① Enter a port code → ② Radar scans all forwarder posts → ③ See who has cargo space → ④ Contact directly'
                : '📡 ① 输入港口代码 → ② 雷达扫描所有货代舱位 → ③ 查看谁有舱 → ④ 一键联系询价'}
            </p>
          </div>

          {/* ═══ 实时动态 ═══ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-gray-900 text-base">
                  {lang === 'en' ? '⚡ Live Feed' : '⚡ 实时动态'}
                </h2>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
            <div className="p-5">
              <ActivityFeed />
            </div>
          </div>

          {/* ═══ 快捷询价 ═══ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-base">{t(FileT.quickInquiryTitle, lang)}</h2>
                    <span className="text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-bold">{t(FileT.quickInquiryBadge, lang)}</span>
                  </div>
                  <p className="text-sm text-white/80 mt-0.5">{t(FileT.quickInquiryDesc, lang)}</p>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-white/40">
                  <Package className="w-5 h-5" />
                  <ArrowRight className="w-4 h-4" />
                  <Plane className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="p-5">
              <ExpressInquiryPanel />
            </div>
          </div>

          {/* ═══ 分类查询 ═══ */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Search className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t(FileT.categorySearchTitle, lang)}</h2>
              <span className="text-xs text-gray-400 ml-auto">{t(FileT.categorySearchHint, lang)}</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-sky-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-sky-400 to-blue-500" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-sky-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{t(FileT.catAirExport, lang)}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="空运出口" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-blue-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <Ship className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{t(FileT.catSeaExport, lang)}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="海运出口" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-amber-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-amber-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{t(FileT.catLandExport, lang)}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="陆运出口" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-emerald-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{t(FileT.catTraderVersion, lang)}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="空运外贸版" />
                </div>
              </div>

              {!isTrader && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-purple-200 transition-all duration-300">
                  <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500" />
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center">
                        <Search className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-gray-800">{t(FileT.catOther, lang)}</h3>
                    </div>
                    <CategoryQueryPanel showOnly="其他" />
                  </div>
                </div>
              )}

              {/* ── 危险品运输查询 ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-red-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-red-400 to-orange-500" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{lang === 'en' ? '☣️ Air DG' : '☣️ 空运危险品'}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="空运危险品" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-red-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{lang === 'en' ? '☣️ Sea DG' : '☣️ 海运危险品'}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="海运危险品" />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-red-200 transition-all duration-300">
                <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-600" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="font-bold text-gray-800">{lang === 'en' ? '☣️ Land DG' : '☣️ 陆运危险品'}</h3>
                  </div>
                  <CategoryQueryPanel showOnly="陆运危险品" />
                </div>
              </div>

              {isTrader && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md hover:border-pink-200 transition-all duration-300">
                  <div className="h-1.5 bg-gradient-to-r from-pink-400 to-rose-500" />
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-pink-600" />
                      </div>
                      <h3 className="font-bold text-gray-800">{lang === 'en' ? 'Hot Searches' : '热门搜索排行'}</h3>
                    </div>
                    <TraderTrending />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* 💬 物流询价 */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'quote' && (
        <>
          <div className="bg-orange-500 text-white rounded-xl px-5 py-4 shadow-md mb-4">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">💡</span>
              <p className="text-sm font-bold">发布需求后，系统将通知已部署雷达的货代——他们会主动联系你报价。</p>
            </div>
          </div>
          <QuotePage />
        </>
      )}
    </div>
  );
}

/** 逻辑闭环图 */
function LoopGraph() {
  const lang = useAuthStore((s) => s.lang);
  return (
    <div className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 overflow-hidden">
      {/* Animated CSS */}
      <style>{`
        @keyframes loop-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loop-dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -24; }
        }
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
        }
        @keyframes node-pulse-blue {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
        }
        @keyframes node-pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
        }
        @keyframes float-down {
          0%, 100% { transform: translateY(0); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @keyframes float-down-blue {
          0%, 100% { transform: translateY(0); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        .loop-particle-1 { animation: float-down 2.5s ease-in-out infinite; }
        .loop-particle-2 { animation: float-down 2.5s ease-in-out 0.8s infinite; }
        .loop-particle-3 { animation: float-down 2.5s ease-in-out 1.6s infinite; }
        .loop-particle-blue-1 { animation: float-down-blue 2.5s ease-in-out 0.4s infinite; }
        .loop-particle-blue-2 { animation: float-down-blue 2.5s ease-in-out 1.2s infinite; }
        .loop-particle-blue-3 { animation: float-down-blue 2.5s ease-in-out 2.0s infinite; }
      `}</style>

      <h3 className="text-sm font-bold text-gray-800 text-center mb-6">{t(FileT.loopTitle, lang)}</h3>

      {/* Loop SVG */}
      <div className="relative max-w-sm mx-auto">
        {/* SVG connecting lines (visible on sm+) */}
        <svg className="hidden sm:block absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 384 280" style={{ zIndex: 0 }}>
          {/* Dashed orbit ellipse */}
          <ellipse cx="192" cy="130" rx="150" ry="80" fill="none" stroke="#c7d2fe" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.5" />
          {/* Animated orbit arc (top-right sector glow) */}
          <path d="M 60 110 A 150 80 0 0 1 324 110" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="4 3" opacity="0.6"
            style={{ animation: 'loop-dash 1s linear infinite' }} />
          {/* Arrow from ②→③ */}
          <line x1="150" y1="105" x2="234" y2="105" stroke="#a5b4fc" strokeWidth="2" markerEnd="url(#arrow-primary)" />
          {/* Arrow from ③→💰 */}
          <line x1="288" y1="130" x2="230" y2="195" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrow-blue)" />
          {/* Arrow from 💰→② */}
          <line x1="154" y1="195" x2="96" y2="130" stroke="#34d399" strokeWidth="2" markerEnd="url(#arrow-green)" />
          {/* Defs */}
          <defs>
            <marker id="arrow-primary" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#818cf8" /></marker>
            <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#60a5fa" /></marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#34d399" /></marker>
          </defs>
        </svg>

        {/* Floating particles */}
        <div className="hidden sm:block absolute left-1/3 top-24 -translate-x-1/2 pointer-events-none z-10">
          <div className="loop-particle-1 w-2 h-2 rounded-full bg-primary-400 mx-auto" />
          <div className="loop-particle-2 w-2 h-2 rounded-full bg-primary-400 mx-auto -mt-1" />
          <div className="loop-particle-3 w-2 h-2 rounded-full bg-primary-400 mx-auto -mt-1" />
        </div>
        <div className="hidden sm:block absolute right-1/4 top-28 pointer-events-none z-10">
          <div className="loop-particle-blue-1 w-2 h-2 rounded-full bg-blue-400 mx-auto" />
          <div className="loop-particle-blue-2 w-2 h-2 rounded-full bg-blue-400 mx-auto -mt-1" />
          <div className="loop-particle-blue-3 w-2 h-2 rounded-full bg-blue-400 mx-auto -mt-1" />
        </div>

        <div className="relative z-20">
          {/* TOP ROW: ② and ③ */}
          <div className="grid grid-cols-2 gap-12 justify-items-center">
            {/* Step 2 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white transition-transform hover:scale-110 duration-300"
                style={{ animation: 'node-pulse 2.5s ease-in-out infinite' }}>
                ②
              </div>
              <div className="mt-2.5 text-xs font-bold text-primary-700 leading-tight">{t(FileT.loopStep2, lang)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 max-w-[100px] leading-snug">{t(FileT.loopStep2Sub, lang)}</div>
              <div className="text-[9px] text-primary-300 font-medium mt-1.5 bg-primary-50/70 px-2.5 py-0.5 rounded-full border border-primary-100">📊 {t(FileT.loopMore, lang)}</div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white transition-transform hover:scale-110 duration-300"
                style={{ animation: 'node-pulse-blue 2.5s ease-in-out 0.7s infinite' }}>
                ③
              </div>
              <div className="mt-2.5 text-xs font-bold text-blue-700 leading-tight">{t(FileT.loopStep3, lang)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 max-w-[100px] leading-snug">{t(FileT.loopStep3Sub, lang)}</div>
              <div className="text-[9px] text-blue-300 font-medium mt-1.5 bg-blue-50/70 px-2.5 py-0.5 rounded-full border border-blue-100">💬 {t(FileT.loopInquiry, lang)}</div>
            </div>
          </div>

          {/* BOTTOM: 💰 */}
          <div className="flex justify-center mt-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center text-2xl font-bold shadow-lg ring-4 ring-white transition-transform hover:scale-110 duration-300"
                style={{ animation: 'node-pulse-green 2.5s ease-in-out 1.4s infinite' }}>
                💰
              </div>
              <div className="mt-2.5 text-xs font-bold text-emerald-700 leading-tight">{t(FileT.loopStep4, lang)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] leading-snug">{t(FileT.loopStep4Sub, lang)}</div>
            </div>
          </div>
        </div>

        {/* Mobile arrows (visible only on small screens) */}
        <div className="sm:hidden flex justify-center gap-2 mt-2 text-lg text-gray-300">
          <span>② → ③ → 💰</span>
        </div>
      </div>

      {/* Bottom info */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <div className="inline-flex items-center gap-1.5 text-[11px] text-primary-600 font-medium bg-gradient-to-r from-primary-50 via-indigo-50 to-primary-50 rounded-full px-4 py-2 border border-primary-200 shadow-sm hover:shadow-md transition-shadow">
          <span className="text-lg leading-none animate-bounce">↩</span>
          <span>{t(FileT.loopFooter, lang)}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full px-4 py-2 border border-dashed border-gray-300">
          <span>💬</span>
          <span className="text-xs">{t(FileT.loopMatch, lang)}</span>
        </div>
      </div>
    </div>
  );
}

/** 个人录入历史（最近5条） */
function RawRecordsMini() {
  const lang = useAuthStore((s) => s.lang);
  const { data, isLoading } = useQuery({
    queryKey: ['raw-messages-mini'],
    queryFn: () => rawMessagesApi.list({ page: 1, limit: 5 }),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-center py-4 text-gray-400 text-xs"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />加载中...</div>;
  if (!data?.data?.length) return <div className="text-center py-8 text-gray-400 text-xs">暂无互换记录，亮出你的第一条优势航线开启共建</div>;

  return (
    <div className="space-y-1.5">
      {data.data.map((item: RawMessage) => (
        <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            item.category === '空运出口' ? 'bg-sky-100 text-sky-700' :
            item.category === '海运出口' ? 'bg-blue-100 text-blue-700' :
            item.category === '陆运出口' ? 'bg-amber-100 text-amber-700' :
            item.category ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {item.category || t(FileT.uncategorized, lang)}
          </span>
          <p className="flex-1 text-xs text-gray-600 truncate">{item.content?.substring(0, 40)}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(item.created_at, 'MM-DD')}</span>
          {item.cargo_count > 0 && (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{item.cargo_count}条</span>
          )}
        </div>
      ))}
    </div>
  );
}
