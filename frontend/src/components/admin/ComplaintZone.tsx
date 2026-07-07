import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { complaintsApi, Complaint } from '../../api/complaints.api';
import { useAuthStore } from '../../store/authStore';
import {
  MessageSquare, Send, Trash2, Building2, User,
  Loader2, AlertTriangle, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';

const QUICK_TAGS = ['恶意拉货', '欺瞒时效', '空运转海运', '快船改慢船', '快递渠道优先改经济', '先承诺后甩柜'];
const QUICK_TAGS_EN = ['Fraudulent pickup', 'False ETA', 'Air to sea switch', 'OOCL to slow boat', 'Express downgrade', 'Rolling after confirmation'];
const LIMIT = 20;

export default function ComplaintZone() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);
  const isTrader = rc.isTrader;
  const isAdmin = rc.isAdmin;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_company: '', target_person: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const myCompany = user?.company_name || '';
  const myName = user?.display_name || '';

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page],
    queryFn: () => complaintsApi.list({ page, limit: LIMIT }),
  });

  const complaints = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return complaints;
    const q = search.trim().toLowerCase();
    return complaints.filter(c =>
      (c.complaint_company || '').toLowerCase().includes(q) ||
      (c.target_company || '').toLowerCase().includes(q) ||
      (c.complaint_person || '').toLowerCase().includes(q) ||
      (c.target_person || '').toLowerCase().includes(q) ||
      (c.reason || '').toLowerCase().includes(q)
    );
  }, [complaints, search]);

  const tags = lang === 'en' ? QUICK_TAGS_EN : QUICK_TAGS;

  const handleSubmit = useCallback(async () => {
    if (!form.target_company || !form.target_person || !form.reason) return;
    setSubmitting(true);
    try {
      await complaintsApi.create({
        complaint_company: myCompany,
        target_company: form.target_company,
        complaint_person: myName,
        target_person: form.target_person,
        reason: form.reason,
      });
      setForm({ target_company: '', target_person: '', reason: '' });
      setShowForm(false);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    } catch { alert(lang === 'en' ? 'Submission failed' : '发布失败，请重试'); }
    setSubmitting(false);
  }, [form, myCompany, myName, queryClient, lang]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await complaintsApi.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    } catch {}
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900">{lang === 'en' ? 'Complaints' : '吐槽专区'}</h2>
          <span className="text-xs text-gray-400">({total || 0})</span>
        </div>
        <button className="text-sm px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-medium"
          onClick={() => setShowForm(!showForm)}>
          {showForm ? (lang === 'en' ? 'Cancel' : '收起') : (lang === 'en' ? 'Post Complaint' : '发布吐槽')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
          placeholder={lang === 'en' ? 'Search company, person or reason...' : '搜索公司、姓名或原因...'}
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')}><X className="w-3 h-3" /></button>}
      </div>

      {/* Publish Form */}
      {showForm && (
        <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-4 mb-4 space-y-3">
          {isTrader && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 space-y-2">
              <p className="font-medium">⚠️ {lang === 'en' ? 'Trader Notice' : '外贸行业用户提醒'}</p>
              <p>{lang === 'en' ? 'You can report issues you encountered with freight forwarders through other channels.' : '您可以吐槽您在其他渠道与货代沟通遇到的无法沟通的问题。'}</p>
              <p>{lang === 'en' ? 'When a company receives ≥5 complaints, the system will notify the admin.' : '被反馈公司收到 ≥5 次不同客户投诉时，系统将通知管理员。'}</p>
              <p className="font-bold text-red-900">{lang === 'en' ? '⚠️ Only post if you genuinely had a real issue!' : '⚠️ 一定是现实中确实吃亏上当无法沟通再进行吐槽！'}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'My Company *' : '吐槽公司 *'}</label>
              <input className="input-field text-sm bg-gray-100 text-gray-500 cursor-not-allowed" value={myCompany || (lang === 'en' ? 'No company set' : '未设置公司名称')} disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? "Target's Company *" : '被吐槽公司 *'}</label>
              <input className="input-field text-sm" value={form.target_company}
                onChange={e => setForm(f => ({ ...f, target_company: e.target.value }))}
                placeholder={lang === 'en' ? "Target's company name" : '对方公司名称'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'My Name *' : '吐槽人 *'}</label>
              <input className="input-field text-sm bg-gray-100 text-gray-500 cursor-not-allowed" value={myName || (lang === 'en' ? 'No name' : '未设置姓名')} disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? "Target's Name *" : '被吐槽人 *'}</label>
              <input className="input-field text-sm" value={form.target_person}
                onChange={e => setForm(f => ({ ...f, target_person: e.target.value }))}
                placeholder={lang === 'en' ? "Target's name" : '对方姓名'} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Reason *' : '吐槽原因 *'}</label>
            <textarea className="input-field text-sm min-h-[60px]" value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder={lang === 'en' ? 'Describe in detail for the community to learn...' : '请详细描述，方便大家引以为戒...'} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <button key={tag} type="button"
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.reason === tag ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-orange-50'}`}
                  onClick={() => setForm(f => ({ ...f, reason: f.reason === tag ? '' : tag }))}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-outline text-sm" onClick={() => setShowForm(false)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
            <button className="btn-primary text-sm flex items-center gap-1" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (lang === 'en' ? 'Posting...' : '发布中...') : <><Send className="w-3.5 h-3.5" /> {lang === 'en' ? 'Post' : '发布'}</>}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {search ? (lang === 'en' ? 'No matching complaints' : '未找到匹配的吐槽') : (lang === 'en' ? 'No complaints yet. Click to post one.' : '暂无吐槽，点击上方按钮发布')}
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filtered.map(item => (
              <div key={item.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" /> {item.complaint_company}
                      </span>
                      <span className="text-xs text-gray-400">→</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" /> {item.target_company}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs text-gray-500 flex items-center gap-0.5"><User className="w-3 h-3" /> {lang === 'en' ? 'From' : '吐槽人'}：{item.complaint_person}</span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-500 flex items-center gap-0.5"><User className="w-3 h-3" /> {lang === 'en' ? 'Against' : '被吐槽人'}：{item.target_person}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.reason}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400">{formatTime(item.created_at, 'MM-DD HH:mm')}</span>
                      {item.uploader_name && (
                        <span className="text-xs text-gray-400">{lang === 'en' ? 'By' : '发布人'}：{item.uploader_company || ''} {item.uploader_name}</span>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" onClick={() => setDeleteTarget(item)} title={lang === 'en' ? 'Delete' : '删除'}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {lang === 'en' ? `Total ${total}, Page ${page}/${totalPages}` : `共 ${total} 条，第 ${page}/${totalPages} 页`}
              </span>
              <div className="flex gap-1">
                <button className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900">{lang === 'en' ? 'Confirm Delete' : '确认删除'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{lang === 'en' ? 'This cannot be undone' : '此操作不可撤销'}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-medium text-gray-900">{deleteTarget.complaint_company} → {deleteTarget.target_company}</div>
              <div className="text-xs text-gray-500 mt-1">{deleteTarget.reason?.substring(0, 60)}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {lang === 'en' ? 'Delete' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
