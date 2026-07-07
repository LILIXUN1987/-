import { useState, useEffect, useMemo } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import type { DDPAgent } from '../../../api/ddp.api';
import { Loader2, Search, CheckCircle, Plus, Handshake } from 'lucide-react';

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
    if (!selectedAgent) { alert(lang === 'en' ? 'Please select an agent' : '请选择代理'); return; }
    setSubmitting(true);
    try {
      await client.post('/cooperations', {
        agent_user_id: selectedAgent,
        service_type: serviceType || undefined,
        description: description || undefined,
      });
      setDone(true);
      setTimeout(() => { setDone(false); setSelectedAgent(''); setServiceType(''); setDescription(''); }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败'));
    }
    setSubmitting(false);
  };

  // 货代看海外代理列表
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

  // 代理视角：引导去联系货代
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="text-center py-8">
        <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {lang === 'en' ? 'Have you worked with a Chinese forwarder?' : '和中国货代合作过？'}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {lang === 'en'
            ? 'Ask them to register a cooperation on the community. Once they do, you can confirm it here.'
            : '请对方在社区登记合作，您收到通知后在这里确认即可。'}
        </p>
        <p className="text-xs text-gray-400">{lang === 'en' ? 'Go to "My Partners" tab to see pending confirmations.' : '前往「我的合作商」Tab 查看待确认的记录。'}</p>
      </div>
    </div>
  );
}
