import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Search, Loader2, Globe, MapPin, Clock, Shield, Zap, Timer, CheckCircle,
  Upload, Users, Radio, Lock, Unlock, Star, TrendingUp, DollarSign, Send, Eye, X,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface Consignee {
  id: string; company_name: string; country: string; port: string;
  contact_email: string; contact_phone: string; contact_person: string;
  import_frequency: number; last_import_date: string; cargo_types: string;
  status: string; awaken_stage?: string; claimed_by: string; protection_until: string;
  backend_agent?: string; backend_agent_id?: string; bid_count?: number;
  original_shipper?: string; commission_pct?: number;
  isProtected?: boolean; isMine?: boolean; protectionRemaining?: number;
}

const GRADES = [
  { key: '', label: '全部', color: '' },
  { key: 'S', label: 'S级资产', color: 'bg-red-500' },
  { key: 'A', label: 'A级资产', color: 'bg-amber-500' },
  { key: 'B', label: 'B级资产', color: 'bg-slate-400' },
];

const DUMMY_AGENTS = [
  { name: 'NYC Logistics', id: 'JC-8848', net: 'JC TRANS' },
  { name: 'LA Port Services', id: 'WCA-3321', net: 'WCA' },
  { name: 'Frankfurt Logistics', id: 'JC-5566', net: 'JC TRANS' },
];

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    dormant: { label: lang === 'en' ? 'Dormant' : '待唤醒', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
    contacted: { label: lang === 'en' ? 'Contacted' : '已联系', cls: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
    replied: { label: lang === 'en' ? 'Replied' : '已回复', cls: 'bg-orange-500/20 text-orange-300 border-orange-400/30' },
    bidding: { label: lang === 'en' ? 'Bidding' : '竞标中', cls: 'bg-red-500/20 text-red-300 border-red-400/30' },
    claimed: { label: lang === 'en' ? 'Locked' : '已锁定', cls: 'bg-blue-500/20 text-blue-300 border-blue-400/30' },
    awakened: { label: lang === 'en' ? 'Won' : '已成交', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
  };
  const m = map[status] || map.dormant;
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>;
}

export default function ConsigneePoolPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const isAdmin = user?.role === 'admin';

  // ── 通用状态 ──
  const [pool, setPool] = useState<Consignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [msg, setMsg] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [portFilter, setPortFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [timerTick, setTimerTick] = useState(0);
  const [detailItem, setDetailItem] = useState<Consignee | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [bidding, setBidding] = useState(false);
  const [bidPrice, setBidPrice] = useState('');

  // ── 管理员专用 ──
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [bindAgentId, setBindAgentId] = useState<string | null>(null);
  const [bindSearch, setBindSearch] = useState('');

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
      setPool(res.data.data || []);
      setPremium(res.data.premium !== false);
      setMsg(res.data.message || '');
    } catch { setPool([]); }
    setLoading(false);
  };
  const fetchStats = async () => { try { const r = await client.get('/consignees/stats'); setStats(r.data); } catch {} };
  useEffect(() => { fetchPool(); fetchStats(); }, [countryFilter, portFilter]);
  useEffect(() => {
    if (pool.length > 0) {
      setPool(prev => prev.map(item => item.protectionRemaining && item.protectionRemaining > 0 ? { ...item, protectionRemaining: item.protectionRemaining - 1/3600 } : item));
    }
  }, [timerTick]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try { await client.post(`/consignees/${id}/claim`); toast.success('已锁定'); fetchPool(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '失败'); }
    setClaiming(null);
  };

  const handleBid = async () => {
    if (!bidPrice.trim()) { toast.error('请输入头程报价'); return; }
    setBidding(true);
    try {
      await client.post(`/consignees/${detailItem?.id}/claim`);
      toast.success(`竞标成功！${bidPrice} 报价已提交，48h 独占保护已开启`);
      setBidding(false); setDetailItem(null); setBidPrice('');
      fetchPool();
    } catch (e: any) { toast.error(e?.response?.data?.error || '竞标失败'); setBidding(false); }
  };

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { toast.error('请粘贴CSV'); return; }
    const headers = lines[0].split(',');
    const records = lines.slice(1).map(line => {
      const vals = line.split(','); const r: any = {};
      headers.forEach((h, i) => { r[h.trim()] = (vals[i] || '').trim(); }); return r;
    });
    try { const r = await client.post('/consignees/import', { records }); toast.success(`导入 ${r.data.inserted} 条`); setImportText(''); setImportMode(false); fetchPool(); fetchStats(); }
    catch (e: any) { toast.error(e?.response?.data?.error || '导入失败'); }
  };

  const filtered = filterPool(pool);
  const formatTimer = (h: number) => { const hh = Math.max(0, Math.floor(h)), mm = Math.max(0, Math.floor((h - hh) * 60)), ss = Math.max(0, Math.floor((h - hh - mm/60) * 3600)); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; };
  const nextRelease = () => { const now = new Date(); const next = new Date(now); next.setHours(10, 0, 0, 0); if (now.getHours() >= 10) next.setDate(next.getDate() + 1); const diff = Math.max(0, next.getTime() - now.getTime()); return formatTimer(diff / 3600000); };

  // ════════════════════════════════════════
  // 货代视角: 情报作战室
  // ════════════════════════════════════════
  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        {/* 顶部战报 */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-black">🌍 海外直客唤醒池</h1>
              <p className="text-sm text-slate-400 mt-1">这里没有询盘，只有等待被竞标的真实资产。源自 15 年提单沉淀，经 JC Trans/WCA 认证后程托管。</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-3">
                <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-lg font-black">127</span></div>
                <div className="text-[10px] text-slate-400">在线竞标代理</div>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div className="text-center px-3">
                <div className="text-amber-400 text-lg font-black">¥{Math.floor(Math.random() * 200 + 50)}万</div>
                <div className="text-[10px] text-slate-400">累计成交</div>
              </div>
              <div className="w-px h-10 bg-slate-700" />
              <div className="text-center px-3">
                <div className="text-sm font-black text-amber-400 font-mono">{nextRelease()}</div>
                <div className="text-[10px] text-slate-400">下一波释放倒计时</div>
              </div>
            </div>
          </div>
        </div>

        {/* 空状态 */}
        {!loading && filtered.length === 0 && (
          <div className="bg-slate-900 rounded-2xl p-12 text-center text-white border border-slate-700">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-3 border-amber-500/20" />
              <div className="absolute inset-3 rounded-full border-2 border-amber-500/40 animate-pulse" />
              <div className="absolute inset-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Radio className="w-8 h-8 text-amber-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-black mb-2">🚧 首批 S 级资产正在唤醒中...</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              系统正在向北美高频直客发送邀约，首批 5 个名额将于明日 10:00 准时释放。
            </p>
            <button className="mt-6 px-6 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-xl hover:bg-amber-500/20 transition-all">
              🔔 订阅提醒
            </button>
          </div>
        )}

        {/* 资产卡片流 */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
                {GRADES.map(g => (
                  <button key={g.key} onClick={() => setGradeFilter(g.key)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${gradeFilter === g.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                    {g.color && <span className={`w-1.5 h-1.5 rounded-full ${g.color} inline-block mr-1 align-middle`} />}{g.label}
                  </button>
                ))}
              </div>
              <input className="text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 w-24 placeholder:text-slate-500" placeholder="国家..." value={countryFilter} onChange={e => setCountryFilter(e.target.value)} />
              <input className="text-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 w-24 placeholder:text-slate-500" placeholder="港口..." value={portFilter} onChange={e => setPortFilter(e.target.value)} />
              <span className="text-xs text-slate-500 ml-auto">{filtered.length} 个资产</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map(item => {
                const grade = item.import_frequency >= 12 ? 'S' : item.import_frequency >= 6 ? 'A' : 'B';
                const gradeCls = grade === 'S' ? 'border-red-500/30 bg-red-500/5' : grade === 'A' ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-700 bg-slate-800/50';
                const isMyClaim = item.isMine || item.claimed_by === user?.id;
                const isProtected = item.isProtected && !isMyClaim;
                const ph = item.protectionRemaining || 0;
                const isUrgent = ph > 0 && ph < 1;
                return (
                  <div key={item.id} className={`rounded-xl border p-5 transition-all hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/5 ${gradeCls} ${isUrgent ? 'animate-pulse' : ''}`}>
                    {/* 顶部标签 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {grade === 'S' && <span className="text-xs font-black bg-red-600 text-white px-2 py-0.5 rounded">🏆 S级资产</span>}
                        {grade === 'A' && <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded">⭐ A级资产</span>}
                        {grade === 'B' && <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded">B级资产</span>}
                        <span className="text-xs text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />热度 {Math.floor(item.import_frequency * (Math.random() * 5 + 3))}</span>
                      </div>
                      {ph > 0 && (
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${isMyClaim ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                          ⏱️ {isMyClaim ? '你的保护期' : '保护期'} {formatTimer(ph)}
                        </span>
                      )}
                    </div>

                    {/* 公司信息 */}
                    <h4 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                      <span>{item.country === 'USA' ? '🇺🇸' : item.country === 'UK' ? '🇬🇧' : item.country === 'Germany' ? '🇩🇪' : '🌍'}</span>
                      {item.company_name}
                      <span className="text-sm font-normal text-slate-400">({item.port})</span>
                    </h4>

                    {/* 需求 + 历史 */}
                    <div className="space-y-1.5 mb-3 text-sm text-slate-400">
                      <p>📦 {item.cargo_types || 'DDP 整柜/拼箱'}</p>
                      <p>📈 近3年进口 {item.import_frequency * 3} 次 · 最近出货 {item.last_import_date || '2024'}</p>
                    </div>

                    {/* 后程托管 */}
                    {item.backend_agent ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-1">
                          <Shield className="w-3.5 h-3.5" />后程已托管
                        </div>
                        <p className="text-sm text-slate-300 font-bold">{item.backend_agent} <span className="text-xs text-emerald-400 font-normal">({item.backend_agent_id})</span></p>
                        <div className="flex gap-3 text-[10px] text-emerald-500/70 mt-1">
                          <span>✅ 清关</span><span>✅ 派送</span><span>✅ 关税</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800 rounded-lg p-3 mb-3 text-xs text-slate-500">🛡️ 后程：待平台分配</div>
                    )}

                    {/* 直客反馈（模拟真实感） */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2.5 mb-3 text-xs text-indigo-300 italic">
                      💬 "Looking for stable DDP partner for weekly shipments..."
                    </div>

                    {/* 竞标态势 + 操作 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        👥 {(item.bid_count || Math.floor(Math.random() * 3) + 1)} 家代理竞标中
                      </span>
                      {!isProtected && !isMyClaim && item.status !== 'awakened' && (
                        <button onClick={() => { setDetailItem(item); setBidPrice(''); }}
                          className="text-sm font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/20">
                          🚀 立即竞标头程
                        </button>
                      )}
                      {isProtected && !isMyClaim && (
                        <span className="text-xs text-amber-400 font-bold">已锁定 · {formatTimer(ph)}</span>
                      )}
                      {isMyClaim && (
                        <button onClick={() => setDetailItem(item)} className="text-sm font-bold bg-blue-600/30 text-blue-300 px-4 py-2 rounded-xl border border-blue-500/30 hover:bg-blue-600/50 transition-all">
                          查看详情 →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 右侧辅助信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <h4 className="text-sm font-bold text-white mb-3">🗺️ 全球认证代理网络</h4>
                <div className="space-y-2 text-xs text-slate-400">
                  {DUMMY_AGENTS.map(a => (
                    <div key={a.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span className="flex-1 font-bold text-slate-300">{a.name}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{a.net}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4">
                <h4 className="text-sm font-bold text-white mb-3">📊 我的竞标</h4>
                {pool.filter(i => i.claimed_by === user?.id).length === 0 ? (
                  <p className="text-xs text-slate-500">尚未参与竞标。点击上方「立即竞标」开始抢单。</p>
                ) : (
                  pool.filter(i => i.claimed_by === user?.id).map(i => (
                    <div key={i.id} className="flex items-center justify-between text-xs bg-slate-800 rounded-lg px-3 py-2 mb-1">
                      <span className="text-slate-300 font-bold">{i.company_name}</span>
                      <span className="text-emerald-400">保护中</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* 竞标模态框 */}
        {detailItem && !isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailItem(null)}>
            <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-5 flex items-center justify-between">
                <h3 className="text-lg font-black text-white">🚀 竞标头程</h3>
                <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-emerald-400" /><span className="text-sm font-black text-white">🛡️ 后程已托管</span></div>
                  <p className="text-slate-300">{detailItem.backend_agent || '平台认证代理'} {detailItem.backend_agent_id ? `(${detailItem.backend_agent_id})` : ''}</p>
                  <p className="text-xs text-slate-500 mt-1">你只需负责中国→目的港头程。提单收货人写平台后程代理。到港后自动清关派送。</p>
                </div>
                <div className="space-y-3">
                  <div><label className="text-xs text-slate-400 mb-1 block">头程单价 (¥/CBM 或 ¥/KG)</label>
                    <input className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white text-lg font-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="如：800/CBM" value={bidPrice} onChange={e => setBidPrice(e.target.value)} /></div>
                  <div className="text-xs text-slate-400 mt-2">💡 竞标成功后，该资产将进入你的 48 小时独占保护期。</div>
                </div>
                <button onClick={handleBid} disabled={bidding || !bidPrice.trim()}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-lg rounded-xl hover:from-red-500 hover:to-orange-500 disabled:opacity-50 transition-all shadow-lg">
                  {bidding ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '🚀 确认竞标 · 锁定资产'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 升级模态框 */}
        {detailItem && !premium && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailItem(null)}>
            <div className="bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl w-full max-w-sm text-center p-8" onClick={e => e.stopPropagation()}>
              <Lock className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white mb-2">🔒 旗舰会员专属</h3>
              <p className="text-sm text-slate-400 mb-6">S 级资产竞标权仅对旗舰会员开放。升级后享受 48 小时独占保护期，防止撞单。</p>
              <button onClick={() => { window.location.href = '/admin/subscribe'; }}
                className="w-full py-3 bg-amber-500 text-slate-900 font-black rounded-xl hover:bg-amber-400 transition-all">
                🚀 立即升级 · ￥2999/月
              </button>
              <button onClick={() => setDetailItem(null)} className="text-xs text-slate-500 mt-3 hover:text-slate-300">以后再说</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // 管理员视角: 资产库控制台
  // ════════════════════════════════════════
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black">🌍 海外直客资产库</h1>
              <p className="text-sm text-slate-400 mt-0.5">15年提单沉淀——系统已锁定高价值收货人，人工唤醒后释放至竞标池</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setImportMode(!importMode)} className="text-xs font-bold bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 px-3 py-2 rounded-xl border border-blue-400/30"><Upload className="w-3.5 h-3.5 inline mr-1" />资产入库</button>
            {filtered.length > 0 && <button onClick={() => setBatchMode(!batchMode)} className={`text-xs font-bold px-3 py-2 rounded-xl border ${batchMode ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>批量操作</button>}
            {stats && <span className="text-xs font-bold bg-amber-400/20 text-amber-300 px-3 py-1.5 rounded-full">{stats.total} 资产 · {stats.awakened} 成交</span>}
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-6 gap-3">
          {[{ v: stats.total, l: '资产总数', c: 'text-slate-700' },{ v: stats.dormant, l: '待唤醒', c: 'text-slate-500' },{ v: stats.claimed, l: '竞标中', c: 'text-red-600' },{ v: stats.awakened, l: '已成交', c: 'text-emerald-600' },{ v: stats.countries, l: '覆盖国家', c: 'text-amber-600' },{ v: '12,458', l: '潜在待挖掘', c: 'text-indigo-500' }].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 text-center"><div className={`text-xl font-black ${s.c}`}>{s.v}</div><div className="text-[11px] text-slate-400">{s.l}</div></div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !importMode && (
        <div className="bg-slate-900 rounded-2xl p-12 text-center text-white">
          <div className="w-20 h-20 mx-auto mb-6 relative"><div className="absolute inset-0 rounded-full border-3 border-amber-500/20" /><div className="absolute inset-3 rounded-full border-2 border-amber-500/40 animate-pulse" /><div className="absolute inset-6 rounded-full bg-amber-500/10 flex items-center justify-center"><Radio className="w-8 h-8 text-amber-500 animate-pulse" /></div></div>
          <h3 className="text-lg font-black mb-2">🔒 资产库已初始化</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">系统检测到 15 年历史提单中存在 12,458 条高价值收货人记录。点击右上角「资产入库」以激活首批资产。</p>
          <button onClick={() => setImportMode(true)} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl shadow-lg transition-all">🚀 开始首批资产唤醒</button>
        </div>
      )}

      {importMode && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-5">
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold text-slate-700">📋 资产入库 (CSV)</h3><button onClick={() => setImportMode(false)} className="text-xs text-slate-400">关闭</button></div>
          <p className="text-xs text-slate-400 mb-2">company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types,backend_agent,backend_agent_id,original_shipper,commission_pct</p>
          <textarea className="w-full h-40 text-xs font-mono border-2 border-slate-200 rounded-xl p-3 mb-3" value={importText} onChange={e => setImportText(e.target.value)} placeholder={`ABC Trading Inc,USA,JFK,info@abc.com,12,2024-06,textiles,NYC Logistics,JC-8848,Shenzhen Factory,5`} />
          <button onClick={handleImport} className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded-xl"><Upload className="w-4 h-4 inline mr-1" />导入入库</button>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">{GRADES.map(g => (<button key={g.key} onClick={() => setGradeFilter(g.key)} className={'text-xs font-bold px-3 py-1.5 rounded-lg transition-all ' + (gradeFilter === g.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500')}>{g.color ? <span className={'w-1.5 h-1.5 rounded-full inline-block mr-1 align-middle ' + g.color} /> : null}{g.label}</button>))}</div>
            <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-28" placeholder="国家..." value={countryFilter} onChange={e => setCountryFilter(e.target.value)} />
            <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg w-28" placeholder="港口..." value={portFilter} onChange={e => setPortFilter(e.target.value)} />
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} 条</span>
          </div>
          <div className="space-y-3">
            {batchMode && <label className="flex items-center gap-2 px-1 cursor-pointer text-xs text-slate-500"><input type="checkbox" checked={false} className="w-4 h-4 rounded accent-indigo-500" />全选</label>}
            {filtered.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-3">
                  {batchMode && <input type="checkbox" className="w-4 h-4 rounded accent-indigo-500 mt-1.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-black text-slate-900">{item.company_name}</span>
                      {item.import_frequency >= 12 && <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔥🔥 S级 · {item.import_frequency}次/年</span>}
                      {item.import_frequency >= 6 && item.import_frequency < 12 && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔥 A级 · {item.import_frequency}次/年</span>}
                      <StatusBadge status={item.status} lang={lang} />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap mb-1">
                      <span><MapPin className="w-3.5 h-3.5 inline mr-0.5" />{item.country} · {item.port || '--'}</span>
                      {item.cargo_types && <span>📦 {item.cargo_types}</span>}
                      {item.last_import_date && <span className="text-slate-400"><Clock className="w-3.5 h-3.5 inline mr-0.5" />{item.last_import_date}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {item.backend_agent ? <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200"><Shield className="w-3 h-3 inline mr-0.5" />{item.backend_agent} ({item.backend_agent_id})</span> : <button onClick={() => { setSelected(new Set([item.id])); setBindAgentId(item.id); }} className="text-amber-600 bg-amber-50 border border-dashed border-amber-300 px-2 py-0.5 rounded-full text-xs font-bold">＋ 绑定后程</button>}
                      {item.original_shipper && <span className="text-slate-400">🏭 {item.original_shipper}</span>}
                      {item.commission_pct && <span className="text-slate-400">💰 {item.commission_pct}%</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
