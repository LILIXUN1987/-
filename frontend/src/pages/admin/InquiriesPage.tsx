import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  MessageSquare, Loader2, User, Mail, Send,
  CheckCircle, Clock, X, DollarSign, Calendar, AlertCircle, Star,
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
  otherReplies?: { company: string; time: string }[];
  contactedOthers?: number;
}

const IGNORED_KEY = 'ignored_inquiries';
function getIgnored(): string[] {
  try { return JSON.parse(localStorage.getItem(IGNORED_KEY) || '[]'); } catch { return []; }
}
function ignoreInquiry(id: string) {
  const list = getIgnored();
  list.push(id);
  localStorage.setItem(IGNORED_KEY, JSON.stringify(list));
}

type ReplyMode = 'text' | 'quote';

/** 解析询价内容提取货物信息 */
function parseInquiryContent(content: string) {
  const extract = (regex: RegExp) => (content.match(regex)?.at(1) || '').trim();
  return {
    origin: extract(/航线[：:]\s*(\S+)/),
    pieces: extract(/(\d+)\s*件/),
    weight: extract(/(\d+(?:\.\d+)?)\s*(?:KG|kg|公斤)/),
    volume: extract(/(\d+(?:\.\d+)?)\s*(?:CBM|cbm|立方)/),
    goods: extract(/货物[：:](.+)/) || extract(/货物(.+)/),
  };
}

export default function InquiriesPage() {
  const lang = useAuthStore((s) => s.lang);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<InquiryItem | null>(null);
  const [replyMode, setReplyMode] = useState<ReplyMode>('text');
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('unreplied');

  const [quoteForm, setQuoteForm] = useState({
    destPort: '', priceCbm: '', priceKg: '', transportMode: 'sea',
    transitDays: '', validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], notes: '',
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
      transitDays: '', validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], notes: '',
    });
  };

  const handleSend = async () => {
    if (!replyModal) return;
    let content = '';
    if (replyMode === 'quote') {
      const f = quoteForm;
      content = ['📋 【正式报价】', '', f.destPort ? '📍 目的港：' + f.destPort : '',
        f.priceCbm ? '📦 单价：¥' + f.priceCbm + '/CBM' + (f.priceKg ? ' / ¥' + f.priceKg + '/KG' : '') : (f.priceKg ? '📦 单价：¥' + f.priceKg + '/KG' : ''),
        '🚢 运输方式：' + (f.transportMode === 'air' ? '空运' : f.transportMode === 'land' ? '陆运' : '海运'),
        f.transitDays ? '⏱ 时效：' + f.transitDays + '天' : '',
        f.validUntil ? '📅 报价有效期：' + f.validUntil : '',
        f.notes ? '\n📝 备注：' + f.notes : '', '', '---', '如需进一步了解请联系报价，谢谢！'
      ].filter(Boolean).join('\n');
    } else { content = replyText.trim(); }
    if (!content) { toast.error(lang === 'en' ? 'Please enter content' : '请输入内容'); return; }
    setReplySending(true);
    try {
      await client.post('/messages', { receiver_id: replyModal.senderId, content });
      toast.success(lang === 'en' ? 'Sent!' : '已发送');
      setReplyModal(null); setReplyText(''); fetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setReplySending(false);
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚'; if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return t.slice(0, 10);
  };

  const unrepliedCount = inquiries.filter(i => !i.hasReply).length;
  const repliedCount = inquiries.filter(i => i.hasReply).length;
  const [ignoredIds, setIgnoredIds] = useState<string[]>(getIgnored());
  const [transportFilter, setTransportFilter] = useState('');

  // 运输类型检测 + 统计
  function detectTransport(content: string): string {
    if (/空运|航空|飞机|✈️/.test(content)) return '空运';
    if (/海运|海路|船运|🚢/.test(content)) return '海运';
    if (/陆运|铁路|公路|卡车|拖车|🚛/.test(content)) return '陆运';
    if (/快递|速递|国际快件|📦/.test(content)) return '快递';
    if (/DDP|双清|包税/.test(content)) return '双清包税';
    return '其他';
  }
  const transportTypes = [...new Set(inquiries.map(i => detectTransport(i.content || '')))].filter(Boolean);

  let filtered = inquiries.filter(i => !ignoredIds.includes(i.id));
  if (filter === 'unreplied') filtered = filtered.filter(i => !i.hasReply);
  else if (filter === 'replied') filtered = filtered.filter(i => i.hasReply);
  if (transportFilter) filtered = filtered.filter(i => detectTransport(i.content || '') === transportFilter);
  const ignoredCount = inquiries.filter(i => ignoredIds.includes(i.id)).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── 页头 ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shadow-amber-200">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{lang === 'en' ? 'Inquiry Management' : '询盘管理'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{lang === 'en' ? 'Reply to trader inquiries — don\'t let leads slip' : '统一回复外贸询价——别让商机溜走'}</p>
        </div>
      </div>

      {/* ── 筛选栏 ── */}
      <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1 mb-4">
        {[
          { key: 'unreplied' as const, label: lang === 'en' ? 'Awaiting Reply' : '待回复', count: unrepliedCount, dot: 'bg-red-500' },
          { key: 'replied' as const, label: lang === 'en' ? 'Replied' : '已回复', count: repliedCount, dot: 'bg-green-500' },
          { key: 'all' as const, label: lang === 'en' ? 'All' : '全部', count: inquiries.length, dot: 'bg-slate-400' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${
              filter === f.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <span className={`w-2 h-2 rounded-full ${f.dot}`} />
            {f.label} <span className="text-slate-400">{f.count}</span>
          </button>
        ))}
      </div>

      {/* ── 运输类型筛选 ── */}
      {transportTypes.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button onClick={() => setTransportFilter('')}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
              !transportFilter ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            {lang === 'en' ? 'All' : '全部'}
          </button>
          {transportTypes.map(t => {
            const count = inquiries.filter(i => detectTransport(i.content || '') === t && !ignoredIds.includes(i.id)).length;
            return (
              <button key={t} onClick={() => setTransportFilter(transportFilter === t ? '' : t)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  transportFilter === t ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {t === '空运' ? '✈️' : t === '海运' ? '🚢' : t === '陆运' ? '🚛' : t === '快递' ? '📦' : t === '双清包税' ? '🌍' : '📋'} {t}
                <span className="ml-1 text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 列表 ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Mail className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {filter === 'unreplied' ? (lang === 'en' ? 'All replied! 🎉' : '全部已回复！🎉') : (lang === 'en' ? 'No inquiries yet' : '暂无询盘')}
          </p>
          <p className="text-xs text-slate-400 mt-1">{lang === 'en' ? 'When traders send you inquiries, they will appear here' : '外贸用户向您询价时，会显示在这里'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cargo = parseInquiryContent(item.content || '');
            const hasReply = item.hasReply;
            return (
              <div key={item.id} className={`relative bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                hasReply ? 'border-slate-100' : 'border-red-200 shadow-sm shadow-red-50'
              }`}>
                {/* 左侧状态条 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${hasReply ? 'bg-slate-200' : 'bg-red-500'}`} />

                <div className="pl-3">
                  {/* 头部：状态 + 发送方 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <a href={`/company/${item.senderId}`} target="_blank" className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline truncate">
                        {item.senderCompany || item.senderName}
                      </a>
                      {hasReply ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />{lang === 'en' ? 'Replied' : '已回复'}
                          {item.replyCount > 0 && <span className="text-slate-300">· {item.replyCount}</span>}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                          <AlertCircle className="w-3 h-3" />{lang === 'en' ? 'AWAITING' : '待回复'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">{item.senderName} · {timeAgo(item.createdAt)}</span>
                  </div>

                  {/* 核心货物信息——结构化展示 */}
                  <div className={`flex items-center gap-2 flex-wrap mb-2 ${hasReply ? '' : 'bg-red-50/50 -mx-1 px-1 py-1 rounded-lg'}`}>
                    {cargo.origin && <span className="text-sm font-black text-slate-900">📍 {cargo.origin}</span>}
                    {(cargo.pieces || cargo.weight || cargo.volume) && <span className="text-slate-300">|</span>}
                    {cargo.pieces && <span className="text-sm font-bold text-slate-800">{cargo.pieces}{lang === 'en' ? 'pcs' : '件'}</span>}
                    {cargo.weight && <span className="text-sm font-bold text-slate-800">{cargo.weight}KG</span>}
                    {cargo.volume && <span className="text-sm font-bold text-slate-800">{cargo.volume}CBM</span>}
                    {cargo.goods && <span className="text-xs text-slate-500">{cargo.goods}</span>}
                  </div>

                  {/* 原始内容折叠 */}
                  <details className="text-[11px] mb-2">
                    <summary className="text-slate-400 cursor-pointer hover:text-slate-600">{lang === 'en' ? 'View full inquiry' : '查看完整询价'}</summary>
                    <p className="text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg whitespace-pre-wrap text-xs">{item.content}</p>
                  </details>

                  {/* 竞争信息：其他代理回复 */}
                  {(item.otherReplies?.length || 0) > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 mb-1">
                        ⚠️ {lang === 'en' ? 'Competitors have replied:' : '已有其他代理回复：'}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.otherReplies!.map((r, j) => (
                          <span key={j} className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                            🏢 {r.company} · {new Date(r.time).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.contactedOthers && item.contactedOthers > 0 && (
                    <p className="text-[10px] text-red-400 mt-1">
                      {lang === 'en' ? `📢 This trader contacted ${item.contactedOthers} other forwarders` : `📢 此客户还联系了 ${item.contactedOthers} 家其他代理`}
                    </p>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                    {!hasReply && (
                      <>
                        <button className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg px-3 py-1.5 transition-colors shadow-sm"
                          onClick={() => openReply(item)}>
                          <Send className="w-3 h-3" />{lang === 'en' ? 'Reply' : '回复'}
                        </button>
                        <button className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 border border-amber-200 transition-colors"
                          onClick={() => { openReply(item); setReplyMode('quote'); }}>
                          <DollarSign className="w-3 h-3" />{lang === 'en' ? 'Quote' : '报价'}
                        </button>
                        <button className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors"
                          onClick={() => { ignoreInquiry(item.id); setIgnoredIds(getIgnored()); toast.success(lang === 'en' ? 'Ignored' : '已忽略'); }}>
                          <X className="w-3 h-3" />{lang === 'en' ? 'Ignore' : '忽略'}
                        </button>
                      </>
                    )}
                    <a href={`/company/${item.senderId}`} target="_blank"
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-1.5 transition-colors ml-auto">
                      <User className="w-3 h-3" />{lang === 'en' ? 'Profile' : '公司主页'}
                    </a>
                    <Star className="w-3.5 h-3.5 text-slate-300 hover:text-amber-400 cursor-pointer transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 回复弹窗（不变） ── */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!replySending) setReplyModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 border-b border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900">
                  {replyMode === 'quote' ? <><DollarSign className="w-4 h-4 inline mr-1.5 text-amber-500" />{lang === 'en' ? 'Send Quote' : '发送报价'}</>
                    : <><Send className="w-4 h-4 inline mr-1.5 text-indigo-500" />{lang === 'en' ? 'Reply' : '回复'}</>}
                </h3>
                <button onClick={() => setReplyModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${replyMode === 'text' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                  onClick={() => setReplyMode('text')}><Send className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Text' : '文字回复'}</button>
                <button className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${replyMode === 'quote' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500'}`}
                  onClick={() => setReplyMode('quote')}><DollarSign className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Quote' : '报价单'}</button>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-600 max-h-[80px] overflow-y-auto">{replyModal.content}</div>
              {replyMode === 'quote' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Dest. Port' : '目的港'}</label>
                      <input className="input-field text-sm" value={quoteForm.destPort} onChange={e => setQuoteForm(f => ({ ...f, destPort: e.target.value }))} placeholder={lang === 'en' ? 'e.g. LAX' : '如：洛杉矶'} /></div>
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Transport' : '运输方式'}</label>
                      <select className="input-field text-sm" value={quoteForm.transportMode} onChange={e => setQuoteForm(f => ({ ...f, transportMode: e.target.value }))}>
                        <option value="sea">{lang === 'en' ? 'Sea' : '海运'}</option><option value="air">{lang === 'en' ? 'Air' : '空运'}</option><option value="land">{lang === 'en' ? 'Land' : '陆运'}</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Price/CBM' : '单价/CBM'}</label>
                      <input className="input-field text-sm" value={quoteForm.priceCbm} onChange={e => setQuoteForm(f => ({ ...f, priceCbm: e.target.value }))} placeholder="800" type="number" /></div>
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Price/KG' : '单价/KG'}</label>
                      <input className="input-field text-sm" value={quoteForm.priceKg} onChange={e => setQuoteForm(f => ({ ...f, priceKg: e.target.value }))} placeholder="12" type="number" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Transit (days)' : '时效（天）'}</label>
                      <input className="input-field text-sm" value={quoteForm.transitDays} onChange={e => setQuoteForm(f => ({ ...f, transitDays: e.target.value }))} placeholder="7" type="number" /></div>
                    <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Valid Until' : '有效期'}</label>
                      <input className="input-field text-sm" value={quoteForm.validUntil} onChange={e => setQuoteForm(f => ({ ...f, validUntil: e.target.value }))} type="date" /></div>
                  </div>
                  <div><label className="text-xs font-medium text-slate-500 mb-1 block">{lang === 'en' ? 'Notes' : '备注'}</label>
                    <textarea className="input-field text-sm w-full min-h-[60px] resize-none" value={quoteForm.notes} onChange={e => setQuoteForm(f => ({ ...f, notes: e.target.value }))} placeholder={lang === 'en' ? 'e.g. Including docs fee' : '如：含文件费'} /></div>
                  <button className="w-full btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5" onClick={handleSend} disabled={replySending}>
                    {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}{lang === 'en' ? 'Send Quote' : '发送报价'}</button>
                </div>
              ) : (
                <>
                  <textarea className="input-field w-full min-h-[120px] text-sm resize-none mb-3" placeholder={lang === 'en' ? 'Type your reply...' : '输入回复内容...'}
                    value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
                  <button className="w-full btn-primary flex items-center justify-center gap-1 text-sm py-2.5" onClick={handleSend} disabled={replySending || !replyText.trim()}>
                    {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{lang === 'en' ? 'Send Reply' : '发送回复'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
