/**
 * Toast 轻量级全局通知组件
 * 用于替代 alert() 的用户反馈场景（成功/错误/警告/信息）
 *
 * 用法：
 *   import { toast } from '../../components/common/Toast';
 *   toast.success('保存成功');
 *   toast.error('操作失败，请重试');
 *   toast.warning('即将过期');
 *   toast.info('新消息');
 *
 * 需要在 App.tsx 或 AdminLayout 中挂载 <ToastContainer />
 */
import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';

// ── 类型 ──
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  leaving: boolean;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

// ── Context ──
const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ── 全局静态方法（方便在任何地方调用） ──
let globalAddToast: ((type: ToastType, message: string) => void) | null = null;

export const toast = {
  success: (msg: string) => globalAddToast?.('success', msg),
  error: (msg: string) => globalAddToast?.('error', msg),
  warning: (msg: string) => globalAddToast?.('warning', msg),
  info: (msg: string) => globalAddToast?.('info', msg),
};

// ── 样式映射 ──
const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-50', border: 'border-green-300', icon: '✅' },
  error:   { bg: 'bg-red-50',   border: 'border-red-300',   icon: '❌' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', icon: '⚠️' },
  info:    { bg: 'bg-blue-50',  border: 'border-blue-300',  icon: 'ℹ️' },
};

// ── 容器组件 ──
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, leaving: false }]);
    // 3 秒后开始消失动画
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      // 动画结束后移除
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  // 注册全局方法
  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${STYLES[t.type].bg} ${STYLES[t.type].border} ${
            t.leaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          <span className="text-base flex-shrink-0 mt-0.5">{STYLES[t.type].icon}</span>
          <span className="text-sm text-gray-800 flex-1 min-w-0 break-words">{t.message}</span>
          <button
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
