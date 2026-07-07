import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';
import {
  Send, Loader2, CheckCircle, AlertTriangle, X, DollarSign,
  Clock, MapPin, Package, Plane, Ship, Truck, MessageSquare,
  ArrowLeft, Plus, TrendingUp,
} from 'lucide-react';

type TabKey = 'new' | 'my' | 'pending';

export default function QuotePage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || '';
  const rc = getRoleChecks(role);
  const isForwarder = rc.isForwarder || rc.isAdmin;
  const [tab, setTab] = useState<TabKey>('new');

  const tabs = [
    { key: 'new' as const, label: '📤 发起询价' },
    { key: 'my' as const, label: '📋 我的询价' },
    ...(isForwarder ? [{ key: 'pending' as const, label: '💬 待报价' }] : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">物流询价</h1>
          <p className="text-sm text-gray-500">发布货物需求，让货代主动为您报价</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-lg">
        {tabs.map(t => (
          <button key={t.key}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'new' && <CreateQuote />}
      {tab === 'my' && <MyQuotes />}
      {tab === 'pending' && isForwarder && <PendingQuotes />}
    </div>
  );
}

/** 发起询价 */
function CreateQuote() {
  const [form, setForm] = useState({ origin: '', dest: '', cargo_desc: '', packaging: '', weight_kg: '', volume_cbm: '', quantity: '1', transport_mode: 'air', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.dest.trim()) { setError('请填写目的港/目的地'); return; }
    if (!form.origin.trim()) { setError('请填写货源地（起运港/城市）'); return; }
    if (!form.packaging.trim()) { setError('请填写包装方式'); return; }
    if (!form.notes.trim()) { setError('请填写件数与对应尺寸'); return; }
    setSubmitting(true); setError('');
    try {
      await client.post('/quote/create-request', {
        origin: form.origin.trim(),
        dest: form.dest.trim(),
        cargo_desc: form.cargo_desc.trim() || undefined,
        packaging: form.packaging.trim(),
        weight_kg: parseFloat(form.weight_kg) || undefined,
        volume_cbm: parseFloat(form.volume_cbm) || undefined,
        quantity: parseInt(form.quantity) || 1,
        transport_mode: form.transport_mode,
        notes: form.notes.trim(),
      });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setForm({ origin: '', dest: '', cargo_desc: '', packaging: '', weight_kg: '', volume_cbm: '', quantity: '1', transport_mode: 'air', notes: '' });
      }, 3000);
    } catch (err: any) { setError(err?.response?.data?.error || '发布失败'); }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-800 mb-1">✅ 询价已发布</h3>
        <p className="text-sm text-green-600">系统已通知匹配的货代，请留意收件箱获取报价</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-5 h-5 text-primary-600" />
          <h2 className="font-bold text-gray-900">发布货物需求</h2>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

        <div className="space-y-3">
          {/* 运输方式 */}
          <div className="flex gap-2">
            {(['air', 'sea', 'land', 'express'] as const).map(m => {
              const icons: any = { air: Plane, sea: Ship, land: Truck, express: Package };
              const Icon = icons[m];
              const labels: any = { air: '✈️ 空运', sea: '🚢 海运', land: '🚛 陆运', express: '📦 快递' };
              return (
                <button key={m}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-bold transition-all ${form.transport_mode === m ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setForm(f => ({ ...f, transport_mode: m }))}>
                  {labels[m]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">货源地/起运港 *</label>
              <input className="input-field text-sm" placeholder="如 深圳" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">目的港/目的地 *</label>
              <input className="input-field text-sm" placeholder="如 洛杉矶" value={form.dest} onChange={e => setForm(f => ({ ...f, dest: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">货物品名</label>
            <input className="input-field text-sm" placeholder="如 电子产品、服装、机械配件" value={form.cargo_desc} onChange={e => setForm(f => ({ ...f, cargo_desc: e.target.value }))} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">包装方式 *</label>
            <input className="input-field text-sm" placeholder="如 纸箱、托盘、木箱、铁桶等" value={form.packaging} onChange={e => setForm(f => ({ ...f, packaging: e.target.value }))} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">重量（KG）</label>
              <input className="input-field text-sm" type="number" min="0" placeholder="100" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">体积（CBM）</label>
              <input className="input-field text-sm" type="number" min="0" placeholder="5" value={form.volume_cbm} onChange={e => setForm(f => ({ ...f, volume_cbm: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">件数</label>
              <input className="input-field text-sm" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">件数与对应尺寸 *</label>
            <textarea className="input-field text-sm min-h-[70px]" placeholder={'100*80*60/1;120*40*30/1     ← 格式：长*宽*高/件数，多件用;隔开'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <p className="text-[10px] text-amber-600 mt-1">⚠️ 示例：<code className="bg-amber-100 px-1 rounded">80*60*40/2;100*80*60/1</code> 表示2件80×60×40 + 1件100×80×60</p>
          </div>

          <button className="btn-primary w-full flex items-center justify-center gap-2 py-3" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? '发布中...' : '📤 发布询价'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            发布后系统将通知匹配的货代，您将在收件箱收到报价通知
          </p>
        </div>
      </div>
    </div>
  );
}

/** 我的询价 */
function MyQuotes() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [requestDetail, setRequestDetail] = useState<any>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);

  const fetch = async () => {
    try { const r = await client.get('/quote/my-requests'); setRequests(r.data.data || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const viewQuotes = async (requestId: string) => {
    setSelected(requestId);
    setQuotesLoading(true);
    try {
      const r = await client.get(`/quote/requests/${requestId}/quotes`);
      setQuotes(r.data.data || []);
      setRequestDetail(r.data.request);
    } catch {}
    setQuotesLoading(false);
  };

  const acceptQuote = async (quoteId: string) => {
    if (!confirm('确定接受该报价？接受后将关闭询价。')) return;
    try {
      await client.post(`/quote/quotes/${quoteId}/accept`);
      alert('✅ 已接受报价，请通过站内信与货代联系');
      if (selected) viewQuotes(selected);
      fetch();
    } catch { alert('操作失败'); }
  };

  if (selected) {
    return (
      <div>
        <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4" onClick={() => { setSelected(null); setQuotes([]); }}>
          <ArrowLeft className="w-4 h-4" /> 返回询价列表
        </button>

        {requestDetail && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {requestDetail.origin || '?'} → {requestDetail.dest}</span>
              <span>{requestDetail.transport_mode === 'air' ? '✈️ 空运' : requestDetail.transport_mode === 'sea' ? '🚢 海运' : requestDetail.transport_mode === 'land' ? '🚛 陆运' : '📦 快递'}</span>
              {requestDetail.weight_kg && <span>{requestDetail.weight_kg}KG</span>}
              {requestDetail.volume_cbm && <span>{requestDetail.volume_cbm}CBM</span>}
              {requestDetail.cargo_desc && <span>📦 {requestDetail.cargo_desc}</span>}
            </div>
          </div>
        )}

        {quotesLoading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
        ) : quotes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无报价</p>
            <p className="text-xs mt-1">货代正在报价中，请耐心等待</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => {
              const isAccepted = q.status === 'accepted';
              return (
                <div key={q.id} className={`bg-white rounded-xl border-2 shadow-sm p-5 transition-all ${isAccepted ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:shadow-md'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-primary-600">¥{Number(q.price_amount).toFixed(2)}</span>
                        <span className="text-xs text-gray-400">{q.currency}</span>
                        {isAccepted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✅ 已接受</span>}
                        {q.status === 'rejected' && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">已过期</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {q.transit_days && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {q.transit_days} 天</span>}
                        {q.valid_until && <span>有效期至 {q.valid_until}</span>}
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {q.forwarder_company || q.forwarder_name}</span>
                      </div>
                      {q.notes && <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">{q.notes}</p>}
                    </div>
                    {!isAccepted && q.status === 'pending' && (
                      <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        onClick={() => acceptQuote(q.id)}>接受报价</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {loading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
        : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>暂无询价记录</p>
            <p className="text-xs mt-1">在"发起询价"页面发布您的第一个询价</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => viewQuotes(r.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{r.origin || '?'} → {r.dest}</span>
                    <span className="text-xs text-gray-400">{r.transport_mode === 'air' ? '✈️' : r.transport_mode === 'sea' ? '🚢' : r.transport_mode === 'land' ? '🚛' : '📦'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{formatTime(r.created_at, 'MM-DD HH:mm')}</span>
                    {r.cargo_desc && <span>📦 {r.cargo_desc}</span>}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      r.status === 'completed' ? 'bg-green-100 text-green-700' : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'completed' ? '已成交' : r.status === 'pending' ? '待报价' : r.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">{r.quote_count} 个报价</span>
                  <span className="text-gray-300">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/** 货代：待报价 */
function PendingQuotes() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [form, setForm] = useState({ price_amount: '', currency: 'CNY', transit_days: '', valid_until: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    try { const r = await client.get('/quote/pending-requests'); setRequests(r.data.data || []); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async () => {
    if (!form.price_amount || parseFloat(form.price_amount) <= 0) { setError('请填写有效报价金额'); return; }
    setSubmitting(true); setError('');
    try {
      await client.post('/quote/submit-quote', {
        request_id: showForm,
        price_amount: parseFloat(form.price_amount),
        currency: form.currency,
        transit_days: parseInt(form.transit_days) || undefined,
        valid_until: form.valid_until || undefined,
        notes: form.notes.trim() || undefined,
      });
      alert('✅ 报价已提交，用户将收到通知');
      setShowForm(null);
      setForm({ price_amount: '', currency: 'CNY', transit_days: '', valid_until: '', notes: '' });
      fetch();
    } catch (err: any) { setError(err?.response?.data?.error || '提交失败'); }
    setSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {loading ? <div className="lg:col-span-2 text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
        : requests.length === 0 ? (
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>暂无待报价的询价</p>
            <p className="text-xs mt-1">当有用户发布询价时，将在这里显示</p>
          </div>
        ) : (
          <>
            {/* 左侧：询价列表 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {requests.map(r => (
                <div key={r.id} className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${showForm === r.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}
                  onClick={() => { setShowForm(r.id); setError(''); }}>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium text-sm">{r.origin || '?'} → {r.dest}</span>
                    <span className="text-xs">{r.transport_mode === 'air' ? '✈️' : r.transport_mode === 'sea' ? '🚢' : r.transport_mode === 'land' ? '🚛' : '📦'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <span>{r.requester_company || r.requester_name}</span>
                    {r.weight_kg && <span>{r.weight_kg}KG</span>}
                    {r.volume_cbm && <span>{r.volume_cbm}CBM</span>}
                    {r.cargo_desc && <span>📦 {r.cargo_desc}</span>}
                  </div>
                  <div className="text-[10px] text-gray-300 mt-0.5">{formatTime(r.created_at, 'MM-DD HH:mm')}</div>
                </div>
              ))}
            </div>

            {/* 右侧：报价表单 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              {!showForm ? (
                <div className="text-center py-16 text-gray-400 text-sm">← 请在左侧选择一个询价进行报价</div>
              ) : (
                <div>
                  <h3 className="font-bold text-gray-900 mb-4">📝 提交报价</h3>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">报价金额 *</label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" type="number" min="0" step="0.01" placeholder="0.00"
                          value={form.price_amount} onChange={e => setForm(f => ({ ...f, price_amount: e.target.value }))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">币种</label>
                        <select className="input-field text-sm" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                          <option value="CNY">CNY</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">运输天数</label>
                        <input className="input-field text-sm" type="number" min="0" placeholder="3" value={form.transit_days} onChange={e => setForm(f => ({ ...f, transit_days: e.target.value }))} />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">有效期至</label>
                      <input className="input-field text-sm" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">备注（选填）</label>
                      <textarea className="input-field text-sm min-h-[80px]" placeholder="报价说明、含哪些费用、注意事项等" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <button className="btn-primary w-full flex items-center justify-center gap-2 py-2.5" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submitting ? '提交中...' : '提交报价'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
