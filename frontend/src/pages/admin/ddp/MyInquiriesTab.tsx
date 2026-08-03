import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useLang, t } from './shared';
import { Loader2, MessageSquare, Send, X, FileSpreadsheet } from 'lucide-react';

export default function MyInquiriesTab({ isAgent }: { isAgent: boolean }) {
  const lang = useLang();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteModal, setQuoteModal] = useState<any | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    ocean_freight: '', clearance_fee: '', delivery_fee: '', duty_fee: '',
    other_fees: '', total_price: '', currency: 'USD', valid_until: '', notes: '', reply_content: '',
  });
  const [quoteSending, setQuoteSending] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAgent) {
        const res = await client.get('/overseas/inquiries');
        setItems(res.data.data || []);
      } else {
        const res = await client.get("/ddp/my-inquiries");
        setItems(res.data.data || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [isAgent]);

  const handleSubmitQuote = async () => {
    if (!quoteModal) return;
    setQuoteSending(true);
    try {
      await client.post('/ddp/quotes', {
        inquiry_id: quoteModal.inquiry_id || quoteModal.id, ...quoteForm,
        reply_content: quoteForm.reply_content || undefined,
      });
      setQuoteSent(true);
      setTimeout(() => {
        setQuoteModal(null); setQuoteSent(false);
        setQuoteForm({ ocean_freight: '', clearance_fee: '', delivery_fee: '', duty_fee: '', other_fees: '', total_price: '', currency: 'USD', valid_until: '', notes: '', reply_content: '' });
        fetchData();
      }, 2000);
    } catch { alert(lang === 'en' ? 'Failed to submit quote' : '提交报价失败'); }
    setQuoteSending(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            {isAgent ? (lang === "en" ? "📬 DDP Inquiries Received" : "📬 我收到的DDP询价") : (lang === "en" ? "📬 My DDP Inquiries" : "📬 我的DDP询价")}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isAgent ? (lang === "en" ? "Reply with a structured quote to win the deal" : "用结构化报价回复，提升成单率") : (lang === "en" ? "Overview of all your DDP inquiries and agent replies" : "查看您所有的DDP询价及各代理的回复情况")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {isAgent
            ? (lang === "en" ? "No DDP inquiries yet. Once Chinese forwarders submit inquiries matching your country, they'll appear here." : "暂无DDP询价。当中国货代提交匹配您国家的询价后，这里会显示。")
            : (lang === "en" ? "No inquiries yet. Submit one from the Inquiry tab!" : "暂无询价记录，去「我要询价」Tab 提交吧！")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 hover:border-primary-200 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isAgent ? (
                    <p className="text-sm font-medium text-gray-800">
                      📦 {item.sender_company || item.sender_name || (lang === 'en' ? 'Client' : '客户')}
                      {item.created_at && <span className="text-[10px] text-gray-400 font-normal ml-2">{item.created_at?.slice(0, 16).replace("T", " ")}</span>}
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-gray-800">{item.country}{item.port ? ` / ${item.port}` : ""}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.goods_desc || item.content?.substring(0, 80) || item.notes?.substring(0, 40) || "-"}</p>
                  {!isAgent && <p className="text-[10px] text-gray-400 mt-0.5">{item.created_at?.slice(0, 16).replace("T", " ")}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {isAgent ? (
                    <>
                      {item.has_replied ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">{lang === "en" ? "Replied" : "已回复"}</span>
                      ) : (
                        <>
                          <button className="text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg px-3 py-1.5"
                            onClick={() => { setQuoteModal(item); setQuoteSent(false); setQuoteForm({ ocean_freight: '', clearance_fee: '', delivery_fee: '', duty_fee: '', other_fees: '', total_price: '', currency: 'USD', valid_until: '', notes: '', reply_content: '' }); }}>
                            {lang === "en" ? "Quote 💰" : "报价 💰"}
                          </button>
                          <button className="text-xs font-medium text-primary-600 border border-primary-200 hover:bg-primary-50 rounded-lg px-3 py-1.5"
                            onClick={() => { (window as any).location = "/admin/inbox"; }}>{lang === "en" ? "Chat" : "聊天"}</button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {item.reply_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <MessageSquare className="w-3 h-3" />{item.reply_count}{lang === "en" ? " replies" : "条回复"}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{lang === "en" ? "Awaiting" : "等待回复"}</span>
                      )}
                      <button className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        onClick={() => { (window as any).location = "/admin/inbox"; }}>{lang === "en" ? "View →" : "查看 →"}</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!quoteSending) setQuoteModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 border-t-4 border-rose-500 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-rose-500" />{lang === 'en' ? 'Submit Quote' : '提交报价'}
              </h3>
              <button onClick={() => setQuoteModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {quoteSent ? (
              <div className="text-center py-8"><div className="text-3xl mb-2">✅</div><p className="text-green-600 text-sm font-medium">{lang === 'en' ? 'Quote submitted!' : '报价已提交！'}</p></div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                  <p><span className="font-medium">{lang === 'en' ? 'Inquiry from' : '询价来自'}:</span> {quoteModal.sender_company || quoteModal.sender_name || (lang === 'en' ? 'Client' : '客户')}</p>
                  {quoteModal.content && <p className="mt-1 text-gray-500 line-clamp-3">{quoteModal.content?.substring(0, 200)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[{key:'ocean_freight',label:'海运费'},{key:'clearance_fee',label:'清关费'},{key:'delivery_fee',label:'派送费'},{key:'duty_fee',label:'关税'},{key:'other_fees',label:'其他费用'},{key:'total_price',label:'总价 *',required:true},{key:'valid_until',label:'有效期'}].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? f.label : f.label}</label>
                      <input className="input-field w-full text-sm" placeholder={f.key === 'valid_until' ? '2026-08-15' : ''}
                        value={(quoteForm as any)[f.key] || ''}
                        onChange={e => setQuoteForm(p => ({...p, [f.key]: e.target.value}))} />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? 'Currency' : '货币'}</label>
                    <select className="input-field w-full text-sm" value={quoteForm.currency}
                      onChange={e => setQuoteForm(p => ({...p, currency: e.target.value}))}>
                      <option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option><option value="JPY">JPY</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? 'Notes' : '备注（选填）'}</label>
                  <textarea className="input-field w-full text-sm min-h-[50px]" placeholder={lang === 'en' ? 'e.g. Excluding customs inspection fees' : '例如：不含商检费'}
                    value={quoteForm.notes} onChange={e => setQuoteForm(p => ({...p, notes: e.target.value}))} />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-500 mb-0.5 block">{lang === 'en' ? 'Message to Client *' : '给客户的留言 *'}</label>
                  <textarea className="input-field w-full text-sm min-h-[60px]" placeholder={lang === 'en' ? 'Dear client, please find our quote below...' : '客户您好，以下是我们的报价...'}
                    value={quoteForm.reply_content} onChange={e => setQuoteForm(p => ({...p, reply_content: e.target.value}))} />
                </div>
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                  onClick={handleSubmitQuote} disabled={quoteSending || !quoteForm.total_price.trim() || !quoteForm.reply_content.trim()}>
                  {quoteSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {quoteSending ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Submit Quote' : '提交报价')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
