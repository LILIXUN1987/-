import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Search, Loader2, Globe, MapPin, Clock, Shield, TrendingUp, Lock, Unlock,
  CheckCircle, Upload, Users, Zap, Award, Timer, Eye, EyeOff, Send, Star, ExternalLink,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface Consignee {
  id: string;
  company_name: string;
  country: string;
  port: string;
  contact_email: string;
  contact_phone: string;
  contact_person: string;
  import_frequency: number;
  last_import_date: string;
  cargo_types: string;
  status: string;
  claimed_by: string;
  protection_until: string;
  backend_agent?: string;
  backend_agent_id?: string;
  bid_count?: number;
  isProtected?: boolean;
  isMine?: boolean;
  protectionRemaining?: number;
}

/* ── 热度等级 ── */
function HeatBadge({ freq }: { freq: number }) {
  if (freq >= 12) return <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔥🔥 超高频 · {freq}次/年</span>;
  if (freq >= 6) return <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔥 高频 · {freq}次/年</span>;
  return <span className="text-xs text-slate-400">{freq}次/年</span>;
}

/* ── 状态标签 ── */
function StatusBadge({ status, lang }: { status: string; lang: string }) {
  switch (status) {
    case 'awakened': return <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">🟢 {lang === 'en' ? 'Replied' : '已回复'}</span>;
    case 'claimed': return <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔵 {lang === 'en' ? 'Claimed' : '已锁定'}</span>;
    case 'contacted': return <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🟡 {lang === 'en' ? 'Contacted' : '已联系'}</span>;
    default: return <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">⚪ {lang === 'en' ? 'Dormant' : '待唤醒'}</span>;
  }
}

export default function ConsigneePoolPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const isAdmin = user?.role === 'admin';

  const [viewMode, setViewMode] = useState<'pool' | 'detail'>('pool');
  const [pool, setPool] = useState<Consignee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [msg, setMsg] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Consignee | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [timerTick, setTimerTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTimerTick(p => p + 1), 1000); return () => clearInterval(t); }, []);

  const fetchPool = async () => {
    setLoading(true);
    try {
      const res = await client.get('/consignees/pool', { params: { country: countryFilter, port: portFilter } });
      setPool(res.data.data || []);
      setTotal(res.data.total || 0);
      setPremium(res.data.premium !== false);
      setMsg(res.data.message || '');
    } catch { setPool([]); }
    setLoading(false);
  };

  const fetchStats = async () => { try { const r = await client.get('/consignees/stats'); setStats(r.data); } catch {} };
  useEffect(() => { fetchPool(); fetchStats(); }, [countryFilter, portFilter, timerTick]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try { const r = await client.post(`/consignees/${id}/claim`); toast.success(r.data.message); fetchPool(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '锁定失败'); }
    setClaiming(null);
  };

  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { toast.error('请粘贴CSV数据'); return; }
    const headers = lines[0].split(',');
    const records = lines.slice(1).map(line => {
      const vals = line.split(','); const r: any = {};
      headers.forEach((h, i) => { r[h.trim()] = (vals[i] || '').trim(); }); return r;
    });
    try { const r = await client.post('/consignees/import', { records }); toast.success(`导入 ${r.data.inserted} 条`); setImportText(''); setImportMode(false); fetchPool(); fetchStats(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '导入失败'); }
  };

  const formatTimer = (hours: number) => {
    if (hours <= 0) return '00:00:00';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor((hours - h - m / 60) * 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── 资产库头部 ──
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* 顶部标题 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">
                {isAdmin
                  ? (lang === 'en' ? '🌍 Consignee Asset Vault' : '🌍 海外直客资产库')
                  : (lang === 'en' ? '🌍 Direct Customer Pool' : '🌍 海外直客唤醒池')}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {isAdmin
                  ? (lang === 'en' ? '15-year consignee data — your exclusive mining asset' : '15年提单沉淀——你的独家挖矿资产，只租不卖')
                  : (lang === 'en' ? 'Real importers, verified backend agents — bid for the headhaul' : '真实进口商，后程已托管——你只管头程竞标')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button onClick={() => setImportMode(!importMode)}
                className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl transition-all">
                <Upload className="w-3.5 h-3.5 inline mr-1" />{lang === 'en' ? 'Import' : '导入'}
              </button>
            )}
            {stats && (
              <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full">
                {stats.total} {lang === 'en' ? 'assets' : '个资产'} · {stats.awakened} {lang === 'en' ? 'awakened' : '已唤醒'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 统计条 */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { v: stats.total, l: lang === 'en' ? 'Total Assets' : '资产总数', c: 'text-slate-700' },
            { v: stats.dormant, l: lang === 'en' ? 'Dormant' : '待唤醒', c: 'text-slate-500' },
            { v: stats.claimed, l: lang === 'en' ? 'In Bidding' : '竞标中', c: 'text-blue-600' },
            { v: stats.awakened, l: lang === 'en' ? 'Awakened' : '已唤醒', c: 'text-emerald-600' },
            { v: stats.countries, l: lang === 'en' ? 'Countries' : '覆盖国家', c: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <div className={`text-xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-[11px] text-slate-400">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* 管理员导入面板 */}
      {isAdmin && importMode && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            {lang === 'en' ? '📋 Batch Import' : '📋 批量导入'}
          </h3>
          <p className="text-xs text-slate-400 mb-2">CSV格式：company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types,backend_agent,backend_agent_id</p>
          <textarea className="w-full h-32 text-xs font-mono border-2 border-slate-200 rounded-xl p-3 mb-3" value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="ABC Trading Inc,USA,JFK,info@abc.com,12,2024-06,textiles,NYC Logistics,JC-8848" />
          <button onClick={handleImport} className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700">
            <Upload className="w-4 h-4 inline mr-1" />导入
          </button>
        </div>
      )}

      {/* 非付费会员墙 */}
      {!premium && !loading && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-8 text-center text-white shadow-xl">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">{lang === 'en' ? '🔒 Premium Intelligence' : '🔒 付费情报——海外直客唤醒池'}</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-lg mx-auto">{msg}</p>
          <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto mb-6">
            {[
              { tier: lang === 'en' ? 'Free' : '免费', price: '¥0', perks: lang === 'en' ? 'View count only' : '仅看统计数字' },
              { tier: lang === 'en' ? 'Standard' : '标准版', price: '¥999/月', perks: lang === 'en' ? 'Daily 3 leads + 24h lock' : '每日3条线索+24h锁定', highlight: false },
              { tier: lang === 'en' ? 'Enterprise' : '旗舰版', price: '¥2999/月', perks: lang === 'en' ? 'Unlimited + 72h exclusivity' : '无限查看+72h独占', highlight: true },
            ].map((t, i) => (
              <div key={i} className={`rounded-xl p-4 text-center border-2 ${t.highlight ? 'bg-amber-500/20 border-amber-400' : 'bg-white/5 border-white/10'}`}>
                <div className="text-xs text-slate-400">{t.tier}</div>
                <div className="text-lg font-black mt-1">{t.price}</div>
                <div className="text-[11px] text-slate-400 mt-1">{t.perks}</div>
              </div>
            ))}
          </div>
          <button onClick={() => window.location.href = '/admin/subscribe'}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all">
            🚀 {lang === 'en' ? 'Upgrade Now' : '立即升级解锁'}
          </button>
        </div>
      )}

      {/* 筛选栏 */}
      {premium && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400" />
            <input className="flex-1 text-sm bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
              placeholder={lang === 'en' ? 'Filter by country...' : '按国家筛选...'} value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-40">
            <MapPin className="w-4 h-4 text-slate-400" />
            <input className="flex-1 text-sm bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
              placeholder={lang === 'en' ? 'Port...' : '港口...'} value={portFilter}
              onChange={e => setPortFilter(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400 ml-auto">{total} {lang === 'en' ? 'assets' : '个资产'}</span>
        </div>
      )}

      {/* 直客列表 */}
      {premium && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : pool.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{lang === 'en' ? 'No consignees found' : '暂无匹配的收货人'}</p>
            </div>
          ) : (
            pool.map((item) => {
              const isMyClaim = item.isMine || item.claimed_by === user?.id;
              const isProtected = item.isProtected && !isMyClaim;
              const protectionH = item.protectionRemaining || 0;
              return (
                <div key={item.id} className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                  isMyClaim ? 'border-blue-300 ring-1 ring-blue-100 bg-blue-50/20' :
                  isProtected ? 'border-amber-200 bg-amber-50/20' :
                  item.status === 'awakened' ? 'border-emerald-200 bg-emerald-50/10' :
                  'border-slate-100'
                }`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* 第一行：名称 + 热度 + 状态 */}
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-base font-black text-slate-900">{item.company_name}</span>
                          <HeatBadge freq={item.import_frequency} />
                          <StatusBadge status={item.status} lang={lang} />
                          {isMyClaim && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔒 {lang === 'en' ? 'Your Lead' : '你的线索'}</span>}
                          {item.bid_count && item.bid_count > 0 && (
                            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">
                              🔥 {item.bid_count} {lang === 'en' ? 'agents bidding' : '家代理竞标'}
                            </span>
                          )}
                        </div>

                        {/* 第二行：航线 + 货类 + 最后进口 */}
                        <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap mb-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{item.country} · {item.port || '--'}</span>
                          {item.cargo_types && <span className="text-slate-400">📦 {item.cargo_types}</span>}
                          {item.last_import_date && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3.5 h-3.5" />{lang === 'en' ? 'Last import' : '最后进口'} {item.last_import_date}
                            </span>
                          )}
                        </div>

                        {/* 第三行：后程托管 + 保护倒计时 */}
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          {item.backend_agent ? (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold border border-emerald-200">
                              <Shield className="w-3 h-3" />{lang === 'en' ? 'Backend: ' : '后程：'}{item.backend_agent}
                              {item.backend_agent_id && <span className="text-emerald-400">({item.backend_agent_id})</span>}
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                              {lang === 'en' ? 'Backend: Pending' : '后程：待托管'}
                            </span>
                          )}
                          {isProtected && (
                            <span className="text-amber-700 font-bold font-mono bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ⏳ {lang === 'en' ? 'Locked' : '保护剩余'} {formatTimer(protectionH)}
                            </span>
                          )}
                          {isMyClaim && protectionH > 0 && (
                            <span className="text-blue-600 font-bold font-mono bg-blue-50 px-2 py-0.5 rounded-full">
                              ⏳ {lang === 'en' ? 'Your lock' : '你的保护期'} {formatTimer(protectionH)}
                            </span>
                          )}
                        </div>

                        {/* 我的线索——显示联系方式 */}
                        {isMyClaim && (
                          <div className="mt-2 bg-blue-50 rounded-lg p-2.5 text-sm text-slate-600 border border-blue-100">
                            <div className="flex items-center gap-2">
                              {item.contact_person && <span className="font-bold">{item.contact_person}</span>}
                              <span>📧 {item.contact_email}</span>
                              {item.contact_phone !== '***' && <span>📞 {item.contact_phone}</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 操作区 */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isProtected && !isMyClaim && item.status !== 'awakened' && (
                          <button onClick={() => handleClaim(item.id)} disabled={claiming === item.id}
                            className="text-sm font-black bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-red-200 disabled:opacity-50">
                            {claiming === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {lang === 'en' ? '🚀 Bid Now' : '🚀 立即竞标'}
                          </button>
                        )}
                        {isProtected && !isMyClaim && (
                          <div className="text-center">
                            <div className="text-xs text-amber-700 font-bold">
                              {lang === 'en' ? 'Locked' : '已锁定'}
                            </div>
                            <div className="text-[11px] text-amber-500 font-mono">{formatTimer(protectionH)}</div>
                          </div>
                        )}
                        {isMyClaim && (
                          <button onClick={() => setDetailItem(item)}
                            className="text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm">
                            {lang === 'en' ? 'Detail →' : '详情 →'}
                          </button>
                        )}
                        {item.status === 'awakened' && !isMyClaim && (
                          <span className="text-xs text-emerald-600 font-bold">
                            {lang === 'en' ? '✅ Won' : '✅ 已成交'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 详情面板 */}
                  {detailItem?.id === item.id && (
                    <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 后程托管卡 */}
                        <div className="bg-white rounded-xl border-2 border-emerald-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            <h4 className="text-sm font-black text-emerald-800">{lang === 'en' ? '🛡️ Backend Guaranteed' : '🛡️ 后程已托管'}</h4>
                          </div>
                          {item.backend_agent ? (
                            <div className="space-y-2 text-sm">
                              <p><strong>{item.backend_agent}</strong> {item.backend_agent_id ? `(${item.backend_agent_id})` : ''}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                                <span>✅ {lang === 'en' ? 'Customs clearance' : '清关'}</span>
                                <span>✅ {lang === 'en' ? 'Last-mile delivery' : '派送'}</span>
                                <span>✅ {lang === 'en' ? 'Duty payment' : '关税代缴'}</span>
                                <span>✅ JC TRANS / WCA</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">{lang === 'en' ? 'Pending assignment' : '待分配后程代理'}</p>
                          )}
                        </div>

                        {/* 头程竞标卡 */}
                        <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-5 h-5 text-blue-600" />
                            <h4 className="text-sm font-black text-blue-800">{lang === 'en' ? '🚢 Headhaul Bid' : '🚢 头程竞标'}</h4>
                          </div>
                          <div className="space-y-2 text-sm text-slate-600">
                            <p>{lang === 'en' ? `Route: China → ${item.port || item.country}` : `航线：中国 → ${item.port || item.country}`}</p>
                            {item.cargo_types && <p>{lang === 'en' ? `Cargo: ${item.cargo_types}` : `货类：${item.cargo_types}`}</p>}
                            <p>{lang === 'en' ? `Frequency: ${item.import_frequency}/year` : `频次：${item.import_frequency}次/年`}</p>
                          </div>
                          <div className="mt-3 bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
                            💡 {lang === 'en'
                              ? 'You only handle China→dest port. Consignee = backend agent (platform). Auto customs clearance upon arrival.'
                              : '你只需负责中国→目的港头程。提单收货人写平台后程代理。到港后自动清关派送。'}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => setDetailItem(null)}
                        className="mt-3 text-xs text-slate-400 hover:text-slate-600">
                        {lang === 'en' ? 'Close details' : '收起详情'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
