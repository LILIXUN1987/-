import { useState, useRef } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Camera, CheckCircle, Loader2, Sparkles,
  Ship, Send, ScanLine, ImageIcon, X,
} from 'lucide-react';

export default function ExpoQuickEntry() {
  const user = useAuthStore((s) => s.user);
  const [rawText, setRawText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; status: 'new' | 'skipped' } | null>(null);
  const [recentCards, setRecentCards] = useState<{ name: string }[]>([]);

  // ── OCR ──
  const [ocrLoading, setOcrLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  // 拍照 → 上传 → OCR → 填入表单
  const handlePhoto = async (file: File) => {
    if (!file) return;
    setError('');
    setOcrLoading(true);

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await client.post('/cards/ocr-scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      const data = res.data;

      // 填入表单
      let text = '';
      if (data.name) text += `姓名：${data.name}\n`;
      if (data.company) text += `公司名称：${data.company}\n`;
      if (data.phone) text += `手机号：${data.phone}\n`;
      if (data.email) text += `邮箱：${data.email}\n`;

      if (text.trim()) {
        setRawText(text.trim());
      } else {
        setError('⚠️ 未识别到名片信息，请手动输入');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'OCR 识别失败';
      setError(`⚠️ ${msg}，请手动输入`);
    }
    setOcrLoading(false);
  };

  const clearPhoto = () => { setPhotoPreview(null); };

  // 从文本框解析
  const parseFields = () => {
    const t = rawText;
    const name = t.match(/姓名[：:]\s*(.+)/)?.[1]?.trim() || '';
    const phone = t.match(/手机[号]?[：:]\s*(.+)/)?.[1]?.trim() || t.match(/1[3-9]\d{9}/)?.[0] || '';
    const email = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0]?.toLowerCase() || '';
    const company = t.match(/公司[名称]?[：:]\s*(.+)/)?.[1]?.trim() || '';
    return { name, company, phone, email };
  };

  const handleSubmit = async () => {
    const parsed = parseFields();
    if (!parsed.name) { setError('未识别到姓名，请确保包含"姓名："'); return; }
    if (!parsed.phone) { setError('未识别到手机号'); return; }
    if (!parsed.email) { setError('未识别到邮箱地址'); return; }

    setSubmitting(true);
    setError('');
    try {
      await client.post('/cards/add', {
        cards: [{ ...parsed, role: 'forwarder' }],
        batch_name: `展会现场录入 ${new Date().toLocaleDateString('zh-CN')}`,
      });

      const inviteRes = await client.post('/cards/add-and-invite', {
        cards: [{ ...parsed, role: 'forwarder' }],
      });

      setDone({ name: parsed.name, status: inviteRes.data.created > 0 ? 'new' : 'skipped' });
      setRecentCards(prev => [{ name: parsed.name }, ...prev].slice(0, 10));
      setRawText('');
      clearPhoto();
    } catch (err: any) {
      setError(err?.response?.data?.error || '操作失败');
    }
    setSubmitting(false);
  };

  if (done) {
    const isNew = done.status === 'new';
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <p className={`font-semibold text-sm mb-1 ${isNew ? 'text-green-600' : 'text-amber-600'}`}>
            {isNew ? '✅ 已邀请' : '⏭️ 已存在'}
          </p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{done.name}</h2>
          <div className={`rounded-xl p-4 mb-6 text-sm ${isNew ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            {isNew ? (
              <><p className="font-medium">📧 开通邮件已发送</p><p className="text-xs mt-1">包含用户名和默认密码</p></>
            ) : (
              <><p className="font-medium">📌 该邮箱已注册</p><p className="text-xs mt-1">已跳过邀请，用户可直接登录</p></>
            )}
          </div>
          <button className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 shadow-lg" onClick={() => setDone(null)}>📋 录入下一位</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white/80 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <Ship className="w-5 h-5 text-primary-600" />
        <span className="font-bold text-gray-800 text-sm">123物流社区 · 展会快捷录入</span>
        <span className="text-xs text-gray-400 ml-auto">{user?.display_name || '管理员'}</span>
      </div>

      <div className="max-w-md mx-auto p-4">
        {recentCards.length > 0 && (
          <div className="bg-white rounded-xl border border-green-200 shadow-sm p-3 mb-4">
            <div className="text-xs text-green-600 font-medium mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 本场已邀请 {recentCards.length} 位
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentCards.map((c, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">{c.name}</span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">录入名片</h1>
              <p className="text-xs text-gray-400">拍照识别 → 确认 → 发送邀请，5秒搞定</p>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

          {/* 拍照区 */}
          <div className="mb-4">
            {photoPreview ? (
              <div className="relative mb-3">
                <img src={photoPreview} alt="名片" className="w-full rounded-xl border-2 border-gray-300 max-h-52 object-contain bg-gray-100" />
                <button className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5" onClick={clearPhoto}><X className="w-4 h-4" /></button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 hover:bg-primary-100 transition-all disabled:opacity-50 active:scale-95"
                onClick={() => cameraRef.current?.click()} disabled={ocrLoading}>
                {ocrLoading ? <Loader2 className="w-7 h-7 text-primary-500 animate-spin" /> : <ScanLine className="w-7 h-7 text-primary-500" />}
                <span className="text-xs font-bold text-primary-700">{ocrLoading ? '识别中...' : '📷 拍照识别'}</span>
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }} />

              <button className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all disabled:opacity-50 active:scale-95"
                onClick={() => albumRef.current?.click()} disabled={ocrLoading}>
                <ImageIcon className="w-7 h-7 text-gray-400" />
                <span className="text-xs font-bold text-gray-600">🖼️ 相册</span>
              </button>
              <input ref={albumRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f); e.target.value = ''; }} />
            </div>
            {photoPreview && <p className="text-xs text-green-600 mt-1.5 text-center font-medium">✅ 已拍照，请核对下方信息后点击录入</p>}
          </div>

          {/* 文本框 */}
          <div className="space-y-3">
            <textarea
              className="w-full min-h-[160px] p-4 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 resize-none leading-relaxed"
              placeholder={'拍照自动识别后填入，也可手动输入：\n\n姓名：龙癸珍\n邮箱：lena@splglobal.net\n手机号：18684145968\n公司名称：深圳市超旺国际物流有限公司'}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              disabled={submitting || ocrLoading}
            />

            <button className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold text-base hover:bg-primary-700 shadow-lg shadow-primary-200 disabled:opacity-60 flex items-center justify-center gap-2"
              onClick={handleSubmit} disabled={submitting || !rawText.trim()}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? '处理中...' : '📨 录入并发送邀请邮件'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
