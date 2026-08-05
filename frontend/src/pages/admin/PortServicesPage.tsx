import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Search, Loader2, MapPin, Shield, Scale, Truck, Search as SearchIcon, Building2 } from 'lucide-react';

type TabKey = 'broker' | 'lawyer' | 'inspection' | 'insurance';

const TABS: { key: TabKey; label: string; icon: any; desc: string; needPort: boolean }[] = [
  { key: 'broker', label: '报关行', icon: Building2, desc: '按口岸查询报关行', needPort: true },
  { key: 'lawyer', label: '口岸律师', icon: Scale, desc: '国际物流法律咨询服务', needPort: false },
  { key: 'inspection', label: '检测认证', icon: SearchIcon, desc: '验货·质检·合规认证服务', needPort: false },
  { key: 'insurance', label: '运输保险', icon: Shield, desc: '货运险·责任险服务', needPort: false },
];

const PORTS = ['CAN','LAX','NGB','HKG','SHA','SZX','PVG','ICN','PEK','XMN','TAO','TSN','CKG','CTU'];

export default function PortServicesPage() {
  const lang = useAuthStore((s) => s.lang);
  const [activeTab, setActiveTab] = useState<TabKey>('broker');
  const [portCode, setPortCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const active = TABS.find(t => t.key === activeTab)!;

  const handleSearch = async () => {
    if (active.needPort && !portCode.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const params: any = {};
      if (active.needPort) params.code = portCode.trim();
      else params.type = active.key;
      const res = await client.get('/port-services', { params });
      if (active.needPort) {
        const d = res.data;
        if (active.key === 'broker') setResults(d.customsBrokers || []);
        else setResults(d[active.key] || []);
      } else {
        setResults(res.data.data || []);
      }
    } catch { setResults([]); }
    setLoading(false);
  };

  useEffect(() => { setResults([]); setSearched(false); }, [activeTab]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900">{lang === 'en' ? 'Port Services' : '口岸服务'}</h1>
          <p className="text-sm text-slate-500">{lang === 'en' ? 'Brokers, lawyers, inspection, insurance by port' : '报关行、律师、检测认证、运输保险一站式查询'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-4 h-4" />{tab.label}
          </button>
        )})}
      </div>

      {/* 搜索栏（仅报关行需要港口） */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <active.icon className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-bold text-slate-800">{active.label}</h2>
          <span className="text-xs text-slate-400">{active.desc}</span>
        </div>

        {active.needPort ? (
          <div className="flex gap-2 flex-wrap">
            <input className="flex-1 min-w-[200px] px-4 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 uppercase font-bold"
              placeholder={lang === 'en' ? 'Enter port code (e.g. CAN, PVG)' : '输入口岸三字码（如 CAN、PVG）'}
              value={portCode} onChange={e => setPortCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button onClick={handleSearch} disabled={loading || !portCode.trim()}
              className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {lang === 'en' ? 'Search' : '查询'}
            </button>
          </div>
        ) : (
          <button onClick={handleSearch} disabled={loading}
            className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {lang === 'en' ? 'View All' : '查看全部'}
          </button>
        )}

        {active.needPort && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-xs text-slate-400 mr-1 pt-1">热门：</span>
            {PORTS.map(p => (
              <button key={p} onClick={() => { setPortCode(p); setTimeout(handleSearch, 100); }}
                className="text-xs font-bold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-700 transition-all">
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 结果 */}
      {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>}

      {searched && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">{active.label} · {results.length} {lang === 'en' ? 'results' : '条结果'}</span>
          </div>
          {results.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <active.icon className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>{lang === 'en' ? 'No results yet' : '暂无服务商信息'}</p>
              <p className="text-xs mt-1">{lang === 'en' ? 'Be the first to register!' : '欢迎入驻成为服务商'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {results.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                    {(item.company_name || item.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800">{item.company_name || item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.phone && <span>📞 {item.phone}</span>}
                      {item.email && <span className="ml-3">📧 {item.email}</span>}
                      {item.port_city && <span className="ml-3">📍 {item.port_city}</span>}
                    </div>
                  </div>
                  {item.contact_person && <span className="text-xs text-slate-400">{item.contact_person}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
