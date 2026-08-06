import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Send, Loader2, Gift, TrendingUp, Clock, CheckCircle, XCircle, Target, DollarSign } from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function BountyPage() {
  const lang = useAuthStore((s) => s.lang);
  const [form, setForm] = useState({ company_name: '', country: '', city: '', pod: '', goods_guess: '' });
  const [submitting, setSubmitting] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [account, setAccount] = useState({ pending_cash: 0, total_earned: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/bounty/my-leads');
      setLeads(res.data.data || []);
      setAccount({ pending_cash: res.data.pending_cash || 0, total_earned: res.data.total_earned || 0 });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { toast.error(lang === 'en' ? 'Company name required' : '请填写公司名称'); return; }
    setSubmitting(true);
    try {
      await client.post('/bounty/submit', form);
      toast.success(lang === 'en' ? 'Lead submitted! Pending verification.' : '线索已提交！等待核验。');
      setForm({ company_name: '', country: '', city: '', pod: '', goods_guess: '' });
      fetchData();
    } catch (e: any) { toast.error(e?.response?.data?.error || '提交失败'); }
    setSubmitting(false);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { zh: string; en: string; cls: string }> = {
      pending: { zh: '待核验', en: 'Pending', cls: 'bg-slate-100 text-slate-600' },
      verified: { zh: '已核验 +30元', en: 'Verified +30', cls: 'bg-blue-100 text-blue-700' },
      engaged: { zh: '已互动 +50元', en: 'Engaged +50', cls: 'bg-amber-100 text-amber-700' },
      converted: { zh: '已成交 💰', en: 'Converted', cls: 'bg-emerald-100 text-emerald-700' },
      rejected: { zh: '无效', en: 'Rejected', cls: 'bg-red-100 text-red-500' },
    };
    const m = map[s] || map.pending;
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.cls}`}>{lang === 'en' ? m.en : m.zh}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 + 账户余额 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">{lang === 'en' ? '🎯 Bounty Leads' : '🎯 直客悬赏'}</h1>
            <p className="text-sm text-slate-500">{lang === 'en' ? 'Submit overseas direct customer leads, earn cash rewards' : '提交海外直客线索，赚取现金奖励'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center bg-amber-50 rounded-xl px-4 py-2 border border-amber-200">
            <div className="text-xs text-amber-600">{lang === 'en' ? 'Frozen' : '冻结中'}</div>
            <div className="text-xl font-black text-amber-700">¥{account.pending_cash}</div>
          </div>
          <div className="text-center bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-200">
            <div className="text-xs text-emerald-600">{lang === 'en' ? 'Total Earned' : '累计获得'}</div>
            <div className="text-xl font-black text-emerald-700">¥{account.total_earned}</div>
          </div>
        </div>
      </div>

      {/* 规则说明 */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border-2 border-amber-200 p-5">
        <h3 className="text-sm font-black text-amber-800 mb-3">📋 {lang === 'en' ? 'Reward Rules' : '悬赏规则'}</h3>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {[
            { step: '1', label: lang === 'en' ? 'Submit Lead' : '提交线索', reward: lang === 'en' ? 'Pending review' : '待核验' },
            { step: '2', label: lang === 'en' ? 'Verified' : '核验通过', reward: '+30元 冻结', cls: 'text-blue-700' },
            { step: '3', label: lang === 'en' ? 'Engaged' : '已互动', reward: '+50元 冻结', cls: 'text-amber-700' },
          ].map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-amber-100">
              <div className="text-xs text-slate-400">Step {r.step}</div>
              <div className="font-bold mt-1">{r.label}</div>
              <div className={`text-xs mt-0.5 font-black ${r.cls || 'text-slate-500'}`}>{r.reward}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-600 mt-3 text-center">
          {lang === 'en' ? '💰 Conversion unlocks all frozen cash. 1 point = 1 RMB.' : '💰 成交后全部冻结金额解锁转为现金。积分=冻结现金，仅记账不可消费。'}
        </p>
      </div>

      {/* 提交表单 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4" />{lang === 'en' ? 'Submit a Lead' : '提交线索'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Company Name *' : '公司名称 *'}</label>
            <input className="input-field text-sm w-full" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder={lang === 'en' ? 'e.g. ABC Trading Inc' : '如：ABC Trading Inc'} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Country' : '国家'}</label>
            <input className="input-field text-sm w-full" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              placeholder="e.g. USA" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'City' : '城市'}</label>
            <input className="input-field text-sm w-full" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. New York" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Destination Port' : '目的港 (POD)'}</label>
            <input className="input-field text-sm w-full uppercase" value={form.pod} onChange={e => setForm(f => ({ ...f, pod: e.target.value }))}
              placeholder="e.g. JFK" />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Goods Guess' : '品类猜测'}</label>
          <input className="input-field text-sm w-full" value={form.goods_guess} onChange={e => setForm(f => ({ ...f, goods_guess: e.target.value }))}
            placeholder={lang === 'en' ? 'e.g. textiles, auto parts' : '如：纺织品、汽配'} />
        </div>
        <button onClick={handleSubmit} disabled={submitting || !form.company_name.trim()}
          className="w-full py-2.5 bg-amber-500 text-white font-black text-sm rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {lang === 'en' ? 'Submit Lead' : '提交线索'}
        </button>
      </div>

      {/* 我的悬赏记录 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">{lang === 'en' ? '📋 My Leads' : '📋 我的悬赏记录'}</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Gift className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>{lang === 'en' ? 'No leads yet. Submit your first!' : '暂无悬赏记录，提交第一条线索吧！'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {leads.map((l: any) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-slate-800">{l.company_name}</span>
                    {statusLabel(l.status)}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                    {l.country && <span>🌍 {l.country}</span>}
                    {l.pod && <span>📍 {l.pod}</span>}
                    {l.goods_guess && <span>📦 {l.goods_guess}</span>}
                    <span className="text-slate-400"><Clock className="w-3 h-3 inline mr-0.5" />{l.created_at?.substring(0, 10)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
