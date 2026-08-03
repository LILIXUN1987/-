import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  MessageSquare, Loader2, User, Mail, Send,
  CheckCircle, Clock, X, DollarSign, Calendar,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface InquiryItem {
  id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderCompany: string;
  hasReply: boolean;
  replyCount: number;
}

type ReplyMode = 'text' | 'quote';

export default function InquiriesPage() {
  const lang = useAuthStore((s) => s.lang);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<InquiryItem | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>('text');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  // 报价表单
  const [quoteForm, setQuoteForm] = useState({
    destPort: '', priceCbm: '', priceKg: '', transportMode: 'sea',
    transitDays: '', validUntil: '', notes: '',
  });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await client.get('/messages/received-inquiries');
      setInquiries(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openReply = (item: InquiryItem) => {
    setReplyModal(item);
    setReplyMode('text');
    setReplyText('');
    const content = item.content || '';
    const portMatch = content.match(/[→➡]\s*([A-Za-z一-鿿]{2,})/);
    const destFromContent = portMatch ? portMatch[1] : '';
    setQuoteForm({
      destPort: destFromContent || '',
      priceCbm: '', priceKg: '', transportMode: 'sea',
      transitDays: '', validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: '',
    });
  };

  const handleSend = async () => {
    if (!replyModal) return;

    let content = '';
    if (replyMode === 'quote') {
      const f = quoteForm;
      const lines: string[] = ['📋 【正式报价】', ''];
      if (f.destPort) lines.push('📍 目的港：' + f.destPort);
      if (f.priceCbm) lines.push('📦 单价：¥' + f.priceCbm + '/CBM' + (f.priceKg ? ' / ¥' + f.priceKg + '/KG' : ''));
      else if (f.priceKg) lines.push('📦 单价：¥' + f.priceKg + '/KG');
      lines.push('🚢 运输方式：' + (f.transportMode === 'air' ? '空运' : f.transportMode === 'land' ? '陆运' : '海运'));
      if (f.transitDays) lines.push('⏱ 时效：' + f.transitDays + '天');
      if (f.validUntil) lines.push('📅 报价有效期：' + f.validUntil);
      if (f.notes) lines.push('', '📝 备注：' + f.notes);
      lines.push('', '---', '如需进一步了解请联系报价，谢谢！');
      content = lines.join('\n');
    } else {
      content = replyText.trim();
    }

    if (!content) {
      toast.error(lang === 'en' ? 'Please enter content' : '请输入内容');
      return;
    }

    setReplySending(true);
    try {
      await client.post('/messages', {
        receiver_id: replyModal.senderId,
        content,
      });
      toast.success(lang === 'en' ? 'Sent!' : '已发送');
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '📋 Inquiry Management' : '📋 询盘管理'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Inquiries from traders' : '收到的询价，统一管理回复'}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No inquiries yet' : '暂无询盘'}</p>
          <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'When traders send you inquiries, they will appear here' : '外贸用户向您询价时，会显示在这里'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((item) => (
            <div key={item.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-all hover:shadow-md ${item.isRead ? 'border-gray-200' : 'border-primary-300 ring-1 ring-primary-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={`/company/${item.senderId}`} target="_blank" className="text-sm font-bold text-gray-900 hover:text-primary-600 hover:underline">{item.senderCompany || item.senderName}</a>
                      {!item.isRead && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{lang === 'en' ? 'NEW' : '新'}</span>}
                    </div>
                    <p className="text-xs text-gray-400">{item.senderName} · {timeAgo(item.createdAt)}</p>
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
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3 bg-gray-50 rounded-lg p-3">{item.content}</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                {!item.hasReply && (
                  <>
                    <button className="flex items-center gap-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 transition-colors"
                      onClick={() => openReply(item)}>
                      <Send className="w-3 h-3" />{lang === 'en' ? 'Reply' : '回复'}
                    </button>
                    <button className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 border border-amber-200 transition-colors"
                      onClick={() => { openReply(item); setReplyMode('quote'); }}>
                      <DollarSign className="w-3 h-3" />{lang === 'en' ? 'Quote' : '报价'}
                    </button>
                  </>
                )}
                <a href={`/company/${item.senderId}`} target="_blank"
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition-colors">
                  <User className="w-3 h-3" />{lang === 'en' ? 'Profile' : '公司主页'}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 回复/报价弹窗 ── */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!replySending) setReplyModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900">
                  {replyMode === 'quote' ?
                    <><DollarSign className="w-4 h-4 inline mr-1.5 text-amber-500" />{lang === 'en' ? 'Send Quote' : '发送报价'}</> :
                    <><Send className="w-4 h-4 inline mr-1.5 text-primary-500" />{lang === 'en' ? `Reply` : '回复'}</>}
                </h3>
                <button onClick={() => setReplyModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${replyMode === 'text' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                  onClick={() => setReplyMode('text')}><Send className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Text' : '文字回复'}</button>
                <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${replyMode === 'quote' ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500'}`}
                  onClick={() => setReplyMode('quote')}><DollarSign className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Quote' : '报价单'}</button>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 max-h-[80px] overflow-y-auto">
                {replyModal.content}
              </div>

              {replyMode === 'quote' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Dest. Port' : '目的港'}</label>
                      <input className="input-field text-sm" value={quoteForm.destPort} onChange={e => setQuoteForm(f => ({ ...f, destPort: e.target.value }))}
                        placeholder={lang === 'en' ? 'e.g. Los Angeles' : '如：洛杉矶'} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Transport' : '运输方式'}</label>
                      <select className="input-field text-sm" value={quoteForm.transportMode} onChange={e => setQuoteForm(f => ({ ...f, transportMode: e.target.value }))}>
                        <option value="sea">{lang === 'en' ? 'Sea freight' : '海运'}</option>
                        <option value="air">{lang === 'en' ? 'Air freight' : '空运'}</option>
                        <option value="land">{lang === 'en' ? 'Land transport' : '陆运'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Price/CBM' : '单价/CBM'}</label>
                      <input className="input-field text-sm" value={quoteForm.priceCbm} onChange={e => setQuoteForm(f => ({ ...f, priceCbm: e.target.value }))}
                        placeholder={lang === 'en' ? 'e.g. 800' : '如：800'} type="number" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Price/KG' : '单价/KG'}</label>
                      <input className="input-field text-sm" value={quoteForm.priceKg} onChange={e => setQuoteForm(f => ({ ...f, priceKg: e.target.value }))}
                        placeholder={lang === 'en' ? 'e.g. 12' : '如：12'} type="number" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Transit (days)' : '时效（天）'}</label>
                      <input className="input-field text-sm" value={quoteForm.transitDays} onChange={e => setQuoteForm(f => ({ ...f, transitDays: e.target.value }))}
                        placeholder={lang === 'en' ? 'e.g. 7' : '如：7'} type="number" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Valid Until' : '报价有效期'}</label>
                      <input className="input-field text-sm" value={quoteForm.validUntil} onChange={e => setQuoteForm(f => ({ ...f, validUntil: e.target.value }))} type="date" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Notes' : '备注'}</label>
                    <textarea className="input-field text-sm w-full min-h-[60px] resize-none" value={quoteForm.notes}
                      onChange={e => setQuoteForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder={lang === 'en' ? 'e.g. Including docs fee' : '如：含文件费'} />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {'📋 【正式报价】\n' +
                      (quoteForm.destPort ? `📍 目的港：${quoteForm.destPort}\n` : '') +
                      (quoteForm.priceCbm ? `📦 单价：¥${quoteForm.priceCbm}/CBM` + (quoteForm.priceKg ? ` / ¥${quoteForm.priceKg}/KG` : '') + '\n' : (quoteForm.priceKg ? `📦 单价：¥${quoteForm.priceKg}/KG\n` : '')) +
                      `🚢 运输方式：${quoteForm.transportMode === 'air' ? '空运' : quoteForm.transportMode === 'land' ? '陆运' : '海运'}\n` +
                      (quoteForm.transitDays ? `⏱ 时效：${quoteForm.transitDays}天\n` : '') +
                      (quoteForm.validUntil ? `📅 报价有效期：${quoteForm.validUntil}\n` : '') +
                      (quoteForm.notes ? `\n📝 备注：${quoteForm.notes}` : '')}
                  </div>
                  <button className="w-full btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5" onClick={handleSend} disabled={replySending}>
                    {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    {lang === 'en' ? 'Send Quote' : '发送报价'}
                  </button>
                </div>
              ) : (
                <>
                  <textarea className="input-field w-full min-h-[120px] text-sm resize-none mb-3"
                    placeholder={lang === 'en' ? 'Type your reply...' : '输入回复内容...'}
                    value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
                  <button className="w-full btn-primary flex items-center justify-center gap-1 text-sm py-2.5" onClick={handleSend} disabled={replySending || !replyText.trim()}>
                    {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {lang === 'en' ? 'Send Reply' : '发送回复'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
