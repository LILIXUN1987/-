import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { complaintsApi } from '../../api/complaints.api';
import {
  Scale, Loader2, CheckCircle, XCircle, Clock, Search,
  Building2, MessageSquare, Send, X, AlertTriangle,
} from 'lucide-react';

export default function ComplaintAppealPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchAppeals = async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.listAppeals(filter === 'all' ? undefined : filter);
      setAppeals(res.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAppeals(); }, [filter]);

  const handleReview = async (action: 'approved' | 'rejected') => {
    if (!reviewModal) return;
    setReviewing(true);
    try {
      await complaintsApi.reviewAppeal(reviewModal.id, action, reviewNote || undefined);
      setReviewModal(null);
      setReviewNote('');
      fetchAppeals();
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Operation failed' : '操作失败'));
    }
    setReviewing(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <Scale className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'en' ? 'Appeal Management' : '申诉管理'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === 'en' ? 'Review and handle complaint appeals' : '审核被投诉公司的申诉请求'}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        {[
          { key: 'pending', label: lang === 'en' ? 'Pending' : '待处理', icon: Clock },
          { key: 'approved', label: lang === 'en' ? 'Approved' : '已通过', icon: CheckCircle },
          { key: 'rejected', label: lang === 'en' ? 'Rejected' : '已驳回', icon: XCircle },
          { key: 'all', label: lang === 'en' ? 'All' : '全部', icon: Search },
        ].map(t => {
          const Ti = t.icon;
          const active = filter === t.key;
          return (
            <button key={t.key}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                active ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setFilter(t.key)}>
              <Ti className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Appeals list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : appeals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Scale className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {filter === 'pending'
              ? (lang === 'en' ? 'No pending appeals' : '暂无待处理申诉')
              : (lang === 'en' ? 'No appeals found' : '暂无申诉记录')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {lang === 'en' ? 'Appeals will appear here when submitted' : '被投诉公司提交申诉后会在此显示'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appeals.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900">{item.target_company}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      item.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'pending' ? (lang === 'en' ? 'Pending' : '待处理') :
                       item.status === 'approved' ? (lang === 'en' ? 'Approved' : '已通过') :
                       (lang === 'en' ? 'Rejected' : '已驳回')}
                    </span>
                  </div>
                  {(item.submitter_company || item.submitter_name) && (
                    <p className="text-xs text-gray-500 mb-1">
                      {lang === 'en' ? 'Submitted by' : '提交人'}：{item.submitter_company || ''} {item.submitter_name || ''}
                    </p>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Appeal reason' : '申诉理由'}</p>
                    <p className="text-sm text-gray-700">{item.appeal_reason}</p>
                    {item.evidence && (
                      <>
                        <p className="text-xs font-medium text-gray-600 mt-2 mb-1">{lang === 'en' ? 'Evidence' : '证据说明'}</p>
                        <p className="text-sm text-gray-600">{item.evidence}</p>
                      </>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">
                      📞 {lang === 'en' ? 'Contact' : '联系方式'}：{item.contact_info}
                    </p>
                  </div>
                  {item.review_note && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {lang === 'en' ? 'Admin note' : '管理员备注'}：{item.review_note}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 mt-2">
                    {item.created_at?.substring(0, 10)} {item.created_at?.substring(11, 16)}
                  </p>
                </div>
                {item.status === 'pending' && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button className="flex items-center gap-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5 transition-colors"
                      onClick={() => setReviewModal(item)}>
                      <CheckCircle className="w-3 h-3" />{lang === 'en' ? 'Review' : '审核'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!reviewing) setReviewModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-500" />
                {lang === 'en' ? 'Review Appeal' : '审核申诉'} — {reviewModal.target_company}
              </h3>
              <button onClick={() => setReviewModal(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-700">
              <p className="font-medium mb-1">{lang === 'en' ? 'Appeal reason' : '申诉理由'}</p>
              <p>{reviewModal.appeal_reason}</p>
              {reviewModal.evidence && (
                <><p className="font-medium mt-2 mb-1">{lang === 'en' ? 'Evidence' : '证据'}</p><p>{reviewModal.evidence}</p></>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{lang === 'en' ? 'Review note (optional)' : '审核备注（选填）'}</label>
              <textarea className="input-field text-sm min-h-[60px]" value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder={lang === 'en' ? 'Note for the appellant...' : '给申诉人的备注...'} />
            </div>
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {lang === 'en'
                ? 'Approving will DELETE the related complaint immediately.'
                : '审核通过将立即删除对应的吐槽记录。'}
            </p>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg py-2.5 transition-colors"
                onClick={() => handleReview('approved')} disabled={reviewing}>
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {lang === 'en' ? 'Approve & Delete' : '通过并删除'}
              </button>
              <button className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg py-2.5 transition-colors"
                onClick={() => handleReview('rejected')} disabled={reviewing}>
                <XCircle className="w-4 h-4" />
                {lang === 'en' ? 'Reject' : '驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
