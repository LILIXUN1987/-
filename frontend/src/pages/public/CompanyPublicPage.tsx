import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import {
  Building2, User, Phone, Mail, Calendar, Package, Eye,
  MessageSquare, MapPin, Loader2, Clock, Send, X, CheckCircle,
  Star, Handshake,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface CargoItem {
  id: string; originPort: string; destPort: string; region: string;
  airlineCode: string; cargoType: string; priceCbm: number | null;
  priceKg: number | null; currency: string; availableCbm: number;
  availableKg: number; validTo: string; views: number; inquiries: number;
  notes: string; createdAt: string;
}

interface ProfileData {
  id: string; displayName: string; companyName: string; role: string;
  avatar: string; bio: string; phone: string; email: string;
  memberSince: string;
  portCity: string; portCode: string;
  stats: { totalCargos: number; activeCargos: number; totalViews: number; totalInquiries: number; cooperations: number };
  reviews: Array<{ rating: number; comment: string; reviewerName: string; reviewerCompany: string; createdAt: string }>;
  activeCargos: CargoItem[];
}

export default function CompanyPublicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactModal, setContactModal] = useState(false);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    client.get(`/auth/profile/${id}`).then(r => {
      setData(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleContact = async () => {
    if (!data || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', { receiver_id: data.id, content: contactText.trim() });
      setContactSent(true);
      setTimeout(() => { setContactModal(false); setContactSent(false); setContactText(''); }, 1500);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '发送失败');
    }
    setContactSending(false);
  };

  const roleIcon: Record<string, string> = {
    forwarder: '🏢', trader: '🏭', lawyer: '⚖️',
    overseas_agent: '🌍', inspector: '🔬', insurer: '🛡️',
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      <div className="text-center"><Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>公司不存在或已注销</p></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">← 返回</button>
          <span className="text-xs text-gray-400">123cargo123.com</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* ═══ 公司信息卡片 ═══ */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 p-8 text-white">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                {data.avatar ? <img src={data.avatar} className="w-full h-full rounded-2xl object-cover" /> : (data.companyName?.charAt(0) || '?')}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold">{data.companyName || data.displayName}</h1>
                <div className="flex items-center gap-3 mt-2 text-white/80 text-sm">
                  <span>{roleIcon[data.role] || '👤'} {data.displayName}</span>
                  {data.memberSince && <span><Calendar className="w-3.5 h-3.5 inline mr-1" />{data.memberSince}</span>}
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            {data.bio && <p className="text-sm text-gray-600 mb-5 leading-relaxed whitespace-pre-wrap">{data.bio}</p>}

            {/* 联系信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {data.phone && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{data.phone}</span>
                </div>
              )}
              {data.email && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{data.email}</span>
                </div>
              )}
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: data.stats.activeCargos, label: '有效舱位', icon: Package },
                { value: data.stats.totalCargos, label: '累计发布', icon: Package },
                { value: data.stats.totalViews, label: '被查看', icon: Eye },
                { value: data.stats.totalInquiries, label: '被询价', icon: MessageSquare },
                { value: data.stats.cooperations, label: '合作记录', icon: Handshake },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {(data.portCity || data.portCode) && (
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 mt-3">
                {data.portCity && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">📍 {data.portCity}</span>}
                {data.portCode && <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200 font-mono">✈️ {data.portCode}</span>}
              </div>
            )}

            <button onClick={() => setContactModal(true)}
              className="mt-5 w-full py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />发送站内信
            </button>
          </div>
        </div>

        {/* ═══ 活跃舱位 ═══ */}
        {data.activeCargos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              有效舱位 ({data.activeCargos.length})
            </h2>
            <div className="space-y-3">
              {data.activeCargos.map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{c.airlineCode ? '✈️' : '🚢'}</span>
                      <span className="font-bold text-gray-900">{c.originPort || '?'} <span className="text-gray-300 mx-1">→</span> {c.destPort || c.region || '?'}</span>
                      {c.airlineCode && <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{c.airlineCode}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-1">
                    {c.priceCbm && <span className="font-bold text-primary-600">¥{c.priceCbm}/CBM</span>}
                    {c.priceKg && <span className="font-bold text-primary-600">¥{c.priceKg}/KG</span>}
                    {c.availableCbm > 0 && <span><Package className="w-3 h-3 inline" /> {Number(c.availableCbm).toLocaleString()} CBM</span>}
                    {c.availableKg > 0 && <span>⚖️ {Number(c.availableKg).toLocaleString()} KG</span>}
                  </div>
                  {c.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.notes}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-200">
                    <span><Eye className="w-3 h-3 inline" /> {c.views}</span>
                    <span><MessageSquare className="w-3 h-3 inline" /> {c.inquiries}</span>
                    <span className="ml-auto">{c.createdAt?.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.reviews?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              合作评价 ({data.reviews.length})
            </h2>
            <div className="space-y-3">
              {data.reviews.map((r, i) => (
                <div key={i} className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-500 font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-xs text-gray-500">{r.reviewerCompany || r.reviewerName}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{r.createdAt?.slice(0, 10)}</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.activeCargos.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无有效舱位</p>
          </div>
        )}
      </div>

      {/* 联系弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(false); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-primary-500" onClick={e => e.stopPropagation()}>
            {contactSent ? (
              <div className="text-center py-6"><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" /><p className="text-sm font-medium text-green-600">✅ 消息已发送</p></div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-500" />
                  发送站内信给 {data.companyName || data.displayName}
                </h3>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder="请输入您要咨询的内容..." value={contactText}
                  onChange={e => setContactText(e.target.value)} autoFocus />
                <div className="flex gap-2">
                  <button className="flex-1 btn-outline text-sm" onClick={() => setContactModal(false)}>取消</button>
                  <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1" onClick={handleContact} disabled={contactSending || !contactText.trim()}>
                    {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}发送
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
