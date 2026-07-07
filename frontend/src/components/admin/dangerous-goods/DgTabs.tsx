import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { dgApi } from '../../../api/dg.api';
import client from '../../../api/client';
import ReviewDialog from '../../common/ReviewDialog';
import { getRoleChecks } from '../../../types';
import { AC } from './DgColors';
import { CHECKLIST_TEMPLATES } from './DgConstants';
import UnQuickRef from './UnQuickRef';
import CaseCard from './CaseCard';
import {
  ClipboardList, Search, Plus, X, Send, Loader2, CheckCircle,
  AlertTriangle, Hash, MapPin, Link2, Upload, FileText,
  Building2, Users, HelpCircle, ChevronDown, ChevronUp,
  BookOpen, Lightbulb, Trash2, Save, MessageSquare, Star,
  BadgeCheck, User, XCircle,
} from 'lucide-react';
import { formatTime } from '../../../utils/time';
import type { DgAgent, DgFaq } from '../../../api/dg.api';

interface CasesTabProps {
  type: string;
}

export function CasesTab({ type }: CasesTabProps) {
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const [cases, setCases] = useState<any[]>([]);
  const [allCases, setAllCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const userCompany = useAuthStore((s) => s.user)?.company_name || '';
  const [form, setForm] = useState({ agent_name: userCompany, title: '', content: '', un_number: '', awb_number: '', port: '' });
  const [checklist, setChecklist] = useState<{ step: number; title: string; desc: string }[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [caseSearch, setCaseSearch] = useState('');
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [templateType, setTemplateType] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    try { setCases(await dgApi.cases(type)); } catch {}
    if (isAdmin) { try { setAllCases(await dgApi.allCases(type)); } catch {} }
    try { setAgentsList(await dgApi.agents(type)); } catch {}
    try { setStats(await dgApi.stats(type)); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchCases(); }, [type]);

  const addCheckStep = () => setChecklist(prev => [...prev, { step: prev.length + 1, title: '', desc: '' }]);
  const updCheck = (idx: number, f: string, v: string) => setChecklist(prev => prev.map((s, i) => i === idx ? { ...s, [f]: v } : s));
  const rmCheck = (idx: number) => setChecklist(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })));
  const applyTemplate = (tpl: string) => {
    const items = CHECKLIST_TEMPLATES[tpl];
    if (items) { setChecklist(items); setTemplateType(tpl); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const r = await dgApi.uploadCaseFile(file); setUploadedFiles(prev => [...prev, { name: file.name, path: r.filePath }]); } catch { alert('上传失败'); }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.un_number.trim()) return;
    setSubmitting(true);
    try {
      const valid = checklist.filter(c => c.title.trim());
      await dgApi.addCase({ ...form, type, file_paths: uploadedFiles.map(f => f.path), checklist: valid.length > 0 ? valid : undefined });
      setSubmitted('✅ 已提交，等待管理员审核发布');
      setForm({ agent_name: userCompany, title: '', content: '', un_number: '', awb_number: '', port: '' });
      setChecklist([]); setUploadedFiles([]); setShowForm(false); setTemplateType('');
      setTimeout(() => setSubmitted(''), 3000);
      fetchCases();
    } catch {}
    setSubmitting(false);
  };

  const pendingCases = allCases.filter((c: any) => c.status === 'pending');
  let displayCases = allCases.length > 0 ? allCases : cases;
  if (caseSearch.trim()) { const q = caseSearch.trim().toLowerCase(); displayCases = displayCases.filter((c: any) => (c.title || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q) || (c.un_number || '').toLowerCase().includes(q) || (c.agent_name || '').toLowerCase().includes(q) || (c.submitter_name || '').toLowerCase().includes(q)); }

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-blue-700">{stats.cases.total}</div><div className="text-xs text-blue-600 mt-0.5">走货实例</div></div>
              <ClipboardList className="w-8 h-8 text-blue-300" />
            </div>
            {stats.cases.pending > 0 && <div className="text-[10px] text-orange-600 bg-orange-100 inline-block px-2 py-0.5 rounded-full mt-1.5">待审 {stats.cases.pending}</div>}
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-green-700">{stats.agents.total}</div><div className="text-xs text-green-600 mt-0.5">危险品代理</div></div>
              <Users className="w-8 h-8 text-green-300" />
            </div>
            {stats.agents.pending > 0 && <div className="text-[10px] text-orange-600 bg-orange-100 inline-block px-2 py-0.5 rounded-full mt-1.5">待审 {stats.agents.pending}</div>}
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-purple-700">{stats.faqs.total}</div><div className="text-xs text-purple-600 mt-0.5">已回答FAQ</div></div>
              <HelpCircle className="w-8 h-8 text-purple-300" />
            </div>
            {stats.faqs.pending > 0 && <div className="text-[10px] text-orange-600 bg-orange-100 inline-block px-2 py-0.5 rounded-full mt-1.5">待答 {stats.faqs.pending}</div>}
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{cases.length} 个实例</span>
          {isAdmin && pendingCases.length > 0 && (
            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">待审核 {pendingCases.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 w-36 sm:w-48" placeholder="搜索标题/内容/UN号..." value={caseSearch} onChange={e => setCaseSearch(e.target.value)} />
            {caseSearch && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setCaseSearch('')}><X className="w-3 h-3" /></button>}
          </div>
          <button onClick={() => { setShowForm(!showForm); setChecklist([]); setTemplateType(''); }}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '提交走货实例'}
          </button>
        </div>
      </div>

      <UnQuickRef form={form} setForm={setForm} />

      {/* 提交表单 Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6 pb-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-emerald-500 overflow-hidden modal-mobile">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div><h3 className="font-bold text-gray-900">提交走货实例</h3><p className="text-xs text-gray-500">填写危险品走货操作详情</p></div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <p className="text-xs flex items-start gap-2 bg-amber-50 text-amber-800 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>每个业务员提交<strong>1个UN号</strong>的走货实例即可申请成为危险品代理。同一公司不同业务员需使用<strong>不同的UN号</strong>。</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">代理公司</label>
                    <input className="w-full text-sm bg-gray-100 text-gray-500 border border-gray-200 rounded-lg px-3 py-2 cursor-not-allowed" value={form.agent_name} disabled />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">UN编号 *</label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.un_number} onChange={e => setForm(f => ({ ...f, un_number: e.target.value.toUpperCase() }))} placeholder="如 UN3480" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">出口口岸</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.port} onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="如 广州白云机场" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">空运提单号</label>
                    <div className="relative">
                      <Link2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.awb_number} onChange={e => setForm(f => ({ ...f, awb_number: e.target.value }))} placeholder="如 057-12345678" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">标题 *</label>
                  <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="如：锂电池空运走货流程详解" />
                </div>
                {/* Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-600">操作步骤清单</label>
                    <div className="flex items-center gap-1.5">
                      <select className="text-[10px] border border-gray-200 rounded px-1.5 py-1 text-gray-500 focus:outline-none" value={templateType} onChange={e => applyTemplate(e.target.value)}>
                        <option value="">选模板</option>
                        {Object.keys(CHECKLIST_TEMPLATES).map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                      <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium" onClick={addCheckStep}>+ 添加步骤</button>
                    </div>
                  </div>
                  {checklist.length > 0 && (
                    <div className="space-y-1.5 mb-1">
                      {checklist.map((c, i) => (
                        <div key={i} className="flex gap-2 items-start bg-blue-50/50 rounded-lg p-2.5">
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-1">{i + 1}</div>
                          <div className="flex-1 space-y-1">
                            <input className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="步骤标题" value={c.title} onChange={e => updCheck(i, 'title', e.target.value)} />
                            <input className="w-full text-xs border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="步骤说明（选填）" value={c.desc} onChange={e => updCheck(i, 'desc', e.target.value)} />
                          </div>
                          <button className="p-1 text-gray-300 hover:text-red-500 mt-1" onClick={() => rmCheck(i)}><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">详细操作流程 *</label>
                  <textarea className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-emerald-400" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="详细描述走货流程、注意事项、操作要求等..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">操作文件</label>
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {uploadedFiles.map((f, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                          <FileText className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-600 max-w-[120px] truncate">{f.name}</span>
                          <button className="text-gray-300 hover:text-red-500" onClick={() => setUploadedFiles(p => p.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-3 py-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />{uploading ? '上传中...' : '上传文件'}
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xlsx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  <p className="text-xs text-red-500 mt-1">⚠️ 请将提单中的公司名、地址、联系人等关键信息抹除后再上传</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setShowForm(false)}>取消</button>
                <button className="text-sm font-medium text-white bg-emerald-600 px-5 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  onClick={handleSubmit} disabled={submitting || !form.title.trim() || !form.content.trim() || !form.un_number.trim()}>
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {submitting ? '提交中...' : '提交审核'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4" />{submitted}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : displayCases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">暂无走货实例</p>
          <p className="text-xs text-gray-400 mt-1">点击上方"提交走货实例"创建第一个</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayCases.map((item: any) => (
            <CaseCard key={item.id} item={item} isAdmin={isAdmin} agentsList={agentsList} />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// 危险品代理 Tab（全类型展示）
// ════════════════════════════════════════════
export function AgentsTabAll() {
  const user = useAuthStore((s) => s.user); const rc = getRoleChecks(user?.role); const isAdmin = rc.isAdmin;
  const [allAgents, setAllAgents] = useState<(DgAgent & { transport_type?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', service_categories: '', description: '', ports: '', type: 'air', ref_case_id: '' });
  const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'air' | 'sea' | 'land'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [myCases, setMyCases] = useState<any[]>([]);
  const [myCasesLoading, setMyCasesLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!showForm) return;
    setMyCasesLoading(true);
    const myId = user?.id;
    (async () => {
      try {
        const [air, sea, land] = await Promise.allSettled([
          dgApi.cases('air'), dgApi.cases('sea'), dgApi.cases('land'),
        ]);
        const combined: any[] = [];
        const addIfMine = (result: PromiseSettledResult<any[]>, type: string) => {
          if (result.status === 'fulfilled') {
            result.value.filter((c: any) => c.created_by === myId).forEach((c: any) => combined.push({ ...c, transport_type: type }));
          }
        };
        addIfMine(air, 'air'); addIfMine(sea, 'sea'); addIfMine(land, 'land');
        setMyCases(combined);
      } catch {}
      setMyCasesLoading(false);
    })();
  }, [showForm, user?.id]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [air, sea, land] = await Promise.allSettled([
        dgApi.allAgents('air'), dgApi.allAgents('sea'), dgApi.allAgents('land'),
      ]);
      const combined: any[] = [];
      if (air.status === 'fulfilled') air.value.forEach((a: any) => combined.push({ ...a, transport_type: 'air' }));
      if (sea.status === 'fulfilled') sea.value.forEach((a: any) => combined.push({ ...a, transport_type: 'sea' }));
      if (land.status === 'fulfilled') land.value.forEach((a: any) => combined.push({ ...a, transport_type: 'land' }));
      setAllAgents(combined);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { alert('请填写公司名称'); return; }
    if (!form.ref_case_id.trim()) { alert('请选择您的走货实例 UN 编号'); return; }
    setSubmitting(true);
    try { await dgApi.addAgent({ ...form, type: form.type }); setSubmitted('✅ 已提交，等待审核'); setForm({ company_name: '', contact_person: '', phone: '', service_categories: '', description: '', ports: '', type: 'air', ref_case_id: '' }); setShowForm(false); setTimeout(() => setSubmitted(''), 3000); } catch {}
    setSubmitting(false);
  };

  const approvedAgents = allAgents.filter(a => a.status === 'approved');
  const pendingAgents = allAgents.filter(a => a.status !== 'approved');

  let displayAgents = isAdmin ? allAgents : approvedAgents;
  if (filterType !== 'all') displayAgents = displayAgents.filter(a => a.transport_type === filterType);
  if (searchTerm.trim()) { const q = searchTerm.trim().toLowerCase(); displayAgents = displayAgents.filter(a => a.company_name?.toLowerCase().includes(q) || a.service_categories?.toLowerCase().includes(q) || a.ports?.toLowerCase().includes(q)); }

  return (
    <div>
      {/* 统计条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            共 <strong className="text-red-600">{approvedAgents.length}</strong> 家已入驻代理
          </span>
          {isAdmin && pendingAgents.length > 0 && (
            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{pendingAgents.length} 家待审</span>
          )}
        </div>
        <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
          onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '提交代理信息'}
        </button>
      </div>

      {/* 快捷筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
          {(['all', 'air', 'sea', 'land'] as const).map(t => {
            const ac = AC[t] || AC.air;
            const active = filterType === t;
            return (
              <button key={t}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  active ? `${ac.bg} ${ac.textDeeper} shadow-sm` : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setFilterType(t)}
              >
                {t !== 'all' && <ac.icon className="w-3 h-3" />}{t === 'all' ? '🚚 全部' : ac.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
            placeholder="搜索公司名、服务类别或口岸..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-10 pb-10 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-red-500 overflow-hidden modal-mobile">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-red-600" /></div><div><h3 className="font-bold text-gray-900">提交危险品代理信息</h3><p className="text-xs text-gray-500">需有1个已批准的走货实例</p></div></div>
                <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-3">
                {/** type selection and form fields (same as original) */}
                <div className="flex gap-2 mb-2">
                  {(['air', 'sea', 'land'] as const).map(t => {
                    const ac = AC[t]; const Ti = ac.icon;
                    return (
                      <button key={t}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition-all ${form.type === t ? `${ac.bg} ${ac.textDeeper} ring-1 ${ac.ring}` : 'bg-gray-50 text-gray-500'}`}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                      ><Ti className="w-4 h-4" />{ac.label}</button>
                    );
                  })}
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <label className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> 选择您的走货实例 UN 编号 *
                  </label>
                  <p className="text-[10px] text-amber-600 mb-2">请选择您在第1步提交的已审核走货实例，以证明您具备操作危险品的能力</p>
                  {myCasesLoading ? (
                    <div className="text-xs text-amber-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 加载中...</div>
                  ) : myCases.length === 0 ? (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">⚠️ 暂无已审核的走货实例，请先在第1步「走货实例」提交并等待审核通过</p>
                  ) : (
                    <select className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white font-medium"
                      value={form.ref_case_id}
                      onChange={e => setForm(f => ({ ...f, ref_case_id: e.target.value }))}
                    >
                      <option value="">— 请选择您的走货实例 —</option>
                      {myCases.map((c, i) => (
                        <option key={i} value={c.un_number || c.id}>
                          {(c as any).transport_type === 'air' ? '✈️' : (c as any).transport_type === 'sea' ? '🚢' : '🚛'} {c.un_number || '无UN'} — {c.title?.substring(0, 30)}
                        </option>
                      ))}
                    </select>
                  )}
                  {form.ref_case_id && (
                    <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> 已选择：{form.ref_case_id}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1"><label className="text-xs font-medium text-gray-600 mb-1 block">公司名称 *</label><input className="input-field text-sm" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">联系人</label><input className="input-field text-sm" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium text-gray-600 mb-1 block">联系方式</label><input className="input-field text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">可接危险品类别</label><input className="input-field text-sm" value={form.service_categories} onChange={e => setForm(f => ({ ...f, service_categories: e.target.value }))} placeholder="如 第2类、第3类、第9类" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">可操作口岸</label><input className="input-field text-sm" value={form.ports} onChange={e => setForm(f => ({ ...f, ports: e.target.value }))} placeholder="如 广州白云机场、深圳宝安机场" /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">业务介绍</label><textarea className="input-field text-sm min-h-[60px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200" onClick={() => setShowForm(false)}>取消</button>
                <button className="text-sm font-medium text-white bg-red-600 px-5 py-2 rounded-lg hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50"
                  onClick={handleSubmit} disabled={submitting || !form.company_name.trim()}>
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}{submitting ? '提交中...' : '提交审核'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {submitted && <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4"><CheckCircle className="w-4 h-4" />{submitted}</div>}

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : displayAgents.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">{filterType !== 'all' ? '该类型暂无代理' : '暂无代理信息'}</p></div>
        : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{displayAgents.map(agent => {
            const isP = agent.status !== 'approved';
            const transType = (agent as any).transport_type || 'air';
            const tc = AC[transType] || AC.air;
            return (
              <div key={agent.id + transType} className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${isP ? 'border-yellow-300 opacity-70' : 'border-gray-200 hover:shadow-md hover:border-red-300'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${isP ? 'bg-yellow-100' : 'bg-red-100'} flex items-center justify-center flex-shrink-0 relative`}>
                    <Building2 className={`w-5 h-5 ${isP ? 'text-yellow-600' : 'text-red-600'}`} />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${tc.bg} flex items-center justify-center`}>
                      <tc.icon className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-gray-900">{agent.company_name}</h3>
                      {isP && <span className="text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">待审</span>}
                      {agent.status === 'approved' && <BadgeCheck className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                    {agent.contact_person && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><User className="w-3 h-3" />{agent.contact_person}</p>}
                    {agent.service_categories && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap"><AlertTriangle className="w-3 h-3" />{agent.service_categories}</p>}
                    {agent.ports && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{agent.ports}</p>}
                    {agent.description && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 bg-gray-50 rounded-lg p-2">{agent.description}</p>}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                      {agent.contact_person && (
                        <button className="flex items-center gap-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-1.5 transition-colors"
                          onClick={async () => { try { const lu = await client.get('/auth/lookup?phone=' + agent.phone); if (lu.data.id) { const msg = prompt(`发站内信给 ${agent.company_name}：`); if (msg) { await client.post('/messages', { receiver_id: lu.data.id, content: msg.trim() }); alert('✅ 已发送'); } } } catch { alert('暂无在线账号'); } }}>
                          <Send className="w-3 h-3" />联系TA
                        </button>
                      )}
                      {agent.created_by && (
                        <button className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg px-3 py-1.5 transition-colors"
                          onClick={() => setReviewTarget({ id: agent.created_by, name: agent.company_name })}>
                          <Star className="w-3 h-3" />评价
                        </button>
                      )}
                      {isAdmin && isP && (
                        <div className="flex gap-1 ml-auto">
                          <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            onClick={async () => { try { await dgApi.reviewAgent(agent.id, 'approved'); fetch(); } catch {} }}><CheckCircle className="w-3 h-3" /></button>
                          <button className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            onClick={async () => { await dgApi.reviewAgent(agent.id, 'rejected'); fetch(); }}><XCircle className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}</div>
      }

      {/* 免责声明 */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3 mt-4 leading-relaxed">
        <p>⚠️ 本平台仅展示危险品代理信息，供用户参考。平台不参与任何运输操作，不担保代理服务质量。</p>
        <p className="mt-1">用户应与代理自行核实资质证件（包括但不限于危险品运输资质、MSDS等）后决定是否合作。</p>
        <p className="mt-1">如遇合作纠纷，建议双方协商解决或向行业主管部门投诉。本平台作为信息展示方，不承担运输合同项下的任何责任。</p>
      </div>

      {reviewTarget && (
        <ReviewDialog
          userId={reviewTarget.id}
          userName={reviewTarget.name}
          onClose={() => setReviewTarget(null)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// FAQ Tab
// ════════════════════════════════════════════
export function FaqTab({ type }: { type: string }) {
  const user = useAuthStore((s) => s.user); const rc = getRoleChecks(user?.role); const isAdmin = rc.isAdmin;
  const [faqs, setFaqs] = useState<DgFaq[]>([]); const [allFaqs, setAllFaqs] = useState<DgFaq[]>([]);
  const [loading, setLoading] = useState(true); const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState(''); const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState('');
  const [answerEditors, setAnswerEditors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [faqSearch, setFaqSearch] = useState('');
  const fetch = async () => { setLoading(true); try { setFaqs(await dgApi.faqs(type)); } catch {} if (isAdmin) { try { setAllFaqs(await dgApi.allFaqs(type)); } catch {} } setLoading(false); };
  useEffect(() => { fetch(); }, [type]);
  const handleSubmit = async () => { if (!question.trim()) return; setSubmitting(true); try { await dgApi.addFaq({ question: question.trim(), type }); setSubmitted('✅ 问题已提交，等待管理员回答'); setQuestion(''); setShowForm(false); setTimeout(() => setSubmitted(''), 3000); } catch {} setSubmitting(false); };
  const pendingFaqs = allFaqs.filter(f => f.status === 'pending');
  let displayFaqs: DgFaq[] = isAdmin ? allFaqs : faqs;
  if (faqSearch.trim()) { const q = faqSearch.trim().toLowerCase(); displayFaqs = displayFaqs.filter(f => (f.question || '').toLowerCase().includes(q) || (f.answer || '').toLowerCase().includes(q)); }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-gray-400" /><span className="text-sm font-medium text-gray-700">已回答 {faqs.length} 个问题</span>
          {isAdmin && pendingFaqs.length > 0 && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">待回答 {pendingFaqs.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 w-32 sm:w-40" placeholder="搜索FAQ..." value={faqSearch} onChange={e => setFaqSearch(e.target.value)} />
            {faqSearch && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setFaqSearch('')}><X className="w-3 h-3" /></button>}
          </div>
          <button className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`} onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '提交问题'}
          </button>
        </div>
      </div>
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-3">
          <textarea className="input-field text-sm min-h-[80px]" value={question} onChange={e => setQuestion(e.target.value)} placeholder="请输入您关于危险品运输的问题..." />
          <div className="flex justify-end gap-2"><button className="btn-outline text-sm" onClick={() => setShowForm(false)}>取消</button><button className="btn-primary text-sm" onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : '提交问题'}</button></div>
        </div>
      )}
      {submitted && <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4"><CheckCircle className="w-4 h-4" />{submitted}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : displayFaqs.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><HelpCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">暂无FAQ</p></div>
        : <div className="space-y-2">{displayFaqs.map(item => {
            const isP = item.status === 'pending'; const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isP ? 'border-yellow-200' : 'border-gray-200'}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${item.answer ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{item.answer ? 'A' : 'Q'}</span>
                    <span className="text-sm font-medium text-gray-800 truncate">{item.question}</span>
                    {isP && <span className="text-[10px] text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full flex-shrink-0">待回答</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && <button className="p-1 text-gray-300 hover:text-red-500" onClick={e => { e.stopPropagation(); dgApi.deleteFaq(item.id).then(() => fetch()); }}><Trash2 className="w-3 h-3" /></button>}
                    {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {item.answer ? (
                      <div className="mt-3 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1"><MessageSquare className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-medium text-green-700">回答</span></div>
                        <p className="text-sm text-gray-700">{item.answer}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {item.answerer_name ? `回答者：${item.answerer_name}` : ''} · {formatTime(item.answered_at || item.created_at, 'MM-DD')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 mb-2">等待危险品代理回答...</p>
                        <textarea className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 min-h-[60px]" placeholder={user?.role === 'forwarder' || isAdmin ? '请输入回答...（仅已入驻危险品代理可发布回答）' : '输入回答...'} value={answerEditors[item.id] || ''} onChange={e => setAnswerEditors(p => ({ ...p, [item.id]: e.target.value }))} />
                        <button className="mt-2 text-xs font-medium text-white bg-green-600 rounded-lg px-3 py-1.5 hover:bg-green-700 transition-colors"
                          onClick={async () => { const a = answerEditors[item.id]; if (!a?.trim()) return; try { await dgApi.answerFaq(item.id, a.trim()); setAnswerEditors(p => { const n = { ...p }; delete n[item.id]; return n; }); fetch(); } catch(err: any) { alert(err?.response?.data?.error || '回答失败'); } }}>发布回答</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}</div>
      }
    </div>
  );
}

// ════════════════════════════════════════════
// 知识库 Tab
// ════════════════════════════════════════════
export function KnowledgeTab() {
  const user = useAuthStore((s) => s.user); const rc = getRoleChecks(user?.role); const isAdmin = rc.isAdmin;
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<any>(null); const [expanded, setExpanded] = useState<number | null>(0);
  const [search, setSearch] = useState('');
  const fetch = async () => { setLoading(true); try { setItems(await dgApi.knowledge()); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);
  const filtered = search.trim() ? items.filter(item => item.title?.includes(search) || item.content?.includes(search)) : items;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-gray-400" /><span className="text-sm font-medium text-gray-700">共 {items.length} 篇知识</span></div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input className="pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 w-32" placeholder="搜索..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {isAdmin && <button className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium" onClick={() => setEditItem({ title: '', content: '', sort_order: 0 })}><Plus className="w-3 h-3 inline mr-1" />新增知识</button>}
        </div>
      </div>
      {editItem && <KnowledgeEditor item={editItem} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); fetch(); }} />}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : filtered.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-500">暂无知识内容</p></div>
        : <div className="space-y-2">{filtered.map((item, i) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors" onClick={() => setExpanded(expanded === i ? null : i)}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0"><Lightbulb className="w-3.5 h-3.5 text-indigo-600" /></div>
                  <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAdmin && <span className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button className="p-1 text-gray-300 hover:text-blue-600 text-xs" onClick={() => setEditItem(item)}>✏️</button>
                    <button className="p-1 text-gray-300 hover:text-red-600" onClick={async () => { if (confirm('确定删除？')) { await dgApi.deleteKnowledge(item.id); fetch(); } }}><Trash2 className="w-3 h-3" /></button>
                  </span>}
                  {expanded === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
              {expanded === i && <div className="px-4 pb-4 border-t border-gray-100"><div className="mt-3 text-sm text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 rounded-lg p-3">{item.content}</div></div>}
            </div>
          ))}</div>
      }
    </div>
  );
}

// ════════════════════════════════════════════
// 知识编辑器 Modal
// ════════════════════════════════════════════
function KnowledgeEditor({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item.title || ''); const [content, setContent] = useState(item.content || '');
  const [sortOrder, setSortOrder] = useState(item.sort_order || 0); const [saving, setSaving] = useState(false);
  const handleSave = async () => { if (!title.trim() || !content.trim()) return; setSaving(true); try { await dgApi.saveKnowledge({ id: item.id, title: title.trim(), content: content.trim(), sort_order: sortOrder }); onSaved(); } catch {} setSaving(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-indigo-600" /><h3 className="font-bold text-gray-900">{item.id ? '编辑知识' : '新增知识'}</h3></div><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button></div>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">标题 *</label><input className="input-field text-sm" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">内容 *</label><textarea className="input-field text-sm min-h-[200px]" value={content} onChange={e => setContent(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-gray-600 mb-1 block">排序</label><input className="input-field text-sm w-24" type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100"><button className="btn-outline text-sm" onClick={onClose}>取消</button><button className="btn-primary text-sm flex items-center gap-1" onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}保存</button></div>
      </div>
    </div>
  );
}
