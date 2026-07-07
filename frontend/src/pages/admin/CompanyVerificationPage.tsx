import { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Shield, CheckCircle, XCircle, Loader2, Search, Building2,
  User, FileText, Eye, Clock, AlertTriangle, ZoomIn,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';

interface VerificationUser {
  id: string;
  username: string;
  display_name: string;
  company_name: string;
  phone: string;
  email: string;
  role: string;
  card_image: string | null;
  company_license: string | null;
  is_verified_company: number;
  created_at: string;
}

/** 构建可访问的资源 URL */
function assetUrl(path: string | null): string | null {
  if (!path) return null;
  return '/api/' + path.replace(/\\/g, '/');
}

export default function CompanyVerificationPage() {
  const user = useAuthStore((s) => s.user);
  const [list, setList] = useState<VerificationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VerificationUser | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  // 驳回确认弹窗
  const [rejectTarget, setRejectTarget] = useState<VerificationUser | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const rc = getRoleChecks(user?.role);
  if (!rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">仅管理员可访问</div>;
  }

  const fetchList = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await client.get('/admin/company-verifications', {
        params: q ? { q } : {},
      });
      setList(res.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // 即时搜索：search 变化后自动拉取
  useEffect(() => {
    const timer = setTimeout(() => fetchList(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchList]);

  const handleApprove = async (userId: string) => {
    try {
      await client.post('/admin/approve-verification', { user_id: userId });
      setSuccess('企业认证已通过');
      setSelected(null);
      fetchList(search);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || '操作失败');
    }
  };

  // ── 驳回单个 ──
  const handleReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await client.post('/admin/reject-verification', { user_id: rejectTarget.id });
      setSuccess('企业认证已驳回');
      setSelected(null);
      setRejectTarget(null);
      fetchList(search);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || '操作失败');
    }
    setIsRejecting(false);
  };

  // ── 批量通过 ──
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        await client.post('/admin/approve-verification', { user_id: id });
        ok++;
      } catch { fail++; }
    }
    setSuccess(`批量通过完成：成功 ${ok} 个${fail > 0 ? `，失败 ${fail} 个` : ''}`);
    setSelectedIds(new Set());
    fetchList(search);
    setTimeout(() => setSuccess(''), 4000);
    setBatchProcessing(false);
  };

  // ── 批量驳回 ──
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定批量驳回 ${selectedIds.size} 个认证申请吗？`)) return;
    setBatchProcessing(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      try {
        await client.post('/admin/reject-verification', { user_id: id });
        ok++;
      } catch { fail++; }
    }
    setSuccess(`批量驳回完成：成功 ${ok} 个${fail > 0 ? `，失败 ${fail} 个` : ''}`);
    setSelectedIds(new Set());
    fetchList(search);
    setTimeout(() => setSuccess(''), 4000);
    setBatchProcessing(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((i) => i.id)));
    }
  };

  return (
    <div>
      {/* ── 标题 ── */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企业认证审核</h1>
          <p className="text-sm text-gray-500">审核货运代理提交的营业执照，授予「🏢 认证企业」标识</p>
        </div>
      </div>

      {/* ── 消息提示 ── */}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4" />{success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ════ 左栏：申请列表 ════ */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-100 space-y-2">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="搜索公司名或用户..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              />
            </div>

            {/* 批量操作栏 */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">已选 {selectedIds.size} 项</span>
                <button
                  className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40"
                  onClick={handleBatchApprove}
                  disabled={batchProcessing}
                >
                  {batchProcessing ? '处理中...' : '批量通过'}
                </button>
                <button
                  className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
                  onClick={handleBatchReject}
                  disabled={batchProcessing}
                >
                  {batchProcessing ? '处理中...' : '批量驳回'}
                </button>
              </div>
            )}
          </div>

          {/* 列表 */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无待审核的认证申请</p>
                <p className="text-xs mt-1">货代上传营业执照后会显示在这里</p>
              </div>
            ) : (
              <>
                {/* 全选 - 仅在有多条时显示 */}
                {list.length > 1 && (
                  <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === list.length}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                      />
                      {selectedIds.size === list.length ? '取消全选' : '全选'}
                    </label>
                  </div>
                )}
                {list.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selected?.id === item.id ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => setSelected(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* 复选框 */}
                      <label onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-400"
                        />
                      </label>

                      {/* 头像 */}
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>

                      {/* 信息 */}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{item.company_name}</div>
                        <div className="text-xs text-gray-500">
                          {item.display_name}
                          {item.phone && <span> · {item.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {item.is_verified_company ? (
                        <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap">
                          已认证
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap">
                          待审核
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ════ 右栏：详情面板 ════ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          {!selected ? (
            <div className="text-center py-12 text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">选择一个申请查看详情</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 头部 */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">{selected.company_name}</div>
                  <div className="text-xs text-gray-500">{selected.display_name}</div>
                </div>
              </div>

              {/* 用户信息 */}
              <div className="space-y-2 text-sm">
                <InfoRow label="用户名" value={selected.username} />
                <InfoRow label="角色" value="货运代理" />
                <InfoRow label="手机" value={selected.phone || '--'} />
                <InfoRow label="邮箱" value={selected.email || '--'} />
                <InfoRow label="注册时间" value={formatTime(selected.created_at, 'YYYY-MM-DD')} />
              </div>

              {/* 名片预览 */}
              {selected.card_image && (
                <ImagePreview
                  label="名片"
                  src={assetUrl(selected.card_image)}
                  onZoom={() => setLightboxImg(assetUrl(selected.card_image))}
                />
              )}

              {/* 营业执照预览 */}
              {selected.company_license && (
                <LicensePreview
                  src={assetUrl(selected.company_license)}
                  filename={selected.company_license}
                  onZoom={() => setLightboxImg(assetUrl(selected.company_license))}
                />
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                {selected.is_verified_company ? (
                  <button
                    className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg py-2.5 hover:bg-red-100 transition-colors"
                    onClick={() => setRejectTarget(selected)}
                  >
                    <XCircle className="w-4 h-4" /> 撤销认证
                  </button>
                ) : (
                  <>
                    <button
                      className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-white bg-emerald-600 rounded-lg py-2.5 hover:bg-emerald-700 transition-colors"
                      onClick={() => handleApprove(selected.id)}
                    >
                      <CheckCircle className="w-4 h-4" /> 通过认证
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg py-2.5 hover:bg-gray-200 transition-colors"
                      onClick={() => setRejectTarget(selected)}
                    >
                      <XCircle className="w-4 h-4" /> 驳回
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ 驳回确认弹窗 ════ */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isRejecting) setRejectTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-amber-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">确认驳回</h3>
                <p className="text-xs text-gray-500 mt-0.5">将清空该用户上传的营业执照</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900">{rejectTarget.company_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{rejectTarget.display_name} · {rejectTarget.phone || '无手机'}</p>
            </div>
            <p className="text-sm text-gray-700 mb-4">确定驳回该企业的认证申请吗？</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setRejectTarget(null)}
                disabled={isRejecting}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ 图片放大灯箱 ════ */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="放大预览"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 transition-colors"
            onClick={() => setLightboxImg(null)}
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── 子组件：信息行 ──
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-[220px] truncate" title={value}>{value}</span>
    </div>
  );
}

// ── 子组件：图片预览 ──
function ImagePreview({ label, src, onZoom }: { label: string; src: string | null; onZoom: () => void }) {
  if (!src) return null;
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative group cursor-pointer" onClick={onZoom}>
        <img src={src} alt={label} className="w-full h-20 object-cover rounded-lg border" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

// ── 子组件：营业执照预览（支持图片和非图片文件） ──
function LicensePreview({ src, filename, onZoom }: { src: string | null; filename: string; onZoom: () => void }) {
  if (!src) return null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
        <FileText className="w-3 h-3" /> 营业执照
      </label>
      {isImage ? (
        <div className="relative group cursor-pointer" onClick={onZoom}>
          <img src={src} alt="营业执照" className="w-full h-auto max-h-40 object-contain rounded-lg border" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <FileText className="w-3 h-3" /> 查看营业执照文件
        </a>
      )}
    </div>
  );
}
