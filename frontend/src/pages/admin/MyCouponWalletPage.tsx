import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Gift, Loader2, CheckCircle, Clock, Send, X, MessageSquare,
  Wallet, TrendingUp,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface Broker {
  id: string;
  company_name: string;
  port_code: string;
  port_name: string;
  unit_price: number;
}

interface CouponItem {
  id: string;
  faceValue: number;
  month: string;
  status: string;
  sentAt: string | null;
  usedAt: string | null;
  createdAt: string;
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

export default function MyCouponWalletPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [useModal, setUseModal] = useState<CouponItem | null>(null);
  const [declInfo, setDeclInfo] = useState({ goodsName: '', port: '广州白云机场', notes: '' });
  const [using, setUsing] = useState(false);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'coupons' | 'history'>('coupons');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [contactTarget, setContactTarget] = useState<{ id: string; name: string; company: string } | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await client.get('/customs-coupons/my-stats');
      setStats(res.data.stats);
    } catch {}
    setStatsLoading(false);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await client.get('/customs-coupons/my-coupons', { params: { role: 'trader' } });
      setCoupons(res.data.data);
    } catch {}
    setLoading(false);
  };

  const fetchUsage = async () => {
    try {
      const res = await client.get('/customs-coupons/usage-history');
      setUsageHistory(res.data.data);
    } catch {}
  };

  useEffect(() => {
    Promise.all([loadStats(), fetchCoupons(), fetchUsage()]).then(() => {});
    client.get('/customs-coupons/active-brokers').then(r => setBrokers(r.data.data || [])).catch(() => {});
  }, []);

  const handleUse = async () => {
    if (!useModal) return;
    if (!declInfo.goodsName.trim()) {
      toast.error(lang === 'en' ? 'Please enter goods name' : '请填写货物名称');
      return;
    }
    setUsing(true);
    try {
      await client.post('/customs-coupons/use', {
        couponId: useModal.id,
        declInfo,
      });
      toast.success(lang === 'en' ? 'Coupon submitted! Customs broker will process.' : '✅ 券已提交使用，报关行将尽快处理');
      setUseModal(null);
      setDeclInfo({ goodsName: '', port: '广州白云机场', notes: '' });
      fetchCoupons();
      fetchUsage();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Failed' : '使用失败'));
    }
    setUsing(false);
  };

  const handleContact = async () => {
    if (!contactTarget || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', {
        receiver_id: contactTarget.id,
        content: contactText.trim(),
      });
      setContactSent(true);
      setContactText('');
      setTimeout(() => { setContactTarget(null); setContactSent(false); }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Failed to send' : '发送失败'));
    }
    setContactSending(false);
  };

  const handleContactForwarder = async (coupon: CouponItem) => {
    if (!coupon.forwarderName && !coupon.forwarderCompany) {
      alert(lang === 'en' ? 'Contact info unavailable' : '暂无送券人联系方式');
      return;
    }
    try {
      const lookup = await client.get('/auth/lookup-by-company', {
        params: { company: coupon.forwarderCompany || coupon.forwarderName }
      });
      if (lookup.data?.id) {
        setContactTarget({
          id: lookup.data.id,
          name: coupon.forwarderName || coupon.forwarderCompany || '',
          company: coupon.forwarderCompany || '',
        });
        setContactSent(false);
        setContactText('');
      } else {
        alert(lang === 'en' ? 'User not found' : '未找到该用户');
      }
    } catch {
      alert(lang === 'en' ? 'Failed to find user' : '查找用户失败');
    }
  };

  const unused = coupons.filter(c => c.status === 'sent');
  const used = coupons.filter(c => c.status === 'used');

  const fmtMonth = (m: string) => {
    const [y, mon] = m.split('-');
    return `${y}年${parseInt(mon)}月`;
  };

  const faceValueSummary = stats?.byFaceValue
    ?.map(fv => `¥${fv.faceValue}×${fv.count}`)
    .join(' + ') || '';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '🎫 My Coupon Wallet' : '🎫 我的券包'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Customs declaration coupons from forwarders' : '货代赠送的报关券，可用于抵扣报关费'}</p>
        </div>
      </div>

      {/* ═══════ 券状态概览卡片（外贸视角） ═══════ */}
      {statsLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : stats ? (
        <div className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-xl border border-amber-200 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-700">
              {lang === 'en' ? '📊 Coupon Overview' : '📊 报关券状态概览'}
            </h3>
            {stats.sent > 0 && (
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">
                {lang === 'en' ? '✅ Active' : '✅ 有可用券'}
              </span>
            )}
          </div>

          {/* 四项核心指标（外贸视角：累计收到 / 现存可用 / 已核销 / 已过期） */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 累计收到 */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                {lang === 'en' ? 'Total Received' : '累计收到'}
              </p>
              <p className="text-2xl font-bold text-amber-700">{stats.totalIssued}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {lang === 'en' ? 'coupons' : '张'}
                {stats.totalFaceValue > 0 && ` · ¥${stats.totalFaceValue}`}
              </p>
            </div>

            {/* 现存可用（sent = 已送给我 = 可使用） */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                {lang === 'en' ? 'Available' : '现存可用'}
              </p>
              <p className={`text-2xl font-bold ${stats.sent > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                {stats.sent}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {lang === 'en' ? 'ready to use' : '可立即使用'}
              </p>
            </div>

            {/* 已核销 */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                {lang === 'en' ? 'Used' : '已核销'}
              </p>
              <p className={`text-2xl font-bold ${stats.used > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {stats.used}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {stats.usedFaceValue > 0
                  ? `¥${stats.usedFaceValue}`
                  : (lang === 'en' ? 'used' : '已使用')}
              </p>
            </div>

            {/* 已过期 */}
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                {lang === 'en' ? 'Expired' : '已过期'}
              </p>
              <p className={`text-2xl font-bold ${stats.expired > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {stats.expired}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {lang === 'en' ? 'expired' : '已失效'}
              </p>
            </div>
          </div>

          {/* 有效期 + 面值明细 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-600">
                {lang === 'en' ? 'Validity' : '有效期'}
              </span>
              <span>
                {stats.expiryRange
                  ? `${fmtMonth(stats.expiryRange.from)} ~ ${fmtMonth(stats.expiryRange.to)}`
                  : (lang === 'en' ? 'No coupons' : '暂无券')}
              </span>
            </div>
            {faceValueSummary && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-600">
                  {lang === 'en' ? 'Denominations' : '面值'}
                </span>
                <span>{faceValueSummary}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Tab */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        <button className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'coupons' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500'}`}
          onClick={() => setTab('coupons')}>
          🎟️ {lang === 'en' ? 'My Coupons' : '我的券'} ({unused.length})
        </button>
        <button className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'history' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500'}`}
          onClick={() => setTab('history')}>
          📋 {lang === 'en' ? 'History' : '使用记录'}
        </button>
      </div>

      {tab === 'coupons' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : unused.length === 0 && used.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No coupons yet' : '暂无报关券'}</p>
              <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Forwarders will send you coupons via the community' : '货代会通过社区赠送报关券给您'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 未使用 */}
              {unused.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {lang === 'en' ? 'Available' : '可用券'} ({unused.length})
                  </h3>
                  {unused.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-emerald-700">¥{c.faceValue}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{lang === 'en' ? 'Customs Coupon' : '报关券'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            🎁 {lang === 'en' ? 'From' : '来自'}：{c.forwarderCompany || c.forwarderName || (lang === 'en' ? 'A forwarder' : '一位货代')}
                          </p>
                          {c.sentAt && <p className="text-[10px] text-gray-400 mt-0.5">📅 {c.sentAt.slice(0, 10)}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button className="flex items-center gap-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3 py-1.5 transition-colors"
                            onClick={() => { setUseModal(c); setDeclInfo({ goodsName: '', port: '广州白云机场', notes: '' }); }}>
                            <Send className="w-3 h-3" />
                            {lang === 'en' ? 'Use' : '使用'}
                          </button>
                          <button className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors border border-blue-200"
                            onClick={() => handleContactForwarder(c)}>
                            <MessageSquare className="w-3 h-3" />
                            {lang === 'en' ? 'Contact' : '联系TA'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 已使用 */}
              {used.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-600 mt-4 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {lang === 'en' ? 'Used' : '已使用'} ({used.length})
                  </h3>
                  {used.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-70">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">¥{c.faceValue} {lang === 'en' ? 'Customs Coupon' : '报关券'}</span>
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{lang === 'en' ? 'Used' : '已使用'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            🎁 {c.forwarderCompany || c.forwarderName}
                            {c.usedAt && ` · ${c.usedAt.slice(0, 10)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">{lang === 'en' ? 'Usage History' : '使用记录'}</h3>
          {usageHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No usage history' : '暂无使用记录'}</div>
          ) : (
            <div className="space-y-2">
              {usageHistory.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">¥50 {lang === 'en' ? 'Coupon Used' : '券已使用'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'
                      }`}>
                        {r.status === 'completed' ? (lang === 'en' ? 'Completed' : '已完成') :
                         r.status === 'pending' ? (lang === 'en' ? 'Processing' : '处理中') : r.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.forwarder_name && `🎁 ${r.forwarder_company || r.forwarder_name}`}
                      {r.created_at && ` · ${r.created_at.slice(0, 10)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 联系送券货代弹窗 ── */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                {lang === 'en' ? `Contact ${contactTarget.name}` : `联系 ${contactTarget.name}`}
              </h3>
              <button onClick={() => setContactTarget(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                ✅ {lang === 'en' ? 'Message sent! Check inbox for reply.' : '消息已发送！请留意收件箱回复。'}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {lang === 'en'
                    ? `Send a message to ${contactTarget.name} about the customs coupon.`
                    : `向 ${contactTarget.name}（${contactTarget.company}）发送站内信，沟通报关券使用事宜。`}
                </p>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder={lang === 'en' ? 'Enter your message...' : '请输入您要咨询的内容...'}
                  value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <div className="flex gap-2">
                  <button className="flex-1 btn-outline text-sm" onClick={() => setContactTarget(null)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                  <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1" onClick={handleContact} disabled={contactSending || !contactText.trim()}>
                    {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {lang === 'en' ? 'Send' : '发送'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 使用券弹窗 ── */}
      {useModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setUseModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500" />
                {lang === 'en' ? 'Use Coupon' : '使用报关券'}
              </h3>
              <button onClick={() => setUseModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {lang === 'en'
                ? `From: ${useModal.forwarderCompany || useModal.forwarderName}. Face value: ¥${useModal.faceValue}.`
                : `来自 ${useModal.forwarderCompany || useModal.forwarderName} 赠送的 ¥${useModal.faceValue} 报关券`}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Goods Name *' : '货物名称 *'}</label>
                <input className="input-field text-sm" value={declInfo.goodsName} onChange={e => setDeclInfo(d => ({ ...d, goodsName: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. Electronic components' : '如：电子产品'} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Customs Port *' : '报关口岸 *'}</label>
                <select className="input-field text-sm"
                  value={declInfo.port}
                  onChange={e => setDeclInfo(d => ({ ...d, port: e.target.value }))}>
                  {brokers.length === 0 ? (
                    <option value="广州白云机场">{lang === 'en' ? 'Guangzhou Baiyun Airport' : '广州白云机场（默认）'}</option>
                  ) : (
                    brokers.map(b => (
                      <option key={b.id} value={b.port_name || b.port_code}>
                        {b.port_name || b.port_code} — {b.company_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Notes (optional)' : '备注（选填）'}</label>
                <textarea className="input-field text-sm min-h-[60px]" value={declInfo.notes} onChange={e => setDeclInfo(d => ({ ...d, notes: e.target.value }))}
                  placeholder={lang === 'en' ? 'Special requirements...' : '特殊要求...'} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="flex-1 btn-outline text-sm" onClick={() => setUseModal(null)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1" onClick={handleUse} disabled={using}>
                {using ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {using ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Use Coupon' : '使用券')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
