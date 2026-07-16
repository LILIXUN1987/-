import { useState, useEffect, useMemo, useRef } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import type { DDPAgent } from '../../../api/ddp.api';
import { Loader2, Search, CheckCircle, Plus } from 'lucide-react';

export default function RegisterTab({ isAgent }: { isAgent: boolean }) {
  const lang = useAuthStore((s) => s.lang);
  const [agents, setAgents] = useState<DDPAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentSearch, setAgentSearch] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    client.get('/ddp/agents')
      .then(res => setAgents(res.data.data || []))
      .catch((err) => { console.warn('[RegisterTab] failed to load agents:', err); })
      .finally(() => setLoading(false));
  }, []);

  const agentOptions = useMemo(() => {
    if (isAgent) return [];
    let list = agents.filter(a => a.created_by);
    if (agentSearch.trim()) {
      const q = agentSearch.trim().toLowerCase();
      list = list.filter(a => a.company_name?.toLowerCase().includes(q) || a.country?.toLowerCase().includes(q) || a.contact_person?.toLowerCase().includes(q) || a.service_ports?.toLowerCase().includes(q));
    }
    return list;
  }, [agents, isAgent, agentSearch]);

  const handleSubmit = async () => {
    if (!selectedAgent) { alert(lang === 'en' ? 'Please select an agent or forwarder' : '请选择代理或货代'); return; }
    setSubmitting(true);
    try {
      const payload: any = { service_type: serviceType || undefined, description: description || undefined };
      // isAgent = 海外代理 → 登记与forwarder合作, 传 forwarder_user_id
      // !isAgent = 中国货代 → 登记与overseas agent合作, 传 agent_user_id
      if (isAgent) {
        payload.forwarder_user_id = selectedAgent;
      } else {
        payload.agent_user_id = selectedAgent;
      }
      await client.post('/cooperations', payload);
      setDone(true);
      setTimeout(() => { setDone(false); setSelectedAgent(''); setServiceType(''); setDescription(''); }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败'));
    }
    setSubmitting(false);
  };

  // 中国货代视角：选择海外代理登记合作
  if (!isAgent) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          {lang === 'en' ? 'Register a cooperation with an overseas agent' : '登记与海外代理的合作'}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {lang === 'en' ? "Select an agent you've worked with to build your cooperation record" : '选择您合作过的海外代理，建立合作记录，积累信用分'}
        </p>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-medium text-sm">{lang === 'en' ? '✅ Cooperation registered! Waiting for agent to confirm.' : '✅ 合作已登记，等待代理方确认'}</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-lg">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : agentOptions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No overseas agents available yet. Go to DDP page to find one.' : '暂无海外代理，请先去 DDP 页面查找代理并联系合作'}</div>
            ) : (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Search & Select Agent *' : '搜索并选择代理 *'}</label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-field w-full text-sm pl-8" placeholder={lang === 'en' ? 'Search by name, country or port...' : '搜索公司名/国家/港口...'} value={agentSearch} onChange={e => setAgentSearch(e.target.value)} />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-1">
                  {agentOptions.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-400">{lang === 'en' ? 'No matching agents' : '未找到匹配的代理'}</div>
                  ) : agentOptions.slice(0, 20).map(a => (
                    <button key={a.id}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${selectedAgent === a.created_by ? 'bg-primary-50 border border-primary-200 text-primary-700' : 'hover:bg-gray-50 border border-transparent'}`}
                      onClick={() => { setSelectedAgent(a.created_by); setAgentSearch(a.company_name + ' (' + a.country + ')'); }}>
                      <span className="text-base">{a.country === '美国' ? '🇺🇸' : a.country === '德国' ? '🇩🇪' : '🌍'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.company_name}</p>
                        <p className="text-gray-400 truncate">{a.country}{a.city ? ` · ${a.city}` : ''}{a.contact_person ? ` · ${a.contact_person}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedAgent && <p className="text-[10px] text-green-600 mt-1">✅ {lang === 'en' ? 'Agent selected' : '已选择代理'}</p>}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Service Type' : '合作类型'}</label>
              <select className="input-field w-full text-sm" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                <option value="">{lang === 'en' ? '-- Select --' : '-- 请选择 --'}</option>
                <option value="DDP">DDP</option>
                <option value="DDU">DDU</option>
                <option value="清关">{lang === 'en' ? 'Customs Clearance' : '清关'}</option>
                <option value="派送">{lang === 'en' ? 'Delivery' : '派送'}</option>
                <option value="仓储">{lang === 'en' ? 'Warehousing' : '仓储'}</option>
                <option value="其他">{lang === 'en' ? 'Other' : '其他'}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Description (optional)' : '合作描述（选填）'}</label>
              <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={lang === 'en' ? 'e.g. Handled 3 FCL shipments to Los Angeles, smooth process' : '例如：操作了3批到洛杉矶的整柜，流程顺畅'} value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <button className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6" onClick={handleSubmit} disabled={submitting || !selectedAgent}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Register Cooperation' : '登记合作')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 海外代理视角：搜索中国货代并登记合作
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-1">
        {lang === 'en' ? 'Register cooperation with a Chinese forwarder' : '登记与中国货代的合作'}
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        {lang === 'en' ? 'Search for a Chinese forwarder you worked with and register' : '搜索您合作过的中国货代，建立合作记录'}
      </p>

      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-green-800 font-medium text-sm">{lang === 'en' ? '✅ Cooperation registered! Awaiting confirmation.' : '✅ 合作已登记，等待货代方确认'}</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-lg">
          <ForwarderSearchSelect
            lang={lang}
            onSelect={(id, label) => { setSelectedAgent(id); setAgentSearch(label); }}
            selectedId={selectedAgent}
            searchLabel={agentSearch}
          />

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Service Type' : '合作类型'}</label>
            <select className="input-field w-full text-sm" value={serviceType} onChange={e => setServiceType(e.target.value)}>
              <option value="">{lang === 'en' ? '-- Select --' : '-- 请选择 --'}</option>
              <option value="DDP">DDP</option>
              <option value="DDU">DDU</option>
              <option value="清关">{lang === 'en' ? 'Customs Clearance' : '清关'}</option>
              <option value="派送">{lang === 'en' ? 'Delivery' : '派送'}</option>
              <option value="仓储">{lang === 'en' ? 'Warehousing' : '仓储'}</option>
              <option value="其他">{lang === 'en' ? 'Other' : '其他'}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Description (optional)' : '合作描述（选填）'}</label>
            <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={lang === 'en' ? 'e.g. Handled shipments together, smooth cooperation' : '例如：合作顺畅，操作专业'} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <button className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6" onClick={handleSubmit} disabled={submitting || !selectedAgent}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Register Cooperation' : '登记合作')}
          </button>
        </div>
      )}
    </div>
  );
}

/** 搜索中国货代子组件 */
function ForwarderSearchSelect({ lang, onSelect, selectedId, searchLabel }: {
  lang: string; onSelect: (id: string, label: string) => void;
  selectedId: string; searchLabel: string;
}) {
  const [query, setQuery] = useState(searchLabel || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await client.get('/overseas/forwarders', { params: { q: q.trim(), limit: 10 } });
      setResults(res.data.data || []);
      setShowDropdown(true);
    } catch { setResults([]); }
    setLoading(false);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs font-medium text-gray-500 mb-1 block">
        {lang === 'en' ? 'Search Chinese Forwarder *' : '搜索中国货代 *'}
      </label>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-field w-full text-sm pl-8"
          placeholder={lang === 'en' ? 'Search by company name...' : '输入中国货代公司名...'}
          value={query}
          onChange={e => { handleSearch(e.target.value); onSelect('', ''); }}
          onFocus={() => results.length > 0 && setShowDropdown(true)} />
        {loading && <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((fw: any) => (
            <button key={fw.id}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ${selectedId === fw.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
              onClick={() => { onSelect(fw.id, fw.company_name || fw.display_name); setQuery(fw.company_name || fw.display_name); setShowDropdown(false); }}>
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">🏢</span>
              <div className="min-w-0">
                <p className="font-medium truncate">{fw.company_name || fw.display_name}</p>
                <p className="text-xs text-gray-400">{fw.display_name} · 🤝 {fw.cooperation_count || 0}次合作 · 🏆 {fw.credit_score || 50}分</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {results.length === 0 && query.trim().length >= 2 && !loading && (
        <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'No forwarders found. Try a different name.' : '未找到货代，请尝试其他公司名'}</p>
      )}
      {selectedId && query && (
        <p className="text-[10px] text-green-600 mt-1">✅ {lang === 'en' ? 'Forwarder selected' : '已选择货代'}</p>
      )}
    </div>
  );
}
