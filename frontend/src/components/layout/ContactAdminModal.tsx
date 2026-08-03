import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';

interface ContactAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactAdminModal({ open, onClose }: ContactAdminModalProps) {
  const lang = useAuthStore((s) => s.lang);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await client.post('/messages/contact-admin', { content: text.trim() });
      setSent(true);
      setText('');
      setTimeout(() => { onClose(); setSent(false); }, 2000);
    } catch { alert(lang === 'en' ? 'Send failed, please retry' : '发送失败，请重试'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!sending) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500 modal-mobile" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-base">
            {lang === 'en' ? '📨 Contact Admin' : '📨 联系管理员'}
          </h3>
          <button onClick={() => { onClose(); setSent(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        {sent ? (
          <div className="text-center py-6 text-green-600 text-sm font-medium">
            {lang === 'en' ? '✅ Message sent to admin, please wait for reply' : '✅ 消息已发送给管理员，请等待回复'}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              {lang === 'en'
                ? 'Having issues? Send a message and the admin will reply in your inbox.'
                : '遇到问题或需要帮助？发送消息给管理员，管理员将在收件箱中回复您。'}
            </p>
            <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
              placeholder={lang === 'en' ? 'Enter your question or suggestion...' : '请输入您的问题或建议...'}
              value={text} onChange={e => setText(e.target.value)} disabled={sending} autoFocus />
            <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleSend} disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {lang === 'en' ? 'Send to Admin' : '发送给管理员'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
