import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Send, Loader2, Gift, Clock, CheckCircle, Target, DollarSign, Mail } from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function BountyHunterDashboard() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [account, setAccount] = useState({ pending_cash: 0, total_earned: 0 });
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/bounty/my-leads');
      setLeads(res.data.data || []);
      setAccount({ pending_cash: res.data.pending_cash || 0, total_earned: res.data.total_earned || 0 });
    } catch {}
    setLoading(false);
    try { const r = await client.get('/messages/inbox', { params: { page: 1, limit: 1 } }); setUnread(r.data?.unread || 0); } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleQuickSubmit = async () => {
    if (!companyName.trim()) return;
    setSubmitting(true);
    try {
      await client.post('/bounty/submit', { company_name: companyName.trim() });
      toast.success('线索已提交！等待核验。');
      setCompanyName('');
      fetchData();
    } catch (e: any) { toast.error(e?.response?.data?.error || '提交失败'); }
    setSubmitting(false);
  };

  const statusTag = (s: string) => {
    const m: any = {
      pending: { zh: '待核验', cls: 'bg-slate-100 text-slate-500' },
      verified: { zh: '已核验 +30', cls: 'bg-blue-100 text-blue-700' },
      engaged: { zh: '已互动 +50', cls: 'bg-amber-100 text-amber-700' },
      converted: { zh: '💰 已成交', cls: 'bg-emerald-100 text-emerald-700' },
      rejected: { zh: '无效', cls: 'bg-red-100 text-red-400' },
    };
    const t = m[s] || m.pending;
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.cls}`}>{t.zh}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">🎯 {lang === 'en' ? 'Bounty Center' : '悬赏中心'}</h1>
          <p className="text-sm text-slate-500 mt-1">{user?.display_name || ''}，提交海外直客线索，赚取现金奖励</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-amber-50 rounded-xl px-4 py-3 border border-amber-200 text-center">
            <div className="text-xs text-amber-600">冻结中</div>
            <div className="text-2xl font-black text-amber-700">¥{account.pending_cash}</div>
          </div>
          <div className="bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200 text-center">
            <div className="text-xs text-emerald-600">累计获得</div>
            <div className="text-2xl font-black text-emerald-700">¥{account.total_earned}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 第一栏：悬赏中心 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 快速提交 */}
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 shadow-lg shadow-amber-200">
            <h3 className="text-lg font-black text-white mb-4">📝 提交海外直客线索</h3>
            <div className="flex gap-2">
              <input className="flex-1 px-4 py-3 rounded-xl bg-white/20 backdrop-blur text-white placeholder:text-white/60 text-base font-bold border-2 border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="请输入海外公司全称 *" value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickSubmit()} />
              <button onClick={handleQuickSubmit} disabled={submitting || !companyName.trim()}
                className="px-6 py-3 bg-white text-amber-700 font-black rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-all shadow-lg">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                提交
              </button>
            </div>
            <p className="text-xs text-white/60 mt-3">
              先提交公司名即可，国家/港口/品类等信息后续补充。核验通过即获 ¥30。
            </p>
          </div>

          {/* 线索记录 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">📋 我的线索记录</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Gift className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>暂无悬赏记录</p>
                <p className="text-xs mt-1">在上方输入第一个海外公司名开始</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {leads.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        l.status === 'converted' ? 'bg-emerald-500' : l.status === 'verified' || l.status === 'engaged' ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-800 truncate block">{l.company_name}</span>
                        <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
                          {l.country && <span>{l.country}</span>}
                          {l.pod && <span>→ {l.pod}</span>}
                          <Clock className="w-3 h-3 inline" />{l.created_at?.substring(0, 10)}
                        </div>
                      </div>
                    </div>
                    {statusTag(l.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 第二栏：站内信 + 第三栏：设置 */}
        <div className="space-y-5">
          {/* 站内信 */}
          <button onClick={() => navigate('/admin/inbox')}
            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />📩 站内信
              </h3>
              {unread > 0 && (
                <span className="bg-red-500 text-white text-xs font-black rounded-full min-w-[22px] h-5 flex items-center justify-center px-1.5 animate-pulse">
                  {unread}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {unread > 0 ? `您有 ${unread} 条新消息` : '暂无新消息'}
            </p>
            <p className="text-xs text-indigo-400 mt-2 group-hover:underline">查看全部 →</p>
          </button>

          {/* 个人设置 */}
          <button onClick={() => navigate('/admin/profile')}
            className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:border-slate-300 hover:shadow-md transition-all">
            <h3 className="text-sm font-bold text-slate-700 mb-2">👤 个人设置</h3>
            <div className="text-xs text-slate-500 space-y-1">
              <p>📱 {user?.phone || '未绑定手机号'}</p>
              <p>📧 {user?.email || '未绑定邮箱'}</p>
            </div>
            <p className="text-xs text-slate-400 mt-2">修改密码 · 绑定联系方式 →</p>
          </button>

          {/* 规则速览 */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
            <h4 className="text-xs font-bold text-amber-800 mb-2">💰 奖励规则</h4>
            <div className="text-[11px] text-amber-700 space-y-1">
              <p>• 提交线索 → 核验通过 +¥30 冻结</p>
              <p>• 线索互动 → +¥50 冻结</p>
              <p>• 成交分红 → ¥1,000 或 25% 利润</p>
              <p className="text-amber-500 mt-1">冻结仅记账，成交后解锁转现金</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
