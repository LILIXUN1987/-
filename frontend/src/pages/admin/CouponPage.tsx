import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Gift, Send, History, Loader2,
  User, Users, Wallet, TrendingUp, Clock,
  MapPin, Building2, Search,
  Phone, MessageCircle, FileText, X,
} from 'lucide-react';
import { getRoleChecks } from '../../types';
import { toast } from '../../components/common/Toast';

type TabKey = 'send' | 'history' | 'pool';

interface TraderItem {
  id: string;
  displayName: string;
  companyName: string;
  searchCount: number;
  inquiryCount: number;
  lastActive: string | null;
}

interface CouponItem {
  id: string;
  faceValue: number;
  month: string;
  status: string;
  sentAt: string | null;
  usedAt: string | null;
  createdAt: string;
  traderName?: string;
  traderCompany?: string;
  brokerCompany?: string;
  forwarderName?: string;
  forwarderCompany?: string;
}

interface CouponStats {
  totalIssued: number;
  available: number;
  sent: number;
  used: number;
  expired: number;
  totalFaceValue: number;
  usedFaceValue: number;
  availableFaceValue: number;
  currentMonth: string;
  latestMonth: string;
  hasCurrentMonthAvailable: boolean;
  monthly: Array<{ month: string; issued: number; sent: number; used: number; expired: number; available: number }>;
  byFaceValue: Array<{ faceValue: number; count: number; total: number }>;
  expiryRange: { from: string; to: string } | null;
}

export default function CouponPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);

  // ══ 所有 Hooks 必须在条件返回之上 ══
  const [tab, setTab] = useState<TabKey>('send');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 外贸列表
  const [traders, setTraders] = useState<TraderItem[]>([]);
  const [tradersTotal, setTradersTotal] = useState(0);
  const [tradersPage, setTradersPage] = useState(1);
  const [tradersLoading, setTradersLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // 券列表
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponsTotal, setCouponsTotal] = useState(0);
  const [couponsPage, setCouponsPage] = useState(1);
  const [couponsLoading, setCouponsLoading] = useState(false);

  // 券池状态
  const [poolData, setPoolData] = useState<any>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [brokerModal, setBrokerModal] = useState<any>(null);
  const [brokerLoading, setBrokerLoading] = useState(false);

  const fetchPool = async (port?: string) => {
    setPoolLoading(true);
    try {
      const res = await client.get('/customs-coupons/available-by-port', { params: { port: port || undefined, mode: selectedMode || undefined } });
      setPoolData(res.data);
    } catch { setPoolData(null); }
    setPoolLoading(false);
  };

  useEffect(() => {
    if (tab === 'pool') fetchPool(selectedPort);
  }, [tab, selectedPort, selectedMode]);

  // ── 加载券统计 ──
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await client.get('/customs-coupons/my-stats');
      setStats(res.data.stats);
    } catch {}
    setStatsLoading(false);
  };

  useEffect(() => {
    Promise.all([loadStats()]).then(() => setLoading(false));
  }, []);

  // ── 加载外贸列表 ──
  const loadTraders = async (page = 1) => {
    setTradersLoading(true);
    try {
      const res = await client.get('/customs-coupons/traders', { params: { page } });
      setTraders(res.data.data);
      setTradersTotal(res.data.total);
      setTradersPage(page);
    } catch {}
    setTradersLoading(false);
  };

  // ── 加载券列表 ──
  const loadCoupons = async (page = 1) => {
    setCouponsLoading(true);
    try {
      const res = await client.get('/customs-coupons/my-coupons', { params: { role: 'forwarder', page } });
      setCoupons(res.data.data);
      setCouponsTotal(res.data.total);
      setCouponsPage(page);
    } catch {}
    setCouponsLoading(false);
  };

  useEffect(() => {
    if (tab === 'send') loadTraders();
    if (tab === 'history') loadCoupons();
  }, [tab]);

  // ── 送券 ──
  const handleSend = async (traderId: string) => {
    setSending(traderId);
    try {
      const res = await client.post('/customs-coupons/send', { traderId });
      toast.success(res.data.message);
      loadTraders(tradersPage);
      loadCoupons();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '赠送失败');
    }
    setSending(null);
  };

  // ── 券池：查看报关行详情 ──
  const handleShowBroker = async (coupon: any) => {
    setBrokerLoading(true);
    try {
      const brokersRes = await client.get('/customs-coupons/active-brokers');
      const brokers = brokersRes.data?.data || [];
      const match = brokers.find((b: any) => b.company_name === coupon.brokerCompany);
      if (match) {
        const detailRes = await client.get(`/customs-coupons/broker/${match.id}/detail`);
        setBrokerModal(detailRes.data);
      } else {
        setBrokerModal({
          companyName: coupon.brokerCompany,
          contactPerson: coupon.contactPerson || '',
          phone: coupon.phone || '',
          portName: coupon.portCity,
        });
      }
    } catch {
      setBrokerModal({ companyName: coupon.brokerCompany, portName: coupon.portCity });
    }
    setBrokerLoading(false);
  };

  // ══ 权限检查 ══
  if (!rc.isForwarder && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'No access' : '暂无权限查看'}</div>;
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const tabs = [
    { key: 'send' as TabKey, label: lang === 'en' ? 'Send Coupon' : '🎫 送券', icon: Send },
    { key: 'history' as TabKey, label: lang === 'en' ? 'History' : '📜 送券记录', icon: History },
    // 券池：管理员和付费货代可见（只读展示，订阅即自动发放，无需手动认领）
    ...(rc.isAdmin || rc.isForwarder ? [{ key: 'pool' as TabKey, label: lang === 'en' ? '🏊 Pool' : '🏊 券池', icon: Search }] : []),
  ];

  const fmtMonth = (m: string) => {
    const [y, mon] = m.split('-');
    return `${y}年${parseInt(mon)}月`;
  };

  const faceValueSummary = stats?.byFaceValue
    ?.map(fv => `¥${fv.faceValue}×${fv.count}`)
    .join(' + ') || '';

  // 券池：合并口岸统计
  const consolidatedPorts = poolData?.portStats?.reduce((acc: any[], p: any) => {
    const existing = acc.find((x: any) => x.port === p.port);
    if (existing) { existing.count += p.count; if (!existing.modes.includes(p.mode)) existing.modes.push(p.mode); }
    else acc.push({ port: p.port, count: p.count, modes: [p.mode] });
    return acc;
  }, []).sort((a: any, b: any) => b.count - a.count) || [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '🎫 Customs Coupon' : '🎫 报关券'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Coupon management, send to traders, and browse pool' : '月费订阅 · 送券给外贸客户 · 从券池领取'}</p>
        </div>
      </div>

      {/* ═══════ 券状态概览卡片 ═══════ */}
      {!statsLoading && stats && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 rounded-xl border border-emerald-200 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-gray-700">
              {lang === 'en' ? '📊 Coupon Overview' : '📊 报关券状态概览'}
            </h3>
            {stats.hasCurrentMonthAvailable && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">
                {lang === 'en' ? '✅ Active' : '✅ 本月可用'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{lang === 'en' ? 'Total Received' : '累计收到'}</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.totalIssued}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{lang === 'en' ? 'coupons' : '张'}{stats.totalFaceValue > 0 && ` · ¥${stats.totalFaceValue}`}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{lang === 'en' ? 'Available' : '现存可送'}</p>
              <p className={`text-2xl font-bold ${stats.available > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{stats.available}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.availableFaceValue > 0 ? `¥${stats.availableFaceValue}` : (lang === 'en' ? 'send to traders' : '可送外贸')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{lang === 'en' ? 'Sent' : '已送出'}</p>
              <p className={`text-2xl font-bold ${stats.sent > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{stats.sent}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{lang === 'en' ? 'to traders' : '给外贸'}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">{lang === 'en' ? 'Used' : '已核销'}</p>
              <p className={`text-2xl font-bold ${stats.used > 0 ? 'text-green-600' : 'text-gray-400'}`}>{stats.used}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{stats.usedFaceValue > 0 ? `¥${stats.usedFaceValue}` : (lang === 'en' ? 'used by traders' : '外贸已用')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-600">{lang === 'en' ? 'Validity' : '有效期'}</span>
              <span>{stats.expiryRange ? `${fmtMonth(stats.expiryRange.from)} ~ ${fmtMonth(stats.expiryRange.to)}` : (lang === 'en' ? 'No coupons' : '暂无券')}</span>
            </div>
            {faceValueSummary && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-600">{lang === 'en' ? 'Denominations' : '面值'}</span>
                <span>{faceValueSummary}</span>
              </div>
            )}
            {stats.expired > 0 && (
              <div className="flex items-center gap-1.5 text-red-400">
                <span className="font-medium">{lang === 'en' ? 'Expired' : '已过期'}</span>
                <span>{stats.expired}{lang === 'en' ? '' : '张'}</span>
              </div>
            )}
            <button onClick={() => navigate('/admin/subscribe')} className="ml-auto text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2">
              {lang === 'en' ? 'Manage Subscription →' : '管理订阅 →'}
            </button>
          </div>
        </div>
      )}

      {/* Tab切换（3个Tab） */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        {tabs.map(t => (
          <button key={t.key}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              tab === t.key ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setTab(t.key)}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* ═══════ Tab 1: 送券 ═══════ */}
      {tab === 'send' && (
        <div>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{lang === 'en' ? 'Coupon Status' : '本月券状态'}</p>
                <p className="text-xs text-gray-500">{lang === 'en' ? 'Check and send to traders' : '查看并赠送给活跃外贸用户'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats && (
                <span className="text-xs text-gray-500 mr-1">{lang === 'en' ? `Available: ${stats.available}` : `可送: ${stats.available}张`}</span>
              )}
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${(stats?.available || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {(stats?.available || 0) > 0 ? (lang === 'en' ? '✅ Ready to send' : '✅ 可赠送') : (lang === 'en' ? 'All sent' : '已全部送出')}
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                <Users className="w-4 h-4 inline mr-1" />
                {lang === 'en' ? 'Active Traders' : '活跃外贸用户'}
                <span className="text-gray-400 font-normal ml-1">({tradersTotal})</span>
              </h3>
            </div>
            {tradersLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : traders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No active traders' : '暂无活跃外贸用户'}</div>
            ) : (
              <div className="space-y-2">
                {traders.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-3 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary-600" /></div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.companyName || t.displayName}</p>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5">
                            <span>🔍 {lang === 'en' ? 'Searches' : '搜索'} {t.searchCount}</span>
                            <span>💬 {lang === 'en' ? 'Inquiries' : '询价'} {t.inquiryCount}</span>
                            {t.lastActive && <span>🕐 {lang === 'en' ? 'Last active' : '最近'}: {t.lastActive.slice(0, 10)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      onClick={() => handleSend(t.id)} disabled={sending === t.id}>
                      {sending === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {sending === t.id ? (lang === 'en' ? 'Sending...' : '赠送中...') : (lang === 'en' ? 'Send' : '🎫 送券')}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tradersTotal > 20 && (
              <div className="flex justify-center gap-2 mt-4">
                <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={tradersPage <= 1} onClick={() => loadTraders(tradersPage - 1)}>
                  {lang === 'en' ? 'Prev' : '上一页'}
                </button>
                <span className="text-xs text-gray-500 py-1">{tradersPage}/{Math.ceil(tradersTotal / 20)}</span>
                <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={tradersPage >= Math.ceil(tradersTotal / 20)} onClick={() => loadTraders(tradersPage + 1)}>
                  {lang === 'en' ? 'Next' : '下一页'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Tab 2: 送券记录 ═══════ */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{lang === 'en' ? 'Coupon History' : '送券记录'}</h3>
          {couponsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No coupons yet' : '暂无记录'}</div>
          ) : (
            <div className="space-y-2">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{c.faceValue}元报关券</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === 'used' ? 'bg-green-100 text-green-700' : c.status === 'sent' ? 'bg-blue-100 text-blue-700' : c.status === 'issued' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.status === 'used' ? (lang === 'en' ? 'Used' : '已使用') :
                         c.status === 'sent' ? (lang === 'en' ? 'Sent' : '已送出') :
                         c.status === 'issued' ? (lang === 'en' ? 'Ready' : '待送出') : c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.month && `${fmtMonth(c.month)}`}
                      {c.traderName && ` · ${lang === 'en' ? 'To' : '送'}：${c.traderCompany || c.traderName}`}
                      {c.brokerCompany && ` · ${c.brokerCompany}`}
                      {c.sentAt && ` · ${c.sentAt.slice(0, 10)}`}
                    </p>
                  </div>
                  {(c.status === 'issued' || c.status === 'sent') && !c.traderName && c.brokerCompany && (
                    <button onClick={async () => {
                      try {
                        await client.post('/customs-coupons/my-coupons/self-verify', { couponId: c.id });
                        toast.success(lang === 'en' ? 'Verified!' : '已确认使用');
                        loadCoupons(couponsPage);
                        loadStats();
                      } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
                    }} className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600">
                      {lang === 'en' ? 'Self-Verify' : '确认已使用'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {couponsTotal > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={couponsPage <= 1} onClick={() => loadCoupons(couponsPage - 1)}>
                {lang === 'en' ? 'Prev' : '上一页'}
              </button>
              <span className="text-xs text-gray-500 py-1">{couponsPage}/{Math.ceil(couponsTotal / 20)}</span>
              <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" disabled={couponsPage >= Math.ceil(couponsTotal / 20)} onClick={() => loadCoupons(couponsPage + 1)}>
                {lang === 'en' ? 'Next' : '下一页'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ Tab 3: 券池 ═══════ */}
      {tab === 'pool' && (
        <div className="space-y-4">
          {/* 池子概览统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[10px] text-gray-400 font-medium mb-1">{lang === 'en' ? 'Total in Pool' : '池中券数'}</p>
              <p className="text-2xl font-bold text-teal-600">{poolData?.total || poolData?.data?.length || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[10px] text-gray-400 font-medium mb-1">{lang === 'en' ? 'Ports' : '覆盖口岸'}</p>
              <p className="text-2xl font-bold text-blue-600">{consolidatedPorts.length || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[10px] text-gray-400 font-medium mb-1">{lang === 'en' ? 'Sea' : '海运券'}</p>
              <p className="text-2xl font-bold text-amber-600">{poolData?.portStats?.filter((p: any) => p.mode === 'sea').reduce((s: number, p: any) => s + p.count, 0) || 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-[10px] text-gray-400 font-medium mb-1">{lang === 'en' ? 'Air' : '空运券'}</p>
              <p className="text-2xl font-bold text-sky-600">{poolData?.portStats?.filter((p: any) => p.mode === 'air').reduce((s: number, p: any) => s + p.count, 0) || 0}</p>
            </div>
          </div>

          {/* 口岸分布 */}
          {consolidatedPorts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-500" />
                {lang === 'en' ? 'Distribution by Port' : '口岸分布'}
              </h3>
              <div className="space-y-2">
                {consolidatedPorts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-6 text-right font-mono">{i + 1}</span>
                    <span className="text-xs font-medium text-gray-700 w-28 truncate">
                      {p.modes.includes('air') && p.modes.includes('sea') ? '🚢✈️' : p.modes.includes('air') ? '✈️' : '🚢'} {p.port}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all" style={{ width: `${(p.count / Math.max(...consolidatedPorts.map((x: any) => x.count))) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-12 text-right">{p.count}{lang === 'en' ? '' : '张'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 池中券明细 */}
          {poolLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : poolData?.data?.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'en' ? 'Pool Detail' : '券池明细'}</h3>
              <div className="space-y-2">
                {poolData.data.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-600">¥{c.faceValue}</span>
                      <span className="text-[11px] text-gray-500">{c.transportMode === 'air' ? '✈️' : '🚢'} {c.portCity}</span>
                      <button className="text-xs text-gray-600 hover:text-teal-700 hover:underline" onClick={() => handleShowBroker(c)}>
                        <Building2 className="w-3 h-3 inline mr-0.5" />{c.brokerCompany || ''}
                      </button>
                    </div>
                    <span className="text-[10px] text-gray-400">{c.createdAt?.slice(0, 10) || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : !poolLoading && (
            <div className="text-center py-12 text-gray-400">
              <Gift className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{lang === 'en' ? 'No coupons in pool yet' : '券池暂无券，等待报关行投放'}</p>
            </div>
          )}

          {/* 报关行详情弹窗 */}
          {brokerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBrokerModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <Building2 className="w-6 h-6" />
                    <button onClick={() => setBrokerModal(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <h2 className="text-lg font-bold mt-2">{brokerModal.companyName}</h2>
                  <p className="text-sm text-white/80">{brokerModal.portName}</p>
                </div>
                <div className="p-5 space-y-3">
                  {brokerModal.contactPerson && (
                    <div className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lang === 'en' ? 'Contact: ' : '联系人：'}{brokerModal.contactPerson}</span></div>
                  )}
                  {brokerModal.phone && (
                    <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-gray-400" /><a href={`tel:${brokerModal.phone}`} className="text-teal-600 hover:underline">{brokerModal.phone}</a></div>
                  )}
                  {brokerModal.wechat && (
                    <div className="flex items-center gap-3 text-sm"><MessageCircle className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lang === 'en' ? 'WeChat: ' : '微信：'}{brokerModal.wechat}</span></div>
                  )}
                  {brokerModal.serviceType && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">
                        {lang === 'en' ? 'Service: ' : '服务：'}
                        {brokerModal.serviceType === 'both' ? (lang === 'en' ? 'Sea + Air' : '海运+空运') : brokerModal.serviceType === 'air' ? (lang === 'en' ? 'Air freight' : '空运') : (lang === 'en' ? 'Sea freight' : '海运')}
                        {brokerModal.canImport ? ' · ' + (lang === 'en' ? 'Import OK' : '可做进口') : ''}
                      </span>
                    </div>
                  )}
                  {brokerModal.feePerDecl && (
                    <div className="flex items-center gap-3 text-sm"><FileText className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lang === 'en' ? 'Fee: ' : '报关费：'}¥{brokerModal.feePerDecl}/{lang === 'en' ? 'decl' : '票'}</span></div>
                  )}
                  {brokerModal.intro && <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed">{brokerModal.intro}</div>}
                  {brokerModal.totalLaunchd > 0 && (
                    <div className="text-[10px] text-gray-400 text-center pt-2">{lang === 'en' ? `${brokerModal.totalLaunchd} coupons contributed` : `已投放 ${brokerModal.totalLaunchd} 张券`}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 券池说明 */}
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'en' ? 'How it works' : '券池说明'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
              {[
                { icon: '🏢', title: lang === 'en' ? 'Brokers contribute' : '报关行贡献', desc: lang === 'en' ? 'Coupons added to the pool for exposure.' : '报关行投放券到池中获取客户曝光。' },
                { icon: '📦', title: lang === 'en' ? 'Auto-issue on subscribe' : '订阅自动获得', desc: lang === 'en' ? 'Coupon auto-issued when subscribing. Use or gift to clients.' : '开通月费自动获得券，可自用或转赠客户。' },
                { icon: '🎁', title: lang === 'en' ? 'Gift to traders' : '转赠客户', desc: lang === 'en' ? 'Send coupons to your trader clients.' : '将券转赠给外贸客户维护关系。' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg p-3">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-gray-800">{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
