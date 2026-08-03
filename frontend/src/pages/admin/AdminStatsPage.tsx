import { useState, useEffect, useMemo, useCallback } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type {
  AdminStatsResponse, UserAnalyticsRow, ActiveUserDetail, DailyTrend,
} from '../../types';
import {
  BarChart3, Users, Search, FileText, MessageSquare, Loader2, Activity, UserPlus,
  TrendingUp, Truck, User, AlertTriangle, RefreshCw, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../utils/time';

const ROLE_LABELS: Record<string, string> = { admin: '管理员', forwarder: '货运代理', trader: '外贸行业', lawyer: '社区律师', inspector: '检测认证', insurer: '运输保险', overseas_agent: '海外代理' };
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-50 text-red-700', forwarder: 'bg-blue-50 text-blue-700',
  trader: 'bg-green-50 text-green-700', lawyer: 'bg-amber-50 text-amber-700',
  inspector: 'bg-teal-50 text-teal-700', insurer: 'bg-rose-50 text-rose-700',
  overseas_agent: 'bg-purple-50 text-purple-700',
};

type TabKey = 'overview' | 'activity' | 'users';

export default function AdminStatsPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [analytics, setAnalytics] = useState<UserAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [activity, setActivity] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, act] = await Promise.all([
        client.get<AdminStatsResponse>('/admin/stats'),
        client.get<{ data: UserAnalyticsRow[] }>('/admin/user-analytics'),
        client.get('/admin/publish-stats'),
      ]);
      setStats(s.data);
      setAnalytics(a.data.data || []);
      setActivity(act.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 用户搜索过滤
  const filteredAnalytics = useMemo(() => {
    if (!userSearch.trim()) return analytics;
    const q = userSearch.trim().toLowerCase();
    return analytics.filter((u) =>
      u.display_name?.toLowerCase().includes(q) ||
      u.company_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [analytics, userSearch]);

  const roleBreakdown = stats?.total?.roleBreakdown || {};

  if (user?.role !== 'admin') {
    return <div className="text-center py-16 text-gray-400">仅管理员可查看</div>;
  }

  return (
    <div>
      {/* ── 标题栏 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">运营管理</h1>
            <p className="text-sm text-gray-500">实时了解社区运营状况 · 用户分析 · 数据看板</p>
          </div>
        </div>
        <button
          className="btn-outline text-sm flex items-center gap-1.5"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : !stats ? (
        <div className="text-center py-16 text-gray-400">暂无数据</div>
      ) : (
        <>
          {/* ── Tab Bar ── */}
          <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-md">
            {([{ key: 'overview', label: '📊 数据概览' }, { key: 'activity', label: '📋 活跃记录' }, { key: 'users', label: '👥 用户分析' }] as const).map((t) => (
              <button
                key={t.key}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ════════ 数据概览 ════════ */}
          {tab === 'overview' && <OverviewTab stats={stats} />}

          {/* ════════ 活跃记录 ════════ */}
          {tab === 'activity' && <ActivityTab activity={activity} />}

          {/* ════════ 用户分析 ════════ */}
          {tab === 'users' && (
            <UsersTab
              analytics={filteredAnalytics}
              totalCount={analytics.length}
              search={userSearch}
              onSearchChange={setUserSearch}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── 数据概览子组件 ──
// ════════════════════════════════════════════
// 活跃记录 Tab
// ════════════════════════════════════════════
function ActivityTab({ activity }: { activity: any }) {
  if (!activity) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const { publishers, searchers, recentSearches, recentPublishes } = activity;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" />发布舱位的用户<span className="text-xs text-gray-400 font-normal">({publishers?.length || 0}人)</span></h3>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {publishers?.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <div className="min-w-0 flex-1"><span className="font-medium text-gray-800 truncate">{u.display_name}</span><span className="text-gray-400 ml-1.5 truncate">{u.company_name || ''}</span></div>
                <span className="text-blue-600 font-bold ml-2 flex-shrink-0">{u.count}条</span><span className="text-gray-400 ml-2 flex-shrink-0 text-[10px]">{u.last_at?.slice(0,10)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Search className="w-4 h-4 text-green-500" />搜索过的用户<span className="text-xs text-gray-400 font-normal">({searchers?.length || 0}人)</span></h3>
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {searchers?.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <div className="min-w-0 flex-1"><span className="font-medium text-gray-800 truncate">{u.display_name}</span><span className="text-gray-400 ml-1.5 truncate">{u.company_name || ''}</span></div>
                <span className="text-green-600 font-bold ml-2 flex-shrink-0">{u.count}次</span><span className="text-gray-400 ml-2 flex-shrink-0 text-[10px]">{u.last_at?.slice(0,10)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" />最近搜索关键词</h3>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-gray-400 border-b"><th className="pb-2 font-medium">用户</th><th className="pb-2 font-medium">分类</th><th className="pb-2 font-medium">关键词</th><th className="pb-2 font-medium">时间</th></tr></thead><tbody>
          {recentSearches?.map((s: any, i: number) => (<tr key={i} className="border-b border-gray-50"><td className="py-2"><span className="font-medium text-gray-800">{s.display_name}</span><span className="text-gray-400 ml-1">{s.company_name||''}</span></td><td className="py-2"><span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{s.category||'--'}</span></td><td className="py-2 text-gray-600 max-w-[200px] truncate">{s.keyword}</td><td className="py-2 text-gray-400">{s.created_at?.slice(0,16)}</td></tr>))}
        </tbody></table></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" />最近发布记录</h3>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-gray-400 border-b"><th className="pb-2 font-medium">用户</th><th className="pb-2 font-medium">分类</th><th className="pb-2 font-medium">内容</th><th className="pb-2 font-medium">时间</th></tr></thead><tbody>
          {recentPublishes?.map((p: any, i: number) => (<tr key={i} className="border-b border-gray-50"><td className="py-2"><span className="font-medium text-gray-800">{p.display_name}</span><span className="text-gray-400 ml-1">{p.company_name||''}</span></td><td className="py-2"><span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">{p.category||'--'}</span></td><td className="py-2 text-gray-600 max-w-[250px] truncate">{p.content}</td><td className="py-2 text-gray-400">{p.created_at?.slice(0,16)}</td></tr>))}
        </tbody></table></div>
      </div>
    </div>
  );
}

function OverviewTab({ stats }: { stats: AdminStatsResponse }) {
  const todayCards = [
    { label: '新增注册', value: stats.today?.newUsers, icon: UserPlus, bg: 'bg-green-50', text: 'text-green-600' },
    { label: '录入推广', value: stats.today?.newPush, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: '搜索次数', value: stats.today?.searches, icon: Search, bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: '匹配成功', value: stats.today?.matches, icon: MessageSquare, bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: '活跃用户', value: stats.today?.activeUsers, icon: Activity, bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: '📱 日活跃(DAU)', value: stats.today?.dau, icon: Users, bg: 'bg-rose-50', text: 'text-rose-600' },
    { label: '货代回复', value: stats.today?.activeForwarders, icon: Truck, bg: 'bg-cyan-50', text: 'text-cyan-600' },
  ];
  const roleBreakdown = stats.total?.roleBreakdown || {};

  return (
    <div>
      {/* 今日数据 */}
      <h3 className="text-sm font-medium text-gray-500 mb-3">
        📊 今日数据（{formatTime(new Date().toISOString(), 'MM-DD')}）
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {todayCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-4 text-center border border-gray-100`}>
            <card.icon className={`w-5 h-5 mx-auto mb-1.5 ${card.text}`} />
            <div className={`text-2xl font-bold ${card.text}`}>{card.value ?? '-'}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 累计 + 用户分类 + 热门搜索 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <CumulativePanel stats={stats} />
        <RolePanel roleBreakdown={roleBreakdown} />
        <HotSearchPanel activeUsers={stats.activeUserDetails} />
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {stats.dailySearches && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />搜索趋势
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailySearches}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'#9ca3af'}} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                  <Line type="monotone" dataKey="searches" stroke="#6366f1" strokeWidth={2} dot={{r:3}} name="搜索次数" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {stats.dailyNewUsers && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-gray-500" />新增注册趋势
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailyNewUsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'#9ca3af'}} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                  <Bar dataKey="newUsers" fill="#22c55e" radius={[4,4,0,0]} name="新增注册" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 日活跃趋势图（全宽，突出显示） */}
      {stats.dailyActive && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />📱 日活跃趋势（DAU）
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyActive}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{fontSize:11,fill:'#9ca3af'}} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
                <Line type="monotone" dataKey="dau" stroke="#e11d48" strokeWidth={3} dot={{r:4, fill:'#e11d48'}} name="日活跃用户" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-2">基于用户API请求记录，比搜索活跃数据更准确</p>
        </div>
      )}

      {/* 转化漏斗 */}
      {stats.funnel && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v2L12 17 4 6V4z"/></svg>
            近7天转化漏斗
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '搜索次数', value: stats.funnel.searches, color: 'bg-indigo-500', pct: 100 },
              { label: '匹配推送', value: stats.funnel.matches, color: 'bg-blue-500', pct: stats.funnel.searches > 0 ? Math.round(stats.funnel.matches / stats.funnel.searches * 100) : 0 },
              { label: '询价发起', value: stats.funnel.inquiries, color: 'bg-amber-500', pct: stats.funnel.matches > 0 ? Math.round(stats.funnel.inquiries / stats.funnel.matches * 100) : 0 },
              { label: '消息互动', value: stats.funnel.messages, color: 'bg-green-500', pct: stats.funnel.inquiries > 0 ? Math.round(stats.funnel.messages / stats.funnel.inquiries * 100) : 0 },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden mb-1.5">
                  <div className={`absolute bottom-0 left-0 right-0 ${item.color} rounded-t-sm transition-all`} style={{ height: `${Math.max(8, item.pct)}%` }} />
                </div>
                <div className="text-lg font-bold text-gray-800">{item.value}</div>
                <div className="text-[10px] text-gray-500">{item.label}</div>
                <div className="text-[10px] text-gray-400">{item.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 今日活跃用户明细 */}
      {stats.activeUserDetails && stats.activeUserDetails.length > 0 && (
        <ActiveUsersTable users={stats.activeUserDetails} />
      )}
    </div>
  );
}

// ── 累计数据面板 ──
function CumulativePanel({ stats }: { stats: AdminStatsResponse }) {
  const items = [
    { label: '总用户数', value: stats.total?.users, icon: Users, color: 'text-gray-700' },
    { label: '推广信息', value: stats.total?.cargos, icon: FileText, color: 'text-gray-700' },
    { label: '7天到期', value: stats.total?.expiringSoon, icon: Clock, color: 'text-amber-600' },
  ];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">📈 累计数据</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className={`text-lg font-bold ${item.color}`}>{item.value ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 用户分类面板 ──
function RolePanel({ roleBreakdown }: { roleBreakdown: Record<string, number> }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">👥 用户分类</h3>
      <div className="space-y-2">
        {Object.entries(roleBreakdown).map(([role, count]) => (
          <div key={role} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || 'bg-gray-100'}`}>
              {ROLE_LABELS[role] || role}
            </span>
            <span className="text-lg font-bold text-gray-800">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 热门搜索面板 ──
function HotSearchPanel({ activeUsers }: { activeUsers: ActiveUserDetail[] | undefined }) {
  const topUsers = activeUsers?.slice(0, 8) || [];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-xs font-medium text-gray-500 mb-3">🔥 今日热门搜索</h3>
      <div className="space-y-2 max-h-[160px] overflow-y-auto">
        {topUsers.map((u, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-gray-700 truncate">{u.display_name || u.company_name}</span>
            <span className="text-orange-600 font-medium ml-2">{u.search_count}次</span>
          </div>
        ))}
        {topUsers.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-4">暂无搜索记录</div>
        )}
      </div>
    </div>
  );
}

// ── 活跃用户明细表格 ──
function ActiveUsersTable({ users }: { users: ActiveUserDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? users : users.slice(0, 5);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-gray-500" />今日活跃用户明细（{users.length}人）
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2 font-medium">用户</th>
              <th className="pb-2 font-medium">角色</th>
              <th className="pb-2 font-medium">搜索次数</th>
              <th className="pb-2 font-medium">匹配推送</th>
            </tr>
          </thead>
          <tbody>
            {display.map((u, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2">
                  <span className="font-medium text-gray-800">{u.display_name}</span>
                  <span className="text-gray-400 ml-1">{u.company_name}</span>
                </td>
                <td className="py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="py-2 font-medium text-purple-600">{u.search_count}</td>
                <td className="py-2 font-medium text-amber-600">{u.push_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length > 5 && (
        <button
          className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? '收起' : `查看全部 ${users.length} 人`}
        </button>
      )}
    </div>
  );
}

// ── 用户分析子组件 ──
function UsersTab({
  analytics, totalCount, search, onSearchChange,
}: {
  analytics: UserAnalyticsRow[];
  totalCount: number;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* 折叠标题栏 */}
      <button
        className="w-full flex items-center justify-between gap-4 cursor-pointer group"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 whitespace-nowrap group-hover:text-primary-600 transition-colors">
          <Users className="w-4 h-4 text-gray-500 group-hover:text-primary-500 transition-colors" />
          全部用户详细分析（{analytics.length}/{totalCount}人）
        </h3>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder-gray-400"
              placeholder="搜索用户名/公司/邮箱..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onClick={(e) => { e.stopPropagation(); if (!open) setOpen(true); }}
            />
            {search && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={(e) => { e.stopPropagation(); onSearchChange(''); }}>
                ✕
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1 transition-colors">
            {open ? (
              <><ChevronUp className="w-4 h-4" /> 收起</>
            ) : (
              <><ChevronDown className="w-4 h-4" /> 展开查看</>
            )}
          </span>
        </div>
      </button>

      {/* 折叠内容 */}
      <div className={`transition-all duration-200 overflow-hidden ${open ? 'max-h-[6000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        {analytics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {search ? '未找到匹配的用户' : '暂无用户数据'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium whitespace-nowrap">用户</th>
                  <th className="pb-2 font-medium">角色</th>
                  <th className="pb-2 font-medium">状态</th>
                  <th className="pb-2 font-medium">邮箱</th>
                  <th className="pb-2 font-medium">注册时间</th>
                  <th className="pb-2 font-medium text-center">推广</th>
                  <th className="pb-2 font-medium text-center">搜索</th>
                  <th className="pb-2 font-medium text-center">推送</th>
                  <th className="pb-2 font-medium text-center">发信</th>
                  <th className="pb-2 font-medium text-center">收信</th>
                  <th className="pb-2 font-medium text-center">总消息</th>
                  <th className="pb-2 font-medium">到期</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 whitespace-nowrap">
                      <span className="font-medium text-gray-800">{u.display_name}</span>
                      <span className="text-gray-400 ml-1">({u.username})</span>
                      <div className="text-gray-400">{u.company_name || '-'}</div>
                    </td>
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        u.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500 max-w-[120px] truncate" title={u.email || ''}>{u.email || '-'}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{formatTime(u.created_at, 'MM-DD')}</td>
                    <td className="py-2 text-center font-medium text-blue-600">{u.cargo_count}</td>
                    <td className="py-2 text-center font-medium text-purple-600">{u.search_count}</td>
                    <td className="py-2 text-center font-medium text-amber-600">{u.push_count}</td>
                    <td className="py-2 text-center font-medium text-blue-600">{u.msg_sent}</td>
                    <td className="py-2 text-center font-medium text-green-600">{u.msg_received}</td>
                    <td className="py-2 text-center font-medium text-gray-700">{u.total_msgs}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {u.trial_end || (u.role !== 'admin' ? '永久' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
