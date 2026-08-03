import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useLang, t, getCountryEmoji } from './shared';
import { FileSpreadsheet, Loader2, CheckSquare, X } from 'lucide-react';

const T = {
  myQuotes: { zh: '我提交的报价', en: 'My Submitted Quotes' },
  receivedQuotes: { zh: '我收到的报价', en: 'Quotes I Received' },
  noQuotesAgent: { zh: '暂无报价记录。在DDP询价中回复结构化报价吧！', en: 'No quotes submitted yet. Reply to DDP inquiries with a structured quote!' },
  noQuotesForwarder: { zh: '暂无收到的报价。代理回复后这里会显示。', en: 'No quotes received yet. Your inquiries will appear here once agents respond.' },
};

export default function QuotesTab({ isAgent }: { isAgent: boolean }) {
  const lang = useLang();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await client.get('/ddp/quotes/my');
      setQuotes(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchQuotes(); }, []);

  const handleRespond = async (id: string, action: 'accepted' | 'rejected') => {
    try {
      await client.post(`/ddp/quotes/${id}/respond`, { action });
      fetchQuotes();
    } catch { alert(lang === 'en' ? 'Operation failed' : '操作失败'); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { zh: string; en: string; cls: string }> = {
      pending: { zh: '待回复', en: 'Pending', cls: 'bg-amber-100 text-amber-700' },
      accepted: { zh: '已接受 ✅', en: 'Accepted ✅', cls: 'bg-green-100 text-green-700' },
      rejected: { zh: '已拒绝 ❌', en: 'Rejected ❌', cls: 'bg-red-100 text-red-700' },
      expired: { zh: '已过期', en: 'Expired', cls: 'bg-gray-100 text-gray-500' },
    };
    const m = map[status] || map.pending;
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.cls}`}>{lang === 'en' ? m.en : m.zh}</span>;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-5 h-5 text-rose-500" />
        <h3 className="text-base font-bold text-gray-800">{isAgent ? t(T.myQuotes, lang) : t(T.receivedQuotes, lang)}</h3>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {isAgent ? t(T.noQuotesAgent, lang) : t(T.noQuotesForwarder, lang)}
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q: any) => (
            <div key={q.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{getCountryEmoji(q.country)}</span>
                    <span className="font-semibold text-gray-900 text-sm">{q.country}{q.port ? ` / ${q.port}` : ''}</span>
                    {statusBadge(q.status)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs mt-2 bg-gray-50 rounded-lg p-3">
                    {q.ocean_freight && <div><span className="text-gray-400">{lang === 'en' ? 'Ocean Freight' : '海运费'}:</span> <span className="font-medium text-gray-700">{q.ocean_freight}</span></div>}
                    {q.clearance_fee && <div><span className="text-gray-400">{lang === 'en' ? 'Clearance' : '清关费'}:</span> <span className="font-medium text-gray-700">{q.clearance_fee}</span></div>}
                    {q.delivery_fee && <div><span className="text-gray-400">{lang === 'en' ? 'Delivery' : '派送费'}:</span> <span className="font-medium text-gray-700">{q.delivery_fee}</span></div>}
                    {q.duty_fee && <div><span className="text-gray-400">{lang === 'en' ? 'Duty/Tax' : '关税'}:</span> <span className="font-medium text-gray-700">{q.duty_fee}</span></div>}
                    {q.other_fees && <div><span className="text-gray-400">{lang === 'en' ? 'Other' : '其他'}:</span> <span className="font-medium text-gray-700">{q.other_fees}</span></div>}
                    {q.total_price && <div className="sm:col-span-2"><span className="text-gray-400">{lang === 'en' ? 'Total' : '总价'}:</span> <span className="font-bold text-rose-600">{q.currency || 'USD'} {q.total_price}</span></div>}
                    {q.valid_until && <div><span className="text-gray-400">{lang === 'en' ? 'Valid Until' : '有效期'}:</span> <span className="text-gray-600">{q.valid_until}</span></div>}
                  </div>
                  {q.goods_desc && <p className="text-xs text-gray-500 mt-2">📦 {q.goods_desc}</p>}
                  {q.notes && <p className="text-xs text-gray-400 mt-1">📝 {q.notes}</p>}
                  {q.agent_company && <p className="text-[10px] text-gray-400 mt-1">{lang === 'en' ? 'From' : '来自'}: {q.agent_company}{q.agent_name ? ` (${q.agent_name})` : ''}</p>}
                </div>
                {!isAgent && q.status === 'pending' && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg px-3 py-1.5"
                      onClick={() => handleRespond(q.id, 'accepted')}>{lang === 'en' ? 'Accept' : '接受'}</button>
                    <button className="text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5"
                      onClick={() => handleRespond(q.id, 'rejected')}>{lang === 'en' ? 'Decline' : '拒绝'}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
