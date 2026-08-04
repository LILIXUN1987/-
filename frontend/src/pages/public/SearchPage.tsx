import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import { Search, Loader2, Plane, Ship, Truck, Globe, TrendingUp, ArrowRight, UserPlus, Shield, Eye } from 'lucide-react';

interface CargoItem {
  origin_port?: string;
  dest_port?: string;
  airline_code?: string;
  notes?: string;
  price_per_cbm?: string;
  price_per_kg?: string;
  created_at?: string;
  company_name?: string;
  region?: string;
  is_newbie?: boolean;
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = params.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CargoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 如果URL带了q参数，自动搜索
  useEffect(() => {
    if (initialQ) handleSearch(initialQ);
  }, [initialQ]);

  const handleSearch = async (q?: string) => {
    const kw = (q || query).trim();
    if (!kw || kw.length < 2) return;
    setLoading(true); setSearched(true);
    try {
      const res = await client.get('/cargo-spaces/public-search', { params: { q: kw } });
      setResults(res.data.data || []);
      setTotal(res.data.total || 0);
      // 更新URL
      const url = new URL(window.location.href);
      url.searchParams.set('q', kw);
      window.history.replaceState({}, '', url.toString());
    } catch { setResults([]); setTotal(0); }
    setLoading(false);
  };

  const timeAgo = (t: string) => {
    if (!t) return '';
    const diff = Date.now() - new Date(t).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return '刚刚';
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  };

  const handleRegister = () => {
    navigate(`/register?ref=search&q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
            查全球舱位 · 实时库存
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            输入港口代码或航线，看看哪个庄家现在有舱——<span className="text-amber-600 font-bold">免费查，不注册也能看</span>
          </p>
        </div>

        {/* 搜索框 */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center gap-2 p-2 bg-white rounded-2xl shadow-2xl shadow-blue-500/10 border-2 border-blue-200 focus-within:border-blue-400 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-3 flex-shrink-0" />
            <input ref={inputRef}
              className="flex-1 text-lg py-3 px-2 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
              placeholder="输入港口代码或航线，如 JFK、CAN-SGN、深圳→洛杉矶..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }} />
            <button onClick={() => handleSearch()} disabled={loading || query.trim().length < 2}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black text-sm rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex-shrink-0">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* 热门搜索 */}
          {!searched && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <span className="text-xs text-slate-400 pt-1">热门：</span>
              {['JFK','LAX','CAN-SGN','深圳→洛杉矶','FRA','NRT','PVG-JFK'].map(p => (
                <button key={p} onClick={() => { setQuery(p); handleSearch(p); }}
                  className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all">
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 实时动态滚动条 */}
        {searched && !loading && total > 0 && (
          <div className="mb-4 bg-slate-900 rounded-xl p-3 overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">雷达动态</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>🟢 深圳某代理（WCA 会员）刚刚查看了「{query}」的舱位</p>
              <p>🟡 广州某货代（JC Trans 会员）刚刚发布了新的 {query} 询价</p>
              <p>🔴 {query} 航线活跃——近24h已有 {Math.floor(Math.random() * 20) + 5} 人搜索</p>
            </div>
          </div>
        )}

        {/* 搜索结果 */}
        {loading && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        )}

        {searched && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                「{query}」相关舱位 <span className="text-slate-400 font-normal text-sm">{total} 条</span>
              </h2>
              {total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    🔔 已有 {(Math.floor(Math.random() * 300) + 100)} 人订阅 {query} 港口
                  </span>
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
                <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">暂无匹配舱位</p>
                <p className="text-sm text-slate-400 mt-1">换个港口试试——每天都有新舱位发布</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((item, i) => (
                  <div key={i} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer ${showRegister && selectedIdx === i ? 'ring-2 ring-amber-400' : 'border-slate-100'}`}
                    onClick={() => { setShowRegister(true); setSelectedIdx(i); }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {item.airline_code ? '✈️' : item.notes?.includes('DDP') ? '🌍' : item.notes?.includes('海运') ? '🚢' : '📦'}
                        </span>
                        <span className="text-base font-black text-slate-900">
                          {item.origin_port || item.region || '?'} → {item.dest_port || '?'}
                        </span>
                        {item.airline_code && (
                          <span className="text-xs font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{item.airline_code}</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.created_at || '')}</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2 line-clamp-2">{item.notes || ''}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.price_per_cbm && (
                          <span className="text-sm font-black text-emerald-600">¥{item.price_per_cbm}/CBM</span>
                        )}
                        {item.price_per_kg && (
                          <span className="text-sm font-black text-emerald-600">¥{item.price_per_kg}/KG</span>
                        )}
                        {item.company_name && (
                          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            🏢 {item.company_name.substring(0, 10)}{item.company_name.length > 10 ? '…' : ''}
                          </span>
                        )}
                      </div>
                      {/* 注册解锁 */}
                      {showRegister && selectedIdx === i && (
                        <button onClick={(e) => { e.stopPropagation(); handleRegister(); }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all">
                          <UserPlus className="w-4 h-4" /> 🔓 解锁联系方式
                        </button>
                      )}
                      {(!showRegister || selectedIdx !== i) && (
                        <span className="text-[10px] text-slate-400">👆 点击查看详情</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 注册引导 */}
            {results.length > 0 && (
              <div className="mt-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-6 text-white text-center shadow-xl shadow-blue-500/20">
                <h3 className="text-xl font-black mb-2">🔓 解锁全部功能——一键拨打 · 自动匹配 · 查看完整联系方式</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 mb-5">
                  {[
                    { icon: '📞', text: '直接联系货代获取实时报价' },
                    { icon: '📡', text: `订阅 ${query.toUpperCase()} 港口 · 新舱位秒通知` },
                    { icon: '🎫', text: '免费领取报关券抵扣费用' },
                  ].map((f, i) => (
                    <div key={i} className="bg-white/10 rounded-xl p-3 text-sm font-bold">
                      {f.icon} {f.text}
                    </div>
                  ))}
                </div>
                {/* 社交证明 */}
                <p className="text-xs text-blue-200 mb-4">
                  🔴 {query.toUpperCase()} 航线近期活跃——已有 {(Math.floor(Math.random() * 10) + 3)} 位代理通过此航线联系了庄家
                </p>
                <button onClick={handleRegister}
                  className="px-8 py-3 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 text-blue-900 font-black text-base rounded-xl transition-all shadow-lg shadow-blue-500/30">
                  🔓 解锁全部功能 · 免费注册
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
