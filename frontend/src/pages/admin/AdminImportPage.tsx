import { useState, useRef, useEffect } from 'react';
import client from '../../api/client';
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Download, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportDetail {
  name: string;
  company: string;
  email: string;
  username: string;
  password: string;
  status: string;
  reason?: string;
}

interface ImportResult {
  message: string;
  total: number;
  success: number;
  batch_id?: string;
  details: ImportDetail[];
}

interface ImportBatch {
  id: string;
  file_name: string | null;
  total: number;
  success: number;
  skipped: number;
  email_failed: number;
  admin_name: string;
  created_at: string;
}

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await client.get<{ data: ImportBatch[] }>('/admin/batch-imports');
      setBatches(res.data.data || []);
    } catch {}
    setBatchesLoading(false);
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await client.post<ImportResult>('/admin/batch-import', fd);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">导入展会名片</h1>
      <p className="text-gray-500 mb-6">上传 Excel 文件，批量导入货代账号并自动发送邮件通知</p>

      {/* 模板说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 space-y-1">
            <p className="font-medium">📋 Excel 格式要求</p>
            <p>必填列：<strong>姓名</strong>、<strong>公司名</strong>、<strong>邮箱</strong></p>
            <p>选填列：<strong>手机号</strong></p>
            <p className="text-xs text-blue-600">* 系统自动生成用户名和随机密码，货代登录后可在个人中心上传名片</p>
            <p className="text-xs text-blue-600">* 自动发送开通邮件到每个邮箱，含用户名+密码</p>
            <p className="text-xs text-blue-600">* 已注册的邮箱会自动跳过，不会重复创建</p>
          </div>
        </div>
      </div>

      {/* 上传区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { setFile(f); setResult(null); setError(''); }
            }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <FileSpreadsheet className="w-8 h-8" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB — 点击重新选择</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">点击选择 Excel 文件</p>
              <p className="text-xs text-gray-400 mt-1">支持 .xlsx / .xls 格式</p>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            className="btn-outline flex items-center gap-1.5 text-sm px-4 py-2"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            下载模板
          </button>
          <button
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-5 py-4 mt-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* 导入结果 */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">{result.message}</h3>
          </div>

          {/* 统计 */}
          {(() => {
            const emailFailed = result.details.filter(d => d.status === '邮件发送失败').length;
            return (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{result.total}</div>
                <div className="text-xs text-gray-500">总数</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{result.success}</div>
                <div className="text-xs text-gray-500">成功</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{emailFailed}</div>
                <div className="text-xs text-gray-500">邮件失败</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-500">{result.total - result.success - emailFailed}</div>
                <div className="text-xs text-gray-500">跳过</div>
              </div>
            </div>
            );
          })()}

          {/* 详情 */}
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-3"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            查看详细结果
          </button>

          {showDetails && (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-2 pr-2 font-medium">姓名</th>
                    <th className="pb-2 pr-2 font-medium">公司</th>
                    <th className="pb-2 pr-2 font-medium">邮箱</th>
                    <th className="pb-2 pr-2 font-medium">用户名</th>
                    <th className="pb-2 pr-2 font-medium">密码</th>
                    <th className="pb-2 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((d, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${d.status === '成功' ? '' : 'text-gray-400'}`}>
                      <td className="py-2 pr-2">{d.name}</td>
                      <td className="py-2 pr-2">{d.company}</td>
                      <td className="py-2 pr-2">{d.email}</td>
                      <td className="py-2 pr-2 font-mono">{d.username || '-'}</td>
                      <td className="py-2 pr-2 font-mono">{d.password || '-'}</td>
                      <td className="py-2">
                        {d.status === '成功' ? (
                          <span className="text-green-600 font-medium">✅ 成功</span>
                        ) : d.status === '邮件发送失败' ? (
                          <span className="text-red-600 font-medium" title={d.reason}>❌ 邮件失败</span>
                        ) : (
                          <span title={d.reason}>⏭️ 跳过 ({d.reason})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ 导入批次历史 ════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">导入历史记录</h3>
          <button className="ml-auto text-xs text-gray-400 hover:text-gray-600" onClick={fetchBatches}>
            {batchesLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : '刷新'}
          </button>
        </div>

        {batchesLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : batches.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">暂无导入记录</div>
        ) : (
          <div className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700 truncate">{b.file_name || '未命名文件'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {b.created_at?.slice(0, 16).replace('T', ' ')} · {b.admin_name || '管理员'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-xs text-gray-500">{b.total} 条</span>
                  <span className="text-xs text-green-600 font-medium">{b.success} 成功</span>
                  {b.email_failed > 0 && <span className="text-xs text-red-600 font-medium">{b.email_failed} 邮件失败</span>}
                  {b.skipped > 0 && <span className="text-xs text-gray-400">{b.skipped} 跳过</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
