import { useState, useEffect, useRef } from 'react';
import client from '../../../api/client';
import { useLang, t, getCountryEmoji, type Lang } from './shared';
import {
  Search, Loader2, Send, X, MessageSquare, Globe,
  Star, TrendingUp, Building2,
} from 'lucide-react';

const T = {
  searchByPort: { zh: '输入口岸代码或城市名搜索', en: 'Search by port code or city name' },
  noAgent: { zh: '暂无海外代理入驻，请联系管理员推荐', en: 'No agents yet, contact admin to recommend one' },
  topRanked: { zh: '推荐代理', en: 'Recommended Agents' },
  randomAgents: { zh: '更多代理', en: 'More Agents' },
  searchFirst: { zh: '输入口岸代码或城市名查找对应的代理商', en: 'Enter a port code or city name to find agents' },
  noSearchResult: { zh: '未找到匹配的代理，请尝试其他关键词', en: 'No agents found, try a different keyword' },
  contactBtn: { zh: '联系咨询', en: 'Contact' },
  sendFailed: { zh: '发送失败', en: 'Send failed' },
  contactPlaceholder: { zh: '请输入您的咨询内容，如：需要了解从中国到当地的DDP报价...', en: 'e.g. I would like a DDP quote from China to your location...' },
  contactTitle: { zh: '联系', en: 'Contact' },
};

export default function AgentsTab({ isAgent }: { isAgent?: boolean }) {
  const lang = useLang();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isAgent);
  const [searched, setSearched] = useState(false);
  const [contactModal, setContactModal] = useState<any | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const topRef = useRef<any[]>([]);
  const randomRef = useRef<any[]>([]);

  const [countryGroups, setCountryGroups] = useState<Record<string, any[]>>({});
  const [countryOrder, setCountryOrder] = useState<string[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const popularCountries = lang === 'zh'
    ? ['美国', '德国', '英国', '法国', '荷兰', '日本', '韩国', '越南', '泰国', '印度', '阿联酋', '沙特', '巴西', '尼日利亚', '肯尼亚', '澳大利亚', '俄罗斯', '意大利', '西班牙', '土耳其', '印度尼西亚', '马来西亚', '菲律宾', '新加坡', '墨西哥', '南非', '埃及']
    : ['USA', 'Germany', 'UK', 'France', 'Netherlands', 'Japan', 'Korea', 'Vietnam', 'Thailand', 'India', 'UAE', 'Saudi Arabia', 'Brazil', 'Nigeria', 'Kenya', 'Australia', 'Russia', 'Italy', 'Spain', 'Turkey', 'Indonesia', 'Malaysia', 'Philippines', 'Singapore', 'Mexico', 'South Africa', 'Egypt'];

  useEffect(() => {
    if (!isAgent && !initialLoaded) loadCountryGrouped();
  }, [isAgent]);

  async function loadCountryGrouped() {
    setLoading(true);
    try {
      const agentsRes = await client.get('/ddp/agents');
      const agents: any[] = agentsRes.data.data || [];
      const groups: Record<string, any[]> = {};
      for (const agent of agents) {
        const country = agent.country || (lang === 'zh' ? '其他' : 'Other');
        if (!groups[country]) groups[country] = [];
        groups[country].push(agent);
      }
      for (const country of Object.keys(groups)) {
        groups[country].sort((a: any, b: any) => (b.completed_orders || 0) - (a.completed_orders || 0));
      }
      const ordered = Object.keys(groups).sort((a, b) => {
        const aIdx = popularCountries.indexOf(a);
        const bIdx = popularCountries.indexOf(b);
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return a.localeCompare(b);
      });
      setCountryGroups(groups);
      setCountryOrder(ordered);
      setInitialLoaded(true);
    } catch {}
    setLoading(false);
  }

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      let list: any[] = [];
      if (isAgent) {
        const res = await client.get('/overseas/forwarders', { params: { q, limit: 20 } });
        list = (res.data.data || []).map((f: any) => ({
          id: f.id, company_name: f.company_name, contact_person: f.display_name,
          created_by: f.id, credit_score: f.credit_score || 50, cooperation_count: f.cooperation_count || 0,
        }));
      } else {
        const portQ = q.toLowerCase();
        const agentsRes = await client.get('/ddp/agents');
        list = (agentsRes.data.data || []).filter((a: any) =>
          (a.service_ports || '').toLowerCase().includes(portQ) ||
          (a.air_ports || '').toLowerCase().includes(portQ) ||
          (a.sea_ports || '').toLowerCase().includes(portQ) ||
          (a.country || '').toLowerCase().includes(portQ) ||
          (a.city || '').toLowerCase().includes(portQ) ||
          (a.company_name || '').toLowerCase().includes(portQ));
      }
      const sorted = [...list].sort((a: any, b: any) => (b.completed_orders || 0) - (a.completed_orders || 0));
      topRef.current = sorted.slice(0, 6);
      randomRef.current = sorted.slice(6).sort(() => Math.random() - 0.5).slice(0, 6);
      setResults(list);
    } catch {}
    setLoading(false);
  };

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', { receiver_id: contactModal.created_by, content: contactText.trim() });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch { alert(t(T.sendFailed, lang)); }
    setContactSending(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            placeholder={t(T.searchByPort, lang)} value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        <button className="btn-primary text-sm px-5" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {lang === 'en' ? 'Search' : '搜索'}
        </button>
      </div>

      {loading && !searched && !initialLoaded && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

      {!isAgent && !searched && initialLoaded && countryOrder.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-500" />
            <h3 className="text-sm font-bold text-gray-700">{lang === 'en' ? 'Overseas Agents by Country' : '海外代理 · 按国家分类'}</h3>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              {Object.values(countryGroups).flat().length}{lang === 'en' ? ' agents' : '家代理'}
            </span>
          </div>
          {countryOrder.map(country => {
            const agents = countryGroups[country];
            if (!agents || agents.length === 0) return null;
            return (
              <div key={country}>
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <span className="text-base">{getCountryEmoji(country)}</span>
                  <h4 className="text-sm font-bold text-gray-800">{country}</h4>
                  <span className="text-[10px] text-gray-400">({agents.length})</span>
                  {popularCountries.includes(country) && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Hot' : '热门'}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agents.slice(0, 8).map((agent: any, i: number) => (
                    <div key={agent.id || i} className="border border-gray-200 bg-white rounded-xl p-3.5 hover:shadow-sm hover:border-primary-200 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {i < 3 && <span className="text-xs">{['🥇', '🥈', '🥉'][i]}</span>}
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{agent.company_name || agent.display_name}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {agent.contact_person && <span className="truncate">{agent.contact_person}</span>}
                            {agent.city && <span className="truncate">📍{agent.city}</span>}
                            {(agent.completed_orders || 0) > 0 && <span>✅ {agent.completed_orders}{lang === 'en' ? ' orders' : '单'}</span>}
                            <span className={"font-bold " + ((agent.credit_score || 50) >= 75 ? "text-green-600" : "text-amber-600")}>🏆 {agent.credit_score || 50}</span>
                          </div>
                          {agent.air_ports && <p className="text-[10px] text-gray-400 mt-1 truncate">✈️ {agent.air_ports.split(/[\n,]+/).slice(0,3).join(', ')}</p>}
                          {agent.sea_ports && <p className="text-[10px] text-gray-400 mt-1 truncate">🚢 {agent.sea_ports.split(/[\n,]+/).slice(0,3).join(', ')}</p>}
                          {!agent.air_ports && !agent.sea_ports && agent.service_ports && <p className="text-[10px] text-gray-400 mt-1 truncate">🚢 {agent.service_ports}</p>}
                          {agent.tags && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {agent.tags.split(',').slice(0, 3).map((tag: string, ti: number) => (
                                <span key={ti} className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 flex-shrink-0"
                          onClick={() => { setContactModal(agent); setContactSent(false); setContactText(''); }}>
                          {lang === 'en' ? 'Contact' : '联系'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {agents.length > 8 && (
                    <div className="col-span-1 sm:col-span-2 text-center">
                      <button className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        onClick={() => { setQuery(country); handleSearch(); }}>
                        +{agents.length - 8} {lang === 'en' ? 'more' : '更多'} →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isAgent && !searched && initialLoaded && countryOrder.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">{t(T.noAgent, lang)}</div>
      )}

      {(isAgent || searched) && loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
      {(isAgent || searched) && !loading && results.length === 0 && (searched ? (
        <div className="text-center py-12 text-gray-400 text-sm">{t(T.noSearchResult, lang)}</div>
      ) : (
        <div className="text-center py-16 text-gray-400"><Search className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p className="text-sm">{t(T.searchFirst, lang)}</p></div>
      ))}

      {(isAgent || searched) && !loading && results.length > 0 && (
        <div className="space-y-6">
          {!isAgent && searched && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search className="w-4 h-4" />
                <span>{lang === 'en' ? `Search results for "` : `搜索 "`}<strong>{query}</strong>"</span>
                <span className="text-xs text-gray-400">({results.length}{lang === 'en' ? ' results' : '条结果'})</span>
              </div>
              <button className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                onClick={() => { setQuery(''); setSearched(false); setResults([]); }}>
                ← {lang === 'en' ? 'All agents' : '全部代理'}
              </button>
            </div>
          )}
          {topRef.current.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏆</span><h3 className="text-sm font-bold text-gray-700">{t(T.topRanked, lang)}</h3>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{lang === 'en' ? 'TOP' : '推荐'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topRef.current.slice(0, 6).map((agent: any, i: number) => (
                  <div key={agent.id || i} className={"border rounded-xl p-3.5 transition-all hover:shadow-sm " + (i < 3 ? "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50" : "border-gray-200 bg-white")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {i < 3 && <span className="text-sm">{['🥇','🥈','🥉'][i]}</span>}
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{agent.company_name || agent.display_name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {agent.contact_person && <span>{agent.contact_person}</span>}
                          {(agent.cooperation_count || 0) > 0 && <span>🤝 {agent.cooperation_count}{lang === 'en' ? ' coops' : '次合作'}</span>}
                          <span className={"font-bold " + ((agent.credit_score || 50) >= 75 ? "text-green-600" : "text-amber-600")}>🏆 {agent.credit_score || 50}</span>
                        </div>
                      </div>
                      <button className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 flex-shrink-0"
                        onClick={() => { setContactModal(agent); setContactSent(false); setContactText(''); }}>{lang === 'en' ? 'Contact' : '联系'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {randomRef.current.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3"><span className="text-lg">🔄</span><h3 className="text-sm font-bold text-gray-700">{t(T.randomAgents, lang)}</h3>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Random' : '随机'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {randomRef.current.slice(0, 6).map((agent: any, i: number) => (
                  <div key={agent.id || 'r' + i} className="border border-gray-200 bg-white rounded-xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{agent.company_name || agent.display_name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {agent.contact_person && <span>{agent.contact_person}</span>}
                          <span className={"font-bold " + ((agent.credit_score || 50) >= 75 ? "text-green-600" : "text-amber-600")}>🏆 {agent.credit_score || 50}</span>
                        </div>
                      </div>
                      <button className="text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg px-3 py-1.5 flex-shrink-0"
                        onClick={() => { setContactModal(agent); setContactSent(false); setContactText(''); }}>{lang === 'en' ? 'Contact' : '联系'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">📬 {t(T.contactTitle, lang)} {contactModal.company_name || contactModal.display_name}</h3>
              <button onClick={() => setContactModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Message sent' : '消息已发送'}</div> : (
              <>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3" placeholder={t(T.contactPlaceholder, lang)}
                  value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                  onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{t(T.contactBtn, lang)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
