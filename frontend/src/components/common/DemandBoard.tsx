import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Search, Clock, MapPin, ArrowRight, Loader2, Handshake, Send } from 'lucide-react';

interface DemandItem {
  id: string;
  keyword: string;
  category: string;
  origin_port: string;
  dest_port: string;
  created_at: string;
  user: { display_name: string; company_name: string } | null;
}

export default function DemandBoard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lang = useAuthStore((s) => s.lang);
  const navigate = useNavigate();
  const [demands, setDemands] = useState<DemandItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  useEffect(() => {
    client.get('/cargo-spaces/demand-board')
      .then(r => setDemands(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClaim = async (item: DemandItem) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setClaiming(item.id);
    try {
      await client.post('/cargo-spaces/bulk-promote', {
        content: `🔍 客户之前搜索「${item.category || '查询'}」${item.keyword.substring(0, 100)}，我有对应舱位可报价！`,
      });
      setClaimed(prev => new Set(prev).add(item.id));
    } catch {}
    setClaiming(null);
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return '刚刚';
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (demands.length === 0) return (
    <section className="max-w-7xl mx-auto px-4 py-8 text-center">
      <p className="text-gray-400 text-sm">📋 暂无未接单的需求</p>
    </section>
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900">
          {lang === 'en' ? '📋 Demand Board' : '📋 需求看板'}
        </h2>
        <p className="text-gray-500 mt-2">
          {lang === 'en'
            ? 'Unmatched inquiries waiting for your quote. Click to claim and contact the customer.'
            : '还没人接的询价需求，货代可以主动报价联系客户。'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {demands.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{item.category || '查询'}</span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(item.created_at)}</span>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-2 line-clamp-2">{item.keyword}</p>
            {(item.origin_port || item.dest_port) && (
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[item.origin_port, item.dest_port].filter(Boolean).join(' → ')}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{item.user?.company_name || item.user?.display_name || '匿名用户'}</span>
              {claimed.has(item.id) ? (
                <span className="text-xs text-green-600 font-bold">✅ {lang === 'en' ? 'Claimed' : '已接单'}</span>
              ) : (
                <button
                  onClick={() => handleClaim(item)}
                  disabled={claiming === item.id}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-50"
                >
                  {claiming === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {lang === 'en' ? 'Claim' : '我来报价'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
