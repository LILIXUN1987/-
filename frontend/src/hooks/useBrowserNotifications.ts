import { useEffect, useRef } from 'react';
import { useUnreadStore } from '../store/unreadStore';
import { useAuthStore } from '../store/authStore';

async function showNotification(title: string, options: NotificationOptions) {
  // PWA 环境下必须用 Service Worker 的 showNotification
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification(title, options);
  } else if ('Notification' in window) {
    // 普通浏览器环境
    try {
      new Notification(title, options);
    } catch {
      // 某些浏览器不支持 Notification 构造函数
    }
  }
}

export function useBrowserNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useUnreadStore((s) => s.count);
  const prevCountRef = useRef(unreadCount);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('Notification' in window) && !('serviceWorker' in navigator)) return;

    // 请求权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const prev = prevCountRef.current;
    prevCountRef.current = unreadCount;

    if (notifiedRef.current && unreadCount > prev && unreadCount > 0 && Notification.permission === 'granted') {
      const diff = unreadCount - prev;
      showNotification('📬 新消息', {
        body: diff === 1 ? `您有 1 条未读消息` : `您有 ${diff} 条新消息`,
        icon: '/vite.svg',
        tag: 'new-message',
      });
    }

    notifiedRef.current = true;
  }, [isAuthenticated, unreadCount]);
}
