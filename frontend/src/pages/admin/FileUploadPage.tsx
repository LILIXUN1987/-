import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TextCargoInput from '../../components/admin/TextCargoInput';
import { cargoApi } from '../../api/cargo.api';
import { getRoleChecks } from '../../types';
import type { DashboardStats } from '../../types';
import {
  CheckCircle, MapPin, Users, Plane, Ship, Truck, Package,
  Search, Zap, Sparkles, Loader2,
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
import { Languages } from 'lucide-react';
import { FEATURES } from '../../config/features';

type TabKey = 'overview' | 'entry' | 'query' | 'quote';

export default function FileUploadPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const setLang = useAuthStore((s) => s.setLang);
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
      {/* ✏️ 货代发布舱位与特价 */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'entry' && (
        <>
          {/* 鼓励提示 */}
          <div className="bg-orange-500 text-white rounded-xl px-5 py-4 shadow-md mb-4">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">💡</span>
              <div>
                <p className="text-sm font-bold">您发布的舱位与特价越多，③ 用户寻舱位与特价 和 ④ 用户主动发需求 就越能第一时间推送给您，获得更多询价机会！</p>
              </div>
            </div>
          </div>

          {/* ═══ 逻辑闭环图 ═══ */}
          <LoopGraph />

          {/* 实时动态（体验期模块下方） */}
          <div className="mb-6">
            <ActivityFeed />
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入区域 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 录入卡片 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-gray-900">AI 智能录入</h2>
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-medium">Beta</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  用自然语言描述舱位信息，AI 自动解析为标准格式
                </p>
              </div>
              <div className="p-5">
                <div className="relative">
                  {isExpiredForwarder && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl cursor-pointer"
                      onClick={() => alert('⚠️ 体验期已结束，数据录入功能已暂停。\n\n请联系管理员续期以恢复全部功能。')}
                    >
                      <div className="text-center p-6">
                        <p className="text-sm font-bold text-red-800">体验期已结束</p>
                        <p className="text-xs text-red-600 mt-1">点击此处查看续期方式</p>
                      </div>
                    </div>
                  )}
                  <div className={isExpiredForwarder ? 'pointer-events-none select-none' : ''}>
                    <TextCargoInput onInserted={handleTextInserted} />
                  </div>
                </div>
              </div>
            </div>

            {/* 快速录入示例 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 快速录入示例</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { text: '深圳LAX空运 500kg 5cbm 每周135航班 EK航空', label: t(FileT.exAirExport, lang) },
                  { text: '宁波到洛杉矶海运 20GP 本周四截关 限重22吨', label: t(FileT.exSeaExport, lang) },
                  { text: '广州到河内陆运 每周3班 可接带电货', label: t(FileT.exLandExport, lang) },
                  { text: '深圳进口清关 普货 3工作日 包税', label: t(FileT.exImport, lang) },
                ].map((ex, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all cursor-pointer group"
                    onClick={() => { navigator.clipboard.writeText(ex.text); alert(`✅ 已复制示例到剪贴板\n\n请在输入框中粘贴(Ctrl+V)`); }}>
                    <span className="text-[10px] font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">{ex.label}</span>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 group-hover:text-gray-900">{ex.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 实时动态 */}
            <ActivityFeed />
          </div>

          {/* 右侧：录入小贴士 + 录入历史 */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-800 mb-2">💡 录入小贴士</h3>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li>• 包含 <strong>起运港+目的港</strong> 解析更准确</li>
                <li>• 注明 <strong>航司代码</strong>（如TK/EK/CZ）让查询更精准</li>
                <li>• 写清楚 <strong>体积/重量</strong> 方便客户匹配</li>
              </ul>
            </div>

            {/* 录入历史记录 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">📋 我的录入历史</h3>
                <a href="/admin/raw-records" className="text-xs text-primary-600 hover:text-primary-700 font-medium">查看全部 →</a>
              </div>
              <RawRecordsMini />
            </div>
          </div>
        </div>
        </>
      )}

      {/* ════════════════════════════════════════ */}
      {/* 🔍 用户寻舱位与特价（社区已存在） */}
      {/* ════════════════════════════════════════ */}
      {activeTab === 'query' && (
        <div className="space-y-4">
          {/* 提示：数据来源 */}
          <div className="bg-orange-500 text-white rounded-xl px-5 py-4 shadow-md">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">💡</span>
              <div>
                <p className="text-sm font-bold">以下舱位与特价信息均由 ② 货代发布舱位与特价 中的货代发布，查找后可直接联系询价</p>
              </div>
            </div>
          </div>

          <LoopGraph />

          {/* 实时动态 */}
          <ActivityFeed />

          {/* 快捷询价 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-gray-900">快捷询价</h2>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">推荐</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">输入您的货物信息，系统自动匹配货代</p>
            </div>
            <div className="p-5">
              <ExpressInquiryPanel />
            </div>
          </div>

          {/* 分类查询 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CategoryQueryPanel showOnly="空运出口" />
            <CategoryQueryPanel showOnly="海运出口" />
            <CategoryQueryPanel showOnly="空运外贸版" />
            <CategoryQueryPanel showOnly="陆运出口" />
            {!isTrader && <CategoryQueryPanel showOnly="其他" />}
            {isTrader && <TraderTrending />}
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
              <p className="text-sm font-bold">您发布需求后，将由系统中 ② 货代发布舱位与特价 模块中的货代为您报价，请耐心等待</p>
            </div>
          </div>
          <LoopGraph />
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <h3 className="text-sm font-bold text-gray-800 text-center mb-4">{t(FileT.loopTitle, lang)}</h3>
      <div className="flex items-center justify-center gap-0 sm:gap-2">
        <div className="flex flex-col items-center text-center w-28 sm:w-32">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl shadow-md shadow-primary-200">②</div>
          <div className="mt-2 text-xs font-bold text-primary-700 leading-tight">{t(FileT.loopStep2, lang)}</div>
          <div className="text-[10px] text-gray-400 mt-1">{t(FileT.loopStep2Sub, lang)}</div>
        </div>
        <div className="flex flex-col items-center"><span className="text-2xl text-gray-300">→</span><span className="text-[9px] text-gray-400 -mt-1">{t(FileT.loopMore, lang)}</span></div>
        <div className="flex flex-col items-center text-center w-28 sm:w-32">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-200">③</div>
          <div className="mt-2 text-xs font-bold text-blue-700 leading-tight">{t(FileT.loopStep3, lang)}</div>
          <div className="text-[10px] text-gray-400 mt-1">{t(FileT.loopStep3Sub, lang)}</div>
        </div>
        <div className="flex flex-col items-center"><span className="text-2xl text-gray-300">→</span><span className="text-[9px] text-gray-400 -mt-1">{t(FileT.loopInquiry, lang)}</span></div>
        <div className="flex flex-col items-center text-center w-28 sm:w-32">
          <div className="w-14 h-14 rounded-2xl bg-green-500 text-white flex items-center justify-center text-2xl shadow-md shadow-green-200">💰</div>
          <div className="mt-2 text-xs font-bold text-green-700 leading-tight">{t(FileT.loopStep4, lang)}</div>
          <div className="text-[10px] text-gray-400 mt-1">{t(FileT.loopStep4Sub, lang)}</div>
        </div>
      </div>
      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-1 text-[11px] text-primary-600 font-medium bg-primary-50 rounded-full px-4 py-1.5 border border-primary-200">
          <span className="text-lg">↩</span><span>{t(FileT.loopFooter, lang)}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5 border border-dashed border-gray-300">
        <span>💬</span>
        <span>{t(FileT.loopMatch, lang)}</span>
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
  if (!data?.data?.length) return <div className="text-center py-8 text-gray-400 text-xs">暂无录入记录，请在上方录入您的第一条推广信息</div>;

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
