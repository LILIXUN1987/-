import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Building2, Gift, Loader2, CheckCircle, TrendingUp, Users, MapPin, Plus, FileText, Star, Award, ArrowRight, Sparkles, Send, X, ChevronDown } from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function BrokerConsolePage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    company_name: user?.company_name || '', contact_person: user?.display_name || '', phone: user?.phone || '',
    port_code: '', port_name: '',
    air_ports: ['', '', '', '', ''] as string[], sea_ports: ['', '', '', '', ''] as string[],
    import_port: '',
    service_type: 'both' as string, can_import: false, wechat: '', intro: '',
    export_fee: '', import_fee: '', commitment_notes: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const [faceValue, setFaceValue] = useState(20);
  const [quantity, setQuantity] = useState(10);
  const [contributing, setContributing] = useState(false);
  const [launchMode, setLaunchMode] = useState('sea');
  const [poolCoupons, setPoolCoupons] = useState<any[]>([]);
  const [allCoupons, setAllCoupons] = useState<any[]>([]);
  const [couponFilter, setCouponFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [withdrawing, setWithdrawing] = useState(false);
  const [contactAdminOpen, setContactAdminOpen] = useState(false);
  const [contactAdminText, setContactAdminText] = useState('');
  const [contactAdminSending, setContactAdminSending] = useState(false);
  const [profileCollapsed, setProfileCollapsed] = useState(!!profile?.registered);

  const [verifySearch, setVerifySearch] = useState('');
  const [verifyResults, setVerifyResults] = useState<any[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyForm, setVerifyForm] = useState<{ couponId: string; customsDeclNumber: string; notes: string }>({ couponId: '', customsDeclNumber: '', notes: '' });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({ usageId: '', customsDeclNumber: '', itemCount: 1, inspectionFee: 0 });

  const [stats, setStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const launchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      client.get('/customs-coupons/broker/stats'),
      client.get('/customs-coupons/active-brokers'),
      client.get('/customs-coupons/broker-directory', { params: { sort: 'contributed', limit: 10 } }),
    ]).then(([statsRes, _, dirRes]) => {
      const s = statsRes.data;
      setStats(s);
      setLeaderboard(dirRes.data?.data || []);
      if (s.registered) {
        const airArr = (s.airPorts || '').split(',').map((p: string) => p.trim()).filter(Boolean);
        const seaArr = (s.seaPorts || '').split(',').map((p: string) => p.trim()).filter(Boolean);
        setProfileForm(f => ({
          ...f, company_name: s.companyName || f.company_name, port_code: s.portCode || '', port_name: s.portName || '',
          air_ports: Array(5).fill('').map((_, i) => airArr[i] || ''),
          sea_ports: Array(5).fill('').map((_, i) => seaArr[i] || ''),
          import_port: s.importPort || '',
          contact_person: s.contactPerson || f.contact_person,
          phone: s.phone || f.phone,
          wechat: s.wechat || '',
          intro: s.intro || '',
          export_fee: s.exportFee || '',
          import_fee: s.importFee || '',
          commitment_notes: s.commitmentNotes || '',
          service_type: s.serviceType || 'both',
          can_import: s.canImport || false,
        }));
        setProfile({ registered: true });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Also fetch global coupon stats and pool coupons
  useEffect(() => {
    client.get('/customs-coupons/available-by-port').then(r => setGlobalStats(r.data)).catch(() => {});
    client.get('/customs-coupons/broker/stats').then(r => {
      if (r.data?.registered) {
        // Fetch pool coupons (issued, not claimed)
        client.get('/customs-coupons/broker/search-coupons').then(res => {
          const all = res.data?.data || [];
          setAllCoupons(all);
          setPoolCoupons(all.filter((c: any) => c.status === 'issued'));
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!profileForm.company_name) { toast.error(lang === 'en' ? 'Fill company name' : '请填写公司名'); return; }
    const airList = profileForm.air_ports.filter(p => p.trim());
    const seaList = profileForm.sea_ports.filter(p => p.trim());
    if (airList.length === 0 && seaList.length === 0) { toast.error(lang === 'en' ? 'Fill at least one port' : '请至少填写一个口岸'); return; }
    setSavingProfile(true);
    try {
      await client.post('/customs-coupons/broker/profile', {
        ...profileForm,
        port_code: profileForm.port_code || null,
        port_name: profileForm.port_name || null,
        air_ports: airList.join(',') || null,
        sea_ports: seaList.join(',') || null,
        import_port: profileForm.import_port || null,
        export_fee: profileForm.export_fee || null,
        import_fee: profileForm.import_fee || null,
      });
      toast.success(lang === 'en' ? 'Profile saved' : '档案已保存');
      setProfile({ registered: true });
      setProfileCollapsed(true);
      const r = await client.get('/customs-coupons/broker/stats');
      setStats(r.data);
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Save failed'); }
    setSavingProfile(false);
  };

  const handleWithdraw = async () => {
    if (selectedIds.size === 0) return;
    setWithdrawing(true);
    try {
      const res = await client.post('/customs-coupons/broker/withdraw', { coupon_ids: Array.from(selectedIds) });
      toast.success(res.data.message);
      setSelectedIds(new Set());
      // Refresh pool + stats
      const sr = await client.get('/customs-coupons/broker/stats');
      setStats(sr.data);
      const poolRes = await client.get('/customs-coupons/broker/search-coupons');
      const allD = poolRes.data?.data || [];
      setAllCoupons(allD);
      setPoolCoupons(allD.filter((c: any) => c.status === 'issued'));
    } catch (err: any) { toast.error(err?.response?.data?.error || '撤回失败'); }
    setWithdrawing(false);
  };

  const handleContactAdmin = async () => {
    if (!contactAdminText.trim()) return;
    setContactAdminSending(true);
    try {
      await client.post('/messages/contact-admin', { content: contactAdminText.trim() });
      setContactAdminOpen(false);
      setContactAdminText('');
      toast.success(lang === 'en' ? 'Message sent!' : '已发送给管理员');
    } catch { toast.error(lang === 'en' ? 'Failed' : '发送失败'); }
    setContactAdminSending(false);
  };

  // Filter all coupons
  const filteredCoupons = couponFilter.trim()
    ? allCoupons.filter((c: any) => c.id?.includes(couponFilter.trim()) || String(c.faceValue) === couponFilter.trim())
    : allCoupons;

  const handleContribute = async () => {
    setContributing(true);
    try {
      const r = await client.post('/customs-coupons/broker/contribute', { face_value: faceValue, quantity, transport_mode: launchMode });
      toast.success(r.data.message || 'Launched');
      const sr = await client.get('/customs-coupons/broker/stats');
      setStats(sr.data);
      // Refresh pool list + all
      const poolRes = await client.get('/customs-coupons/broker/search-coupons');
      const allData = poolRes.data?.data || [];
      setAllCoupons(allData);
      setPoolCoupons(allData.filter((c: any) => c.status === 'issued'));
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
    setContributing(false);
  };

  const handleVerifySearch = async () => {
    if (!verifySearch.trim()) return;
    setVerifyLoading(true);
    try { const r = await client.get('/customs-coupons/broker/search-coupons', { params: { q: verifySearch.trim() } }); setVerifyResults(r.data?.data || []); } catch { setVerifyResults([]); }
    setVerifyLoading(false);
  };

  const handleManualVerify = async () => {
    if (!verifyForm.couponId) return;
    setVerifySubmitting(true);
    try {
      await client.post('/customs-coupons/broker/manual-verify', verifyForm);
      setVerifySuccess(true); setVerifyResults([]); setVerifySearch(''); setVerifyForm({ couponId: '', customsDeclNumber: '', notes: '' });
      const sr = await client.get('/customs-coupons/broker/stats'); setStats(sr.data);
      setTimeout(() => setVerifySuccess(false), 3000);
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
    setVerifySubmitting(false);
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try { const r = await client.get('/customs-coupons/broker/orders'); setOrders(r.data?.data || []); } catch {}
    setOrdersLoading(false);
  };
  useEffect(() => { if (stats?.registered) fetchOrders(); }, [stats]);

  const handleComplete = async () => {
    if (!completeForm.customsDeclNumber) { toast.error(lang === 'en' ? 'Fill decl number' : '请填写报关单号'); return; }
    setCompleting(completeForm.usageId);
    try {
      await client.post('/customs-coupons/broker/complete', completeForm);
      toast.success(lang === 'en' ? 'Completed' : '已完成');
      setCompleteForm({ usageId: '', customsDeclNumber: '', itemCount: 1, inspectionFee: 0 });
      fetchOrders();
      const sr = await client.get('/customs-coupons/broker/stats'); setStats(sr.data);
    } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
    setCompleting(null);
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;

  const isNewBroker = !profile?.registered || (stats?.totalContributed || 0) === 0;
  const totalPoolCoupons = globalStats?.total || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-7 h-7 text-teal-600" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Customs Broker Console' : '📊 报关行工作台'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Launch coupons, gain exposure, get clients' : '投放报关券 · 获取曝光 · 获得客户'}</p>
        </div>
        {profile?.registered && (
          <button onClick={() => { const el = document.getElementById('broker-launch'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all animate-pulse">
            <Gift className="w-4 h-4" />{lang === 'en' ? 'Launch Coupons' : '投放报关券'}
          </button>
        )}
      </div>

      {/* ── 为什么投放报关券？价值说明 ── */}
      <div className="bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 border-2 border-teal-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-black text-teal-800">{lang === 'en' ? '💰 Why Launch Coupons?' : '💰 为什么投放报关券？'}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {[
            {
              icon: '🎯', title: lang === 'en' ? 'Zero-Cost Client Acquisition' : '零成本获客',
              desc: lang === 'en'
                ? 'You only pay per actual declaration. Coupons in the pool cost nothing — you only earn when a member claims and uses yours.'
                : '券在池中停留不花钱，只有被领走并核销时才产生报关服务费。零风险获取新客户。',
            },
            {
              icon: '📈', title: lang === 'en' ? 'Free Exposure' : '免费曝光',
              desc: lang === 'en'
                ? 'Your company appears on the broker directory, coupon pool, and dashboard — seen by hundreds of paying forwarders daily.'
                : '您的公司展示在报关行黄页、券池、首页——每天被数百付费货代看到，不花钱打广告。',
            },
            {
              icon: '🔁', title: lang === 'en' ? 'Build Repeat Business' : '建立回头客',
              desc: lang === 'en'
                ? 'Once a forwarder uses your service, they come back. Each coupon is a chance to win a long-term client.'
                : '货代用过一次您的服务后，下次继续找您。每张券都可能带来一个长期合作客户。',
            },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-teal-100">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">{lang === 'en' ? 'How it works' : '操作流程'}</p>
              <p className="text-white/90 text-sm leading-relaxed">
                {lang === 'en'
                  ? 'You launch coupons → Pool → Forwarders claim → They use your service → You get paid 💰'
                  : '您投放券 → 进入公共券池 → 付费货代领取 → 货代/外贸找您报关 → 您收报关费 💰'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 新手入驻引导大横幅 ── */}
      {isNewBroker && (
        <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mt-10 -mr-10" />
          <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase">Welcome</span>
            </div>
            <h2 className="text-2xl font-black mb-2">{lang === 'en' ? '🎉 Start Getting Clients Today!' : '🎉 入驻成功！开始获取客户吧！'}</h2>
            <p className="text-white/90 text-sm mb-4 max-w-lg">
              {lang === 'en'
                ? 'Launch customs coupons to the community pool. Paying members claim them and use your service — free client acquisition!'
                : '投放报关券到社区券池，付费货代领取后会在您这里核销——零成本获客！'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { step: '1', icon: '📝', title: lang === 'en' ? 'Complete Profile' : '完善档案', desc: lang === 'en' ? 'Fill your company info and service port' : '填写公司信息和报关口岸' },
                { step: '2', icon: '🎫', title: lang === 'en' ? 'Launch Coupons' : '投放报关券', desc: lang === 'en' ? 'Choose ¥10/20/30/50 and quantity' : '选择金额和张数，一键投放到池中' },
                { step: '3', icon: '🤝', title: lang === 'en' ? 'Get Clients' : '获取客户', desc: lang === 'en' ? 'Paying members claim and use your service' : '付费货代领券后找您报关，建立合作' },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                  <div>
                    <div className="text-sm font-bold">{s.icon} {s.title}</div>
                    <div className="text-xs text-white/70 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 投放券入库（已有档案时显示） ── */}
      {profile?.registered && (
        <div id="broker-launch" className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black flex items-center gap-2">
              <span className="text-2xl">🎫</span>
              {lang === 'en' ? 'Launch Customs Coupons' : '投放报关券'}
            </h2>
            {!isNewBroker && (
              <span className="text-sm text-white/80 bg-white/15 px-3 py-1 rounded-full font-bold">
                {lang === 'en' ? `${stats?.totalContributed || 0} contributed` : `已投放 ${stats?.totalContributed || 0} 张`}
              </span>
            )}
          </div>
          <p className="text-white/90 text-sm mb-4 max-w-2xl">
            {lang === 'en'
              ? 'Launch coupons to the pool. Paying members will claim them and come to you for customs clearance.'
              : '投放券到社区券池，付费货代领取后会在您这里核销报关。投放越多，曝光越多。'}
          </p>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { v: stats.totalContributed || 0, l: lang === 'en' ? 'Total' : '累计投放' },
                { v: stats.sentCount || 0, l: lang === 'en' ? 'Claimed' : '已被领取' },
                { v: stats.usedCount || 0, l: lang === 'en' ? 'Used' : '已核销' },
                { v: stats.remainingLaunchd || 0, l: lang === 'en' ? 'In Pool' : '池中剩余' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <div className="text-2xl font-black text-teal-700">{s.v}</div>
                  <div className="text-xs text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Amount breakdown */}
          {stats?.amountStats && (
            <div className="bg-white rounded-xl p-3 mb-4">
              <h4 className="text-xs font-bold text-gray-600 mb-2">{lang === 'en' ? 'Amount Summary' : '金额汇总'}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: lang === 'en' ? 'Total' : '累计', value: stats.amountStats.totalAmount },
                  { label: lang === 'en' ? 'Claimed' : '已领', value: stats.amountStats.sentAmount },
                  { label: lang === 'en' ? 'Used' : '已用', value: stats.amountStats.usedAmount },
                  { label: lang === 'en' ? 'In Pool' : '池中', value: stats.amountStats.pendingAmount },
                  { label: lang === 'en' ? 'Expired' : '过期', value: stats.amountStats.expiredAmount },
                ].map((s, i) => (
                  <div key={i} className="bg-teal-50 rounded-lg p-2 text-center">
                    <div className="text-sm font-black text-teal-700">¥{s.value}</div>
                    <div className="text-[10px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 近期投放记录 */}
          {stats?.recentContributions?.length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-4">
              <h4 className="text-xs font-bold text-gray-600 mb-2">{lang === 'en' ? 'Recent Contributions' : '近期投放记录'}</h4>
              <div className="space-y-1.5">
                {stats.recentContributions.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-teal-50 rounded-lg px-3 py-1.5">
                    <span className="text-gray-600">{r.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-400">{r.transportMode === 'air' ? '✈️' : '🚢'}</span>
                      <span className="font-bold text-teal-700">¥{r.faceValue} × {r.count}</span>
                      <span className="text-gray-400">= ¥{r.faceValue * r.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 券池管理：可撤回未认领的券 */}
          {poolCoupons.length > 0 && (
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-600">{lang === 'en' ? 'Pool Management' : '券池管理'} ({poolCoupons.length} {lang === 'en' ? 'available' : '张可撤回'})</h4>
                {selectedIds.size > 0 && (
                  <button onClick={handleWithdraw} disabled={withdrawing}
                    className="text-xs font-bold bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 disabled:opacity-50">
                    {withdrawing ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                    {lang === 'en' ? `Withdraw ${selectedIds.size}` : `撤回 ${selectedIds.size} 张`}
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {poolCoupons.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5 hover:bg-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-3 h-3 rounded"
                        checked={selectedIds.has(c.id)}
                        onChange={() => {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                            return next;
                          });
                        }} />
                      <span className="font-bold text-teal-700">¥{c.faceValue}</span>
                      <span className="text-gray-500">{lang === 'en' ? 'ID:' : '券号：'}{c.id?.slice(-8)}</span>
                    </label>
                    <span className="text-gray-400">{c.createdAt?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Launch form */}
          <div className="bg-white rounded-xl p-4">
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Transport Mode' : '适用运输方式'}</label>
              <div className="flex gap-2">
                {[{ key: 'sea', label: lang === 'en' ? '🚢 Sea' : '🚢 海运' }, { key: 'air', label: lang === 'en' ? '✈️ Air' : '✈️ 空运' }].map(opt => (
                  <button key={opt.key} onClick={() => setLaunchMode(opt.key)}
                    className={'text-xs px-3 py-1.5 rounded-lg border transition-all ' + (launchMode === opt.key ? 'bg-teal-500 text-white border-teal-500 font-bold' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">{lang === 'en' ? 'Coupon Value' : '券面金额'}</label>
            <div className="flex gap-2 mb-3">
              {[10, 20, 30, 50].map(v => (
                <button key={v} onClick={() => setFaceValue(v)}
                  className={'px-5 py-2 rounded-lg text-sm font-bold border-2 transition-all ' + (faceValue === v ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>¥{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Quantity' : '张数'}</label>
                <input className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none" type="number" min={1} max={1000} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
              </div>
              <div className="pt-5">
                <button className="inline-flex items-center gap-1.5 text-sm font-black bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-all shadow-md disabled:opacity-50" onClick={handleContribute} disabled={contributing}>
                  {contributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {lang === 'en' ? 'Launch' : '投放券'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{lang === 'en' ? `Total face value: ¥${faceValue * quantity}` : `名义总额：¥${faceValue * quantity}`}</p>
          </div>
        </div>
      )}

      {/* ── 报关行投放排行 ── */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Top Contributing Brokers' : '🏆 报关行投放排行'}</h2>
            <span className="text-[10px] text-gray-400 ml-auto">{totalPoolCoupons > 0 ? `${lang === 'en' ? `${totalPoolCoupons} coupons in pool` : `池中共 ${totalPoolCoupons} 张券`}` : ''}</span>
          </div>
          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((b: any, i: number) => (
              <div key={b.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={'w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ' + (i < 3 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 'bg-gray-100 text-gray-500')}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{b.companyName}</span>
                  {b.avgRating > 0 && <span className="text-xs text-amber-500 flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" />{b.avgRating.toFixed(1)}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>🔥 {b.totalContributed}</span>
                  {b.claimCount > 0 && <span>👥 {b.claimCount}</span>}
                  {b.reviewCount > 0 && <span>⭐ {b.reviewCount}</span>}
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/admin/broker-directory')} className="mt-3 w-full text-xs text-teal-600 hover:text-teal-700 font-medium text-center hover:underline">
            {lang === 'en' ? 'View All Brokers →' : '查看全部报关行 →'}
          </button>
        </div>
      )}

      {/* ── 公司档案 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <button className="w-full text-sm font-bold text-gray-800 flex items-center justify-between" onClick={() => setProfileCollapsed(!profileCollapsed)}>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-500" />
            {lang === 'en' ? 'Company Profile' : '公司档案'}
            {profile?.registered && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-2">{lang === 'en' ? 'Saved' : '已保存'}</span>}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileCollapsed ? '' : 'rotate-180'}`} />
        </button>
        {!profileCollapsed && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Company Name' : '公司名称'} *</label>
            <input className="input-field text-sm" value={profileForm.company_name} onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} placeholder={lang === 'en' ? 'Name' : '报关行名称'} />
          </div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Contact' : '联系人'}</label><input className="input-field text-sm" value={profileForm.contact_person} onChange={e => setProfileForm(f => ({ ...f, contact_person: e.target.value }))} placeholder={lang === 'en' ? 'Name' : '姓名'} /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Phone' : '电话'}</label><input className="input-field text-sm" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder={lang === 'en' ? 'Phone' : '手机号'} /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">微信</label><input className="input-field text-sm" value={profileForm.wechat} onChange={e => setProfileForm(f => ({ ...f, wechat: e.target.value }))} placeholder="微信号" /></div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Transport Type' : '运输方式'} *</label>
            <div className="flex gap-2">
              {[{ k: 'sea', l: '🚢' + (lang === 'en' ? ' Sea' : ' 海运') }, { k: 'air', l: '✈️' + (lang === 'en' ? ' Air' : ' 空运') }, { k: 'both', l: lang === 'en' ? 'Both' : '都能做' }].map(o => (
                <button key={o.k} onClick={() => setProfileForm(f => ({ ...f, service_type: o.k }))} className={'text-xs px-3 py-1.5 rounded-lg border ' + (profileForm.service_type === o.k ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200')}>{o.l}</button>
              ))}
            </div>
          </div>
          {/* Air ports */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">✈️ {lang === 'en' ? 'Air Ports (max 5)' : '空运口岸（最多5个）'}</label>
            <div className="grid grid-cols-5 gap-2">
              {profileForm.air_ports.map((p, i) => (
                <input key={i} className="input-field text-xs py-1.5" placeholder={lang === 'en' ? `Air ${i+1}` : `空运${i+1}`}
                  value={p} onChange={e => { const n = [...profileForm.air_ports]; n[i] = e.target.value.toUpperCase(); setProfileForm(f => ({ ...f, air_ports: n })); }} />
              ))}
            </div>
          </div>
          {/* Sea ports */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">🚢 {lang === 'en' ? 'Sea Ports (max 5)' : '海运口岸（最多5个）'}</label>
            <div className="grid grid-cols-5 gap-2">
              {profileForm.sea_ports.map((p, i) => (
                <input key={i} className="input-field text-xs py-1.5" placeholder={lang === 'en' ? `Sea ${i+1}` : `海运${i+1}`}
                  value={p} onChange={e => { const n = [...profileForm.sea_ports]; n[i] = e.target.value.toUpperCase(); setProfileForm(f => ({ ...f, sea_ports: n })); }} />
              ))}
            </div>
          </div>
          {/* Import port */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Import Port (1 only)' : '能做进口口岸（仅1个）'}</label>
            <input className="input-field text-sm" value={profileForm.import_port} onChange={e => setProfileForm(f => ({ ...f, import_port: e.target.value.toUpperCase() }))} placeholder={lang === 'en' ? 'e.g. CKG' : '如：CKG'} />
          </div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Export Fee (¥/decl)' : '出口报关费（¥/票）'}</label><input className="input-field text-sm" type="number" value={profileForm.export_fee} onChange={e => setProfileForm(f => ({ ...f, export_fee: e.target.value }))} placeholder="300" /></div>
          <div><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Import Fee (¥/decl)' : '进口报关费（¥/票）'}</label><input className="input-field text-sm" type="number" value={profileForm.import_fee} onChange={e => setProfileForm(f => ({ ...f, import_fee: e.target.value }))} placeholder="500" /></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Intro' : '公司介绍'}</label><textarea className="input-field text-sm min-h-[60px] resize-none" value={profileForm.intro} onChange={e => setProfileForm(f => ({ ...f, intro: e.target.value }))} placeholder={lang === 'en' ? 'Brief intro...' : '简要介绍...'} /></div>
          <div className="sm:col-span-2"><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Commitments' : '服务承诺'}</label><textarea className="input-field text-sm min-h-[60px] resize-none" value={profileForm.commitment_notes} onChange={e => setProfileForm(f => ({ ...f, commitment_notes: e.target.value }))} placeholder={lang === 'en' ? 'e.g. Includes inspection...' : '如：包查验、超5项加收...'} /></div>
        </div>
        } {/* end !profileCollapsed */}
        <button className="mt-3 btn-primary text-sm flex items-center gap-1.5" onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {lang === 'en' ? 'Save' : '保存档案'}
        </button>
      </div>

      {/* ── 我的报关券（全量管理+搜索+核销） ── */}
      {stats?.registered && (
        <div className="bg-white rounded-xl border-2 border-teal-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-teal-500" />
              {lang === 'en' ? 'My Coupons' : '🎫 我的报关券'} ({allCoupons.length})
            </h2>
            <button onClick={() => { setContactAdminOpen(true); setContactAdminText(''); }}
              className="text-xs text-gray-500 hover:text-primary-600 bg-gray-100 hover:bg-primary-50 px-2.5 py-1 rounded-lg transition-colors">
              📩 {lang === 'en' ? 'Contact Admin' : '联系管理员'}
            </button>
          </div>

          {/* 统计：按运输方式+状态 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-sky-50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">✈️ {lang === 'en' ? 'Air Coupons' : '空运券'}</div>
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="text-teal-600 font-bold">{allCoupons.filter((c:any) => c.transportMode === 'air' && c.status === 'issued').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'pool' : '池中'}</span></span>
                <span className="text-blue-600 font-bold">{allCoupons.filter((c:any) => c.transportMode === 'air' && c.status === 'sent').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'sent' : '已领'}</span></span>
                <span className="text-green-600 font-bold">{allCoupons.filter((c:any) => c.transportMode === 'air' && c.status === 'used').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'used' : '已用'}</span></span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {lang === 'en' ? 'Total' : '面值合计'}：¥{allCoupons.filter((c:any) => c.transportMode === 'air').reduce((s:number,c:any)=>s+(c.faceValue||0),0)}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">🚢 {lang === 'en' ? 'Sea Coupons' : '海运券'}</div>
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="text-teal-600 font-bold">{allCoupons.filter((c:any) => c.transportMode !== 'air' && c.status === 'issued').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'pool' : '池中'}</span></span>
                <span className="text-blue-600 font-bold">{allCoupons.filter((c:any) => c.transportMode !== 'air' && c.status === 'sent').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'sent' : '已领'}</span></span>
                <span className="text-green-600 font-bold">{allCoupons.filter((c:any) => c.transportMode !== 'air' && c.status === 'used').length}<span className="text-gray-400 font-normal"> {lang === 'en' ? 'used' : '已用'}</span></span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {lang === 'en' ? 'Total' : '面值合计'}：¥{allCoupons.filter((c:any) => c.transportMode !== 'air').reduce((s:number,c:any)=>s+(c.faceValue||0),0)}
              </div>
            </div>
          </div>

          {/* 快速核销 + 搜索 */}
          <div className="flex gap-2 mb-3">
            <input className="input-field text-sm flex-1" value={couponFilter} onChange={e => setCouponFilter(e.target.value)}
              placeholder={lang === 'en' ? 'Search by coupon ID or face value...' : '搜券号或面值...'}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                const val = (e.target as HTMLInputElement).value.trim();
                if (val.length < 8) return;
                const match = allCoupons.find((c: any) => c.id === val || c.id?.endsWith(val));
                if (match && match.status === 'sent') {
                  if (confirm(lang === 'en' ? `Verify ¥${match.faceValue} coupon?` : `核销 ¥${match.faceValue} 报关券？`)) {
                    client.post('/customs-coupons/broker/manual-verify', { couponId: match.id, customsDeclNumber: 'counter-' + Date.now() }).then(() => {
                      toast.success(lang === 'en' ? 'Verified!' : '已核销');
                      setCouponFilter('');
                      client.get('/customs-coupons/broker/search-coupons').then(r => {
                        const allD = r.data?.data || []; setAllCoupons(allD); setPoolCoupons(allD.filter((x: any) => x.status === 'issued'));
                      });
                    }).catch((err: any) => toast.error(err?.response?.data?.error || 'Failed'));
                  }
                } else if (match) {
                  toast.error(lang === 'en' ? `Coupon status: ${match.status}, cannot verify` : `券状态为${match.status}，无法核销`);
                } else {
                  toast.error(lang === 'en' ? 'Coupon not found' : '未找到此券');
                }
              }} />
            <button className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-lg" onClick={() => setCouponFilter('')}>
              {lang === 'en' ? 'Clear' : '清空'}
            </button>
            <button className="text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50"
              onClick={() => {
                const val = couponFilter.trim();
                if (val.length < 8) return;
                const match = allCoupons.find((c: any) => c.id === val || c.id?.endsWith(val));
                if (!match) { toast.error(lang === 'en' ? 'Not found' : '未找到此券'); return; }
                if (match.status !== 'sent') { toast.error(lang === 'en' ? `Status: ${match.status}` : `券状态为${match.status}，需先被货代领取才能核销`); return; }
                if (!confirm(lang === 'en' ? `Verify ¥${match.faceValue} coupon?` : `核销 ¥${match.faceValue} 报关券？`)) return;
                client.post('/customs-coupons/broker/manual-verify', { couponId: match.id, customsDeclNumber: 'counter-' + Date.now() }).then(() => {
                  toast.success(lang === 'en' ? 'Verified!' : '已核销');
                  setCouponFilter('');
                  client.get('/customs-coupons/broker/search-coupons').then(r => {
                    const allD = r.data?.data || []; setAllCoupons(allD); setPoolCoupons(allD.filter((x: any) => x.status === 'issued'));
                  });
                }).catch((err: any) => toast.error(err?.response?.data?.error || 'Failed'));
              }}>
              {lang === 'en' ? 'Verify' : '核销'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2 mb-2">{lang === 'en' ? 'Enter coupon ID → click Verify (only claimed coupons)' : '输入券号 → 点击核销（仅已领取的券可核销）'}</p>

          {/* Coupon list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredCoupons.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">{lang === 'en' ? 'No coupons' : '暂无报关券'}</div>
            ) : (
              filteredCoupons.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5 hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400">{c.id?.slice(-8)}</span>
                    <span className="font-bold text-teal-700">¥{c.faceValue}</span>
                    <span className="text-[10px]">{c.transportMode === 'air' ? '✈️' : '🚢'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      c.status === 'used' ? 'bg-green-100 text-green-700' :
                      c.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'issued' ? 'bg-teal-100 text-teal-700' :
                      'bg-gray-100 text-gray-500'}`}>
                      {c.status === 'used' ? (lang === 'en' ? 'Used' : '已用') :
                       c.status === 'sent' ? (lang === 'en' ? 'Claimed' : '已领') :
                       c.status === 'issued' ? (lang === 'en' ? 'Pool' : '池中') : c.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{c.createdAt?.slice(0, 10)}</span>
                    {c.status === 'sent' && (
                      <button onClick={async () => {
                        if (!confirm(lang === 'en' ? 'Mark this coupon as used?' : '确认核销此券？')) return;
                        try {
                          await client.post('/customs-coupons/broker/manual-verify', { couponId: c.id, customsDeclNumber: 'manual-' + Date.now() });
                          toast.success(lang === 'en' ? 'Verified!' : '已核销');
                          const r = await client.get('/customs-coupons/broker/search-coupons');
                          const allD = r.data?.data || [];
                          setAllCoupons(allD); setPoolCoupons(allD.filter((x: any) => x.status === 'issued'));
                        } catch (err: any) { toast.error(err?.response?.data?.error || 'Failed'); }
                      }} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded hover:bg-amber-200">
                        {lang === 'en' ? 'Verify' : '核销'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── 待处理订单 ── */}
      {stats?.registered && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-teal-500" />
            {lang === 'en' ? 'Pending Orders' : '待处理订单'}
          </h2>
          {ordersLoading ? <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" /></div> : orders.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm"><CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>{lang === 'en' ? 'No pending orders' : '暂无待处理订单'}</p></div>
          ) : (
            <div className="space-y-2">
              {orders.map((o: any) => (
                <div key={o.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div><p className="text-sm font-bold text-gray-800">{o.trader_company || o.trader_name || '用户'}</p>{o.decl_info && <p className="text-xs text-gray-500 mt-0.5">{o.decl_info}</p>}</div>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Pending' : '待处理'}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mb-2">{lang === 'en' ? 'Submitted' : '提交时间'}：{o.created_at?.substring(0, 10) || ''}</p>
                  {completing === o.id ? (
                    <div className="space-y-2 bg-white rounded-lg p-3 border border-gray-200">
                      <input className="input-field text-xs" placeholder={lang === 'en' ? 'Decl number' : '报关单号'} value={completeForm.customsDeclNumber} onChange={e => setCompleteForm(f => ({ ...f, customsDeclNumber: e.target.value }))} />
                      <div className="flex gap-2">
                        <input className="input-field text-xs flex-1" type="number" placeholder={lang === 'en' ? 'Items' : '项数'} value={completeForm.itemCount} onChange={e => setCompleteForm(f => ({ ...f, usageId: o.id, itemCount: parseInt(e.target.value) || 1 }))} />
                        <input className="input-field text-xs flex-1" type="number" placeholder={lang === 'en' ? 'Inspection fee' : '查验费'} value={completeForm.inspectionFee} onChange={e => setCompleteForm(f => ({ ...f, usageId: o.id, inspectionFee: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 text-xs font-bold bg-green-600 text-white py-2 rounded-lg hover:bg-green-700" onClick={handleComplete} disabled={!completeForm.customsDeclNumber}>
                          {lang === 'en' ? 'Complete' : '确认完成'}
                        </button>
                        <button className="text-xs text-gray-500 px-2" onClick={() => setCompleting(null)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setCompleteForm({ usageId: o.id, customsDeclNumber: '', itemCount: 1, inspectionFee: 0 })} className="text-xs font-bold bg-teal-500 text-white px-4 py-1.5 rounded-lg hover:bg-teal-600">
                      {lang === 'en' ? 'Complete' : '完成订单'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BMS 结算报表 ── */}
      {stats?.registered && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{lang === 'en' ? '📊 Settlement Report' : '📊 结算报表'}</h3>
              <p className="text-xs text-gray-500">{lang === 'en' ? 'Coupon usage & revenue summary' : '报关券核销与收入汇总'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{lang === 'en' ? 'Total Launched' : '累计投放'}</p>
              <p className="text-2xl font-black text-emerald-700">{stats.totalLaunchd || 0}<span className="text-xs font-normal text-gray-400 ml-1">{lang === 'en' ? 'tickets' : '张'}</span></p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{lang === 'en' ? 'Claimed' : '已认领'}</p>
              <p className="text-2xl font-black text-blue-700">{stats.sentCount || 0}<span className="text-xs font-normal text-gray-400 ml-1">{lang === 'en' ? 'tickets' : '张'}</span></p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{lang === 'en' ? 'Verified' : '已核销'}</p>
              <p className="text-2xl font-black text-amber-700">{stats.usedCount || 0}<span className="text-xs font-normal text-gray-400 ml-1">{lang === 'en' ? 'tickets' : '张'}</span></p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{lang === 'en' ? 'Revenue' : '结算收入'}</p>
              <p className="text-2xl font-black text-violet-700">
                ¥{((stats.usedCount || 0) * 50).toLocaleString()}
                <span className="text-[10px] font-normal text-gray-400 ml-0.5">{lang === 'en' ? 'est.' : '估'}</span>
              </p>
            </div>
          </div>

          {/* 金额明细 */}
          {stats.amountStats && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-600 mb-2">{lang === 'en' ? 'Amount Breakdown' : '金额明细'}</h4>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-gray-400">{lang === 'en' ? 'Sent Value' : '已送出'}</span>
                  <p className="font-bold text-gray-700">¥{Number(stats.amountStats.sentAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">{lang === 'en' ? 'Verified Value' : '已核销'}</span>
                  <p className="font-bold text-green-700">¥{Number(stats.amountStats.usedAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">{lang === 'en' ? 'Pending' : '待处理'}</span>
                  <p className="font-bold text-blue-700">¥{Number(stats.amountStats.pendingAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">{lang === 'en' ? 'Expired' : '已过期'}</span>
                  <p className="font-bold text-red-500">¥{Number(stats.amountStats.expiredAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* 按面值统计 */}
          {stats.byDenom && stats.byDenom.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-600 mb-2">{lang === 'en' ? 'By Denomination' : '按面值统计'}</h4>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const denomMap: Record<string, any[]> = {};
                  for (const d of stats.byDenom) {
                    if (!denomMap[d.faceValue]) denomMap[d.faceValue] = [];
                    denomMap[d.faceValue].push(d);
                  }
                  return Object.entries(denomMap).map(([fv, items]) => {
                    const total = items.reduce((s: number, x: any) => s + x.count, 0);
                    const used = items.filter((x: any) => x.status === 'used').reduce((s: number, x: any) => s + x.count, 0);
                    return (
                      <div key={fv} className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                        <span className="font-bold text-gray-800">¥{fv}</span>
                        <span className="text-gray-400 ml-2">{lang === 'en' ? 'Total' : '共'}: {total}</span>
                        {used > 0 && <span className="text-green-600 ml-1.5">{lang === 'en' ? 'Verified' : '已核'}: {used}</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* 最近投放记录 */}
          {stats.recentContributions && stats.recentContributions.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-bold text-gray-600 mb-2">{lang === 'en' ? 'Recent Contributions (30 days)' : '最近30天投放记录'}</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {stats.recentContributions.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5">
                    <span className="text-gray-500">{r.date}</span>
                    <span className="font-medium text-gray-700">{r.transportMode === 'air' ? '✈️' : '🚢'} ¥{r.faceValue} × {r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 联系管理员弹窗 ── */}
      {contactAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactAdminSending) setContactAdminOpen(false); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-primary-500" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">📩 {lang === 'en' ? 'Contact Admin' : '联系管理员'}</h3>
            <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
              placeholder={lang === 'en' ? 'Describe your issue...' : '请描述您遇到的问题...'}
              value={contactAdminText} onChange={e => setContactAdminText(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button className="flex-1 btn-outline text-sm" onClick={() => setContactAdminOpen(false)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="flex-1 btn-primary text-sm" onClick={handleContactAdmin} disabled={contactAdminSending || !contactAdminText.trim()}>
                {contactAdminSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {lang === 'en' ? 'Send' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
