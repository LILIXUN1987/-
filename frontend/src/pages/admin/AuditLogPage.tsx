import { useState, useEffect } from 'react';
import client from '../../api/client';
import { formatTime } from '../../utils/time';
import { Loader2, ClipboardList, Search, Filter } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  'dg_case_approved': '走货实例 - 批准发布',
  'dg_case_rejected': '走货实例 - 驳回',
  'dg_agent_approved': '危险品代理 - 通过',
  'dg_agent_rejected': '危险品代理 - 驳回',
};

const ACTION_COLORS: Record<string, string> = {
  'dg_case_approved': 'bg-green-100 text-green-700',
  'dg_case_rejected': 'bg-red-100 text-red-700',
  'dg_agent_approved': 'bg-green-100 text-green-700',
  'dg_agent_rejected': 'bg-red-100 text-red-700',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 30 };
      if (filterAction) params.action = filterAction;
      const res = await client.get('/audit-logs', { params });
      setLogs(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, filterAction]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审核日志</h1>
          <p className="text-sm text-gray-500 mt-0.5">查看所有管理员审核操作记录</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
          value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
          <option value="">全部操作</option>
          <option value="dg_case_approved">走货实例 - 批准发布</option>
          <option value="dg_case_rejected">走货实例 - 驳回</option>
          <option value="dg_agent_approved">危险品代理 - 通过</option>
          <option value="dg_agent_rejected">危险品代理 - 驳回</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">共 {total} 条记录</span>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">暂无审核日志</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600">
                  操作人：<strong>{log.operator_name || '管理员'}</strong>
                  {log.target_name && <span> · 目标：{log.target_name}</span>}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{formatTime(log.created_at, 'MM-DD HH:mm')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
          <span className="text-xs text-gray-500">第 {page}/{totalPages} 页</span>
          <div className="flex gap-1">
            <button className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
            <button className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
          </div>
        </div>
      )}
    </div>
  );
}
