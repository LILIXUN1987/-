/**
 * 将数据库时间（UTC）显示为中国北京时间（UTC+8）
 * SQLite 存储时不带时区，实际为UTC时间
 */
export function formatTime(isoOrDbTime: string, format = 'MM-DD HH:mm'): string {
  if (!isoOrDbTime) return '';

  // 如果已经是 ISO 格式（带T），直接解析
  let date = new Date(isoOrDbTime);

  // 如果解析失败或不是ISO格式，尝试当作UTC+0时间处理
  if (isNaN(date.getTime())) {
    date = new Date(isoOrDbTime + 'Z'); // 当作 UTC
  }

  // 加上 8 小时（北京时间）
  const beijing = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const pad = (n: number) => String(n).padStart(2, '0');
  const map: Record<string, string> = {
    'MM': pad(beijing.getMonth() + 1),
    'DD': pad(beijing.getDate()),
    'HH': pad(beijing.getHours()),
    'mm': pad(beijing.getMinutes()),
    'ss': pad(beijing.getSeconds()),
  };

  let result = format;
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(key, val);
  }
  return result;
}
