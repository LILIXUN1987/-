import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { ToolsT, t } from '../../i18n';
import {
  Calculator, Search, MapPin, Loader2, Copy, CheckCircle, ExternalLink,
} from 'lucide-react';
import NavLinksBrowser from '../../components/admin/NavLinksBrowser';

type TabKey = 'links' | 'volumetric' | 'airport' | 'hscode';

function calcVw(l: number, w: number, h: number, u: 'cm' | 'm', mode: 'air' | 'express'): { vw: number } {
  const vol = u === 'm' ? l * w * h : (l * w * h) / 1000000;
  return { vw: Math.round(vol * (mode === 'air' ? 167 : 200) * 100) / 100 };
}

export default function ToolsPage() {
  const lang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>('links');

  const tabs = [
    { key: 'links' as TabKey, label: { zh: '🔗 导航库', en: '🔗 Navigation' }, bg: 'from-rose-500 to-pink-600', icon: ExternalLink },
    { key: 'volumetric' as TabKey, label: ToolsT.tabVol, bg: 'from-blue-500 to-indigo-600', icon: Calculator },
    { key: 'airport' as TabKey, label: ToolsT.tabAirport, bg: 'from-emerald-500 to-teal-600', icon: MapPin },
    { key: 'hscode' as TabKey, label: ToolsT.tabHS, bg: 'from-amber-500 to-orange-600', icon: Search },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(ToolsT.title, lang)}</h1>
      <p className="text-gray-500 mb-6">{t(ToolsT.subtitle, lang)}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {tabs.map(ti => (
          <button key={ti.key}
            className={`relative overflow-hidden rounded-xl py-3 px-3 text-sm font-bold transition-all duration-200 ${
              tab === ti.key
                ? `bg-gradient-to-r ${ti.bg} text-white shadow-lg scale-[1.02]`
                : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md border border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setTab(ti.key)}
          >
            <div className="flex items-center justify-center gap-2">
              <ti.icon className="w-5 h-5" />
              <span>{t(ti.label, lang)}</span>
            </div>
          </button>
        ))}
      </div>
      {tab === 'volumetric' && <VolCalc />}
      {tab === 'airport' && <AirportSearch />}
      {tab === 'hscode' && <HSCodeSearch />}
      {tab === 'links' && <LinksTab />}
    </div>
  );
}

// ... VolCalc and AirportSearch stay the same ...

function VolCalc() {
  const lang = useAuthStore((s) => s.lang);
  const [u, setU] = useState<'cm' | 'm'>('cm');
  const [mode, setMode] = useState<'air' | 'express'>('air');
  const [items, setItems] = useState<{ l: number; w: number; h: number; a: number }[]>([{ l: 0, w: 0, h: 0, a: 0 }]);
  const f = mode === 'air' ? 167 : 200;
  const add = () => setItems(p => [...p, { l: 0, w: 0, h: 0, a: 0 }]);
  const rm = (i: number) => setItems(p => p.filter((_, j) => j !== i));
  const ttl = items.reduce((ac, it) => {
    const vw = it.l > 0 && it.w > 0 && it.h > 0 ? calcVw(it.l, it.w, it.h, u, mode).vw : 0;
    const ch = Math.max(vw, it.a);
    return { v: ac.v + vw, a: ac.a + it.a, c: ac.c + ch };
  }, { v: 0, a: 0, c: 0 });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-gray-900">{t(ToolsT.calcTitle, lang)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 shadow-inner">
            {(['air', 'express'] as const).map(mk => (
              <button key={mk}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  mode === mk ? (mk === 'air' ? 'bg-blue-500 text-white shadow-sm' : 'bg-orange-500 text-white shadow-sm') : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setMode(mk)}
              >
                {mk === 'air' ? t(ToolsT.calcAir, lang) : t(ToolsT.calcExpress, lang)}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 shadow-inner">
            {(['cm', 'm'] as const).map(uk => (
              <button key={uk} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${u === uk ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setU(uk)}>
                {t(uk === 'cm' ? ToolsT.calcCm : ToolsT.calcM, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className={`rounded-xl px-4 py-3 mb-5 border flex items-start gap-3 ${mode === 'air' ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${mode === 'air' ? 'bg-blue-100' : 'bg-orange-100'}`}>
          <span className="text-base">{mode === 'air' ? '✈️' : '📦'}</span>
        </div>
        <div className={`text-xs leading-relaxed ${mode === 'air' ? 'text-blue-700' : 'text-orange-700'}`}>
          <p className="font-bold text-sm mb-0.5">{mode === 'air' ? t(ToolsT.calcAirFormula, lang) : t(ToolsT.calcExpressFormula, lang)}</p>
          <p>{t(ToolsT.calcChargeNote, lang)}</p>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1 mb-1">
          <div className="col-span-1">{t(ToolsT.calcHeaderNum, lang)}</div>
          <div className="col-span-4">{t(ToolsT.calcHeaderDims, lang)}<span className="text-gray-400 font-normal ml-1">({u === 'cm' ? 'cm' : 'm'})</span></div>
          <div className="col-span-2 text-center">{t(ToolsT.calcHeaderActual, lang)}</div>
          <div className="col-span-2 text-center">{t(ToolsT.calcHeaderVol, lang)}</div>
          <div className="col-span-2 text-center">{t(ToolsT.calcHeaderCharge, lang)}</div>
          <div className="col-span-1"></div>
        </div>
        {items.map((it, i) => {
          const r = it.l > 0 && it.w > 0 && it.h > 0 ? calcVw(it.l, it.w, it.h, u, mode) : null;
          const ch = r ? Math.max(r.vw, it.a) : (it.a || 0);
          const ul = u === 'cm' ? 'cm' : 'm';
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-1 text-xs text-gray-400 text-center font-mono">{i + 1}</span>
              <div className="col-span-4 flex gap-0.5">
                <div className="flex-1 relative">
                  <input className="input-field text-xs py-1.5 w-full pr-6" type="number" min="0" placeholder="L" value={it.l || ''} onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, l: parseFloat(e.target.value) || 0 } : x))} />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">{ul}</span>
                </div>
                <span className="text-gray-300 self-center px-0.5">×</span>
                <div className="flex-1 relative">
                  <input className="input-field text-xs py-1.5 w-full pr-6" type="number" min="0" placeholder="W" value={it.w || ''} onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, w: parseFloat(e.target.value) || 0 } : x))} />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">{ul}</span>
                </div>
                <span className="text-gray-300 self-center px-0.5">×</span>
                <div className="flex-1 relative">
                  <input className="input-field text-xs py-1.5 w-full pr-6" type="number" min="0" placeholder="H" value={it.h || ''} onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, h: parseFloat(e.target.value) || 0 } : x))} />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">{ul}</span>
                </div>
              </div>
              <div className="col-span-2 relative">
                <input className="input-field text-xs py-1.5 w-full pr-6" type="number" min="0" placeholder="kg" value={it.a || ''} onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, a: parseFloat(e.target.value) || 0 } : x))} />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 pointer-events-none">kg</span>
              </div>
              <div className="col-span-2 text-sm font-mono text-center">{r ? r.vw.toFixed(1) : '—'}</div>
              <div className={`col-span-2 text-sm font-bold text-center ${ch > (it.a || 0) ? 'text-orange-600' : 'text-green-600'}`}>
                {ch > 0 ? ch.toFixed(1) : '—'}{ch > (it.a || 0) && it.a > 0 && <span className="text-[9px] ml-0.5 font-normal">{t(ToolsT.calcBulky, lang)}</span>}
              </div>
              <button className="col-span-1 text-gray-300 hover:text-red-500 text-xs" onClick={() => rm(i)} disabled={items.length === 1}>✕</button>
            </div>
          );
        })}
      </div>
      <button className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors mb-4 inline-flex items-center gap-1" onClick={add}>
        <span className="text-lg leading-none">+</span> {t(ToolsT.calcAddItem, lang)}
      </button>
      {items.some(it => it.l > 0 || it.a > 0) && (
        <div className={`rounded-xl p-4 border ${mode === 'air' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'}`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-xs text-gray-500">{t(ToolsT.calcTotalVol, lang)}</div><div className="text-xl font-bold text-gray-900">{ttl.v.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></div><div className="text-[10px] text-gray-400">{(ttl.v / f).toFixed(2)} CBM</div></div>
            <div><div className="text-xs text-gray-500">{t(ToolsT.calcTotalActual, lang)}</div><div className="text-xl font-bold text-gray-900">{ttl.a.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></div></div>
            <div><div className="text-xs text-gray-500">{t(ToolsT.calcTotalCharge, lang)}</div><div className={`text-xl font-bold ${ttl.c > ttl.a ? 'text-orange-600' : 'text-green-600'}`}>{ttl.c.toFixed(1)} <span className="text-sm font-normal text-gray-500">kg</span></div><div className="text-[10px] text-gray-400">{ttl.a > 0 ? `${(ttl.c / ttl.a * 100).toFixed(0)}%` : ''}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function AirportSearch() {
  const lang = useAuthStore((s) => s.lang);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['airport-search', q],
    queryFn: () => client.get<{ data: any[] }>('/tools/airport-search', { params: { q } }).then(r => r.data.data),
    enabled: q.length >= 1,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
          <MapPin className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-bold text-gray-900">{t(ToolsT.airportTitle, lang)}</h2>
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white"
          placeholder={t(ToolsT.airportPlaceholder, lang)} value={q} onChange={e => setQ(e.target.value)} autoFocus />
      </div>
      {isLoading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}
      {q && !isLoading && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {!data || data.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{t(ToolsT.airportEmpty, lang)}</div>
          ) : data.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-b-0">
              <span className="w-16 text-center font-mono font-bold text-primary-700 bg-primary-50 rounded-lg px-2 py-1 text-sm tracking-wider">{item.code}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{item.zh}{item.type === 'international' && item.en && <span className="text-gray-400 ml-1 font-normal">({item.en})</span>}</div>
                <div className="text-xs text-gray-400">{item.type === 'domestic' ? t(ToolsT.airportDomestic, lang) : `🌍 ${item.country || 'International'}`}</div>
              </div>
              <button className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => { navigator.clipboard.writeText(item.code).then(() => { setCopied(item.code); setTimeout(() => setCopied(''), 1500); }); }}>
                {copied === item.code ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {t(ToolsT.airportCopy, lang)}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 导航库Tab（常用查询+社区导航库）
// ════════════════════════════════════════════
function LinksTab() {
  const lang = useAuthStore((s) => s.lang);
  const quickLinks = [
    { title: lang === 'en' ? 'Customs Release Query' : '海关查放行', url: 'http://query.customs.gov.cn/HYW2007DataQuery/FormStatusQuery.aspx', desc: lang === 'en' ? 'Check customs release status' : '查询报关单放行状态', icon: '🏛️' },
    { title: lang === 'en' ? 'IPR Customs Recordal' : '出口知识产权备案', url: 'http://202.127.48.145:8888/zscq/search/jsp/vBrandSearchIndex.jsp', desc: lang === 'en' ? 'Search IPR records' : '查询知识产权海关备案信息', icon: '⚖️' },
    { title: lang === 'en' ? 'Air Cargo Tracking' : '货物追踪（空运）', url: 'https://www.track-trace.com/aircargo', desc: lang === 'en' ? 'Track air waybill worldwide' : '全球空运提单追踪', icon: '✈️' },
    { title: lang === 'en' ? 'Import Manifest Query' : '进口舱单状态查询', url: 'http://query.customs.gov.cn/MNFTQ/MQuery.aspx', desc: lang === 'en' ? 'Check import manifest status' : '查询进口舱单状态', icon: '🚢' },
  ];

  return (
    <div className="space-y-6">
      {/* 常用查询快捷卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
            <ExternalLink className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="font-bold text-gray-900 text-sm">{lang === 'en' ? '🔗 Quick Links' : '🔗 常用快捷入口'}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group">
              <span className="text-lg flex-shrink-0">{link.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate group-hover:text-rose-600">{link.title}</div>
                <div className="text-[10px] text-gray-400 truncate">{link.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* 社区导航库 */}
      <NavLinksBrowser />
    </div>
  );
}

// ════════════════════════════════════════════
// HS编码查询
// ════════════════════════════════════════════
function HSCodeSearch() {
  const lang = useAuthStore((s) => s.lang);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['hs-search', q],
    queryFn: () => client.get<{ data: any[] }>('/tools/hs-search', { params: { q } }).then(r => r.data.data),
    enabled: q.length >= 1,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
          <Search className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-bold text-gray-900">{t(ToolsT.hsTitle, lang)}</h2>
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-white"
          placeholder={t(ToolsT.hsPlaceholder, lang)} value={q} onChange={e => setQ(e.target.value)} autoFocus />
      </div>
      {isLoading && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>}
      {q && !isLoading && (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {!data || data.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{t(ToolsT.hsEmpty, lang)}</div>
          ) : data.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-b-0">
              <span className="flex-shrink-0 font-mono font-bold text-green-700 bg-green-50 rounded-lg px-2.5 py-1 text-xs tracking-wider cursor-pointer"
                onClick={() => { navigator.clipboard.writeText(item.code); setCopied(item.code); setTimeout(() => setCopied(''), 1500); }}>
                {item.code}{copied === item.code && <CheckCircle className="w-3 h-3 inline ml-1 text-green-500" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800">{item.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.category}</div>
              </div>
              <button className="text-xs px-2 py-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100"
                onClick={() => { navigator.clipboard.writeText(item.code); setCopied(item.code); setTimeout(() => setCopied(''), 1500); }}>
                {copied === item.code ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1"><span>⚠️</span> {t(ToolsT.hsWarning, lang)}</p>
    </div>
  );
}
