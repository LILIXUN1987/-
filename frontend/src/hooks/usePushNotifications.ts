import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';

const VAPID_PUBLIC_KEY = 'BLn6aCkPBdk8ZqzCjCRBAPyQJ60dD-eK55PjJPfOWF8byo3LDQ6q4bHE2vAH3LJ_y8nbRRWzAKXgFi6tKmhqVXM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let subscribed = false;

    async function register() {
      try {
        // 注册 Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // 等待活跃
        await navigator.serviceWorker.ready;

        // 检查已有订阅
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // 已有订阅，只需确认
          subscribed = true;
          return;
        }

        // 新建订阅
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });

        // 发送到后端
        await client.post('/push/subscribe', {
          subscription: subscription.toJSON(),
        });
        subscribed = true;
      } catch (err) {
        // 用户拒绝权限或浏览器不支持，静默失败
        console.debug('Push notification subscription failed:', err);
      }
    }

    register();

    return () => {
      // 登出时不清除订阅（保留通知能力）
    };
  }, [isAuthenticated]);
}
