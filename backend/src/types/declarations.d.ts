/** 第三方模块缺少类型声明 */
declare module 'web-push';
declare module 'compression';

/** Push API subscription type */
interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}
