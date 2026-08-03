import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useLang, t, getCountryEmoji } from './shared';
import type { DDPStatsResponse } from '../../../api/ddp.api';
import {
  MessageSquare, Users, Clock, TrendingUp, Loader2, RefreshCw,
} from 'lucide-react';

const T = {
  statsTotalInquiries: { zh: '累计询价', en: 'Total Inquiries' },
  statsTotalAgents: { zh: '入驻代理', en: 'Registered Agents' },
  statsPending: { zh: '待审核', en: 'Pending Review' },
  statsHotTitle: { zh: '热门询价目的地 TOP 10', en: 'Hot Inquiry Destinations TOP 10' },
  statsNoInquiries: { zh: '暂无询价记录', en: 'No inquiry records' },
  statsAgentDist: { zh: '代理分布', en: 'Agent Distribution' },
  statsNoAgents: { zh: '暂无代理入驻', en: 'No agents registered' },
  statsRefresh: { zh: '刷新数据', en: 'Refresh' },
  times: { zh: '次', en: ' times' },
  count: { zh: '家', en: ' agents' },
};

export default function StatsTab() {
  const lang = useLang();
  const [stats, setStats] = useState<DDPStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await client.get<DDPStatsResponse>('/ddp/stats');
      setStats(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!stats) return <div className="text-center py-12 text-gray-400 text-sm">{t(T.statsNoInquiries, lang)}</div>;

  const maxInquiryCount = Math.max(...stats.inquiryStats.map(s => s.count), 1);
  const maxAgentCount = Math.max(...stats.agentStats.map(s => s.count), 1);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: T.statsTotalInquiries, value: stats.overview.totalInquiries, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: T.statsTotalAgents, value: stats.overview.totalAgents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: T.statsPending, value: stats.overview.pendingAgents, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label.zh} className={`${card.bg} rounded-xl p-4 text-center border border-gray-100`}>
            <card.icon className={`w-5 h-5 mx-auto mb-1.5 ${card.color}`} />
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t(card.label, lang)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />{t(T.statsHotTitle, lang)}
          </h3>
          {stats.inquiryStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">{t(T.statsNoInquiries, lang)}</div>
          ) : (
            <div className="space-y-2">
              {stats.inquiryStats.slice(0, 10).map((item, idx) => (
                <div key={item.country} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{idx + 1}</span>
                  <span className="text-sm">{getCountryEmoji(item.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{item.country}</span>
                      <span className="text-xs font-bold text-blue-600">{item.count}{t(T.times, lang)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(item.count / maxInquiryCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />{t(T.statsAgentDist, lang)}
          </h3>
          {stats.agentStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">{t(T.statsNoAgents, lang)}</div>
          ) : (
            <div className="space-y-2">
              {stats.agentStats.map((item, idx) => (
                <div key={item.country} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{idx + 1}</span>
                  <span className="text-sm">{getCountryEmoji(item.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{item.country}</span>
                      <span className="text-xs font-bold text-emerald-600">{item.count}{t(T.count, lang)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(item.count / maxAgentCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-right">
        <button className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1" onClick={fetchStats}>
          <RefreshCw className="w-3 h-3" /> {t(T.statsRefresh, lang)}
        </button>
      </div>
    </div>
  );
}
