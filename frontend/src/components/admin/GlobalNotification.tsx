import { useEffect, useRef, useState } from 'react';
import { messagesApi } from '../../api/messages.api';
import { useUnreadStore } from '../../store/unreadStore';
import { useNavigate } from 'react-router-dom';
import { Mail, X } from 'lucide-react';

export default function GlobalNotification() {
  const navigate = useNavigate();
  const setGlobalUnread = useUnreadStore((s) => s.setCount);
  const setLastMessage = useUnreadStore((s) => s.setLastMessage);
  const clearNewFlag = useUnreadStore((s) => s.clearNewFlag);
  const hasNew = useUnreadStore((s) => s.hasNew);
  const lastSender = useUnreadStore((s) => s.lastSender);
  const [toastVisible, setToastVisible] = useState(false);
  const prevUnread = useRef(0);
  const [toastData, setToastData] = useState({ sender: '', content: '' });

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const data = await messagesApi.inbox();
        setGlobalUnread(data.unread);

        // 新消息到达 → 更新最后一次消息并弹出toast
        if (data.unread > prevUnread.current && prevUnread.current > 0 && data.data.length > 0) {
          const latest = data.data[0];
          const sender = [latest.sender_company, latest.sender_name].filter(Boolean).join(' ');
          setLastMessage(sender, latest.content);
          setToastData({ sender, content: latest.content });
          setToastVisible(true);

          // 浏览器通知（PWA 兼容）
          if (Notification.permission === 'granted') {
            const show = async () => {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const reg = await navigator.serviceWorker.ready;
                reg.showNotification('📬 123共享外贸物流社区', { body: `${sender} 给您发了一条消息` });
              } else {
                try { new Notification('📬 123共享外贸物流社区', { body: `${sender} 给您发了一条消息` }); } catch {}
              }
            };
            show();
          }
          // 提示音
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
          } catch {}
        }
        prevUnread.current = data.unread;
      } catch {}
    };

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    fetchInbox();
    const timer = setInterval(fetchInbox, 10000);
    return () => clearInterval(timer);
  }, []);

  // 3秒后自动隐藏toast
  useEffect(() => {
    if (toastVisible) {
      const t = setTimeout(() => setToastVisible(false), 5000);
      return () => clearTimeout(t);
    }
  }, [toastVisible]);

  return (
    <>
      {/* 底部右侧Toast通知 */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-slide-up">
          <div className="bg-white rounded-xl shadow-2xl border-l-4 border-red-500 p-4 flex gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{toastData.sender || '新消息'}</p>
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{toastData.content}</p>
              <button
                className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                onClick={() => { setToastVisible(false); clearNewFlag(); navigate('/admin/inbox'); }}
              >
                查看详情 →
              </button>
            </div>
            <button
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              onClick={() => { setToastVisible(false); clearNewFlag(); }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
