import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  MessageSquare, Loader2, User, Send, Scale,
  CheckCircle, Phone, Building2, Clock,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface ConsultItem {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderCompany: string;
  senderPhone: string;
  hasReply: boolean;
  replyCount: number;
}

export default function LawyerConsultPage() {
  const lang = useAuthStore((s) => s.lang);
  const [consults, setConsults] = useState<ConsultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, total: 0, responded: 0 });
  const [replyModal, setReplyModal] = useState<ConsultItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await client.get('/messages/lawyer-consultations');
      setConsults(res.data.data || []);
      if (res.data.stats) setStats(res.data.stats);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleReply = async () => {
    if (!replyModal || !replyText.trim()) return;
    setReplySending(true);
    try {
      await client.post('/messages', {
        receiver_id: replyModal.senderId,
        content: replyText.trim(),
      });
      toast.success(lang === 'en' ? 'Reply sent!' : '回复已发送');
      setReplyModal(null);
      setReplyText('');
      fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setReplySending(false);
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return t.slice(0, 10);
  };

  const stripTag = (content: string) => {
    const lines = content.split('\n');
    const clean = lines.filter((l: string) => !l.startsWith('【律师咨询】') && !l.startsWith('咨询人'));
    return clean.join('\n').trim() || content;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Scale className="w-7 h-7 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '📋 Consultation Management' : '📋 咨询管理'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Legal consultations from community users' : '用户向您提交的法律咨询，统一管理回复'}</p>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">{lang === 'en' ? 'Today' : '今日新增'}</p>
          <p className="text-2xl font-bold text-amber-600">{stats.today}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">{lang === 'en' ? 'Total' : '累计咨询'}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">{lang === 'en' ? 'Replied' : '已回复'}</p>
          <p className="text-2xl font-bold text-green-600">{stats.responded}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : consults.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Scale className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No consultations yet' : '暂无咨询'}</p>
          <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'When users consult you, they will appear here' : '用户向您提交法律咨询时，会显示在这里'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consults.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${item.isRead ? 'border-gray-200' : 'border-amber-300 ring-1 ring-amber-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{item.senderCompany || item.senderName}</span>
                      {!item.isRead && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{lang === 'en' ? 'NEW' : '新'}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                      <span>{item.senderName}</span>
                      {item.senderPhone && <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {item.senderPhone}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {item.hasReply && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />{lang === 'en' ? 'Replied' : '已回复'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3 bg-gray-50 rounded-lg p-3">{stripTag(item.content)}</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                {!item.hasReply && (
                  <button className="flex items-center gap-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3 py-1.5 transition-colors"
                    onClick={() => { setReplyModal(item); setReplyText(''); }}>
                    <Send className="w-3 h-3" />{lang === 'en' ? 'Reply' : '回复咨询'}
                  </button>
                )}
                <a href={`/admin/inbox`}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                  <MessageSquare className="w-3 h-3" />{lang === 'en' ? 'Inbox' : '收件箱'}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 回复弹窗 */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!replySending) setReplyModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 border-t-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">
                <Scale className="w-4 h-4 inline mr-1.5 text-amber-500" />
                {lang === 'en' ? `Reply to ${replyModal.senderCompany || replyModal.senderName}` : `回复 ${replyModal.senderCompany || replyModal.senderName}`}
              </h3>
            </div>
            <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
              <span><Building2 className="w-3 h-3 inline mr-1" />{replyModal.senderCompany || ''}</span>
              <span><User className="w-3 h-3 inline mr-1" />{replyModal.senderName}</span>
              {replyModal.senderPhone && <span><Phone className="w-3 h-3 inline mr-1" />{replyModal.senderPhone}</span>}
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 max-h-[100px] overflow-y-auto">
              {stripTag(replyModal.content)}
            </div>
            <textarea className="input-field w-full min-h-[120px] text-sm resize-none mb-3"
              placeholder={lang === 'en' ? 'Type your reply...' : '输入回复内容...'}
              value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
            <button className="w-full btn-primary flex items-center justify-center gap-1 text-sm py-2.5" onClick={handleReply} disabled={replySending || !replyText.trim()}>
              {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {lang === 'en' ? 'Send Reply' : '发送回复'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
