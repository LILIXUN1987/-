import { useState, useEffect, useMemo, useRef } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import type { DDPAgent } from '../../../api/ddp.api';
import { Loader2, Search, CheckCircle, Plus, Globe, Building2, MapPin, Zap } from 'lucide-react';

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agentOptions = useMemo(() => {
    if (isAgent) return [];
    let list = agents.filter(a => a.created_by);
    if (agentSearch.trim()) {
      const q = agentSearch.trim().toLowerCase();
      list = list.filter(a =>
        a.company_name?.toLowerCase().includes(q) ||
        a.country?.toLowerCase().includes(q) ||
        a.contact_person?.toLowerCase().includes(q) ||
        a.service_ports?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [agents, isAgent, agentSearch]);

  const handleSubmit = async () => {
    if (!selectedAgent) { alert(lang === 'en' ? 'Please select an agent or forwarder' : '请选择代理或货代'); return; }
    setSubmitting(true);
    try {
      const payload: any = { service_type: serviceType || undefined, description: description || undefined };
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

  const serviceOptions = ['DDP', 'DDU', lang === 'en' ? 'Customs Clearance' : '清关', lang === 'en' ? 'Delivery' : '派送', lang === 'en' ? 'Warehousing' : '仓储', lang === 'en' ? 'Other' : '其他'];

  // ═══════════════════════════════════════
  // 中国货代 → 选择海外代理
  // ═══════════════════════════════════════
  if (!isAgent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-500/5 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-5 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {lang === 'en' ? 'Register Overseas Partner' : '登记海外合作伙伴'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {lang === 'en'
                  ? 'Select an overseas agent and record your cooperation to build credit score'
                  : '选择合作过的海外代理，建立合作记录，积累信用分'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {done ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-emerald-800 font-bold text-lg mb-1">{lang === 'en' ? 'Cooperation Registered!' : '合作已登记！'}</p>
              <p className="text-emerald-600/70 text-sm">{lang === 'en' ? 'Waiting for agent to confirm' : '等待代理方确认合作'}</p>
            </div>
          ) : (
            <div className="max-w-lg space-y-5">
              {/* Agent Selection */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
                  {lang === 'en' ? 'Select Overseas Agent *' : '选择海外代理 *'}
                </label>
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
                ) : agentOptions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <Globe className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">{lang === 'en' ? 'No agents available. Check DDP page first.' : '暂无海外代理，请先前往 DDP 页面'}</p>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        placeholder={lang === 'en' ? 'Search by name, country or port...' : '搜索公司名/国家/港口...'}
                        value={agentSearch}
                        onChange={e => setAgentSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                      {agentOptions.slice(0, 20).map(a => (
                        <button key={a.id}
                          onClick={() => { setSelectedAgent(a.created_by); setAgentSearch(`${a.company_name} (${a.country})`); }}
                          className={`w-full text-left flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all duration-200 ${
                            selectedAgent === a.created_by
                              ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                              : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                            selectedAgent === a.created_by ? 'bg-indigo-100' : 'bg-gray-100'
                          }`}>
                            {a.country === '美国' ? '🇺🇸' : a.country === '德国' ? '🇩🇪' : a.country === '日本' ? '🇯🇵' : a.country === '韩国' ? '🇰🇷' : a.country === '英国' ? '🇬🇧' : a.country === '法国' ? '🇫🇷' : a.country === '越南' ? '🇻🇳' : a.country === '泰国' ? '🇹🇭' : '🌍'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 truncate">{a.company_name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              <span>{a.country}{a.city ? ` · ${a.city}` : ''}</span>
                              {a.contact_person && <span>· {a.contact_person}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {selectedAgent && <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" />{lang === 'en' ? 'Agent selected' : '已选择代理'}</p>}
              </div>

              {/* Service Type */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
                  {lang === 'en' ? 'Service Type' : '合作类型'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {serviceOptions.map(s => (
                    <button key={s}
                      onClick={() => setServiceType(s === serviceType ? '' : s)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        serviceType === s
                          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
                  {lang === 'en' ? 'Description (Optional)' : '合作描述（选填）'}
                </label>
                <textarea
                  className="w-full text-sm min-h-[90px] resize-none border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder={lang === 'en' ? 'e.g. Handled 3 FCL shipments to Los Angeles, smooth process...' : '例如：操作了3批到洛杉矶的整柜，流程顺畅...'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedAgent}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-xl shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Register Cooperation' : '登记合作')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // 海外代理 → 选择中国货代
  // ═══════════════════════════════════════
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-500/5 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-5 border-b border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {lang === 'en' ? 'Register Chinese Forwarder' : '登记中国货代合作'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'en' ? 'Search and register a Chinese forwarder you worked with' : '搜索您合作过的中国货代，建立合作记录'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {done ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-emerald-800 font-bold text-lg mb-1">{lang === 'en' ? 'Cooperation Registered!' : '合作已登记！'}</p>
            <p className="text-emerald-600/70 text-sm">{lang === 'en' ? 'Waiting for forwarder to confirm' : '等待货代方确认合作'}</p>
          </div>
        ) : (
          <div className="max-w-lg space-y-5">
            <ForwarderSearchSelect
              lang={lang}
              onSelect={(id, label) => { setSelectedAgent(id); setAgentSearch(label); }}
              selectedId={selectedAgent}
              searchLabel={agentSearch}
            />

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
                {lang === 'en' ? 'Service Type' : '合作类型'}
              </label>
              <div className="flex flex-wrap gap-2">
                {serviceOptions.map(s => (
                  <button key={s}
                    onClick={() => setServiceType(s === serviceType ? '' : s)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      serviceType === s
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
                {lang === 'en' ? 'Description (Optional)' : '合作描述（选填）'}
              </label>
              <textarea
                className="w-full text-sm min-h-[90px] resize-none border border-gray-200 rounded-xl p-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder={lang === 'en' ? 'e.g. Worked on shipments together, professional and reliable...' : '例如：合作顺畅，操作专业，值得信赖...'}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedAgent}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-xl shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : (lang === 'en' ? 'Register Cooperation' : '登记合作')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// 搜索中国货代子组件
// ═══════════════════════════════════════
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
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 block">
        {lang === 'en' ? 'Search Chinese Forwarder *' : '搜索中国货代 *'}
      </label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          placeholder={lang === 'en' ? 'Enter forwarder company name...' : '输入中国货代公司名...'}
          value={query}
          onChange={e => { handleSearch(e.target.value); onSelect('', ''); }}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
        />
        {loading && <Loader2 className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />}
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-500/10 max-h-56 overflow-y-auto overflow-hidden">
          {results.map((fw: any) => (
            <button key={fw.id}
              onClick={() => { onSelect(fw.id, fw.company_name || fw.display_name); setQuery(fw.company_name || fw.display_name); setShowDropdown(false); }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors flex items-center gap-3 ${
                selectedId === fw.id ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                🏢
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 truncate">{fw.company_name || fw.display_name}</p>
                <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                  <span>{fw.display_name}</span>
                  <span>· 🤝 {fw.cooperation_count || 0}</span>
                  <span>· 🏆 {fw.credit_score || 50}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {results.length === 0 && query.trim().length >= 2 && !loading && (
        <p className="text-xs text-gray-400 mt-2">{lang === 'en' ? 'No forwarders found. Try different name.' : '未找到货代，请尝试其他公司名'}</p>
      )}
      {selectedId && query && (
        <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />{lang === 'en' ? 'Forwarder selected' : '已选择货代'}
        </p>
      )}
    </div>
  );
}
