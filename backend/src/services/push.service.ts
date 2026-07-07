import webpush from 'web-push';
import db from '../config/database';
import logger from '../utils/logger';

// 生成 VAPID 密钥（首次运行）
const VAPID_PUBLIC_KEY = 'BLn6aCkPBdk8ZqzCjCRBAPyQJ60dD-eK55PjJPfOWF8byo3LDQ6q4bHE2vAH3LJ_y8nbRRWzAKXgFi6tKmhqVXM';
const VAPID_PRIVATE_KEY = '1bN8oXfSJCNdR6vYTy6NH7GgPq5Zm3wKxL9jF2cVt0A';

webpush.setVapidDetails(
  'mailto:support@tiangaocargo.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

export { VAPID_PUBLIC_KEY };

/**
 * 保存用户的推送订阅信息
 */
export async function saveSubscription(userId: string, subscription: PushSubscriptionJSON): Promise<void> {
  try {
    // 删除旧订阅
    await db('push_subscriptions').where({ user_id: userId }).delete();
    // 写入新订阅
    await db('push_subscriptions').insert({
      user_id: userId,
      endpoint: subscription.endpoint || '',
      p256dh_key: subscription.keys?.p256dh || '',
      auth_key: subscription.keys?.auth || '',
      created_at: db.fn.now(),
    });
  } catch (err) {
    logger.error('保存推送订阅失败:', err);
  }
}

/**
 * 向指定用户发送推送通知
 */
export async function sendPushNotification(userId: string, title: string, body: string, url?: string): Promise<void> {
  try {
    const subs = await db('push_subscriptions')
      .where({ user_id: userId })
      .select('endpoint', 'p256dh_key', 'auth_key');

    for (const sub of subs) {
      if (!sub.endpoint) continue;
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        }, JSON.stringify({ title, body, tag: 'new-message', url: url || '/admin/inbox' }));
      } catch (err: any) {
        // 订阅过期（410 Gone）→ 删除
        if (err.statusCode === 410) {
          await db('push_subscriptions').where({ endpoint: sub.endpoint }).delete();
        }
      }
    }
  } catch (err) {
    logger.error('发送推送通知失败:', err);
  }
}
