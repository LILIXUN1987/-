import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Search, Loader2, Users, MapPin, MessageSquare, Clock, TrendingUp, Target, ChevronDown } from 'lucide-react';

interface Searcher {
  user_id: string;
  display_name: string;
  company_name: string;
  role: string;
  port_city: string;
  port_code: string;
  match_keyword: string;
  searched_at: string;
  days_ago: number;
}

export default function CustomerFinderPage() {
  const lang = useAuthStore((s) => s.lang);
  const [port, setPort] = useState('');
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Searcher[]>([]);
  const [totalSearches, setTotalSearches] = useState(0);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    const q = port.trim().toUpperCase();
    if (!q || q.length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await client.get('/cargo-spaces/match-searchers', { params: { port: q, days } });
      setResults(res.data.data || []);
      setTotalSearches(res.data.totalSearches || 0);
    } catch {
      setResults([]);
      setTotalSearches(0);
    }
    setLoading(false);
  };

  const handleContact = async (userId: string) => {
    setSending(userId);
    try {
      await client.post('/messages', { receiver_id: userId, content: `您好，我注意到您搜索过「${port.toUpperCase()}」相关的航线。我这边有${port.toUpperCase()}的舱位资源，如果有需要可以联系我。` });
      alert(lang === 'en' ? '✅ Message sent!' : '✅ 站内信已发送！');
    } catch {
      alert(lang === 'en' ? '❌ Failed to send' : '❌ 发送失败');
    }
    setSending(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'en' ? '🎯 Find Potential Customers' : '🎯 反向匹配潜在客户'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {lang === 'en'
              ? 'Enter a port code to discover traders who searched for it — your potential customers!'
              : '输入你的优势港口代码，发现搜索过该港口的外贸用户——他们就是你的潜在客户！'}
          </p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-gray-700">
            {lang === 'en' ? 'Search by Port Code' : '按港口代码搜索'}
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={inputRef}
            className="flex-1 min-w-[200px] px-4 py-3 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-gray-50 focus:bg-white transition-all"
            placeholder={lang === 'en' ? 'Enter port code, e.g. JFK, LAX, HAM...' : '输入港口三字码，如 JFK、LAX、HAM...'}
            value={port}
            onChange={e => setPort(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <select
            className="px-3 py-3 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={7}>{lang === 'en' ? 'Last 7 days' : '最近7天'}</option>
            <option value={30}>{lang === 'en' ? 'Last 30 days' : '最近30天'}</option>
            <option value={90}>{lang === 'en' ? 'Last 90 days' : '最近90天'}</option>
            <option value={365}>{lang === 'en' ? 'Last year' : '最近一年'}</option>
          </select>
          <button
            className="px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            onClick={handleSearch}
            disabled={loading || port.trim().length < 2}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {lang === 'en' ? 'Search' : '搜索'}
          </button>
        </div>

        {/* 热门港口快捷按钮 */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-[10px] text-gray-400 mr-1 pt-1">{lang === 'en' ? 'Hot ports:' : '热门港口：'}</span>
          {['JFK', 'LAX', 'HAM', 'FRA', 'LHR', 'ORD', 'SIN', 'DXB', 'NRT'].map(p => (
            <button key={p} className="text-[11px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              onClick={() => { setPort(p); setTimeout(() => handleSearch, 100); }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 结果 */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <h3 className="text-sm font-bold">
                {lang === 'en' ? `Results for "${port.toUpperCase()}"` : `「${port.toUpperCase()}」匹配结果`}
              </h3>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full ml-auto">
                {results.length} {lang === 'en' ? 'potential customers' : '个潜在客户'} · {totalSearches} {lang === 'en' ? 'total searches' : '次搜索'}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{lang === 'en' ? 'No matching searchers found' : '没有找到匹配的搜索用户'}</p>
                <p className="text-xs mt-1">{lang === 'en' ? 'Try a different port code or extend the time range' : '换个港口代码试试，或扩大时间范围'}</p>
              </div>
            ) : (
              results.map((r, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {r.display_name?.charAt(0) || '?'}
                  </div>
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{r.company_name || r.display_name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                        {r.role === 'trader' ? (lang === 'en' ? 'Trader' : '外贸') : r.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                      {r.port_city && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{r.port_city}{r.port_code ? ` (${r.port_code})` : ''}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Search className="w-3 h-3" />
                        {lang === 'en' ? 'Searched' : '搜索过'}「{r.match_keyword}」
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {r.days_ago === 0 ? (lang === 'en' ? 'Today' : '今天') : r.days_ago === 1 ? (lang === 'en' ? 'Yesterday' : '昨天') : `${r.days_ago}${lang === 'en' ? 'd ago' : '天前'}`}
                      </span>
                    </div>
                  </div>
                  {/* 操作 */}
                  <button
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-medium text-xs rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                    onClick={() => handleContact(r.user_id)}
                    disabled={sending === r.user_id}
                  >
                    {sending === r.user_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    {lang === 'en' ? 'Contact' : '联系TA'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      {!searched && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-800 mb-1">
                {lang === 'en' ? '💡 How it works' : '💡 使用说明'}
              </h4>
              <ul className="space-y-1 text-xs text-emerald-700">
                <li>{lang === 'en' ? '• Enter a port code where you have cargo space (e.g. JFK)' : '• 输入你有舱位的港口代码（如 JFK）'}</li>
                <li>{lang === 'en' ? '• System finds all traders who searched for that port' : '• 系统找出所有搜索过该港口的外贸用户'}</li>
                <li>{lang === 'en' ? '• You can directly contact them via platform message' : '• 你可以通过站内信直接联系他们'}</li>
                <li>{lang === 'en' ? '• These are your potential customers — reach out before competitors do!' : '• 这些用户就是你的潜在客户——在竞争对手之前联系他们！'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
