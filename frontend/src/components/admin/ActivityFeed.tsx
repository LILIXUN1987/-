import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';

interface Activity {
  type: 'search' | 'inquiry' | 'chat';
  text: string;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<Activity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    client.get('/activity-feed').then((r: any) => {
      if (r.data?.data?.length) setItems(r.data.data);
    }).catch((err) => { console.warn('[ActivityFeed] failed to load activity feed:', err); });
  }, []);

  if (items.length === 0) return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="text-sm font-semibold text-primary-600 whitespace-nowrap flex-shrink-0 bg-white rounded-full px-3 py-1 shadow-sm border border-primary-200">⚡ 实时动态</span>
        <span className="text-xs text-gray-400">⏳ 暂无最新动态，请稍候...</span>
      </div>
    </div>
  );

  const iconMap: Record<string, string> = { search: '🔍', inquiry: '📢', chat: '💬' };

  const content = items.map(i => `${iconMap[i.type] || '📌'} ${i.text}`).join('  ·  ');

  return (
    <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 border border-blue-200 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-4 overflow-hidden">
        <span className="text-sm font-semibold text-primary-600 whitespace-nowrap flex-shrink-0 bg-white rounded-full px-3 py-1 shadow-sm border border-primary-200">
          ⚡ 实时动态
        </span>
        <div className="overflow-hidden flex-1 relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 30px, black calc(100% - 30px), transparent)' }}>
          <div
            ref={containerRef}
            className="whitespace-nowrap"
            style={{
              animation: `marquee ${Math.max(6, items.length * 0.8)}s linear infinite`,
            }}
            onMouseEnter={() => { if (containerRef.current) containerRef.current.style.animationPlayState = 'paused'; }}
            onMouseLeave={() => { if (containerRef.current) containerRef.current.style.animationPlayState = 'running'; }}
          >
            <span className="inline-block text-sm text-gray-700">{content}</span>
            <span className="inline-block text-sm text-gray-700 ml-8">{content}</span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
