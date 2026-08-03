import { useState, useRef, useEffect } from 'react';
import client from '../../api/client';
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Download,
  Clock, Send, UserPlus, X, Mail, Users, TrendingUp, UserCheck, ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../store/authStore';

interface UploadResult {
  message: string;
  batch_id: string;
  total: number;
  pending: number;
  registered: number;
  invalid: number;
}

interface InviteResult {
  message: string;
  total: number;
  success?: number;
  emailFailed?: number;
  failed?: number;
  queued?: boolean;
}

interface ImportBatch {
  id: string;
  name: string | null;
  total: number;
  invited: number;
  pending: number;
  created_at: string;
}

export default function AdminImportPage() {
  const lang = useAuthStore((s) => s.lang);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [inviteBatchId, setInviteBatchId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bouncedIds, setBouncedIds] = useState<Set<string>>(new Set());
  const [markingBounced, setMarkingBounced] = useState(false);

  const handleMarkBounced = async () => {
    if (bouncedIds.size === 0) return;
    setMarkingBounced(true);
    try {
      await client.post('/admin/mark-bounced', { cardIds: Array.from(bouncedIds), reason: '邮箱退件' });
      alert(`已标记 ${bouncedIds.size} 张名片为退件`);
      setBouncedIds(new Set());
      if (selectedBatchId) handleViewBatch(selectedBatchId);
    } catch {}
    setMarkingBounced(false);
  };
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchCards, setBatchCards] = useState<any[]>([]);
  const [batchCardsLoading, setBatchCardsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await client.get<{ data: ImportBatch[] }>('/cards/batches');
      setBatches(res.data.data || []);
    } catch {}
    setBatchesLoading(false);
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setUploadResult(null);
    setInviteResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('batch_name', batchName.trim());
      fd.append('batch_notes', batchNotes.trim());
      const res = await client.post<UploadResult>('/cards/directory/upload', fd);
      setUploadResult(res.data);
      fetchBatches();
      setFile(null);
      setBatchName('');
      setBatchNotes('');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
  };

  const handleInvite = async () => {
    if (!inviteBatchId) return;
    setInviting(true);
    setConfirmOpen(false);
    try {
      const res = await client.post<InviteResult>('/cards/directory/batch-invite', {
        batch_id: inviteBatchId,
      });
      setInviteResult(res.data);
      setInviteBatchId(null);
      fetchBatches();
    } catch (err: any) {
      setError(err?.response?.data?.error || '邀请失败');
    } finally { setInviting(false); }
  };

  const handleViewBatch = async (batchId: string) => {
    if (selectedBatchId === batchId) { setSelectedBatchId(null); return; }
    setSelectedBatchId(batchId);
    setBatchCardsLoading(true);
    try {
      const res = await client.get<{ data: any[] }>(`/cards/batches/${batchId}`);
      setBatchCards(res.data.data || []);
    } catch {}
    setBatchCardsLoading(false);
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['姓名', '公司名', '手机号', '邮箱'],
      ['张三', '深圳XX国际物流', '13800138000', 'zhangsan@example.com'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, '名片');
    XLSX.writeFile(wb, '名片导入模板.xlsx');
  };

  const totalAll = batches.reduce((s, b) => s + b.total, 0);
  const totalPending = batches.reduce((s, b) => s + (b.pending || 0), 0);
  const totalInvited = batches.reduce((s, b) => s + b.invited, 0);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl shadow-2xl mb-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 px-8 py-8">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 ring-4 ring-white/10 flex-shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {lang === 'en' ? 'Import Contacts & Invite' : '我的通讯录'}
              </h1>
              <p className="text-sm text-white/60 mt-1 max-w-xl">
                {lang === 'en' ? 'Upload Excel, manage contacts, invite to join the community.' : '上传 Excel 管理展会联系人，邀请注册为社区成员。'}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-5 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{totalAll}</div>
                    <div className="text-[10px] text-white/50">{lang === 'en' ? 'Contacts' : '联系人'}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{totalInvited}</div>
                    <div className="text-[10px] text-white/50">{lang === 'en' ? 'Invited' : '已邀请'}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{totalPending}</div>
                    <div className="text-[10px] text-white/50">{lang === 'en' ? 'Pending' : '待邀请'}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{batches.length}</div>
                    <div className="text-[10px] text-white/50">{lang === 'en' ? 'Batches' : '批次'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 上传区域 ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-bold text-gray-900">{lang === 'en' ? 'Upload Excel' : '上传通讯录'}</h2>
          <span className="text-xs text-gray-400 ml-auto">{lang === 'en' ? 'Max 500 rows per batch' : '≤500条/次 · CSV/Excel'}</span>
        </div>

        {/* 通讯录名称 */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">{lang === 'en' ? 'Directory Name *' : '通讯录名称 *'}</label>
          <input className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            placeholder={lang === 'en' ? 'e.g. 2026 Shanghai Logistics Expo' : '如：2026深圳物流展'}
            value={batchName} onChange={e => setBatchName(e.target.value)} />
        </div>

        {/* 备注 */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">{lang === 'en' ? 'Notes (visible to users)' : '备注说明（用户可见）'}</label>
          <textarea className="w-full px-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 min-h-[60px] resize-none"
            placeholder={lang === 'en' ? 'e.g. Collected at the Canton Fair, mostly electronics forwarders' : '如：广交会收集，主要为电子类货代'}
            value={batchNotes} onChange={e => setBatchNotes(e.target.value)} />
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50/20 transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setUploadResult(null); setInviteResult(null); setError(''); } }} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-primary-600" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · {lang === 'en' ? 'Click to reselect' : '点击重新选择'}</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">{lang === 'en' ? 'Click to select Excel file' : '点击选择 Excel 文件'}</p>
              <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Drag & drop or browse' : '支持拖拽或浏览选择'}</p>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button className="btn-outline flex items-center gap-1.5 text-sm px-4 py-2" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4" />{lang === 'en' ? 'Template' : '下载模板'}
          </button>
          <button className="btn-primary flex items-center gap-1.5 text-sm px-5 py-2"
            onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? (lang === 'en' ? 'Uploading...' : '上传中...') : (lang === 'en' ? 'Upload' : '上传通讯录')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-5 py-4 mb-6 border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* 上传结果 */}
      {uploadResult && !inviteResult && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm font-bold text-emerald-800">{lang === 'en' ? 'Upload successful' : '上传成功'}</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {lang === 'en'
                    ? `${uploadResult.total} contacts, ${uploadResult.pending} pending, ${uploadResult.registered} registered`
                    : `共 ${uploadResult.total} 条，${uploadResult.pending} 人待邀请，${uploadResult.registered} 人已注册`}
                </p>
              </div>
            </div>
            {uploadResult.pending > 0 && (
              <button className="flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-5 py-2.5 shadow-md hover:shadow-lg transition-all"
                onClick={() => { setInviteBatchId(uploadResult.batch_id); setConfirmOpen(true); }}>
                <UserPlus className="w-4 h-4" />{lang === 'en' ? 'Invite Now' : '邀请注册'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 邀请结果 */}
      {inviteResult && (
        <div className={`rounded-2xl p-5 mb-6 border ${inviteResult.queued ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {inviteResult.queued ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            <span className={`font-bold ${inviteResult.queued ? 'text-blue-800' : 'text-green-800'}`}>
              {inviteResult.queued
                ? (lang === 'en' ? 'Invitation Submitted' : '邀请已提交')
                : (lang === 'en' ? 'Invitation Complete' : '邀请完成')}
            </span>
          </div>
          {inviteResult.queued ? (
            <div>
              <p className="text-sm text-blue-700">{inviteResult.message}</p>
              <p className="text-xs text-blue-500 mt-2">{lang === 'en' ? 'Refresh the page later to see results.' : '稍后刷新页面查看发送结果。'}</p>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {inviteResult.success != null && <span className="text-emerald-700 font-medium">✅ {inviteResult.success} {lang === 'en' ? 'registered' : '人注册成功'}</span>}
              {(inviteResult.emailFailed || 0) > 0 && <span className="text-red-500">❌ {inviteResult.emailFailed} {lang === 'en' ? 'email failed' : '封邮件失败'}</span>}
              {(inviteResult.failed || 0) > 0 && <span className="text-gray-400">⏭️ {inviteResult.failed} {lang === 'en' ? 'skipped' : '人跳过'}</span>}
            </div>
          )}
        </div>
      )}

      {/* ═══ 导入历史 ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <h2 className="text-base font-bold text-gray-900">{lang === 'en' ? 'Import History' : '导入记录'}</h2>
              <span className="text-xs text-gray-400">({batches.length} {lang === 'en' ? 'batches' : '个批次'})</span>
            </div>
            <button className="text-xs text-gray-400 hover:text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={fetchBatches}>
              {batchesLoading ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
              {lang === 'en' ? 'Refresh' : '刷新'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {batchesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No import records yet' : '暂无导入记录'}</p>
              <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Upload your first Excel file above' : '在上方上传你的第一个通讯录文件'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map(b => {
                const isExpanded = selectedBatchId === b.id;
                return (
                  <div key={b.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all">
                    <div className="px-5 py-4 flex items-center justify-between cursor-pointer" onClick={() => handleViewBatch(b.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-800">{b.name || (lang === 'en' ? 'Unnamed' : '未命名')}</span>
                          {(b.pending || 0) > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{b.pending} {lang === 'en' ? 'pending' : '待邀请'}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                          <span>📊 {b.total} {lang === 'en' ? 'contacts' : '条'}</span>
                          <span>✅ {b.invited} {lang === 'en' ? 'invited' : '已邀请'}</span>
                          <span>🕐 {b.created_at?.slice(0, 10)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {(b.pending || 0) > 0 && (
                          <button className="flex items-center gap-1 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-3 py-1.5 transition-colors"
                            onClick={e => { e.stopPropagation(); setInviteBatchId(b.id); setConfirmOpen(true); }}>
                            <Send className="w-3 h-3" />{lang === 'en' ? 'Invite' : '邀请注册'}
                          </button>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* 展开的批次明细 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-white">
                        {batchCardsLoading ? (
                          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                        ) : batchCards.length === 0 ? (
                          <div className="text-center py-6 text-xs text-gray-400">{lang === 'en' ? 'No contacts' : '暂无联系人'}</div>
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr className="text-left text-gray-500">
                                  <th className="py-2.5 px-2 font-medium w-8"></th>
                                   <th className="py-2.5 px-4 font-medium">{lang === 'en' ? 'Name' : '姓名'}</th>
                                  <th className="py-2.5 px-4 font-medium">{lang === 'en' ? 'Company' : '公司'}</th>
                                  <th className="py-2.5 px-4 font-medium">{lang === 'en' ? 'Email' : '邮箱'}</th>
                                  <th className="py-2.5 px-4 font-medium">{lang === 'en' ? 'Status' : '状态'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batchCards.map((c: any, i: number) => (
                                  <tr key={c.id || i} className="border-t border-gray-50 hover:bg-gray-50/50">
                                    <td className="py-2 px-2"><input type="checkbox" disabled={c.email_status === 'bounced'} checked={bouncedIds.has(c.id)} onChange={e => setBouncedIds(prev => { const next = new Set(prev); e.target.checked ? next.add(c.id) : next.delete(c.id); return next; })} className="w-3.5 h-3.5" /></td>
                                    <td className="py-2 px-4">{c.name || '-'}</td>
                                    <td className="py-2 px-4 text-gray-500">{c.company || '-'}</td>
                                    <td className="py-2 px-4 font-mono text-gray-600">{c.email || '-'}</td>
                                    <td className="py-2 px-4">
                                      {c.email_status === 'bounced' ? (
                                        <span className="text-red-500 font-medium" title={c.bounce_reason || ''}>📭 {lang === 'en' ? 'Bounced' : '退件'}</span>
                                      ) : c.registered ? (
                                        <span className="text-green-600 font-medium">✅ {lang === 'en' ? 'Registered' : '已注册'}</span>
                                      ) : c.invited ? (
                                        <span className="text-blue-600 font-medium">📧 {lang === 'en' ? 'Invited' : '已邀请'}</span>
                                      ) : (
                                        <span className="text-amber-600 font-medium">⏳ {lang === 'en' ? 'Pending' : '待邀请'}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {bouncedIds.size > 0 && (
                              <div className="px-4 py-3 border-t border-gray-100 bg-red-50 flex items-center justify-between">
                                <span className="text-xs text-red-600 font-medium">已选 {bouncedIds.size} 张名片标记为退件</span>
                                <button className="text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors" onClick={handleMarkBounced} disabled={markingBounced}>{markingBounced ? '标记中...' : '📭 标记为退件'}</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 确认弹窗 */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{lang === 'en' ? 'Confirm Invitation' : '确认邀请注册'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{lang === 'en' ? 'Create accounts & send emails' : '为未注册联系人创建账号并发送邮件'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {lang === 'en'
                ? 'System will generate username & password, send to their email. 30-day Standard trial included. Existing users skipped.'
                : '系统自动生成用户名和密码发送到对方邮箱，赠送 30 天标准版试用。已注册邮箱自动跳过。'}
            </p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                onClick={() => setConfirmOpen(false)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-1.5"
                onClick={handleInvite} disabled={inviting}>
                {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {lang === 'en' ? 'Confirm' : '确认邀请'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
