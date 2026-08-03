import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import { getRoleChecks } from '../../../types';
import { Loader2, Plus, Scale, Shield, AlertTriangle, CheckCircle, XCircle, Clock, Search, ChevronRight } from 'lucide-react';

// ═══════════════════════════════════════
// 发起争议表单
// ═══════════════════════════════════════
function DisputeForm({ onDone }: { onDone: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);

  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const res = await client.get('/admin/users', { params: { q } });
      setUserResults(res.data.data || []);
    } catch { setUserResults([]); }
  };

  const handleSubmit = async () => {
    if (!respondentId || !title.trim() || !description.trim()) {
      alert(lang === 'en' ? 'Please fill in all fields' : '请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/disputes', { respondent_id: respondentId, title: title.trim(), description: description.trim() });
      alert(lang === 'en' ? 'Dispute filed. Admin will review.' : '争议已提交，等待管理员介入');
      onDone();
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Failed' : '提交失败'));
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-500/5 overflow-hidden">
      <div className="bg-gradient-to-r from-rose-50 to-red-50 px-6 py-5 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">{lang === 'en' ? 'File a Dispute' : '发起新争议'}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{lang === 'en' ? 'Describe the issue and admin will mediate' : '详细描述问题，管理员将介入调解'}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-lg">
        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
            {lang === 'en' ? 'Respondent *' : '被投诉方 *'}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
              placeholder={lang === 'en' ? 'Search user name / company...' : '搜索用户名或公司名...'}
              value={userSearch}
              onChange={e => searchUsers(e.target.value)}
            />
          </div>
          {userResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-xl max-h-40 overflow-y-auto overflow-hidden shadow-lg">
              {userResults.map((u: any) => (
                <button key={u.username}
                  onClick={() => { setRespondentId(u.username); setRespondentName(u.display_name); setUserSearch(`${u.display_name} · ${u.company_name || ''}`); setUserResults([]); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-rose-50 transition-colors flex items-center gap-3 ${
                    respondentId === u.username ? 'bg-rose-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {(u.display_name || u.username).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{u.display_name}</p>
                    <p className="text-[11px] text-gray-400">{u.company_name || '-'} · @{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
            {lang === 'en' ? 'Title *' : '争议标题 *'}
          </label>
          <input
            className="w-full text-sm px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
            placeholder={lang === 'en' ? 'e.g. Delayed payment for clearance' : '如：清关费用拖欠'}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
            {lang === 'en' ? 'Description *' : '详细描述 *'}
          </label>
          <textarea
            className="w-full text-sm min-h-[120px] resize-none border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all outline-none"
            placeholder={lang === 'en' ? 'Describe the issue in detail...' : '请详细描述问题经过、涉及金额、时间线...'}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-xl shadow-rose-500/20 transition-all duration-200 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Submit Dispute' : '提交争议')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 争议卡片
// ═══════════════════════════════════════
function DisputeCard({ dispute, isAdmin, onRefresh }: { dispute: any; isAdmin: boolean; onRefresh: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const [verdict, setVerdict] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleResolve = async (status: string) => {
    if (!verdict.trim() && status === 'resolved') { alert(lang === 'en' ? 'Provide verdict' : '请填写裁决说明'); return; }
    setActionLoading(true);
    try {
      await client.post(`/disputes/${dispute.id}/resolve`, { status, verdict: verdict.trim() || undefined });
      alert(lang === 'en' ? 'Done' : '已处理');
      onRefresh();
    } catch { alert(lang === 'en' ? 'Failed' : '操作失败'); }
    setActionLoading(false);
  };

  const statusConfig: Record<string, any> = {
    pending:    { icon: Clock, label: lang === 'en' ? 'Pending' : '待处理', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100' },
    under_review: { icon: Shield, label: lang === 'en' ? 'Mediating' : '调解中', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100' },
    resolved:   { icon: CheckCircle, label: lang === 'en' ? 'Resolved' : '已裁决', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
    dismissed:  { icon: XCircle, label: lang === 'en' ? 'Dismissed' : '已驳回', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', iconBg: 'bg-gray-100' },
  };
  const sc = statusConfig[dispute.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className={`bg-white rounded-2xl border ${sc.border} shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${sc.iconBg} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${sc.text}`} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{dispute.title}</h4>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text} mt-0.5`}>
                {sc.label}
              </span>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold">申</span>
            <span>{dispute.filer_company || ''} {dispute.filer_name}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold">被</span>
            <span>{dispute.respondent_company || ''} {dispute.respondent_name}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 mb-3 italic border-l-2 border-rose-200">
          "{dispute.description}"
        </p>

        {/* Verdict */}
        {dispute.verdict && (
          <div className="text-xs bg-indigo-50 text-indigo-700 rounded-xl p-4 mb-3 border border-indigo-100">
            <span className="font-bold">{lang === 'en' ? 'Verdict: ' : '裁决：'}</span>
            {dispute.verdict}
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (dispute.status === 'pending' || dispute.status === 'under_review') && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <textarea
              className="w-full text-xs min-h-[70px] resize-none border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder={lang === 'en' ? 'Verdict...' : '输入裁决说明...'}
              value={verdict}
              onChange={e => setVerdict(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => handleResolve('resolved')} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/20 transition-all">
                <CheckCircle className="w-3.5 h-3.5" />{lang === 'en' ? 'Resolve' : '裁决'}
              </button>
              <button onClick={() => handleResolve('dismissed')} disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                <XCircle className="w-3.5 h-3.5" />{lang === 'en' ? 'Dismiss' : '驳回'}
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-2">{dispute.created_at?.slice(0, 16).replace('T', ' ')}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// DisputesTab 主体
// ═══════════════════════════════════════
export default function DisputesTab() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchDisputes = async (status?: string) => {
    setLoading(true);
    try {
      const res = await client.get('/disputes', { params: { status } });
      setDisputes(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const filterOptions = [
    { value: '', label: lang === 'en' ? 'All' : '全部' },
    { value: 'pending', label: lang === 'en' ? 'Pending' : '待处理' },
    { value: 'under_review', label: lang === 'en' ? 'Mediating' : '调解中' },
    { value: 'resolved', label: lang === 'en' ? 'Resolved' : '已裁决' },
    { value: 'dismissed', label: lang === 'en' ? 'Dismissed' : '已驳回' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {filterOptions.map(opt => (
            <button key={opt.value}
              onClick={() => { setFilterStatus(opt.value); fetchDisputes(opt.value || undefined); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                filterStatus === opt.value
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 ${
            showForm
              ? 'bg-gray-200 text-gray-600'
              : 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 hover:from-rose-600 hover:to-red-700'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? (lang === 'en' ? 'Cancel' : '取消') : (lang === 'en' ? 'File Dispute' : '发起争议')}
        </button>
      </div>

      {/* Form */}
      {showForm && <DisputeForm onDone={() => { setShowForm(false); fetchDisputes(); }} />}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-rose-400" /></div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">
            {filterStatus ? (lang === 'en' ? 'No disputes in this category' : '该分类下无争议') : (lang === 'en' ? 'No disputes yet' : '暂无争议记录')}
          </p>
          <p className="text-xs text-gray-300">
            {lang === 'en' ? 'Disputes help resolve cooperation issues fairly' : '争议调解帮助双方公平解决合作纠纷'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disputes.map(d => (
            <DisputeCard key={d.id} dispute={d} isAdmin={isAdmin} onRefresh={() => fetchDisputes(filterStatus || undefined)} />
          ))}
        </div>
      )}
    </div>
  );
}
