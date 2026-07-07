import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Search, Loader2, Send, Plus, Building2, Phone, User, MapPin,
  MessageSquare, Trash2, CheckCircle,
} from 'lucide-react';

export default function PortServicesBrowser() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [code, setCode] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedService, setSelectedService] = useState('');

  const popularCities = [
    { value: 'CAN', label: lang === 'en' ? 'Guangzhou (CAN)' : '广州 (CAN)', short: 'CAN' },
    { value: 'LAX', label: lang === 'en' ? 'Los Angeles (LAX)' : '洛杉矶 (LAX)', short: 'LAX' },
    { value: 'NGB', label: lang === 'en' ? 'Ningbo (NGB)' : '宁波 (NGB)', short: 'NGB' },
    { value: 'HKG', label: lang === 'en' ? 'Hong Kong (HKG)' : '香港 (HKG)', short: 'HKG' },
    { value: 'SHA', label: lang === 'en' ? 'Shanghai (SHA)' : '上海 (SHA)', short: 'SHA' },
    { value: 'SZX', label: lang === 'en' ? 'Shenzhen (SZX)' : '深圳 (SZX)', short: 'SZX' },
    { value: 'PVG', label: lang === 'en' ? 'Shanghai Pudong (PVG)' : '上海浦东 (PVG)', short: 'PVG' },
    { value: 'ICN', label: lang === 'en' ? 'Seoul (ICN)' : '首尔 (ICN)', short: 'ICN' },
    { value: 'PEK', label: lang === 'en' ? 'Beijing (PEK)' : '北京 (PEK)', short: 'PEK' },
    { value: 'XMN', label: lang === 'en' ? 'Xiamen (XMN)' : '厦门 (XMN)', short: 'XMN' },
    { value: 'TAO', label: lang === 'en' ? 'Qingdao (TAO)' : '青岛 (TAO)', short: 'TAO' },
    { value: 'TSN', label: lang === 'en' ? 'Tianjin (TSN)' : '天津 (TSN)', short: 'TSN' },
    { value: 'CKG', label: lang === 'en' ? 'Chongqing (CKG)' : '重庆 (CKG)', short: 'CKG' },
    { value: 'CTU', label: lang === 'en' ? 'Chengdu (CTU)' : '成都 (CTU)', short: 'CTU' },
    { value: 'FOC', label: lang === 'en' ? 'Fuzhou (FOC)' : '福州 (FOC)', short: 'FOC' },
    { value: 'HGH', label: lang === 'en' ? 'Hangzhou (HGH)' : '杭州 (HGH)', short: 'HGH' },
    { value: 'NKG', label: lang === 'en' ? 'Nanjing (NKG)' : '南京 (NKG)', short: 'NKG' },
    { value: 'SYX', label: lang === 'en' ? 'Sanya (SYX)' : '三亚 (SYX)', short: 'SYX' },
  ];
  const [results, setResults] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [showMySubs, setShowMySubs] = useState(false);
  const [mySubsLoading, setMySubsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await client.get('/port-services', { params: { code: code.trim() } });
      setResults(res.data.data || []);
      setGroups({
        customsBrokers: res.data.customsBrokers || [],
        trucking: res.data.trucking || [],
        insurance: res.data.insurance || [],
        inspection: res.data.inspection || [],
        lawyers: res.data.lawyers || [],
      });
    } catch {}
    setLoading(false);
  };

  const fetchMySubmissions = async () => {
    setMySubsLoading(true);
    try {
      const res = await client.get('/port-services/my-submissions');
      setMySubmissions(res.data.data || []);
    } catch {}
    setMySubsLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await client.delete(`/port-services/${id}`);
      setMySubmissions(p => p.filter(i => i.id !== id));
      setDeleteTarget(null);
    } catch { alert(lang === 'en' ? 'Delete failed' : '删除失败'); }
  };

  const allGroups = [
    { key: 'customsBrokers', label: lang === 'en' ? 'Customs Brokers' : '报关行', icon: '📋', bg: 'bg-blue-100', text: 'text-blue-700', hoverBg: 'hover:bg-blue-50/30', hoverBorder: 'hover:border-blue-200', iconText: 'text-blue-600' },
    { key: 'trucking', label: lang === 'en' ? 'Trucking' : '进出口车队', icon: '🚛', bg: 'bg-orange-100', text: 'text-orange-700', hoverBg: 'hover:bg-orange-50/30', hoverBorder: 'hover:border-orange-200', iconText: 'text-orange-600' },
    { key: 'insurance', label: lang === 'en' ? 'Insurance' : '运输保险', icon: '🛡️', bg: 'bg-rose-100', text: 'text-rose-700', hoverBg: 'hover:bg-rose-50/30', hoverBorder: 'hover:border-rose-200', iconText: 'text-rose-600' },
    { key: 'inspection', label: lang === 'en' ? 'Inspection' : '检测认证', icon: '🔬', bg: 'bg-teal-100', text: 'text-teal-700', hoverBg: 'hover:bg-teal-50/30', hoverBorder: 'hover:border-teal-200', iconText: 'text-teal-600' },
    { key: 'lawyers', label: lang === 'en' ? 'Lawyers' : '口岸律师', icon: '⚖️', bg: 'bg-amber-100', text: 'text-amber-700', hoverBg: 'hover:bg-amber-50/30', hoverBorder: 'hover:border-amber-200', iconText: 'text-amber-600' },
  ];
  const sendMessage = async (item: any) => {
    if (!item.submitted_by) { alert(lang === 'en' ? 'Contact info not available' : '暂无法联系该提交人'); return; }
    const msg = prompt(lang === 'en' ? `Send message to ${item.company_name}:` : `发送站内信给 ${item.company_name}：`);
    if (msg?.trim()) {
      try {
        await client.post('/messages', { receiver_id: item.submitted_by, content: msg.trim() });
        alert('✅ ' + (lang === 'en' ? 'Message sent' : '消息已发送'));
      } catch { alert(lang === 'en' ? 'Send failed' : '发送失败'); }
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 搜索区 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-gray-900">{lang === 'en' ? '🚛 Port Services Directory' : '🚛 口岸服务查询'}</h2>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          {lang === 'en' ? 'Find brokers, trucking, insurance, inspection & lawyers by port' : '选择城市和查询服务类型，查询当地口岸配套服务'}
        </p>

        {/* BANNER */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-lg">💡</span></div>
          <div className="text-xs text-indigo-700 leading-relaxed">
            <p className="font-semibold text-sm mb-1">{lang === 'en' ? '📍 Find Local Port Services' : '📍 在这里可以凭关键词找到当地口岸的'}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {allGroups.map(g => (
                <span key={g.key} className={'inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-0.5 rounded-full ' + g.bg + ' ' + g.text}>
                  {g.icon} {g.label}
                </span>
              ))}
            </div>
          </div>
        </div>

                                {/* 城市搜索 + 服务类型选择 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'Search City / Port *' : '输入城市名或三字代码 *'}</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-teal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 bg-white"
                placeholder={lang === 'en' ? 'e.g. Guangzhou, CAN, Los Angeles...' : '如：广州、CAN、Los Angeles...'}
                value={selectedCity}
                onChange={e => { setSelectedCity(e.target.value); setCode(e.target.value + (selectedService ? ' ' + selectedService : '')); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              />
            </div>
          </div>
          <div className="sm:w-48">
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{lang === 'en' ? 'Service Type' : '服务类型'}</label>
            <select className="input-field w-full text-sm" value={selectedService}
              onChange={e => { setSelectedService(e.target.value); setCode((selectedCity || '') + (e.target.value ? ' ' + e.target.value : '')); }}>
              <option value="">{lang === 'en' ? '-- All --' : '-- 全部 --'}</option>
              <option value="报关行">📋 {lang === 'en' ? 'Customs Broker' : '报关行'}</option>
              <option value="车队">🚛 {lang === 'en' ? 'Trucking' : '进出口车队'}</option>
              <option value="运输保险">🛡️ {lang === 'en' ? 'Insurance' : '运输保险'}</option>
              <option value="检测认证">🔬 {lang === 'en' ? 'Inspection' : '检测认证'}</option>
              <option value="律师">⚖️ {lang === 'en' ? 'Lawyer' : '口岸律师'}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary text-sm px-6 py-2.5 flex items-center gap-1.5" onClick={handleSearch} disabled={loading || !selectedCity}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{lang === 'en' ? 'Search' : '查询'}</span>
            </button>
          </div>
        </div>

        {/* 快捷城市按钮 + 操作按钮 */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {popularCities.slice(0, 10).map(p => (
              <button key={p.value}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-mono font-bold ${selectedCity === p.value ? 'bg-teal-100 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'}`}
                onClick={() => { setSelectedCity(p.value); setCode(p.value + (selectedService ? ' ' + selectedService : '')); setTimeout(() => handleSearch(), 100); }}>
                {p.short}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className={`flex items-center gap-1 text-xs font-bold rounded-lg px-3 py-1.5 transition-all ${showMySubs ? 'bg-gray-100 text-gray-600' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'}`}
              onClick={() => { setShowMySubs(!showMySubs); if (!showMySubs && mySubmissions.length === 0) fetchMySubmissions(); }}>
              <User className="w-3.5 h-3.5" />
              {showMySubs ? (lang === 'en' ? 'Back' : '返回') : (lang === 'en' ? 'My Submissions' : '我的提交')}
            </button>
            <button className={`flex items-center gap-1 text-xs font-bold rounded-lg px-3 py-1.5 transition-all ${showSubmit ? 'bg-gray-100 text-gray-600' : 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'}`}
              onClick={() => setShowSubmit(!showSubmit)}>
              <Plus className="w-3.5 h-3.5" />
              {showSubmit ? (lang === 'en' ? 'Cancel' : '收起') : (lang === 'en' ? 'Add My Info' : '添加自我信息')}
            </button>
          </div>
        </div>      </div>

      {/* 我的提交 */}
      {showMySubs && <MySubmissionsPanel data={mySubmissions} loading={mySubsLoading} onDelete={handleDelete} onRefresh={fetchMySubmissions} />}

      {/* 提交表单 */}
      {showSubmit && <SubmitForm onDone={() => { setShowSubmit(false); if (code.trim()) handleSearch(); }} />}

      {/* 结果筛选 */}
      {searched && !loading && results.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filterType ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
            onClick={() => setFilterType('')}>
            {lang === 'en' ? 'All' : '全部'} ({results.length})
          </button>
          {allGroups.filter(g => (groups[g.key] || []).length > 0).map(g => (
            <button key={g.key}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === g.key ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
              onClick={() => setFilterType(g.key)}>
{g.icon} {g.label} ({(groups[g.key] || []).length})
            </button>
          ))}
        </div>
      )}

      {/* 结果列表 */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{lang === 'en' ? 'No services found' : '该口岸暂无服务信息'}</p>
          <p className="text-xs mt-1 text-gray-300">{lang === 'en' ? 'Be the first to add one!' : '快来添加第一条吧！'}</p>
        </div>
      ) : searched ? (
        <div className="space-y-6">
          {allGroups.filter(g => {
            if (filterType && filterType !== g.key) return false;
            const items = groups[g.key] || [];
            return items.length > 0;
          }).map(g => {
            const items = groups[g.key] || [];
            return (
              <div key={g.key}>
                <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <span className={'w-5 h-5 rounded-full flex items-center justify-center text-xs ' + g.bg}>{g.icon}</span>
                  {g.label}（{items.length}）
                </h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div key={item.id} className={'flex items-start gap-3 px-3 py-2.5 rounded-lg border border-gray-100 ' + g.hoverBg + ' ' + g.hoverBorder + ' transition-all'}>
                      <div className={'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + g.bg}>
                        <Building2 className={'w-4 h-4 ' + g.iconText} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{item.company_name}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                          {item.contact_person && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{item.contact_person}</span>}
                          {item.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{item.phone}</span>}
                          {item.port_name && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{item.port_name}</span>}
                        </div>
                        {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                        {/* 信任标识 */}
                        {item.trust_info && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.trust_info.has_card && <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-medium">📇 已实名</span>}
                            {item.trust_info.days_since_reg > 0 && <span className="text-[10px] text-gray-400">📅 {item.trust_info.days_since_reg}天</span>}
                          </div>
                        )}
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.submitted_by && (
                          <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title={lang === 'en' ? 'Send message' : '发站内信'} onClick={() => sendMessage(item)}>
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════
// 我的提交面板
// ════════════════════════════════════════
function MySubmissionsPanel({ data, loading, onDelete, onRefresh }: {
  data: any[]; loading: boolean; onDelete: (id: string) => void; onRefresh: () => void
}) {
  const lang = useAuthStore((s) => s.lang);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-500" />
          {lang === 'en' ? 'My Submissions' : '我的提交'}
          <span className="text-xs text-gray-400">({data.length})</span>
        </h3>
        <button className="text-xs text-indigo-600 hover:underline" onClick={onRefresh}>
          {lang === 'en' ? 'Refresh' : '刷新'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">{lang === 'en' ? 'No submissions yet' : '暂无提交记录'}</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {data.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-800 truncate">{item.company_name}</p>
                <p className="text-[10px] text-gray-400">
                  {item.port_code} · {item.service_type} · {item.created_at?.slice(0, 10)}
                </p>
              </div>
              <button className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                onClick={() => { if (confirm(lang === 'en' ? 'Delete this submission?' : '确定删除？')) onDelete(item.id); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// 提交表单
// ════════════════════════════════════════
function SubmitForm({ onDone }: { onDone: () => void }) {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [portCode, setPortCode] = useState('');
  const [portName, setPortName] = useState('');
  const [serviceType, setServiceType] = useState('报关行');
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [contactPerson, setContactPerson] = useState(user?.display_name || '');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!portCode.trim() || !companyName.trim()) {
      setError(lang === 'en' ? 'Please fill in port code and company name' : '请填写口岸代码和公司名称');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await client.post('/port-services', {
        port_code: portCode.trim(),
        port_name: portName.trim() || undefined,
        service_type: serviceType,
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => onDone(), 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || (lang === 'en' ? 'Submit failed' : '提交失败');
      setError(msg);
    }
    setSubmitting(false);
  };

  if (done) {
    return <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-sm text-green-700 font-medium">✅ {lang === 'en' ? 'Submitted successfully! Thanks for sharing.' : '服务信息已添加，感谢分享！'}</div>;
  }

  const types = [
    { key: '报关行', zh: '报关行', en: 'Broker' },
    { key: '车队', zh: '车队', en: 'Trucking' },
    { key: '运输保险', zh: '运输保险', en: 'Insurance' },
    { key: '检测认证', zh: '检测认证', en: 'Inspection' },
    { key: '律师', zh: '口岸律师', en: 'Lawyer' },
  ];

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-teal-700">{lang === 'en' ? '📝 Share your port service info with the community' : '📝 添加您的口岸服务信息，分享给社区群友'}</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-xs">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Port Code *' : '口岸代码 *'}</label>
          <input className="input-field w-full text-sm font-mono uppercase" placeholder="CAN" value={portCode} onChange={e => { setPortCode(e.target.value.toUpperCase()); setError(''); }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Port Name' : '口岸名称'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. Guangzhou Baiyun' : '如：广州白云'} value={portName} onChange={e => setPortName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Service Type *' : '服务类型 *'}</label>
          <div className="flex flex-wrap gap-1">
            {types.map(st => (
              <button key={st.key}
                className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${serviceType === st.key ? 'bg-teal-100 border-teal-300 text-teal-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                onClick={() => { setServiceType(st.key); setError(''); }}>
                {lang === 'en' ? st.en : st.zh}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Company Name *' : '公司名称 *'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'Company name' : '公司名称'} value={companyName} onChange={e => { setCompanyName(e.target.value); setError(''); }} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Contact Person' : '联系人'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'Your name' : '您的姓名'} value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Phone' : '联系电话'}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'Phone number' : '手机号'} value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">{lang === 'en' ? 'Description (mention your advantages)' : '备注（请填写您的优势）'}</label>
          <textarea className="input-field w-full text-sm min-h-[60px]" placeholder={lang === 'en' ? 'e.g. 10+ years, specialize in electronics, 24h service...' : '如：擅长电子产品报关、10年经验、24小时服务、价格优势...'} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-outline text-sm" onClick={onDone}>{lang === 'en' ? 'Cancel' : '取消'}</button>
        <button className="btn-primary text-sm flex items-center gap-1" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {lang === 'en' ? 'Submit' : '提交'}
        </button>
      </div>
    </div>
  );
}
