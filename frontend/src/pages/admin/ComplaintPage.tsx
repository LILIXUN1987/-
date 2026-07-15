import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { complaintsApi } from '../../api/complaints.api';
import ComplaintZone from '../../components/admin/ComplaintZone';
import { Search, Building2, AlertTriangle, Users, MessageSquare, X, Loader2, ChevronRight } from 'lucide-react';

export default function ComplaintPage() {
  const lang = useAuthStore((s) => s.lang);
  const [searchQ, setSearchQ] = useState('');
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['complaint-company-stats', query],
    queryFn: () => complaintsApi.companyStats(query || undefined),
    enabled: true,
  });

  const topComplained = data?.topComplained || [];
  const companyDetail = data?.companyDetail;

  const handleSearch = () => {
    setQuery(searchQ.trim());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ═══ 头部 ═══ */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {lang === 'en' ? '🛡️ Industry Blacklist' : '🛡️ 货代避雷针'}
        </h1>
        <p className="text-sm text-gray-500">
          {lang === 'en'
            ? 'Search companies and see community complaints. Stay informed, avoid scams.'
            : '查公司口碑，避合作雷坑。被投诉 ≥5 次自动触发风控预警。'}
        </p>
      </div>

      {/* ═══ 公司查询区 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Search className="w-4 h-4 text-primary-500" />
          {lang === 'en' ? '🔍 Look up a company' : '🔍 查一家货代'}
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              placeholder={lang === 'en' ? 'Enter company name to check reputation...' : '输入公司全称或关键词，查口碑...'}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button className="btn-primary text-sm px-5" onClick={handleSearch} disabled={!searchQ.trim()}>
            {lang === 'en' ? 'Search' : '查询'}
          </button>
        </div>

        {/* 搜索结果 */}
        {isLoading && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        )}

        {companyDetail && !isLoading && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                <span className="font-bold text-lg text-gray-900">{companyDetail.target_company}</span>
              </div>
              <button onClick={() => { setSearchQ(''); setQuery(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{companyDetail.total}</div>
                <div className="text-xs text-gray-500">{lang === 'en' ? 'Complaints' : '被投诉次数'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{companyDetail.distinct_complainers}</div>
                <div className="text-xs text-gray-500">{lang === 'en' ? 'Complainers' : '不同投诉方'}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${companyDetail.total >= 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {companyDetail.total >= 5 ? '⚠️' : '✅'}
                </div>
                <div className="text-xs text-gray-500">
                  {companyDetail.total >= 5
                    ? (lang === 'en' ? 'Risk Alert' : '已触发风控')
                    : (lang === 'en' ? 'Safe' : '暂未达阈值')}
                </div>
              </div>
            </div>
            {companyDetail.topReasons && companyDetail.topReasons.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-600 mb-1.5">{lang === 'en' ? 'Common issues:' : '常见问题：'}</div>
                <div className="flex flex-wrap gap-1.5">
                  {companyDetail.topReasons.map((r: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white border border-orange-200 rounded-full text-gray-700">
                      {r.reason} <span className="text-gray-400">×{r.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {companyDetail.complaints && companyDetail.complaints.length > 0 && (
              <details className="group">
                <summary className="text-xs text-primary-600 cursor-pointer hover:underline select-none">
                  {lang === 'en' ? `View all ${companyDetail.total} complaints` : `查看全部 ${companyDetail.total} 条吐槽`}
                </summary>
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {companyDetail.complaints.map((c: any) => (
                    <div key={c.id} className="bg-white rounded-lg p-3 border border-orange-100 text-sm">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <Users className="w-3 h-3" />
                        <span>{c.complaint_company} · {c.complaint_person}</span>
                        <span className="text-gray-300">→</span>
                        <span>{c.target_person}</span>
                      </div>
                      <p className="text-gray-700">{c.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {query && !isLoading && !companyDetail && (
          <div className="mt-4 text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl">
            {lang === 'en' ? 'No complaints found for this company' : '未找到该公司的投诉记录'}
          </div>
        )}
      </div>

      {/* ═══ 被投诉最多的公司 ═══ */}
      {topComplained.length > 0 && !companyDetail && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            {lang === 'en' ? '🔥 Most Complained Companies' : '🔥 被投诉最多的公司'}
          </h2>
          <div className="space-y-2">
            {topComplained.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    i < 3 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-gray-700">{item.company}</span>
                  {item.total >= 5 && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                      ⚠️ {lang === 'en' ? 'Alert' : '风控'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{item.total}{lang === 'en' ? ' complaints' : '次投诉'}</span>
                  <span>{item.distinct_complainers}{lang === 'en' ? ' sources' : '家来源'}</span>
                  <button
                    className="text-primary-500 hover:text-primary-700"
                    onClick={() => { setSearchQ(item.company); setQuery(item.company); }}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 已有吐槽列表 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          {lang === 'en' ? '📋 Recent Complaints' : '📋 最新吐槽'}
        </h2>
        <ComplaintZone />
      </div>
    </div>
  );
}
