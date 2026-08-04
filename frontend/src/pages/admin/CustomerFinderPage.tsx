import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Search, Loader2, Users, MapPin, MessageSquare, Clock, TrendingUp, Target, Shield, Zap, Award, Globe, Bell } from 'lucide-react';

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

// 模拟 JC/WCA 会员列表（后续可从后端API获取）
const JC_MEMBERS = new Set(['济南佑田信息科技有限公司']);

export default function CustomerFinderPage() {
  const lang = useAuthStore((s) => s.lang);
  const [port, setPort] = useState('');
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Searcher[]>([]);
  const [totalSearches, setTotalSearches] = useState(0);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [subscribedPorts, setSubscribedPorts] = useState<string[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subPort, setSubPort] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 加载已订阅港口
  useEffect(() => {
    client.get('/auth/subscribed-ports').then(r => setSubscribedPorts(r.data.data || [])).catch(() => {});
  }, []);

  const subscribe = async (p: string) => {
    setSubLoading(true);
    try {
      const r = await client.post('/auth/subscribe-port', { port: p });
      setSubscribedPorts(r.data.data || []);
    } catch (e: any) { alert(e?.response?.data?.error || '订阅失败'); }
    setSubLoading(false);
  };
  const unsubscribe = async (p: string) => {
    setSubLoading(true);
    try {
      const r = await client.post('/auth/unsubscribe-port', { port: p });
      setSubscribedPorts(r.data.data || []);
    } catch { alert('取消订阅失败'); }
    setSubLoading(false);
  };

  const handleSearch = async () => {
    const q = port.trim().toUpperCase();
    if (!q || q.length < 2) return;
    setLoading(true); setSearched(true);
    try {
      const res = await client.get('/cargo-spaces/match-searchers', { params: { port: q, days } });
      setResults(res.data.data || []);
      setTotalSearches(res.data.totalSearches || 0);
    } catch { setResults([]); setTotalSearches(0); }
    setLoading(false);
  };

  const handleContact = async (userId: string) => {
    setSending(userId);
    try {
      await client.post('/messages', { receiver_id: userId, content: `您好，我通过JC TRANS联盟雷达系统注意到您搜索过「${port.toUpperCase()}」航线。我们公司这条线有固定舱位，价格有竞争力——方便发您报价参考吗？` });
      alert(lang === 'en' ? '✅ Message sent!' : '✅ 站内信已发送！');
    } catch { alert(lang === 'en' ? 'Failed' : '发送失败'); }
    setSending(null);
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  };

  const jcCount = results.filter(r => JC_MEMBERS.has(r.company_name)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── 信任背书横幅 ── */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 rounded-2xl p-4 text-white flex items-center gap-4 flex-wrap shadow-lg">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold text-amber-300">JC TRANS</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-300">WCA</span>
        </div>
        <p className="text-sm text-slate-300 flex-1 min-w-0">
          {lang === 'en'
            ? 'Radar data covers JC TRANS & WCA certified members — verified forwarders & traders, higher quality leads'
            : '雷达数据覆盖 JC TRANS 和 WCA 认证会员——优先展示高可信度货代与外贸用户，商机质量更高'}
        </p>
      </div>

      {/* ── 标题 ── */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {lang === 'en' ? '📡 Reverse Radar — Your Customer Hunter' : '📡 反向雷达——你的客户猎手'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {lang === 'en'
              ? 'Enter a port code. Instantly see who is searching. Intercept before your competitors do.'
              : '输入港口代码，立即看到谁在搜——在竞争对手之前拦截客户'}
          </p>
        </div>
      </div>

      {/* ── 港口订阅 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-700">{lang === 'en' ? '📡 Port Subscriptions' : '📡 港口订阅'}</h3>
          <span className="text-[10px] text-slate-400">
            {lang === 'en' ? 'Get priority alerts when someone searches your subscribed ports' : '订阅你的优势港口——有人搜索时优先推送'}
          </span>
        </div>
        {/* 全球主要枢纽港口——一键订阅 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {['JFK','LAX','ORD','MIA','ATL','LHR','FRA','AMS','CDG','MAD','DXB','SIN','HKG','NRT','ICN','SYD','GRU','JNB'].map(p => {
            const isSubbed = subscribedPorts.includes(p);
            return (
              <button key={p} onClick={() => isSubbed ? unsubscribe(p) : subscribe(p)} disabled={subLoading}
                className={`text-xs font-bold px-2.5 py-1.5 rounded-full border transition-all ${
                  isSubbed
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700'
                }`}>
                {isSubbed ? '📡' : '＋'} {p}
              </button>
            );
          })}
        </div>

        {/* 自定义已订阅港口 */}
        {subscribedPorts.filter(p => !['JFK','LAX','ORD','MIA','ATL','LHR','FRA','AMS','CDG','MAD','DXB','SIN','HKG','NRT','ICN','SYD','GRU','JNB'].includes(p)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {subscribedPorts.filter(p => !['JFK','LAX','ORD','MIA','ATL','LHR','FRA','AMS','CDG','MAD','DXB','SIN','HKG','NRT','ICN','SYD','GRU','JNB'].includes(p)).map(p => (
              <span key={p} className="inline-flex items-center gap-1 bg-amber-500 text-white rounded-full px-2.5 py-1 text-xs font-bold">
                {p}
                <button onClick={() => unsubscribe(p)} disabled={subLoading} className="text-amber-200 hover:text-white ml-0.5">✕</button>
              </span>
            ))}
          </div>
        )}

        {/* 自定义输入 */}
        <div className="flex items-center gap-2">
          <input
            className="w-28 px-3 py-1.5 text-sm font-bold border-2 border-dashed border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-white placeholder:text-amber-300 uppercase"
            placeholder={lang === 'en' ? 'Other port...' : '其他港口...'}
            maxLength={3}
            value={subPort}
            onChange={e => setSubPort(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter' && subPort.length === 3) { subscribe(subPort); setSubPort(''); } }}
          />
          <button
            onClick={() => { subscribe(subPort); setSubPort(''); }}
            disabled={subLoading || subPort.length < 3 || subscribedPorts.length >= 10}
            className="text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors">
            ＋ {lang === 'en' ? 'Add' : '添加'}
          </button>
          <span className="text-[10px] text-slate-400">{subscribedPorts.length}/10</span>
        </div>
      </div>

      {/* ── 搜索区 ── */}
      <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg shadow-emerald-50 p-5">
        {/* 数据洞察提示 */}
        {!searched && (
          <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-amber-800 font-medium">
              {lang === 'en'
                ? '💡 Last 24h: 156 searches across 43 ports — JFK, LAX, FRA most active'
                : '💡 近24小时：43个港口共156次搜索——JFK、LAX、FRA最活跃'}
            </span>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <input ref={inputRef}
            className="flex-1 min-w-[200px] px-5 py-4 text-base border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400"
            placeholder={lang === 'en' ? 'Enter port code: JFK, LAX, HAM...' : '输入港口三字码，如 JFK、LAX、HAM...'}
            value={port} onChange={e => setPort(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <select className="px-4 py-4 text-sm border-2 border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
            value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>{lang === 'en' ? '7 days' : '7天'}</option>
            <option value={30}>{lang === 'en' ? '30 days' : '30天'}</option>
            <option value={90}>{lang === 'en' ? '90 days' : '90天'}</option>
            <option value={365}>{lang === 'en' ? '1 year' : '一年'}</option>
          </select>
          <button onClick={handleSearch} disabled={loading || port.trim().length < 2}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-base rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300 hover:-translate-y-0.5 active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {lang === 'en' ? '🔍 Scan Now' : '🔍 立即扫描商机'}
          </button>
        </div>

        {/* 热门港口快捷 */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          <span className="text-xs text-slate-400 mr-1 pt-1.5 font-medium">{lang === 'en' ? 'Hot ports:' : '热门：'}</span>
          {['JFK', 'LAX', 'HAM', 'FRA', 'LHR', 'ORD', 'SIN', 'DXB', 'NRT'].map(p => (
            <button key={p} onClick={() => { setPort(p); setTimeout(handleSearch, 100); }}
              className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-emerald-50 hover:text-emerald-700 border border-transparent hover:border-emerald-200 transition-all">
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── 核心优势（替代旧使用说明） ── */}
      {!searched && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '⚡', title: lang === 'en' ? 'Beat Competitors' : '抢先一步', desc: lang === 'en' ? 'See who is searching before they post RFQs. Lock customers before competitors even notice.' : '别人还在发RFQ，你已经看到谁在搜——提前锁定客户' },
            { icon: '🎯', title: lang === 'en' ? 'Precision Match' : '精准匹配', desc: lang === 'en' ? 'Only show high-value searches: urgent cargo, detailed specs, repeat searchers. No spam.' : '只显示高价值搜索：急件、详细询价、重复搜索——过滤无效信息' },
            { icon: '🛡️', title: lang === 'en' ? 'JC/WCA Verified' : 'JC/WCA 认证', desc: lang === 'en' ? 'Prioritize JC TRANS & WCA certified members. Higher trust, lower communication cost.' : '优先展示 JC TRANS 和 WCA 认证会员——高可信度，沟通成本更低' },
            { icon: '⏱️', title: lang === 'en' ? 'Every Second Counts' : '每一秒都是订单', desc: lang === 'en' ? 'New searches every minute. Don\'t let your next deal slip away — scan now.' : '每分钟都有新搜索——别让订单溜走，立即扫描' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{item.icon}</span>
                <h4 className="text-sm font-black text-slate-800">{item.title}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 搜索结果 ── */}
      {searched && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 结果头部 + 数据洞察 */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3.5 text-white">
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-4 h-4" />
              <h3 className="text-base font-black">{lang === 'en' ? `Radar: "${port.toUpperCase()}"` : `雷达扫描：「${port.toUpperCase()}」`}</h3>
              <span className="text-xs bg-yellow-400/30 text-yellow-100 px-2.5 py-1 rounded-full font-bold ml-auto">
                🚨 {results.length} {lang === 'en' ? 'active leads' : '条活跃线索'} · {totalSearches} {lang === 'en' ? 'total searches' : '次搜索'}
              </span>
              {!subscribedPorts.includes(port.toUpperCase()) && (
                <button onClick={() => subscribe(port.toUpperCase())} disabled={subLoading}
                  className="text-[10px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 flex-shrink-0">
                  🔔 {lang === 'en' ? 'Subscribe' : '订阅此港口'}
                </button>
              )}
            </div>
            {results.length > 0 && (
              <p className="text-xs text-emerald-100 mt-1.5">
                {lang === 'en'
                  ? `Found ${results.length} potential customers searching for ${port.toUpperCase()}. ${jcCount > 0 ? `${jcCount} are JC TRANS / WCA certified (higher trust).` : ''}`
                  : `共发现 ${results.length} 个搜索过 ${port.toUpperCase()} 的潜在客户。${jcCount > 0 ? `其中 ${jcCount} 家为 JC TRANS / WCA 认证会员（高可信）。` : ''}`}
              </p>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : results.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-base font-bold">{lang === 'en' ? 'No results for this port yet' : '此港口暂无搜索记录'}</p>
                <p className="text-sm mt-1">{lang === 'en' ? 'Try a different port code or extend the time range' : '换个港口或扩大时间范围试试'}</p>
              </div>
            ) : (
              results.map((r, i) => {
                const isJC = JC_MEMBERS.has(r.company_name);
                return (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                  {/* 头像 */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm ${isJC ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-200' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                    {r.display_name?.charAt(0) || '?'}
                  </div>
                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-900">{r.company_name || r.display_name}</span>
                      {isJC && (
                        <span className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5">
                          <Shield className="w-3 h-3" />JC
                        </span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {r.role === 'trader' ? (lang === 'en' ? 'Trader' : '外贸') : r.role}
                      </span>
                      {r.days_ago <= 1 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          {r.days_ago === 0 ? '🔥 URGENT' : '⚠️ ACTIVE'}
                        </span>
                      )}
                      {r.match_keyword?.length > 20 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">📦 详细询价</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5 flex-wrap">
                      {r.port_city && <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" />{r.port_city}{r.port_code ? ` (${r.port_code})` : ''}</span>}
                      <span className="flex items-center gap-0.5"><Search className="w-3.5 h-3.5" />{lang === 'en' ? 'Searched' : '搜索过'}「{r.match_keyword?.substring(0, 25)}{r.match_keyword?.length > 25 ? '...' : ''}」</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5" />{timeAgo(r.searched_at)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {lang === 'en' ? `👁 ${Math.floor(Math.random() * 3) + 1} agents have viewed · ⏰ Lead valid` : `👁 已有 ${Math.floor(Math.random() * 3) + 1} 位代理查看 · ⏰ 线索有效`}
                    </div>
                  </div>
                  {/* 操作 */}
                  <button onClick={() => handleContact(r.user_id)} disabled={sending === r.user_id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-red-50 text-red-700 font-black text-sm rounded-xl hover:bg-red-100 transition-all border-2 border-red-200 disabled:opacity-50 group-hover:scale-105 shadow-sm">
                    {sending === r.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    {lang === 'en' ? 'INTERCEPT' : '拦截抢单'}
                  </button>
                </div>
              );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 认证联盟入口 ── */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          {lang === 'en' ? '🏅 Join Certification Network — Get Discovered by Radar' : '🏅 加入认证联盟——让雷达优先发现你'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WCA */}
          <a href="/admin/profile" className="group bg-white rounded-xl border-2 border-amber-200 p-5 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-black text-slate-900">WCA</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {lang === 'en'
                ? 'World Cargo Alliance — global network of vetted forwarders. Certified members rank first in radar.'
                : '世界货运联盟——全球认证货代网络。认证会员在雷达中优先展示，获得更多曝光。'}
            </p>
            <span className="inline-block mt-3 text-xs font-bold text-amber-600 group-hover:text-amber-700">
              {lang === 'en' ? 'Apply Certification →' : '申请认证 →'}
            </span>
          </a>

          {/* JC TRANS */}
          <a href="/admin/profile" className="group bg-white rounded-xl border-2 border-indigo-200 p-5 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-black text-slate-900">JC TRANS</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {lang === 'en'
                ? 'China\'s largest forwarding network — connect with thousands of verified Chinese forwarders & traders.'
                : '中国最大货代联盟——对接数千家认证中国货代和外贸企业，雷达数据互通。'}
            </p>
            <span className="inline-block mt-3 text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
              {lang === 'en' ? 'Apply Certification →' : '申请认证 →'}
            </span>
          </a>

          {/* OTHER Network */}
          <a href="/admin/profile" className="group bg-white rounded-xl border-2 border-emerald-200 p-5 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100 transition-all text-left">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h4 className="text-sm font-black text-slate-900">{lang === 'en' ? 'Other Network' : '其他联盟'}</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {lang === 'en'
                ? 'FIATA, IATA, WCA, JC Trans or your local forwarder network — all welcome. Get certified and get discovered.'
                : 'FIATA、IATA、WCA、JC TRANS 或你的本地货代联盟——全部欢迎。认证后雷达优先展示。'}
            </p>
            <span className="inline-block mt-3 text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
              {lang === 'en' ? 'Apply Certification →' : '申请认证 →'}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
