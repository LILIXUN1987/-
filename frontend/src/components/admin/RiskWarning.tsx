import { useState, useEffect, useRef, useMemo } from 'react';
import client from '../../api/client';
import { Shield, ShieldAlert, AlertTriangle, ExternalLink, Search, X } from 'lucide-react';

interface RiskAlert {
  id: string;
  target_company: string;
  complaint_count: number;
  status: string;
  created_at: string;
  processed_at: string;
}

export default function RiskWarning() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await client.get<{ data: RiskAlert[] }>('/risk-alerts/approved');
      setAlerts(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  // 过滤后的列表
  const filteredAlerts = useMemo(() => {
    if (!searchQuery.trim()) return alerts;
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter(a => a.target_company.toLowerCase().includes(q));
  }, [alerts, searchQuery]);

  // Auto scroll (只在无搜索且无悬停时滚动)
  useEffect(() => {
    if (!scrollRef.current || alerts.length === 0 || isPaused || searchQuery) return;
    const scrollEl = scrollRef.current;
    let direction = 1;
    const interval = setInterval(() => {
      if (isPaused || searchQuery) return;
      if (direction === 1 && scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight) {
        direction = -1;
      } else if (direction === -1 && scrollEl.scrollTop <= 0) {
        direction = 1;
      }
      scrollEl.scrollTop += direction;
    }, 80);
    return () => clearInterval(interval);
  }, [alerts, isPaused, searchQuery]);

  if (loading) return null;
  if (alerts.length === 0) return null;

  const displayList = searchQuery ? filteredAlerts : alerts;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
          <h3 className="font-semibold text-red-800 text-sm whitespace-nowrap">🚨 风险代理查询</h3>
        </div>
        <button
          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 flex-shrink-0"
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
          <span className={showSearch ? '' : 'font-bold'}>{showSearch ? '关闭搜索' : '搜索代理'}</span>
        </button>
      </div>

      {/* 搜索框 */}
      {showSearch && (
        <div className="relative mb-3">
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border-2 border-red-300 bg-red-50/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 placeholder-red-300"
            placeholder="🔍 输入公司名称搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 提示条 */}
      {searchQuery && (
        <div className="text-xs text-red-500 mb-2">
          已列入避雷名单 {filteredAlerts.length} 家 / 共 {alerts.length} 家
        </div>
      )}

      {!searchQuery && (
        <div className="text-xs text-red-500 mb-2">
          已列入避雷名单 {alerts.length} 家公司，合作前请先查询！
        </div>
      )}

      {/* 列表 */}
      <div
        ref={scrollRef}
        className="overflow-y-auto max-h-[200px] space-y-2 pr-1 scrollbar-thin"
        style={{ scrollBehavior: 'smooth' }}
      >
        {displayList.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            未找到匹配「{searchQuery}」的风险代理
          </div>
        ) : (
          displayList.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5 text-xs hover:bg-red-100 transition-colors cursor-default"
            >
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-red-800 text-sm leading-tight">{alert.target_company}</div>
                <div className="text-red-600 mt-0.5">
                  ⚠️ 被 <strong>{alert.complaint_count}</strong> 家公司投诉吐槽，存在严重风险
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <a
          href="/admin/complaints"
          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
        >
          查看全部吐槽详情 <ExternalLink className="w-3 h-3" />
        </a>
        {!showSearch && (
          <span className="text-xs text-gray-400">鼠标悬停暂停滚动</span>
        )}
      </div>
    </div>
  );
}
