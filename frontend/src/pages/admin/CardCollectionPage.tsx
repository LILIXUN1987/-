import { useState, useRef } from 'react';
import client from '../../api/client';
import { Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function CardCollectionPage() {
  const [uploadingDir, setUploadingDir] = useState(false);
  const [result, setResult] = useState<{ message: string; created: number; skipped: number } | null>(null);
  const [error, setError] = useState('');
  const dirInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">📂 通讯录导入</h1>
      <p className="text-gray-500 mb-6">上传展会名片Excel → 系统自动解析 → 创建账号 → 发送开通邮件</p>

      {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-green-800 font-medium mb-2"><CheckCircle className="w-5 h-5" />{result.message}</div>
          <div className="flex gap-4 text-xs text-green-700">
            <span>✅ 新建账号：<strong>{result.created}</strong> 个</span>
            <span>⏭️ 跳过：<strong>{result.skipped}</strong> 个（已注册或无效）</span>
          </div>
        </div>
      )}

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold text-gray-900">上传 Excel 文件</h3>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-xs text-amber-800 space-y-1">
            <p className="font-medium">📌 Excel 格式要求：</p>
            <p>• 第一行为表头，系统自动识别列名</p>
            <p>• 必含列：<strong>姓名</strong>、<strong>邮箱</strong>（或 Name、Email）</p>
            <p>• 可选列：公司、手机（或 Company、Phone）</p>
            <p>• 上传后系统自动创建账号并发送开通邮件</p>
            <p className="text-amber-600 mt-1">💡 示例：姓名, 公司, 手机, 邮箱</p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-primary-400 transition-colors cursor-pointer"
            onClick={() => dirInputRef.current?.click()}>
            {uploadingDir ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-sm text-gray-500">正在解析并创建账号，请稍候...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-1">点击选择 Excel 文件</p>
                <p className="text-xs text-gray-400">支持 .xlsx / .xls 格式</p>
              </>
            )}
            <input ref={dirInputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingDir(true); setError(''); setResult(null);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const res = await client.post('/cards/directory/upload', fd);
                  setResult(res.data);
                } catch (err: any) {
                  setError(err?.response?.data?.error || '上传失败');
                }
                setUploadingDir(false);
                e.target.value = '';
              }} />
          </div>
        </div>
      </div>
    </div>
  );
}
