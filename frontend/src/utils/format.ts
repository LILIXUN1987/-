import dayjs from 'dayjs';

/**
 * Format a number with locale string (e.g., 1,234,567.89)
 */
export function formatNumber(value: number | string, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '--';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a date string to readable format
 */
export function formatDate(date: string, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

/**
 * Format date range
 */
export function formatDateRange(from: string, to: string): string {
  return `${dayjs(from).format('YYYY/MM/DD')} ~ ${dayjs(to).format('YYYY/MM/DD')}`;
}

/**
 * Format currency with unit
 */
export function formatCurrency(value: number | null | undefined, currency = 'CNY'): string {
  if (value == null) return '--';
  return `${formatNumber(value)} ${currency}`;
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format cargo status to Chinese label
 */
export function formatCargoStatus(status: string): string {
  const map: Record<string, string> = {
    available: '可用',
    reserved: '已预定',
    expired: '已过期',
  };
  return map[status] || status;
}
