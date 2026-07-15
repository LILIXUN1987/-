import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Gift, Send, History, Settings, Loader2, CheckCircle, XCircle,
  User, Search, ChevronDown, ChevronUp, AlertCircle, Users,
} from 'lucide-react';
import { getRoleChecks } from '../../types';
import { toast } from '../../components/common/Toast';

type TabKey = 'send' | 'history' | 'settings';

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
  forwarderName?: string;
  forwarderCompany?: string;
}

export default function CouponPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);

  // 仅货代和管理员可查看
  if (!rc.isForwarder && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'No access' : '暂无权限查看'}</div>;
  }

  const [tab, setTab] = useState<TabKey>('send');
  const [subscribed, setSubscribed] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

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

  // ── 加载订阅状态 ──
  const loadSubscription = async () => {
    try {
      const res = await client.get('/customs-coupons/my-subscription');
      setSubscribed(res.data.subscribed);
      setSubStatus(res.data);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadSubscription()]).finally(() => setLoading(false));
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
    if (tab === 'send' && subscribed) loadTraders();
    if (tab === 'history') loadCoupons();
  }, [tab, subscribed]);

  // ── 开通订阅 ──
  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    try {
      const res = await client.post('/customs-coupons/subscribe');
      toast.success(res.data.message);
      await loadSubscription();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '开通失败');
    }
    setSubscribeLoading(false);
  };

  // ── 取消订阅 ──
  const handleUnsubscribe = async () => {
    if (lang === 'en' ? !confirm('Cancel subscription? You will lose future coupons.') : !confirm('确定取消订阅？取消后不再发放报关券。')) return;
    try {
      await client.post('/customs-coupons/unsubscribe');
      toast.success(lang === 'en' ? 'Subscription cancelled' : '已取消订阅');
      await loadSubscription();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '取消失败');
    }
  };

  // ── 送券 ──
  const handleSend = async (traderId: string) => {
    setSending(traderId);
    try {
      const res = await client.post('/customs-coupons/send', { traderId });
      toast.success(res.data.message);
      loadTraders(tradersPage);
      loadCoupons();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '赠送失败');
    }
    setSending(null);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const tabs = [
    { key: 'send' as TabKey, label: lang === 'en' ? 'Send Coupon' : '🎫 送券', icon: Send },
    { key: 'history' as TabKey, label: lang === 'en' ? 'History' : '📜 送券记录', icon: History },
    { key: 'settings' as TabKey, label: lang === 'en' ? 'Settings' : '⚙️ 订阅管理', icon: Settings },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '🎫 Customs Coupon' : '🎫 报关券'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Monthly subscription · Send coupons to traders' : '月费订阅 · 送券给外贸客户'}</p>
        </div>
      </div>

      {/* Tab切换 */}
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
          {!subscribed ? (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 text-center">
              <Gift className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">
                {lang === 'en' ? 'Monthly Customs Coupon Subscription' : '📦 月费报关券'}
              </h2>
              <p className="text-sm text-gray-600 mb-1">
                {lang === 'en' ? 'Only 19.9/month, get 1 customs coupon to send to your trader clients' : '仅需19.9元/月，每月获得1张50元报关券'}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {lang === 'en' ? 'Send to your trader clients as a gift, they use it to save customs fees' : '送给外贸客户，客户省报关费，您维护关系'}
              </p>
              <button className="btn-primary inline-flex items-center gap-2 text-base py-3 px-8"
                onClick={handleSubscribe} disabled={subscribeLoading}>
                {subscribeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
                {subscribeLoading ? (lang === 'en' ? 'Opening...' : '开通中...') : (lang === 'en' ? 'Subscribe 19.9/month' : '🎯 开通月费 19.9元/月')}
              </button>
              <p className="text-xs text-gray-400 mt-2">{lang === 'en' ? '¥19.9/month, cancel anytime' : '19.9元/月，随时取消'}</p>
            </div>
          ) : (
            <div>
              {/* 当前月券状态 */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{lang === 'en' ? 'This month\'s coupon' : '本月券状态'}</p>
                    <p className="text-xs text-gray-500">{lang === 'en' ? `Month: ${subStatus?.currentMonth || '-'}` : `所属月份：${subStatus?.currentMonth || '-'}`}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${coupons.some(c => c.status === 'issued') ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {coupons.some(c => c.status === 'issued') ? (lang === 'en' ? '✅ Ready to send' : '✅ 可赠送') : (lang === 'en' ? 'Sent' : '已送出')}
                </span>
              </div>

              {/* 外贸列表 */}
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
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-primary-600" />
                            </div>
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

                {/* 分页 */}
                {tradersTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                      disabled={tradersPage <= 1} onClick={() => loadTraders(tradersPage - 1)}>
                      {lang === 'en' ? 'Prev' : '上一页'}
                    </button>
                    <span className="text-xs text-gray-500 py-1">{tradersPage}/{Math.ceil(tradersTotal / 20)}</span>
                    <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                      disabled={tradersPage >= Math.ceil(tradersTotal / 20)} onClick={() => loadTraders(tradersPage + 1)}>
                      {lang === 'en' ? 'Next' : '下一页'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
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
                      <span className="text-sm font-medium text-gray-800">50元报关券</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        c.status === 'used' ? 'bg-green-100 text-green-700' :
                        c.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'issued' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status === 'used' ? (lang === 'en' ? 'Used' : '已使用') :
                         c.status === 'sent' ? (lang === 'en' ? 'Sent' : '已送出') :
                         c.status === 'issued' ? (lang === 'en' ? 'Ready' : '待送出') :
                         c.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.traderName && `${lang === 'en' ? 'To' : '送'}：${c.traderCompany || c.traderName}`}
                      {c.sentAt && ` · ${c.sentAt.slice(0, 10)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {couponsTotal > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                disabled={couponsPage <= 1} onClick={() => loadCoupons(couponsPage - 1)}>
                {lang === 'en' ? 'Prev' : '上一页'}
              </button>
              <span className="text-xs text-gray-500 py-1">{couponsPage}/{Math.ceil(couponsTotal / 20)}</span>
              <button className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
                disabled={couponsPage >= Math.ceil(couponsTotal / 20)} onClick={() => loadCoupons(couponsPage + 1)}>
                {lang === 'en' ? 'Next' : '下一页'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ Tab 3: 订阅管理 ═══════ */}
      {tab === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">{lang === 'en' ? 'Subscription Settings' : '订阅设置'}</h3>
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{lang === 'en' ? 'Status' : '订阅状态'}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${subscribed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {subscribed ? (lang === 'en' ? 'Active' : '已订阅') : (lang === 'en' ? 'Not subscribed' : '未订阅')}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{lang === 'en' ? 'Price' : '月费'}</span>
              <span className="text-sm font-medium">19.9元/月</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{lang === 'en' ? 'Current Month' : '当前月份'}</span>
              <span className="text-sm">{subStatus?.currentMonth || '-'}</span>
            </div>
          </div>
          {subscribed ? (
            <button className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50"
              onClick={handleUnsubscribe}>
              {lang === 'en' ? 'Cancel Subscription' : '取消订阅'}
            </button>
          ) : (
            <button className="btn-primary text-sm" onClick={handleSubscribe} disabled={subscribeLoading}>
              {subscribeLoading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
              {lang === 'en' ? 'Subscribe Now' : '开通订阅'}
            </button>
          )}
          <p className="text-xs text-gray-400 mt-3">
            {lang === 'en' ? '¥19.9/month. Cancel anytime and future coupons will stop.' : '19.9元/月，取消后不再发放新券。'}
          </p>
        </div>
      )}
    </div>
  );
}
