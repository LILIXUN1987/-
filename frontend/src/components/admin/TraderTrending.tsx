import { useState, useEffect } from 'react';
import client from '../../api/client';
import { TrendingUp, Clock, Plane, Loader2 } from 'lucide-react';

export default function TraderTrending() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    client.get('/cargo-spaces/trending').then(r => setData(r.data)).catch((err) => { console.warn('[TraderTrending] failed to load trending:', err); });
  }, []);

  if (!data?.hotSearches?.length && !data?.latest?.length) return null;

  return (
    <div className="space-y-3">
      {/* 热门搜索 */}
      {data.hotSearches?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-medium text-gray-500">🔥 本周热门搜索 Top 10</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.hotSearches.map((item: any, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full">
                {item.keyword?.substring(0, 25)}
                <span className="text-orange-400 text-[10px] font-medium">{item.cnt}次</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 最新推广 */}
      {data.latest?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-medium text-gray-500">📦 最新推广信息</h3>
          </div>
          <div className="space-y-1.5">
            {data.latest.map((item: any, i: number) => (
              <div key={item.id || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Plane className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-800">{item.origin_port || '?'}</span>
                  <span className="text-gray-300">→</span>
                  <span className="text-gray-700 truncate">{(item.dest_port || '?').substring(0, 18)}</span>
                  {item.airline_code && (
                    <span className="px-1 py-0.5 rounded bg-primary-50 text-primary-600 font-mono text-[10px]">{item.airline_code}</span>
                  )}
                </div>
                <span className="text-gray-400 flex-shrink-0 text-[10px] ml-2">{(item.created_at || '').substring(5, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
