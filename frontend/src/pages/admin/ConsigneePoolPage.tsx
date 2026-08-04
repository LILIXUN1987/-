import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Search, Loader2, Globe, MapPin, Clock, Shield, TrendingUp, Lock, Unlock, CheckCircle, Upload, Users } from 'lucide-react';
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
  isProtected?: boolean;
  isMine?: boolean;
  protectionRemaining?: number;
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
  const [claiming, setClaiming] = useState<string | null>(null);

  // 统计
  const [stats, setStats] = useState<any>(null);

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

  const fetchStats = async () => {
    try {
      const res = await client.get('/consignees/stats');
      setStats(res.data);
    } catch {}
  };

  useEffect(() => { fetchPool(); fetchStats(); }, [countryFilter, portFilter]);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    try {
      const res = await client.post(`/consignees/${id}/claim`);
      toast.success(res.data.message);
      fetchPool();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '锁定失败');
    }
    setClaiming(null);
  };

  const handleAwaken = async (id: string) => {
    try {
      const res = await client.post(`/consignees/${id}/awaken`);
      toast.success(res.data.message);
      fetchPool(); fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '操作失败');
    }
  };

  // ── 管理员导入 ──
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');

  const handleImport = async () => {
    const lines = importText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { toast.error('请粘贴CSV数据（第一行为表头）'); return; }
    const headers = lines[0].split(',');
    const records = lines.slice(1).map(line => {
      const vals = line.split(',');
      const r: any = {};
      headers.forEach((h, i) => { r[h.trim()] = (vals[i] || '').trim(); });
      return r;
    });
    try {
      const res = await client.post('/consignees/import', { records });
      toast.success(res.data.message || `导入 ${res.data.inserted} 条`);
      setImportText('');
      setImportMode(false);
      fetchPool(); fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '导入失败');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm shadow-amber-200">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            {lang === 'en' ? '🌍 Overseas Direct Customer Pool' : '🌍 海外直客唤醒池'}
          </h1>
          <p className="text-sm text-slate-500">
            {lang === 'en' ? '15 years of consignee data — exclusive, uncontacted, real importers' : '15年提单沉淀——真实、高频、未被开发过的海外收货人'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setImportMode(!importMode)}
            className="ml-auto text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5 inline mr-1" />{lang === 'en' ? 'Import' : '导入数据'}
          </button>
        )}
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { v: stats.total, l: lang === 'en' ? 'Total Consignees' : '收货人总数', c: 'text-slate-700' },
            { v: stats.dormant, l: lang === 'en' ? 'Dormant' : '待唤醒', c: 'text-amber-600' },
            { v: stats.claimed, l: lang === 'en' ? 'Claimed' : '已锁定', c: 'text-blue-600' },
            { v: stats.awakened, l: lang === 'en' ? 'Awakened' : '已唤醒', c: 'text-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* 非付费提示 */}
      {!premium && !loading && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-black text-amber-800 mb-2">
            {lang === 'en' ? '🔒 Premium Feature' : '🔒 付费会员专属'}
          </h2>
          <p className="text-sm text-amber-700 mb-4">{msg}</p>
          <button onClick={() => window.location.href = '/admin/subscribe'}
            className="px-6 py-2.5 bg-amber-500 text-white font-black text-sm rounded-xl hover:bg-amber-600 shadow-lg transition-all">
            {lang === 'en' ? 'Upgrade Now' : '立即升级'}
          </button>
        </div>
      )}

      {/* 导入面板（管理员） */}
      {isAdmin && importMode && (
        <div className="bg-white rounded-2xl border-2 border-slate-300 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">
            {lang === 'en' ? '📋 Batch Import — Paste CSV (company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types)' : '📋 批量导入——粘贴CSV（公司名,国家,港口,邮箱,进口频次,最后进口日期,货类）'}
          </h3>
          <textarea className="w-full h-40 text-xs font-mono border-2 border-slate-200 rounded-xl p-3 mb-3" value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="company_name,country,port,contact_email,import_frequency,last_import_date,cargo_types&#10;ABC Trading Inc,USA,JFK,info@abc.com,12,2024-06,textiles&#10;XYZ Imports,UK,LHR,john@xyz.co.uk,6,2024-05,auto parts" />
          <button onClick={handleImport}
            className="px-5 py-2 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700 transition-colors">
            <Upload className="w-4 h-4 inline mr-1" />{lang === 'en' ? 'Import' : '导入'}
          </button>
        </div>
      )}

      {/* 筛选 */}
      {premium && (
        <div className="flex items-center gap-3 flex-wrap">
          <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-200 w-32"
            placeholder={lang === 'en' ? 'Country...' : '国家...'} value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)} />
          <input className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-200 w-32"
            placeholder={lang === 'en' ? 'Port...' : '港口...'} value={portFilter}
            onChange={e => setPortFilter(e.target.value)} />
          <span className="text-xs text-slate-400">{total} {lang === 'en' ? 'results' : '条结果'}</span>
        </div>
      )}

      {/* 直客列表 */}
      {premium && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
          ) : pool.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{lang === 'en' ? 'No consignees found' : '暂无匹配的收货人'}</p>
            </div>
          ) : (
            pool.map((item) => {
              const isMyClaim = item.isMine || item.claimed_by === user?.id;
              const isProtected = item.isProtected && !isMyClaim;
              return (
                <div key={item.id} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${isMyClaim ? 'border-blue-300 ring-1 ring-blue-100' : isProtected ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-black text-slate-900">{item.company_name}</span>
                        {item.import_frequency >= 12 && <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">🔥 高频</span>}
                        {item.import_frequency >= 6 && item.import_frequency < 12 && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ 中频</span>}
                        {isMyClaim && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{lang === 'en' ? '🔒 Your Lead' : '🔒 你的线索'}</span>}
                        {isProtected && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⏳ {lang === 'en' ? `Locked ${item.protectionRemaining}h` : `已锁定 ${item.protectionRemaining}h`}</span>}
                        {item.status === 'awakened' && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ {lang === 'en' ? 'Awakened' : '已唤醒'}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{item.country}</span>
                        {item.port && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.port}</span>}
                        <span>{lang === 'en' ? `Frequency: ${item.import_frequency}/yr` : `进口频次: ${item.import_frequency}次/年`}</span>
                        {item.last_import_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lang === 'en' ? 'Last import' : '最后进口'} {item.last_import_date}</span>}
                        {item.cargo_types && <span className="text-slate-400">{item.cargo_types}</span>}
                      </div>
                      {/* 联系方式——仅自己的显示 */}
                      {isMyClaim && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2 text-xs text-slate-600">
                          {item.contact_person && <span className="font-bold mr-2">{item.contact_person}</span>}
                          {item.contact_email !== '***@***.***' && <span className="mr-2">📧 {item.contact_email}</span>}
                          {item.contact_phone !== '***' && <span>📞 {item.contact_phone}</span>}
                        </div>
                      )}
                    </div>
                    {/* 操作 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isProtected && !isMyClaim && item.status !== 'awakened' && (
                        <button onClick={() => handleClaim(item.id)} disabled={claiming === item.id}
                          className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
                          {claiming === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                          {lang === 'en' ? 'Claim' : '锁定'}
                        </button>
                      )}
                      {isMyClaim && item.status !== 'awakened' && (
                        <button onClick={() => handleAwaken(item.id)}
                          className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                          <CheckCircle className="w-3 h-3" />
                          {lang === 'en' ? 'Mark Awakened' : '标记唤醒'}
                        </button>
                      )}
                      {isProtected && !isMyClaim && (
                        <span className="text-xs text-slate-400">
                          {lang === 'en' ? `Wait ${item.protectionRemaining}h` : `等待 ${item.protectionRemaining}小时`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
