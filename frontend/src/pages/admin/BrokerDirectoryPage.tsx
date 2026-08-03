import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Building2, MapPin, Search, Star, Loader2, Phone, MessageCircle, TrendingUp, Users, FileText, X, Shield, Send, MessageSquare } from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function BrokerDirectoryPage() {
  const lang = useAuthStore((s) => s.lang);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [port, setPort] = useState('');
  const [mode, setMode] = useState('');
  const [sort, setSort] = useState('rating');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  // 站内信联系
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [msgTarget, setMsgTarget] = useState<{ userId: string; name: string } | null>(null);

  const handleSendMessage = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgSending(true);
    try {
      await client.post('/messages', { receiver_id: msgTarget.userId, content: msgText.trim() });
      setMsgSent(true);
      setTimeout(() => { setMsgOpen(false); setMsgSent(false); setMsgText(''); }, 2000);
    } catch { toast.error(lang === 'en' ? 'Send failed' : '发送失败'); }
    setMsgSending(false);
  };

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const res = await client.get('/customs-coupons/broker-directory', { params: { port: port || undefined, mode: mode || undefined, sort } });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchDirectory(); }, [port, mode, sort]);

  const handleShowDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await client.get(`/customs-coupons/broker/${id}/detail`);
      setDetail(res.data);
    } catch { toast.error('Failed to load'); }
    setDetailLoading(false);
  };

  const brokers = data?.data || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-7 h-7 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Broker Directory' : '🏢 报关行黄页'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Browse customs brokers by port, rating and service' : '按口岸评分和运输方式浏览报关行'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Port' : '口岸'}</label>
            <input className="input-field text-sm" value={port} onChange={e => setPort(e.target.value)} placeholder={lang === 'en' ? 'Search port...' : '口岸名'} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Transport' : '运输方式'}</label>
            <div className="flex gap-1">
              {['', 'sea', 'air'].map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={'text-xs px-3 py-1.5 rounded-lg border transition-all ' + (mode === m ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200')}>
                  {m === '' ? (lang === 'en' ? 'All' : '全部') : m === 'sea' ? '🚢' : '✈️'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Sort' : '排序'}</label>
            <div className="flex gap-1">
              {[
                { key: 'rating', label: lang === 'en' ? 'Rating' : '评分' },
                { key: 'contributed', label: lang === 'en' ? 'Volume' : '投放量' },
              ].map(s => (
                <button key={s.key} onClick={() => setSort(s.key)}
                  className={'text-xs px-3 py-1.5 rounded-lg border transition-all ' + (sort === s.key ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-200')}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-gray-400">{data?.total || 0} {lang === 'en' ? 'brokers' : '家报关行'}</p>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : brokers.length === 0 ? (
        <div className="text-center py-12 text-gray-400"><Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">{lang === 'en' ? 'No brokers found' : '未找到报关行'}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {brokers.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer" onClick={() => handleShowDetail(b.id)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{b.companyName}</h3>
                  <p className="text-xs text-gray-500 mt-0.5"><MapPin className="w-3 h-3 inline mr-0.5" />{b.portName}</p>
                </div>
                {b.avgRating > 0 && (
                  <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold ml-2">
                    <Star className="w-3 h-3 fill-current" />{b.avgRating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                  {b.serviceType === 'both' ? '🚢✈️' : b.serviceType === 'air' ? '✈️' : '🚢'}
                </span>
                {b.canImport && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{lang === 'en' ? 'Import' : '进口'}</span>}
                {b.feePerDecl && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-600">¥{b.feePerDecl}/{lang === 'en' ? 'decl' : '票'}</span>}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                {b.totalContributed > 0 && <span>🔥{b.totalContributed}</span>}
                {b.claimCount > 0 && <span><Users className="w-3 h-3 inline" />{b.claimCount}</span>}
                {b.reviewCount > 0 && <span><Star className="w-3 h-3 inline" />{b.reviewCount}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setDetailId(null); setDetail(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
            ) : detail ? (
              <>
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-5 text-white sticky top-0">
                  <div className="flex items-center justify-between mb-1">
                    <Building2 className="w-6 h-6" />
                    <button onClick={() => { setDetailId(null); setDetail(null); }} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <h2 className="text-lg font-bold">{detail.companyName}</h2>
                  <p className="text-sm text-white/80">{detail.portName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {detail.avgRating > 0 && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 inline fill-yellow-300 text-yellow-300" /> {detail.avgRating.toFixed(1)} ({detail.reviewCount || 0})
                      </span>
                    )}
                    {detail.totalContributed > 0 && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">🔥{detail.totalContributed}</span>}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {detail.contactPerson && <div className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{detail.contactPerson}</span></div>}
                  {detail.phone && <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-gray-400" /><a href={`tel:${detail.phone}`} className="text-teal-600 hover:underline">{detail.phone}</a></div>}
                  {detail.wechat && <div className="flex items-center gap-3 text-sm"><MessageCircle className="w-4 h-4 text-gray-400" /><span className="text-gray-700">微信：{detail.wechat}</span></div>}
                  <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-gray-400" /><span className="text-gray-700">
                    {detail.serviceType === 'both' ? (lang === 'en' ? 'Sea + Air' : '海运+空运') : detail.serviceType === 'air' ? (lang === 'en' ? 'Air' : '空运') : (lang === 'en' ? 'Sea' : '海运')}
                    {detail.canImport ? ' · ' + (lang === 'en' ? 'Import OK' : '可做进口') : ''}
                  </span></div>
                  {detail.feePerDecl && <div className="flex items-center gap-3 text-sm"><FileText className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lang === 'en' ? 'Fee: ¥' : '报关费¥'}{detail.feePerDecl}/{lang === 'en' ? 'decl' : '票'}</span></div>}
                  {detail.viewCount > 0 && <div className="flex items-center gap-3 text-sm"><TrendingUp className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{lang === 'en' ? 'Views: ' : '曝光'}{detail.viewCount}</span></div>}

                  {detail.intro && <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{detail.intro}</div>}
                  {detail.commitmentNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                      <span className="font-bold">{lang === 'en' ? 'Commitments: ' : '服务承诺：'}</span>{detail.commitmentNotes}
                    </div>
                  )}
                  {/* Send Message button */}
                  {detail.userId && (
                    <button
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-lg shadow-teal-500/20 transition-all"
                      onClick={() => { setMsgTarget({ userId: detail.userId, name: detail.companyName }); setMsgText(''); setMsgSent(false); setMsgOpen(true); }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {lang === 'en' ? 'Send Message' : '发送站内信'}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Message Modal */}
      {msgOpen && msgTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { if (!msgSending) setMsgOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">
                <MessageSquare className="w-4 h-4 inline mr-1.5 text-teal-500" />
                {lang === 'en' ? `Contact ${msgTarget.name}` : `联系 ${msgTarget.name}`}
              </h3>
              <button onClick={() => setMsgOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {msgSent ? (
              <div className="text-center py-6 text-green-600 font-semibold">{lang === 'en' ? '✅ Message sent!' : '✅ 消息已发送！'}</div>
            ) : (
              <>
                <textarea className="w-full min-h-[100px] text-sm resize-none border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                  placeholder={lang === 'en' ? 'Enter your message...' : '输入消息...'}
                  value={msgText} onChange={e => setMsgText(e.target.value)} disabled={msgSending} autoFocus />
                <button className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-600 disabled:opacity-50"
                  onClick={handleSendMessage} disabled={msgSending || !msgText.trim()}>
                  {msgSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send' : '发送'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
