import { useState, useEffect, useRef } from 'react';
import { cargoApi } from '../../api/cargo.api';
import { BarChart3, Eye, MessageSquare, FileText, TrendingUp, TrendingDown, Loader2, Plane, MapPin, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

export default function ForwarderStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartCompact, setChartCompact] = useState(false);
  const [airItems, setAirItems] = useState<any[]>([]);
  const [airLoading, setAirLoading] = useState(true);
  const [routeCollapsed, setRouteCollapsed] = useState(true);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargoApi.myStats().then(setData).catch((err) => { console.warn('[ForwarderStats] failed to load stats:', err); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargoApi.myAirItems().then(r => setAirItems(r.data || [])).catch((err) => { console.warn('[ForwarderStats] failed to load air items:', err); }).finally(() => setAirLoading(false));
  }, []);

  // 自动轮播（每 3.5 秒滚动一次）
  useEffect(() => {
    if (airItems.length === 0) return;
    const timer = setInterval(() => {
      if (!marqueeRef.current) return;
      const el = marqueeRef.current;
      const maxScroll = el.scrollWidth / 2; // 因为复制了一份，只用滚一半
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 312, behavior: 'smooth' }); // 卡片宽(224)+gap(16)≈240，略多
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [airItems]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setChartCompact(true);
    }
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (!data) return null;

  const statCards = [
    { label: '推广总数', value: data.totalRecords, icon: FileText, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: '有效推广', value: data.activeRecords, icon: TrendingUp, bg: 'bg-green-50', text: 'text-green-600' },
    { label: '累计浏览', value: data.totalViews, icon: Eye, bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: '累计询价', value: data.totalInquiries, icon: MessageSquare, bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  const routeStats = data.routeStats || [];
  const sortedRoutes = [...routeStats].sort((a: any, b: any) => b.views - a.views);

  return (
    <>
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary-600" />
        <h3 className="font-semibold text-gray-900">我的推广统计</h3>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-lg p-3 text-center`}>
            <card.icon className={`w-5 h-5 mx-auto mb-1 ${card.text}`} />
            <div className={`text-2xl font-bold ${card.text}`}>{card.value}</div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 航线分析表 — 默认折叠 */}

      {/* 航线分析表 — 默认折叠 */}
      {sortedRoutes.length > 0 && (
        <div>
          <button
            onClick={() => setRouteCollapsed(!routeCollapsed)}
            className="flex items-center gap-2 mb-3 w-full text-left"
          >
            <TrendingDown className="w-4 h-4 text-gray-500" />
            <h4 className="text-xs font-medium text-gray-500">航线维度分析（按浏览量排序）</h4>
            <span className={`ml-auto text-gray-400 transition-transform ${routeCollapsed ? '' : 'rotate-180'}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
          {!routeCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">航线</th>
                  <th className="pb-2 font-medium">航司</th>
                  <th className="pb-2 font-medium text-right">浏览</th>
                  <th className="pb-2 font-medium text-right">询价</th>
                  <th className="pb-2 font-medium text-right">转化率</th>
                  <th className="pb-2 font-medium text-right">状态</th>
                </tr>
              </thead>
              <tbody>
                {sortedRoutes.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 pr-2">
                      <span className="font-medium text-gray-800">{item.route}</span>
                    </td>
                    <td className="py-2 pr-2">
                      {item.airline && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 font-mono text-[10px]">
                          {item.airline}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-purple-600 font-medium">{item.views}</td>
                    <td className="py-2 pr-2 text-right text-amber-600 font-medium">{item.inquiries}</td>
                    <td className="py-2 pr-2 text-right">
                      <span className={`font-medium ${parseInt(item.conversion) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {item.conversion}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        item.status === '有效' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      )}

      {/* ── 社区推广轮播 ── */}
      {!airLoading && airItems.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary-600" />
            <h4 className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">社区推广信息</h4>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 via-white to-amber-50 border border-gray-200">
            {/* 渐变遮罩 — 左右边缘淡出 */}
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-blue-50/80 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-amber-50/80 to-transparent pointer-events-none" />

            <div
              ref={marqueeRef}
              className="flex gap-4 py-4 px-4 overflow-x-auto scrollbar-hide"
              style={{ scrollBehavior: 'smooth', msOverflowStyle: 'none', scrollbarWidth: 'none' }}
              onMouseEnter={() => { if (marqueeRef.current) marqueeRef.current.style.animationPlayState = 'paused'; }}
              onMouseLeave={() => { if (marqueeRef.current) marqueeRef.current.style.animationPlayState = 'running'; }}
            >
              {/* 复制两份实现无缝循环 */}
              {[...airItems, ...airItems].map((item, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-56 bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-1.5">
                    <span className="text-primary-700">{item.origin_port || '?'}</span>
                    <span className="text-gray-300 mx-0.5">✈️</span>
                    <span>{item.dest_port || '?'}</span>
                    {item.airline_code && (
                      <span className="ml-auto inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-100 text-primary-700">
                        {item.airline_code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 min-h-[2em]">
                    {item.notes?.substring(0, 80) || '暂无描述'}
                  </p>
                  {item.valid_from && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{dayjs(item.valid_from).format('MM-DD')} ~ {dayjs(item.valid_to).format('MM-DD')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-1 mt-2">
            <button
              className="text-[10px] text-gray-400 hover:text-primary-600 transition-colors px-2 py-0.5 rounded bg-gray-50 hover:bg-primary-50"
              onClick={() => {
                if (!marqueeRef.current) return;
                marqueeRef.current.scrollBy({ left: -300, behavior: 'smooth' });
              }}
            >
              ◀ 左移
            </button>
            <button
              className="text-[10px] text-gray-400 hover:text-primary-600 transition-colors px-2 py-0.5 rounded bg-gray-50 hover:bg-primary-50"
              onClick={() => {
                if (!marqueeRef.current) return;
                marqueeRef.current.scrollBy({ left: 300, behavior: 'smooth' });
              }}
            >
              右移 ▶
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
