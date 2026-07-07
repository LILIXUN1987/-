import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import { getRoleChecks } from '../../../types';
import { Loader2, Plus, Scale } from 'lucide-react';

function DisputeForm({ onDone }: { onDone: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [respondentName, setRespondentName] = useState('');
  const [respondentId, setRespondentId] = useState('');
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
      alert(lang === 'en' ? 'Please fill in all required fields' : '请填写完整信息');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/disputes', { respondent_id: respondentId, title: title.trim(), description: description.trim() });
      alert(lang === 'en' ? '✅ Dispute filed. Admin will review shortly.' : '✅ 争议已提交，等待管理员介入');
      onDone();
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败'));
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{lang === 'en' ? '⚖️ File a New Dispute' : '⚖️ 发起新争议'}</h4>
      <div className="space-y-3 max-w-lg">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Respondent (search by name/company) *' : '被投诉方（搜索姓名/公司） *'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'Search user...' : '搜索用户名/公司名...'} value={userSearch} onChange={e => searchUsers(e.target.value)} />
          {userResults.length > 0 && (
            <div className="mt-1 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
              {userResults.map((u: any) => (
                <button key={u.username} className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${respondentId === u.username ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
                  onClick={() => { setRespondentId(u.username); setRespondentName(u.display_name); setUserSearch(`${u.display_name} (${u.company_name || ''})`); setUserResults([]); }}>
                  {u.display_name} · {u.company_name || '-'} · @{u.username}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Title *' : '争议标题 *'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. Delayed payment for clearance services' : '如：清关费用拖欠'} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Description *' : '详细描述 *'}</label>
          <textarea className="input-field w-full text-sm min-h-[100px]" placeholder={lang === 'en' ? 'Describe the issue in detail...' : '请详细描述问题经过...'} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
          {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Submit Dispute' : '提交争议')}
        </button>
      </div>
    </div>
  );
}

function DisputeCard({ dispute, isAdmin, onRefresh }: { dispute: any; isAdmin: boolean; onRefresh: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const [verdict, setVerdict] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleResolve = async (status: string) => {
    if (!verdict.trim() && status === 'resolved') { alert(lang === 'en' ? 'Please provide a verdict' : '请填写裁决说明'); return; }
    setActionLoading(true);
    try {
      await client.post(`/disputes/${dispute.id}/resolve`, { status, verdict: verdict.trim() || undefined });
      alert(lang === 'en' ? 'Done' : '已处理');
      onRefresh();
    } catch { alert(lang === 'en' ? 'Failed' : '操作失败'); }
    setActionLoading(false);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    under_review: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    dismissed: 'bg-gray-100 text-gray-500',
  };
  const statusLabels: Record<string, string> = lang === 'en'
    ? { pending: 'Pending', under_review: 'Under Review', resolved: 'Resolved ✓', dismissed: 'Dismissed' }
    : { pending: '待处理', under_review: '调解中', resolved: '已裁决', dismissed: '已驳回' };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-gray-500" />
            <h4 className="font-semibold text-gray-900 text-sm">{dispute.title}</h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[dispute.status] || 'bg-gray-100'}`}>
              {statusLabels[dispute.status] || dispute.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'en' ? 'Complainant' : '申请人'}: {dispute.filer_company || ''} {dispute.filer_name}
            {' · '}
            {lang === 'en' ? 'Respondent' : '被投诉方'}: {dispute.respondent_company || ''} {dispute.respondent_name}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-2">{dispute.description}</p>

      {dispute.verdict && (
        <div className="text-xs bg-indigo-50 text-indigo-700 rounded-lg p-3 mb-2">
          <span className="font-medium">{lang === 'en' ? 'Verdict' : '裁决'}: </span>{dispute.verdict}
        </div>
      )}

      {isAdmin && (dispute.status === 'pending' || dispute.status === 'under_review') && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <textarea className="input-field w-full text-xs min-h-[60px]" placeholder={lang === 'en' ? 'Enter verdict/notes...' : '输入裁决说明...'} value={verdict} onChange={e => setVerdict(e.target.value)} />
          <div className="flex gap-2">
            <button className="flex-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg py-2" onClick={() => handleResolve('resolved')} disabled={actionLoading}>
              {lang === 'en' ? '✅ Resolve' : '✅ 裁决'}
            </button>
            <button className="flex-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg py-2" onClick={() => handleResolve('dismissed')} disabled={actionLoading}>
              {lang === 'en' ? '❌ Dismiss' : '❌ 驳回'}
            </button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-2">{dispute.created_at?.slice(0, 16).replace('T', ' ')}</p>
    </div>
  );
}

export default function DisputesTab() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchDisputes = async (status?: string) => {
    setLoading(true);
    try {
      const res = await client.get('/disputes', { params: { status } });
      setDisputes(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const [filterStatus, setFilterStatus] = useState('');

  return (
    <div className="space-y-4">
      {/* 发起争议按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['', 'pending', 'under_review', 'resolved', 'dismissed'].map(s => (
            <button key={s} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filterStatus === s ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`} onClick={() => { setFilterStatus(s); fetchDisputes(s || undefined); }}>
              {s ? (lang === 'en' ? s.replace('_', ' ') : (
                s === 'pending' ? '待处理' : s === 'under_review' ? '调解中' : s === 'resolved' ? '已裁决' : '已驳回'
              )) : (lang === 'en' ? 'All' : '全部')}
            </button>
          ))}
        </div>
        <button className="btn-outline text-xs flex items-center gap-1 py-1.5 px-3" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3 h-3" />
          {lang === 'en' ? 'File Dispute' : '发起争议'}
        </button>
      </div>

      {/* 争议表单 */}
      {showForm && <DisputeForm onDone={() => { setShowForm(false); fetchDisputes(); }} />}

      {/* 争议列表 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {lang === 'en' ? 'No dispute cases' : '暂无争议记录'}
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => (
            <DisputeCard key={d.id} dispute={d} isAdmin={isAdmin} onRefresh={() => fetchDisputes(filterStatus || undefined)} />
          ))}
        </div>
      )}
    </div>
  );
}
