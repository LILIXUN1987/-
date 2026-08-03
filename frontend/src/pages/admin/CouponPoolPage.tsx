import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Gift, MapPin, Building2, Search, Loader2, CheckCircle, AlertCircle, Users, CreditCard, ArrowRight, X, Phone, MessageCircle, FileText, Star } from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function CouponPoolPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPort, setSelectedPort] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState('');

  // Broker detail modal
  const [brokerModal, setBrokerModal] = useState<any>(null);
  const [brokerLoading, setBrokerLoading] = useState(false);

  // Self-use modal
  const [useModal, setUseModal] = useState<any>(null);
  const [useForm, setUseForm] = useState({ decl_info: '' });
  const [useSubmitting, setUseSubmitting] = useState(false);
  const [useSuccess, setUseSuccess] = useState(false);

  const fetchPool = async (port?: string) => {
    setLoading(true);
    try {
      const res = await client.get('/customs-coupons/available-by-port', { params: { port: port || undefined, mode: selectedMode || undefined } });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchPool(selectedPort); }, [selectedPort, selectedMode]);

  const handleClaim = async (couponId: string) => {
    if (!data?.isPaidForwarder) {
      toast.error(lang === 'en' ? 'Only paid forwarders can claim coupons' : '仅付费货代可领券');
      return;
    }
    setClaiming(couponId);
    try {
      const res = await client.post('/customs-coupons/claim', { couponId });
      toast.success(res.data.message || '领券成功');
      fetchPool(selectedPort);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '领券失败');
    }
    setClaiming(null);
  };

  const handleShowBroker = async (coupon: any) => {
    // Try to find broker by company name - use the available brokers list
    setBrokerLoading(true);
    try {
      const brokersRes = await client.get('/customs-coupons/active-brokers');
      const brokers = brokersRes.data?.data || [];
      // Match by company name
      const match = brokers.find((b: any) => b.company_name === coupon.brokerCompany);
      if (match) {
        const detailRes = await client.get(`/customs-coupons/broker/${match.id}/detail`);
        setBrokerModal(detailRes.data);
      } else {
        // Show what we have from the coupon data
        setBrokerModal({
          companyName: coupon.brokerCompany,
          contactPerson: coupon.contactPerson || '',
          phone: coupon.phone || '',
          portName: coupon.portCity,
        });
      }
    } catch {
      setBrokerModal({
        companyName: coupon.brokerCompany,
        contactPerson: coupon.contactPerson || '',
        portName: coupon.portCity,
      });
    }
    setBrokerLoading(false);
  };

  const handleSelfUse = async () => {
    if (!useModal) return;
    setUseSubmitting(true);
    try {
      const userInfo = await client.get('/auth/me').then(r => r.data);
      const myCompany = userInfo?.company_name || userInfo?.display_name || '';
      const myName = userInfo?.display_name || '';

      await client.post('/customs-coupons/use', {
        couponId: useModal.couponId,
        brokerId: useModal.brokerId,
        declInfo: { company: myCompany, person: myName, notes: useForm.decl_info },
      });
      setUseSuccess(true);
      fetchPool(selectedPort);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Use failed' : '使用失败'));
    }
    setUseSubmitting(false);
  };

  const handleClaimAndUse = async (coupon: any) => {
    if (!data?.isPaidForwarder) {
      toast.error(lang === 'en' ? 'Only paid forwarders can claim' : '仅付费货代可领券');
      return;
    }
    setClaiming(coupon.id);
    try {
      await client.post('/customs-coupons/claim', { couponId: coupon.id });
      // Now open use modal
      setUseModal({ couponId: coupon.id, brokerId: null, brokerCompany: coupon.brokerCompany, faceValue: coupon.faceValue });
      setUseForm({ decl_info: '' });
      setUseSuccess(false);
      fetchPool(selectedPort);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Claim failed' : '领券失败'));
    }
    setClaiming(null);
  };

  // Consolidate port stats by port name
  const consolidatedPorts = data?.portStats?.reduce((acc: any[], p: any) => {
    const existing = acc.find((x: any) => x.port === p.port);
    if (existing) { existing.count += p.count; if (!existing.modes.includes(p.mode)) existing.modes.push(p.mode); }
    else acc.push({ port: p.port, count: p.count, modes: [p.mode] });
    return acc;
  }, []).sort((a: any, b: any) => b.count - a.count) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Gift className="w-7 h-7 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Coupon Pool' : '报关券池'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Browse and claim customs coupons by port' : '按口岸浏览报关券，付费货代免费领取'}</p>
        </div>
      </div>

      {/* 付费状态提示 */}
      {data && !data.isPaidForwarder && user?.role === 'forwarder' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1 text-sm text-amber-800">
            {lang === 'en' ? 'Only forwarders with an active subscription can claim coupons.' : '仅标准版以上付费货代可领取报关券。'}
          </div>
          <button onClick={() => navigate('/admin/subscribe')} className="flex-shrink-0 text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">
            {lang === 'en' ? 'Subscribe' : '开通月费'} <ArrowRight className="w-3 h-3 inline" />
          </button>
        </div>
      )}

      {/* 筛选条件 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-teal-500" />
          {lang === 'en' ? 'Filter' : '筛选条件'}
        </h2>
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-2 block">{lang === 'en' ? 'Transport Mode' : '运输方式'}</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: '', label: lang === 'en' ? 'All' : '全部' },
              { key: 'sea', label: '🚢 ' + (lang === 'en' ? 'Sea' : '海运') },
              { key: 'air', label: '✈️ ' + (lang === 'en' ? 'Air' : '空运') },
            ].map(opt => (
              <button key={opt.key} onClick={() => setSelectedMode(opt.key)}
                className={'text-xs px-3 py-1.5 rounded-full border transition-all ' + (selectedMode === opt.key ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <h3 className="text-xs font-bold text-gray-700 mb-2">{lang === 'en' ? 'Port' : '口岸'}</h3>
        {data?.portStats && data.portStats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelectedPort('')}
              className={'text-xs px-3 py-1.5 rounded-full border transition-all ' + (!selectedPort ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300')}>
              {lang === 'en' ? 'All' : '全部'} ({consolidatedPorts.reduce((s: number, p: any) => s + p.count, 0)})
            </button>
            {consolidatedPorts.map((p: any, i: number) => (
              <button key={i} onClick={() => setSelectedPort(p.port)}
                className={'text-xs px-3 py-1.5 rounded-full border transition-all ' + (selectedPort === p.port ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300')}>
                {p.modes.includes('air') && p.modes.includes('sea') ? '🚢✈️' : p.modes.includes('air') ? '✈️' : '🚢'} {p.port} ({p.count})
              </button>
            ))}
          </div>
        )}
        {!data?.portStats?.length && !loading && (
          <div className="text-center py-6 text-gray-400 text-sm">
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{lang === 'en' ? 'No coupons available yet' : '暂无可用券，等待报关行贡献'}</p>
          </div>
        )}
      </div>

      {/* 券列表 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : data?.data?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.data.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-2xl font-bold text-teal-600">¥{c.faceValue}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{lang === 'en' ? 'Coupon' : '报关券'}</div>
                </div>
                <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                  {c.transportMode === 'air' ? '✈️' : '🚢'} {c.portCity}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <button className="text-left hover:text-teal-700 hover:underline font-medium" onClick={() => handleShowBroker(c)}>
                  {c.brokerCompany}
                </button>
              </div>
              {/* Two buttons: Claim + Use directly */}
              <div className="flex gap-2">
                <button onClick={() => handleClaim(c.id)} disabled={claiming === c.id || !data?.isPaidForwarder}
                  className={'flex-1 text-xs font-bold py-2 rounded-lg transition-all ' + (data?.isPaidForwarder ? 'bg-teal-500 text-white hover:bg-teal-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                  {claiming === c.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (lang === 'en' ? 'Claim' : '领取')}
                </button>
                <button onClick={() => handleClaimAndUse(c)} disabled={claiming === c.id || !data?.isPaidForwarder}
                  className={'flex-1 text-xs font-bold py-2 rounded-lg transition-all ' + (data?.isPaidForwarder ? 'bg-teal-700 text-white hover:bg-teal-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                  {claiming === c.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : (lang === 'en' ? 'Claim & Use' : '领券并使用')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="text-center py-12 text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{lang === 'en' ? 'No coupons available' : '暂无可用券'}</p>
        </div>
      )}

      {/* ═══ 报关行详情弹窗 ═══ */}
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
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lang === 'en' ? 'Contact: ' : '联系人：'}{brokerModal.contactPerson}</span>
                </div>
              )}
              {brokerModal.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${brokerModal.phone}`} className="text-teal-600 hover:underline">{brokerModal.phone}</a>
                </div>
              )}
              {brokerModal.wechat && (
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lang === 'en' ? 'WeChat: ' : '微信：'}{brokerModal.wechat}</span>
                </div>
              )}
              {brokerModal.serviceType && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {lang === 'en' ? 'Service: ' : '服务：'}
                    {brokerModal.serviceType === 'both' ? (lang === 'en' ? 'Sea + Air' : '海运+空运') :
                     brokerModal.serviceType === 'air' ? (lang === 'en' ? 'Air freight' : '空运') : (lang === 'en' ? 'Sea freight' : '海运')}
                    {brokerModal.canImport ? ' · ' + (lang === 'en' ? 'Import OK' : '可做进口') : ''}
                  </span>
                </div>
              )}
              {brokerModal.feePerDecl && (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{lang === 'en' ? 'Fee: ' : '报关费：'}¥{brokerModal.feePerDecl}/{lang === 'en' ? 'decl' : '票'}</span>
                </div>
              )}
              {brokerModal.intro && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed">
                  {brokerModal.intro}
                </div>
              )}
              {brokerModal.commitmentNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <span className="font-bold">{lang === 'en' ? 'Commitments: ' : '服务承诺：'}</span>
                  {brokerModal.commitmentNotes}
                </div>
              )}
              {brokerModal.totalLaunchd > 0 && (
                <div className="text-[10px] text-gray-400 text-center pt-2">
                  {lang === 'en' ? `${brokerModal.totalLaunchd} coupons contributed` : `已投放 ${brokerModal.totalLaunchd} 张券`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 货代自助使用弹窗 ═══ */}
      {useModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!useSubmitting) { setUseModal(null); setUseSuccess(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <FileText className="w-6 h-6" />
                <button onClick={() => { setUseModal(null); setUseSuccess(false); }} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <h2 className="text-lg font-bold mt-2">{lang === 'en' ? 'Use Coupon' : '使用报关券'}</h2>
              <p className="text-sm text-white/80">{useModal.brokerCompany} · ¥{useModal.faceValue}</p>
            </div>
            {useSuccess ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Coupon submitted!' : '券已提交使用！'}</p>
                <p className="text-xs text-gray-500 mt-1">{lang === 'en' ? 'The broker will process your declaration.' : '报关行将尽快处理您的报关申请。'}</p>
                <button className="mt-4 text-xs text-teal-600 hover:underline" onClick={() => { setUseModal(null); setUseSuccess(false); }}>
                  {lang === 'en' ? 'Close' : '关闭'}
                </button>
              </div>
            ) : (
              <div className="p-5">
                <p className="text-xs text-gray-500 mb-4">
                  {lang === 'en' ? 'Submit your declaration info. The broker will review and process it.' : '提交报关信息，报关行审核后将为您办理。'}
                </p>
                <div className="bg-teal-50 rounded-lg p-3 mb-4 text-sm">
                  <div className="flex items-center gap-1.5 text-teal-700 font-medium mb-1">
                    <Building2 className="w-4 h-4" />{useModal.brokerCompany}
                  </div>
                  <div className="text-teal-600 font-bold">¥{useModal.faceValue} {lang === 'en' ? 'coupon' : '报关券'}</div>
                </div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Declaration Info (optional)' : '报关备注（选填）'}</label>
                <textarea className="input-field text-sm min-h-[80px] resize-none w-full mb-4" value={useForm.decl_info} onChange={e => setUseForm(f => ({ ...f, decl_info: e.target.value }))}
                  placeholder={lang === 'en' ? 'e.g. 2 items, HS code 8471...' : '如：2项商品、HS编码8471...'} />
                <button className="w-full btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5" onClick={handleSelfUse} disabled={useSubmitting}>
                  {useSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {lang === 'en' ? 'Submit & Use Coupon' : '提交并核销'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 价值说明 */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'en' ? 'How it works' : '券池说明'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
          {[
            { icon: '🏢', title: lang === 'en' ? 'Brokers contribute' : '报关行贡献', desc: lang === 'en' ? 'Coupons added to the pool for exposure.' : '报关行投放券到池中获取客户曝光。' },
            { icon: '📦', title: lang === 'en' ? 'Forwarders claim' : '货代领券', desc: lang === 'en' ? 'Claim coupons to use yourself or gift to clients.' : '付费货代领取后可自己用或转赠客户。' },
            { icon: '🏭', title: lang === 'en' ? 'Self-use' : '自主使用', desc: lang === 'en' ? 'Submit declaration info directly to the broker.' : '领券后直接提交报关信息给报关行。' },
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
  );
}
