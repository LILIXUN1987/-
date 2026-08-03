import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface ServiceConsultModalProps {
  open: boolean;
  role: string;
  label: string;
  onClose: () => void;
}

export default function ServiceConsultModal({ open, role, label, onClose }: ServiceConsultModalProps) {
  const lang = useAuthStore((s) => s.lang);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await client.post(`/messages/service-consult/${role}`, { content: text.trim() });
      setSent(true);
      setText('');
      setTimeout(() => { onClose(); setSent(false); }, 2000);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!sending) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-teal-500 modal-mobile" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            {role === 'inspector' ? '🔬' : '🛡️'}
            {label} {lang === 'en' ? 'Consultation' : '咨询'}
          </h3>
          <button onClick={() => { onClose(); setSent(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        {sent ? (
          <div className="text-center py-6 text-green-600 text-sm font-medium">
            {lang === 'en' ? '✅ Your inquiry has been submitted, please check your inbox' : '✅ 您的咨询已提交，请留意收件箱回复'}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              {lang === 'en'
                ? `You will be connected to a ${label} provider via internal message. The first inquiry will also be sent by email.`
                : `系统将随机为您联系一位${label}服务人员，通过站内信沟通。首次咨询将同步发送邮件通知对方。`}
            </p>
            <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
              placeholder={lang === 'en' ? `Enter your ${label} requirements...` : `请输入您的${label}需求...`}
              value={text} onChange={e => setText(e.target.value)} disabled={sending} autoFocus />
            <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleSend} disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {lang === 'en' ? `Submit ${label} Inquiry` : `提交${label}咨询`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
