import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { riskAlertApi, RiskAlert } from '../../api/riskalert.api';
import {
  Shield, ShieldCheck, ShieldX, Check, X, Loader2,
  AlertTriangle, RefreshCw, Trash2,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';

type TabKey = 'pending' | 'history';

export default function RiskCenterPage() {
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<RiskAlert[]>([]);
  const [history, setHistory] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  // 审批确认弹窗
  const [approveTarget, setApproveTarget] = useState<RiskAlert | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RiskAlert | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([riskAlertApi.pending(), riskAlertApi.history()]);
      setPending(p.data);
      setHistory(h.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async () => {
    if (!approveTarget) return;
    setProcessing(approveTarget.id);
    try {
      const r = await riskAlertApi.approve(approveTarget.id);
      alert(`✅ 已批准，提醒通知已发送给 ${r.total_recipients} 位用户`);
      setApproveTarget(null);
      fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '操作失败');
    }
    setProcessing(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget.id);
    try {
      await riskAlertApi.reject(rejectTarget.id);
      setRejectTarget(null);
      fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.error || '操作失败');
    }
    setProcessing(null);
  };

  const rc = getRoleChecks(user?.role);
  if (!rc.isAdmin) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-base">仅管理员可访问风控中心</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── 标题 ── */}
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-7 h-7 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">风控中心</h1>
          <p className="text-sm text-gray-500">管理被多次投诉的公司风险预警</p>
        </div>
        <button className="ml-auto btn-outline text-sm flex items-center gap-1" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-4 mb-4 border-b border-gray-200">
        <button
          className={`pb-3 text-sm font-medium transition-colors ${tab === 'pending' ? 'text-red-600 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('pending')}
        >
          待审批
          {pending.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs rounded-full">{pending.length}</span>}
        </button>
        <button
          className={`pb-3 text-sm font-medium transition-colors ${tab === 'history' ? 'text-red-600 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setTab('history')}
        >
          处理记录
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">暂无待审批预警</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border-2 border-red-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <h3 className="font-semibold text-gray-900">{item.target_company}</h3>
                    </div>
                    <div className="bg-red-50 rounded-lg px-3 py-2 text-sm text-red-700 mb-3">
                      ⚠️ 已被 <strong className="text-lg">{item.complaint_count}</strong> 家不同公司用户投诉吐槽，建议群发提醒通知
                    </div>
                    <div className="text-xs text-gray-400">
                      触发时间：{formatTime(item.created_at, 'YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="inline-flex items-center gap-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2.5 transition-colors shadow-sm"
                      onClick={() => setApproveTarget(item)}
                      disabled={processing === item.id}
                    >
                      {processing === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      批准群发
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2.5 transition-colors"
                      onClick={() => setRejectTarget(item)}
                      disabled={processing === item.id}
                    >
                      <X className="w-4 h-4" />
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-16 text-gray-400"><p>暂无处理记录</p></div>
          ) : (
            history.map(item => (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{item.target_company}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.complaint_count} 家公司投诉 | {formatTime(item.created_at, 'MM-DD HH:mm')}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  item.status === 'approved' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.status === 'approved' ? <Shield className="w-3 h-3" /> : <ShieldX className="w-3 h-3" />}
                  {item.status === 'approved' ? '已群发' : '已拒绝'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 批准确认弹窗 ── */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!processing) setApproveTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">批准群发提醒通知</h3>
                <p className="text-xs text-gray-500 mt-0.5">此操作将向所有用户发送 3 轮警告</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-semibold text-red-800">{approveTarget.target_company}</div>
              <div className="text-red-600 mt-1">已被 {approveTarget.complaint_count} 家公司投诉</div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              批准后系统将向所有注册群友发送连续3遍的提醒通知站内信，确认继续？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setApproveTarget(null)} disabled={!!processing}>取消</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5" onClick={handleApprove} disabled={!!processing}>
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                确认群发
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 拒绝确认弹窗 ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!processing) setRejectTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-gray-400" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ShieldX className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">拒绝预警</h3>
                <p className="text-xs text-gray-500 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              确定拒绝针对 <span className="font-semibold">{rejectTarget.target_company}</span> 的风险预警吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setRejectTarget(null)} disabled={!!processing}>取消</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1.5" onClick={handleReject} disabled={!!processing}>
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
