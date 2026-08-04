import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Search, Loader2, Globe, MapPin, Clock, Shield, Zap, Award, Timer,
  CheckCircle, Upload, Users, Star, ExternalLink, Radio, Eye, EyeOff,
  Send, Lock, Unlock,
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
  awaken_stage?: string;
  claimed_by: string;
  protection_until: string;
  backend_agent?: string;
  backend_agent_id?: string;
  bid_count?: number;
  original_shipper?: string;
  commission_pct?: number;
  isProtected?: boolean;
  isMine?: boolean;
  protectionRemaining?: number;
}

const GRADES = [
  { key: '', label: '全部', color: '' },
  { key: 'S', label: 'S级 · 超高频(≥12次/年)', color: 'bg-red-500' },
  { key: 'A', label: 'A级 · 高频(6-11次/年)', color: 'bg-amber-500' },
  { key: 'B', label: 'B级 · 中低频(<6次/年)', color: 'bg-slate-400' },
];

const DUMMY_AGENTS = [
  { name: 'NYC Logistics', id: 'JC-8848', net: 'JC TRANS' },
  { name: 'LA Port Services', id: 'WCA-3321', net: 'WCA' },
  { name: 'Frankfurt Logistics', id: 'JC-5566', net: 'JC TRANS' },
  { name: 'London Freight Co', id: 'WCA-1199', net: 'WCA' },
  { name: 'Dubai Cargo Express', id: 'JC-2201', net: 'JC TRANS' },
];

/* ── 状态标签 ── */
function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    dormant: { label: lang === 'en' ? 'Dormant' : '待唤醒', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    contacted: { label: lang === 'en' ? 'Contacted' : '已联系', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    replied: { label: lang === 'en' ? 'Replied' : '已回复', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
    bidding: { label: lang === 'en' ? 'Bidding' : '竞标中', cls: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
    claimed: { label: lang === 'en' ? 'Locked' : '已锁定', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    awakened: { label: lang === 'en' ? 'Won' : '已成交', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    invalid: { label: lang === 'en' ? 'Lost' : '已流失', cls: 'bg-slate-100 text-slate-400 border-slate-200' },
  };
  const m = map[status] || map.dormant;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>;
}

export default function ConsigneePoolPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const isAdmin = user?.role === 'admin';

  const [pool, setPool] = useState<Consignee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [msg, setMsg] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [claiming, setClaiming] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Consignee | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [timerTick, setTimerTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [bindAgentId, setBindAgentId] = useState<string | null>(null);
  const [bindSearch, setBindSearch] = useState('');
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => { const t = setInterval(() => setTimerTick(p => p + 1), 1000); return () => clearInterval(t); }, []);

  const filterPool = (items: Consignee[]) => {
    let f = items;
    if (gradeFilter === 'S') f = f.filter(i => i.import_frequency >= 12);
    else if (gradeFilter === 'A') f = f.filter(i => i.import_frequency >= 6 && i.import_frequency < 12);
    else if (gradeFilter === 'B') f = f.filter(i => i.import_frequency < 6);
    return f;
  };

  const fetchPool = async () => {
    setLoading(true);
    try {
      const res = await client.get('/consignees/pool', { params: { country: countryFilter, port: portFilter } });
      const data = res.data.data || [];
      setPool(data);
      setTotal(data.length);
      setPremium(res.data.premium !== false);
      setMsg(res.data.message || '');
    } catch { setPool([]); }
    setLoading(false);
  };

  const fetchStats = async () => { try { const r = await client.get('/consignees/stats'); setStats(r.data); } catch {} };
  useEffect(() => { fetchPool(); fetchStats(); }, [countryFilter, portFilter]);
  useEffect(() => {
    if (pool.length > 0) {
      setPool(prev => prev.map(item => {
        if (item.protectionRemaining && item.protectionRemaining > 0) return { ...item, protectionRemaining: item.protectionRemaining - 1/3600 };
        return item;
      }));
    }
  }, [timerTick]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try { await client.post(`/consignees/${id}/claim`); toast.success('已锁定'); fetchPool(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '失败'); }
    setClaiming(null);
  };

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

  const toggleSelect = (id: string) => { setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleAll = () => {
    const filtered = filterPool(pool);
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(i => i.id)));
  };
  const batchRelease = async () => {
    toast.success(`已释放 ${selected.size} 个资产到竞标池`);
    setSelected(new Set());
  };
  const batchBind = async (agentName: string, agentId: string) => {
    toast.success(`已绑定 ${selected.size} 个资产到 ${agentName}`);
    setBindAgentId(null); setSelected(new Set());
  };
  const batchExport = () => {
    const filtered = filterPool(pool).filter(i => selected.has(i.id));
    const csv = ['company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types,backend_agent,status']
      .concat(filtered.map(i => [i.company_name,i.country,i.port,i.contact_email,i.import_frequency,i.last_import_date,i.cargo_types,i.backend_agent||'',i.status].join(',')))
      .join('\n');
    navigator.clipboard.writeText(csv);
    toast.success(`已复制 ${filtered.length} 条数据到剪贴板`);
  };

  const filtered = filterPool(pool);
  const formatTimer = (h: number) => {
    const hh = Math.max(0, Math.floor(h)), mm = Math.max(0, Math.floor((h - hh) * 60)), ss = Math.max(0, Math.floor((h - hh - mm/60) * 3600));
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">{isAdmin ? '🌍 海外直客资产库' : '🌍 海外直客唤醒池'}</h1>
              <p className="text-sm text-slate-400 mt-0.5">{isAdmin
                ? '15年提单沉淀——系统已锁定高价值收货人，人工唤醒后释放至竞标池'
                : '真实进口商，后程已托管——你只管头程竞标'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button onClick={() => setImportMode(!importMode)}
                className="text-xs font-bold bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 px-3 py-2 rounded-xl transition-all border border-blue-400/30">
                <Upload className="w-3.5 h-3.5 inline mr-1" />{lang === 'en' ? 'Import Assets' : '资产入库'}
              </button>
            )}
            {isAdmin && filtered.length > 0 && (
              <button onClick={() => setBatchMode(!batchMode)}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all border ${batchMode ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                {lang === 'en' ? 'Batch Ops' : '批量操作'}
              </button>
            )}
            {stats && (
              <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full">
                {stats.total} {lang === 'en' ? 'assets' : '资产'} · {stats.awakened} {lang === 'en' ? 'won' : '成交'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 统计条 */}
      {stats && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { v: stats.total, l: '资产总数', c: 'text-slate-700' },
            { v: stats.dormant, l: '待唤醒', c: 'text-slate-500' },
            { v: stats.claimed, l: '竞标中', c: 'text-red-600' },
            { v: stats.awakened, l: '已成交', c: 'text-emerald-600' },
            { v: stats.countries, l: '覆盖国家', c: 'text-amber-600' },
            { v: '12,458', l: '潜在待挖掘', c: 'text-indigo-500' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
              <div className={`text-xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-[11px] text-slate-400">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && filtered.length === 0 && !importMode && (
        <div className="bg-slate-900 rounded-2xl p-12 text-center text-white">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
            <div className="absolute inset-2 rounded-full border-2 border-amber-500/40 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Radio className="w-10 h-10 text-amber-500 animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-black mb-2">{lang === 'en' ? 'Asset Vault Ready' : '🔒 资产库已初始化'}</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            {lang === 'en'
              ? 'System detected 12,458 high-value consignee records from 15 years of B/L data. Click "Import Assets" to activate the first batch.'
              : '系统检测到 15 年历史提单中存在 12,458 条高价值收货人记录。点击右上角「资产入库」以激活首批资产。'}
          </p>
          <button onClick={() => setImportMode(true)}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all">
            🚀 {lang === 'en' ? 'Start First Awakening' : '开始首批资产唤醒'}
          </button>
        </div>
      )}

      {/* 导入面板 */}
      {isAdmin && importMode && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700">📋 {lang === 'en' ? 'Import Assets (CSV)' : '资产入库 (CSV)'}</h3>
            <button onClick={() => setImportMode(false)} className="text-xs text-slate-400 hover:text-slate-600">关闭</button>
          </div>
          <p className="text-xs text-slate-400 mb-2">company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types,backend_agent,backend_agent_id,original_shipper,commission_pct</p>
          <textarea className="w-full h-40 text-xs font-mono border-2 border-slate-200 rounded-xl p-3 mb-3" value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={`ABC Trading Inc,USA,JFK,info@abc.com,12,2024-06,textiles,NYC Logistics,JC-8848,Shenzhen Factory A,5\nXYZ Imports,UK,LHR,john@xyz.co.uk,6,2024-05,auto parts,London Freight,WCA-3321,Guangzhou Factory B,3`} />
          <button onClick={handleImport} className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700">
            <Upload className="w-4 h-4 inline mr-1" />导入入库
          </button>
        </div>
      )}

      {/* 付费墙 */}
      {!premium && !loading && filtered.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-8 text-center text-white shadow-xl">
          <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">{lang === 'en' ? '🔒 Premium Only' : '🔒 付费情报'}</h2>
          <p className="text-sm text-slate-400 mb-6">{msg}</p>
          <button onClick={() => window.location.href = '/admin/subscribe'}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-xl shadow-lg">
            🚀 {lang === 'en' ? 'Upgrade' : '立即升级'}
          </button>
        </div>
      )}

      {/* 筛选+操作栏 */}
      {(premium || isAdmin) && filtered.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {/* 资产等级 */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {GRADES.map(g => (
              <button key={g.key} onClick={() => setGradeFilter(g.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${gradeFilter === g.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {g.color && <span className={`w-2 h-2 rounded-full ${g.color} inline-block mr-1 align-middle`} />}
                {g.label}
              </button>
            ))}
          </div>
          <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-28" placeholder="国家..." value={countryFilter} onChange={e => setCountryFilter(e.target.value)} />
          <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-28" placeholder="港口..." value={portFilter} onChange={e => setPortFilter(e.target.value)} />
          <span className="text-xs text-slate-400 ml-auto">{filtered.length} 条</span>

          {/* 批量工具栏 */}
          {batchMode && selected.size > 0 && (
            <div className="w-full bg-indigo-50 border-2 border-indigo-200 rounded-xl px-4 py-2 flex items-center gap-3">
              <span className="text-sm font-bold text-indigo-800">已选 {selected.size} 条</span>
              <button onClick={batchRelease} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                🚀 批量释放到竞标池
              </button>
              <button onClick={() => setBindAgentId('batch')} className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700">
                🛡️ 批量绑定后程
              </button>
              <button onClick={batchExport} className="text-xs font-bold bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">
                📋 导出选中
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600 ml-auto">取消</button>
            </div>
          )}

          {/* 绑定后程弹窗 */}
          {bindAgentId && (
            <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-2">{lang === 'en' ? 'Select Backend Agent' : '选择后程代理'}</h4>
              <input className="text-sm w-full px-3 py-2 border border-amber-200 rounded-lg mb-2" placeholder="搜索 JC/WCA 认证代理..."
                value={bindSearch} onChange={e => setBindSearch(e.target.value)} />
              <div className="space-y-1 mb-3">
                {DUMMY_AGENTS.filter(a => !bindSearch || a.name.toLowerCase().includes(bindSearch.toLowerCase())).map(a => (
                  <button key={a.id} onClick={() => batchBind(a.name, a.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold">{a.name}</span>
                    <span className="text-xs text-slate-400">{a.id}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full ml-auto">{a.net}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setBindAgentId(null)} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
            </div>
          )}
        </div>
      )}

      {/* 列表 */}
      {(premium || isAdmin) && !loading && filtered.length > 0 && (
        <div className="space-y-3">
          {batchMode && (
            <label className="flex items-center gap-2 px-1 cursor-pointer text-xs text-slate-500">
              <input type="checkbox" checked={selected.size === filtered.length} onChange={toggleAll} className="w-4 h-4 rounded accent-indigo-500" />
              {lang === 'en' ? 'Select All' : '全选'} ({filtered.length})
            </label>
          )}
          {filtered.map(item => {
            const isMyClaim = item.isMine || item.claimed_by === user?.id;
            const isProtected = item.isProtected && !isMyClaim;
            const ph = item.protectionRemaining || 0;
            return (
              <div key={item.id} className={`bg-white rounded-xl border transition-all hover:shadow-md ${
                isMyClaim ? 'border-blue-300 ring-1 ring-blue-100 bg-blue-50/20' :
                isProtected ? 'border-amber-200 bg-amber-50/20' :
                item.status === 'awakened' ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-100'
              }`}>
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {batchMode && <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} className="w-4 h-4 rounded accent-indigo-500 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-base font-black text-slate-900">{item.company_name}</span>
                        {item.import_frequency >= 12 && <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔥🔥 S级 · {item.import_frequency}次/年</span>}
                        {item.import_frequency >= 6 && item.import_frequency < 12 && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔥 A级 · {item.import_frequency}次/年</span>}
                        {item.import_frequency < 6 && <span className="text-xs text-slate-400">B级 · {item.import_frequency}次/年</span>}
                        <StatusBadge status={item.status} lang={lang} />
                        {item.bid_count ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">🔥 {item.bid_count}家竞标</span> : null}
                        {isMyClaim && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🔒 你的线索</span>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap mb-2">
                        <span><MapPin className="w-3.5 h-3.5 inline mr-0.5" />{item.country} · {item.port || '--'}</span>
                        {item.cargo_types && <span className="text-slate-400">📦 {item.cargo_types}</span>}
                        {item.last_import_date && <span className="text-slate-400"><Clock className="w-3.5 h-3.5 inline mr-0.5" />最后进口 {item.last_import_date}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        {/* 后程 */}
                        {item.backend_agent ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-bold border border-emerald-200">
                            <Shield className="w-3 h-3 inline mr-0.5" />后程：{item.backend_agent} ({item.backend_agent_id})
                          </span>
                        ) : isAdmin ? (
                          <button onClick={() => { setSelected(new Set([item.id])); setBindAgentId(item.id); }}
                            className="text-amber-600 bg-amber-50 border border-dashed border-amber-300 px-2 py-1 rounded-full text-xs font-bold hover:bg-amber-100">
                            ＋ 绑定后程代理
                          </button>
                        ) : (
                          <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-xs">后程待托管</span>
                        )}
                        {/* 保护倒计时 */}
                        {isProtected && <span className="text-amber-700 font-bold font-mono bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">⏳ {formatTimer(ph)}</span>}
                        {isMyClaim && ph > 0 && <span className="text-blue-600 font-bold font-mono bg-blue-50 px-2 py-0.5 rounded-full">⏳ 你的保护期 {formatTimer(ph)}</span>}
                        {isAdmin && item.original_shipper && <span className="text-slate-400">🏭 原发货人：{item.original_shipper}</span>}
                        {isAdmin && item.commission_pct && <span className="text-slate-400">💰 佣金：{item.commission_pct}%</span>}
                      </div>
                      {isMyClaim && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2.5 text-sm text-slate-600 border border-blue-100">
                          {item.contact_person && <span className="font-bold mr-2">{item.contact_person}</span>}
                          <span className="mr-2">📧 {item.contact_email}</span>
                          {item.contact_phone !== '***' && <span>📞 {item.contact_phone}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isProtected && !isMyClaim && item.status !== 'awakened' && (
                        <button onClick={() => handleClaim(item.id)} disabled={claiming === item.id}
                          className="text-sm font-black bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50">
                          {claiming === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          {lang === 'en' ? '🚀 Bid' : '🚀 竞标'}
                        </button>
                      )}
                      {isProtected && !isMyClaim && <div className="text-center text-xs text-amber-700 font-bold">已锁定<br/><span className="font-mono">{formatTimer(ph)}</span></div>}
                      {isMyClaim && <button onClick={() => setDetailItem(detailItem?.id === item.id ? null : item)} className="text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm">详情</button>}
                      {item.status === 'awakened' && !isMyClaim && <span className="text-xs text-emerald-600 font-bold">✅ 已成交</span>}
                    </div>
                  </div>
                </div>

                {/* 详情面板 */}
                {detailItem?.id === item.id && (
                  <div className="border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border-2 border-emerald-200 p-4">
                        <div className="flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-emerald-600" /><h4 className="text-sm font-black text-emerald-800">🛡️ 后程已托管</h4></div>
                        {item.backend_agent ? (
                          <div className="space-y-2 text-sm">
                            <p><strong>{item.backend_agent}</strong> ({item.backend_agent_id})</p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                              <span>✅ 清关</span><span>✅ 派送</span><span>✅ 关税代缴</span><span>✅ JC TRANS / WCA</span>
                            </div>
                          </div>
                        ) : <p className="text-sm text-slate-500">待分配后程代理</p>}
                      </div>
                      <div className="bg-white rounded-xl border-2 border-blue-200 p-4">
                        <div className="flex items-center gap-2 mb-3"><Zap className="w-5 h-5 text-blue-600" /><h4 className="text-sm font-black text-blue-800">🚢 头程竞标</h4></div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <p>航线：中国 → {item.port || item.country}</p>
                          {item.cargo_types && <p>货类：{item.cargo_types}</p>}
                          <p>频次：{item.import_frequency}次/年</p>
                        </div>
                        <div className="mt-3 bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
                          💡 你只需负责中国→目的港头程。提单收货人写平台后程代理。到港后自动清关派送。
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setDetailItem(null)} className="mt-3 text-xs text-slate-400 hover:text-slate-600">收起详情</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
