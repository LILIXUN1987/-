/**
 * 统一错误消息提取工具
 * 后端返回 { error: string, code: string } 格式，Axios 包装在 err.response.data 中。
 * 此函数遍历常见错误格式，返回可读的错误消息。
 *
 * 用法：
 *   import { extractError } from '../../utils/error';
 *   try { ... } catch (err) { toast.error(extractError(err, '操作失败')); }
 */

export function extractError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;

  const e = err as Record<string, unknown>;

  // Axios 包装：err.response?.data?.error
  const response = e.response as Record<string, unknown> | undefined;
  if (response?.data) {
    const data = response.data as Record<string, unknown>;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
  }

  // 直接 { error: string } 格式
  if (typeof e.error === 'string') return e.error;

  // 直接 { message: string } 格式
  if (typeof e.message === 'string') return e.message;

  return fallback;
}
