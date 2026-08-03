import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { complaintsApi } from '../../api/complaints.api';
import client from '../../api/client';
import ComplaintZone from '../../components/admin/ComplaintZone';
import {
  Search, Building2, AlertTriangle, Users, MessageSquare, X, Loader2, ChevronRight,
  Send, CheckCircle, Flag, Scale,
} from 'lucide-react';

const QUICK_TAGS = ['恶意拉货', '欺瞒时效', '空运转海运', '快船改慢船', '快递渠道优先改经济', '先承诺后甩柜'];
const QUICK_TAGS_EN = ['Fraudulent pickup', 'False ETA', 'Air to sea switch', 'OOCL to slow boat', 'Express downgrade', 'Rolling after confirmation'];

export default function ComplaintPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const myCompany = user?.company_name || user?.display_name || '';
  const myName = user?.display_name || '';
  const queryClient = useQueryClient();
  const tags = lang === 'en' ? QUICK_TAGS_EN : QUICK_TAGS;

  const [searchQ, setSearchQ] = useState('');
  const [query, setQuery] = useState('');

  // ── 发布表单 ──
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_company: '', target_person: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  // ── 申诉弹窗 ──
  const [appealTarget, setAppealTarget] = useState<{ company: string; complaintId: string } | null>(null);
  const [appealForm, setAppealForm] = useState({ contact_info: '', appeal_reason: '', evidence: '' });
  const [appealing, setAppealing] = useState(false);
  const [appealSent, setAppealSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['complaint-company-stats', query],
    queryFn: () => complaintsApi.companyStats(query || undefined),
    enabled: true,
  });

  const topComplained = data?.topComplained || [];
  const companyDetail = data?.companyDetail;

  const handleSearch = () => { setQuery(searchQ.trim()); };

  const handleSubmit = async () => {
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
      queryClient.invalidateQueries({ queryKey: ['complaint-company-stats'] });
    } catch { alert(lang === 'en' ? 'Submission failed' : '发布失败'); }
    setSubmitting(false);
  };

  const handleAppealSubmit = async () => {
    if (!appealTarget || !appealForm.contact_info || !appealForm.appeal_reason) return;
    setAppealing(true);
    try {
      await complaintsApi.appeal(appealTarget.complaintId, appealForm);
      setAppealSent(true);
      setTimeout(() => { setAppealTarget(null); setAppealSent(false); setAppealForm({ contact_info: '', appeal_reason: '', evidence: '' }); }, 3000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败'));
    }
    setAppealing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {lang === 'en' ? '🔍 Company Lookup' : '🛡️ 货代避雷针'}
        </h1>
        <p className="text-sm text-gray-500">
          {lang === 'en'
            ? 'Check company reputation before cooperation. Avoid scams.'
            : '查公司口碑，避合作雷坑。被投诉 ≥5 次自动触发风控预警。'}
        </p>
      </div>

      {/* ═══ 自查提醒 ═══ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Search className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-blue-900">
              {lang === 'en' ? '🔍 Check Your Company Reputation' : '🔍 自查：您的公司有被吐槽吗？'}
            </h3>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              {lang === 'en'
                ? 'Search your own company name below to check if there are complaints. If you find any untrue complaints, click "Appeal" on the company detail card to submit a removal request. Admin will review within 24 hours.'
                : '在下方搜索框输入您自己的公司名称，查看是否有被吐槽记录。如发现不实吐槽，可在公司详情卡片上点击「申诉删除」提交删除请求，管理员将在24小时内审核处理。'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                {lang === 'en' ? '💡 Self-check' : '💡 自查'}
              </span>
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                ⚖️ {lang === 'en' ? 'Appeal' : '申诉'}
              </span>
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                📋 {lang === 'en' ? 'Admin review' : '审核'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 发布表单 ═══ */}
      <div className="bg-white rounded-xl border-2 border-orange-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-bold text-gray-800">
              {lang === 'en' ? '📋 Post a Complaint' : '📋 发布吐槽'}
            </h2>
          </div>
          <button
            className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
              showForm ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? (lang === 'en' ? 'Cancel' : '收起') : (lang === 'en' ? 'Post' : '发布吐槽')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {lang === 'en'
            ? 'Share your real cooperation experience to help the community avoid risks.'
            : '分享您的真实合作经历，帮助群友避雷。一定要是真实经历！'}
        </p>

        {showForm && (
          <div className="space-y-3 bg-orange-50/50 rounded-xl p-4 border border-orange-200">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              <p className="font-medium">⚠️ {lang === 'en' ? 'Notice' : '提醒'}</p>
              <p className="mt-1">{lang === 'en'
                ? 'Only post if you genuinely encountered an issue! False complaints may lead to legal liability.'
                : '一定是现实中确实吃亏上当无法沟通再进行吐槽！虚假吐槽可能承担法律责任。'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'My Company' : '我的公司'}</label>
                <input className="input-field text-sm bg-gray-100 text-gray-500 cursor-not-allowed" value={myCompany || '-'} disabled />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'My Name' : '我的姓名'}</label>
                <input className="input-field text-sm bg-gray-100 text-gray-500 cursor-not-allowed" value={myName || '-'} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? "Target Company *" : '被投诉公司 *'}</label>
                <input className="input-field text-sm" value={form.target_company}
                  onChange={e => setForm(f => ({ ...f, target_company: e.target.value }))}
                  placeholder={lang === 'en' ? "Target's company" : '对方公司名称'} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Contact Person *' : '被投诉联系人 *'}</label>
                <input className="input-field text-sm" value={form.target_person}
                  onChange={e => setForm(f => ({ ...f, target_person: e.target.value }))}
                  placeholder={lang === 'en' ? "Target's name" : '对方姓名'} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Reason *' : '投诉详情 *'}</label>
              <textarea className="input-field text-sm min-h-[80px]" value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder={lang === 'en' ? 'Describe in detail...' : '请详细描述，方便大家引以为戒...'} />
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
              <button className="btn-outline text-sm" onClick={() => { setShowForm(false); setForm({ target_company: '', target_person: '', reason: '' }); }}>
                {lang === 'en' ? 'Cancel' : '取消'}
              </button>
              <button className="btn-primary text-sm flex items-center gap-1" onClick={handleSubmit} disabled={submitting || !form.target_company || !form.target_person || !form.reason}>
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {lang === 'en' ? 'Post' : '发布'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ 公司查询区 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Search className="w-4 h-4 text-primary-500" />
          {lang === 'en' ? '🔍 Look up a company' : '🔍 查一家公司'}
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              placeholder={lang === 'en' ? 'Enter company name to check reputation...' : '输入公司全称或关键词，查口碑...'}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button className="btn-primary text-sm px-5" onClick={handleSearch} disabled={!searchQ.trim()}>
            {lang === 'en' ? 'Search' : '查询'}
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        )}

        {companyDetail && !isLoading && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-lg text-gray-900">{companyDetail.target_company}</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors font-medium"
                  onClick={() => setAppealTarget({
                    company: companyDetail.target_company,
                    complaintId: companyDetail.complaints?.[0]?.id || '',
                  })}>
                  <Scale className="w-3 h-3" />{lang === 'en' ? 'Appeal' : '申诉删除'}
                </button>
                <button onClick={() => { setSearchQ(''); setQuery(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{companyDetail.total}</div>
                <div className="text-xs text-gray-500">{lang === 'en' ? 'Complaints' : '被投诉次数'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{companyDetail.distinct_complainers}</div>
                <div className="text-xs text-gray-500">{lang === 'en' ? 'Complainers' : '不同投诉方'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${companyDetail.total >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {companyDetail.total >= 5 ? '⚠️' : '✅'}
                </div>
                <div className="text-xs text-gray-500">
                  {companyDetail.total >= 5 ? (lang === 'en' ? 'Risk Alert' : '已触发风控') : (lang === 'en' ? 'Safe' : '暂未达阈值')}
                </div>
              </div>
            </div>
            {companyDetail.topReasons && companyDetail.topReasons.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-600 mb-1.5">{lang === 'en' ? 'Common issues:' : '常见问题：'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {companyDetail.topReasons.map((r: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white border border-orange-200 rounded-full text-gray-700">
                      {r.reason} <span className="text-gray-400">×{r.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {companyDetail.complaints && companyDetail.complaints.length > 0 && (
              <details className="group">
                <summary className="text-xs text-primary-600 cursor-pointer hover:underline select-none">
                  {lang === 'en' ? `View all ${companyDetail.total} complaints` : `查看全部 ${companyDetail.total} 条吐槽`}
                </summary>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {companyDetail.complaints.map((c: any) => (
                    <div key={c.id} className="bg-white rounded-lg p-3 border border-orange-100 text-sm">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Users className="w-3 h-3" />
                        <span>{c.complaint_company} · {c.complaint_person}</span>
                        <span className="text-gray-300">→</span>
                        <span>{c.target_person}</span>
                      </div>
                      <p className="text-gray-700">{c.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {query && !isLoading && !companyDetail && (
          <div className="mt-4 text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
            {lang === 'en' ? 'No complaints found for this company' : '未找到该公司的投诉记录'}
          </div>
        )}
      </div>

      {/* ═══ 被投诉最多的公司 ═══ */}
      {topComplained.length > 0 && !companyDetail && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            {lang === 'en' ? '🔥 Most Complained Companies' : '🔥 被投诉最多的公司'}
          </h2>
          <div className="space-y-2">
            {topComplained.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    i < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-gray-700">{item.company}</span>
                  {item.total >= 5 && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                      ⚠️ {lang === 'en' ? 'Alert' : '风控'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{item.total}{lang === 'en' ? ' complaints' : '次投诉'}</span>
                  <span>{item.distinct_complainers}{lang === 'en' ? ' sources' : '家来源'}</span>
                  <button className="text-primary-500 hover:text-primary-700" onClick={() => { setSearchQ(item.company); setQuery(item.company); }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 最新吐槽列表 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          {lang === 'en' ? '📋 Recent Complaints' : '📋 最新吐槽'}
        </h2>
        <ComplaintZone />
      </div>

      {/* ═══ 申诉弹窗 ═══ */}
      {appealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!appealing) setAppealTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" />
                {lang === 'en' ? 'Appeal Removal' : '申诉删除'}
              </h3>
              <button onClick={() => setAppealTarget(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {appealSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                ✅ {lang === 'en' ? 'Appeal submitted! Admin will review.' : '申诉已提交，等待管理员审核'}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  {lang === 'en'
                    ? `If you believe the complaints about ${appealTarget.company} are untrue, please submit an appeal.`
                    : `如果您认为对 ${appealTarget.company} 的吐槽不实，请提交申诉。管理员审核通过后将删除相关吐槽。`}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Contact Info *' : '联系方式 *'}</label>
                    <input className="input-field text-sm" value={appealForm.contact_info}
                      onChange={e => setAppealForm(f => ({ ...f, contact_info: e.target.value }))}
                      placeholder={lang === 'en' ? 'Phone or email' : '手机号或邮箱'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Appeal Reason *' : '申诉理由 *'}</label>
                    <textarea className="input-field text-sm min-h-[80px]" value={appealForm.appeal_reason}
                      onChange={e => setAppealForm(f => ({ ...f, appeal_reason: e.target.value }))}
                      placeholder={lang === 'en' ? 'Explain why this complaint is untrue...' : '请说明该投诉不实的原因...'} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Evidence (optional)' : '证据说明（选填）'}</label>
                    <textarea className="input-field text-sm min-h-[60px]" value={appealForm.evidence}
                      onChange={e => setAppealForm(f => ({ ...f, evidence: e.target.value }))}
                      placeholder={lang === 'en' ? 'Describe any evidence you have...' : '描述您掌握的证据...'} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 btn-outline text-sm" onClick={() => setAppealTarget(null)}>
                    {lang === 'en' ? 'Cancel' : '取消'}
                  </button>
                  <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleAppealSubmit} disabled={appealing || !appealForm.contact_info || !appealForm.appeal_reason}>
                    {appealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {lang === 'en' ? 'Submit' : '提交申诉'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
