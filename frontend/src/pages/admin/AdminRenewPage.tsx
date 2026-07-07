import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  CreditCard, Plus, Save, Trash2, Loader2, Search,
  CheckCircle, Clock, AlertTriangle, AlertCircle, X,
  ExternalLink, Copy, Smartphone,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import { getRoleChecks } from '../../types';
import { getRoleLabel } from '../../utils/roles';

interface Plan {
  id: string; name: string; days: number; price: number; is_active: boolean;
}

interface UserItem {
  username: string; display_name: string; company_name: string; role: string; trial_end: string | null;
}

interface RenewalRecord {
  id: string; days: number; amount: number; remark: string;
  user_name: string; username: string; company_name: string; creator_name: string; created_at: string;
}

type TabKey = 'self' | 'plans' | 'renew' | 'records';

export default function AdminRenewPage() {
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const myRole = user?.role || '';
  const myTrialEnd = user?.trial_end || '';

  // 非管理员默认跳到自助续期
  const [tab, setTab] = useState<TabKey>(isAdmin ? 'plans' : 'self');

  // ── 自助续期 ──
  const [selfPlans, setSelfPlans] = useState<(Plan & { selected?: boolean })[]>([]);
  const [selfLoading, setSelfLoading] = useState(true);
  const [alipayConfigured, setAlipayConfigured] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState('');
  const [payOrderId, setPayOrderId] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [payError, setPayError] = useState('');

  // 当前用户续期记录
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // ── 管理员：套餐管理 ──
  const [plans, setPlans] = useState<Plan[]>([]);
  const [records, setRecords] = useState<RenewalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', days: 30, price: 0, is_active: true });
  const [userQuery, setUserQuery] = useState('');
  const [userList, setUserList] = useState<UserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewAmount, setRenewAmount] = useState(0);
  const [renewRemark, setRenewRemark] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── 加载套餐列表（自助） ──
  useEffect(() => {
    if (tab !== 'self') return;
    setSelfLoading(true);
    client.get('/payment/plans').then((r: any) => {
      setSelfPlans((r.data?.data || []).map((p: Plan) => ({ ...p })));
      setAlipayConfigured(r.data?.alipay_configured || false);
    }).catch((err) => { console.warn('[AdminRenewPage] failed to load plans:', err); }).finally(() => setSelfLoading(false));
  }, [tab]);

  // ── 加载我的订单 ──
  useEffect(() => {
    if (tab !== 'self') return;
    client.get('/payment/my-orders').then((r: any) => {
      setMyOrders(r.data?.data || []);
    }).catch((err) => { console.warn('[AdminRenewPage] failed to load orders:', err); });
  }, [tab, paySuccess]);

  // ── 管理员数据加载 ──
  useEffect(() => {
    if (tab === 'plans') loadPlans();
    else if (tab === 'records') loadRecords();
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!userQuery.trim()) { setUserList([]); return; }
      try { const r = await client.get<{ data: UserItem[] }>('/admin/users?q=' + encodeURIComponent(userQuery)); setUserList(r.data.data || []); } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [userQuery]);

  const loadPlans = async () => {
    setLoading(true);
    try { const r = await client.get<{ data: Plan[] }>('/admin/plans'); setPlans(r.data.data || []); } catch {}
    setLoading(false);
  };
  const loadRecords = async () => {
    setLoading(true);
    try { const r = await client.get<{ data: RenewalRecord[] }>('/admin/renewal-records'); setRecords(r.data.data || []); } catch {}
    setLoading(false);
  };

  // ── 创建支付 ──
  const handlePay = async (planId: string) => {
    setPayLoading(true);
    setPayError('');
    setPayUrl('');
    setPaySuccess(false);
    try {
      const r = await client.post('/payment/create-order', { plan_id: planId });
      setPayUrl(r.data.pay_url);
      setPayOrderId(r.data.order_id);
      // 新窗口打开支付宝
      window.open(r.data.pay_url, '_blank');
      // 开始轮询
      pollOrder(r.data.order_id);
    } catch (err: any) {
      setPayError(err?.response?.data?.error || '创建订单失败');
    } finally { setPayLoading(false); }
  };

  const pollOrder = (orderId: string) => {
    const timer = setInterval(async () => {
      try {
        const r = await client.get(`/payment/query/${orderId}`);
        if (r.data.status === 'paid') {
          setPaySuccess(true);
          clearInterval(timer);
        }
      } catch {}
    }, 3000);
    // 5分钟后停止轮询
    setTimeout(() => clearInterval(timer), 300000);
  };

  const copyPayUrl = () => {
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── 管理员函数 ──
  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.days) return;
    try {
      const payload = editPlan ? { ...planForm, id: editPlan.id } : planForm;
      await client.post('/admin/plans/save', payload);
      setSuccess('套餐已保存'); setEditPlan(null);
      setPlanForm({ name: '', days: 30, price: 0, is_active: true });
      loadPlans(); setTimeout(() => setSuccess(''), 3000);
    } catch { setError('保存失败'); }
  };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try { await client.delete('/admin/plans/' + deleteTarget.id); setDeleteTarget(null); loadPlans(); } catch {}
    setIsDeleting(false);
  };
  const handleRenew = async () => {
    if (!selectedUser || !renewDays) return;
    setRenewing(true); setError('');
    try {
      const r = await client.post('/admin/renew', {
        username: selectedUser.username, days: renewDays, amount: renewAmount, remark: renewRemark,
      });
      setSuccess(r.data.message || '续期成功');
      setSelectedUser(null); setUserQuery(''); setUserList([]); setRenewDays(30); setRenewAmount(0); setRenewRemark('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: any) { setError(e?.response?.data?.error || '续期失败'); } finally { setRenewing(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">会员续期</h1>
          <p className="text-sm text-gray-500">
            {tab === 'self' ? '选择套餐，支付宝扫码自助续期' : '管理员手动续期（替代支付的过渡方案）'}
          </p>
        </div>
      </div>

      {/* ── 标签导航（管理员看到全部，普通用户只看到自助续期） ── */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-xl flex-wrap">
        {([
          { key: 'self' as const, label: '💳 自助续期' },
          ...(isAdmin ? [
            { key: 'plans' as const, label: '📋 套餐管理' },
            { key: 'renew' as const, label: '✏️ 手动续期' },
            { key: 'records' as const, label: '📜 续期记录' },
          ] : []),
        ]).map(t => (
          <button key={t.key}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {success && <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3 mb-4"><CheckCircle className="w-4 h-4" />{success}</div>}
      {error && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* ════════════════════════════════════════════ */}
      {/* 💳 自助续期 */}
      {/* ════════════════════════════════════════════ */}
      {tab === 'self' && (
        <div>
          {/* 当前状态 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">当前角色：<strong className="text-gray-700">
                  {getRoleLabel(myRole, 'zh')}
                </strong></p>
                <p className="text-sm text-gray-500 mt-1">
                  会员有效期至：
                  <strong className={myTrialEnd && new Date(myTrialEnd + 'T23:59:59') < new Date() ? 'text-red-600' : 'text-green-600'}>
                    {myTrialEnd ? myTrialEnd : '永久有效'}
                  </strong>
                  {myTrialEnd && new Date(myTrialEnd + 'T23:59:59') < new Date() && (
                    <span className="ml-2 text-red-500 text-xs">（已过期，请续期）</span>
                  )}
                </p>
              </div>
              {alipayConfigured && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">✅ 支付宝已就绪</span>
              )}
            </div>
          </div>

          {/* 套餐选择 */}
          {selfLoading ? (
            <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : !alipayConfigured ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
              <CreditCard className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-amber-800 mb-2">支付系统正在配置中</h3>
              <p className="text-sm text-amber-600">支付宝支付功能暂未开放，请联系管理员办理续期</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {selfPlans.map(p => (
                <div key={p.id}
                  className={`bg-white rounded-xl shadow-sm border-2 p-5 cursor-pointer transition-all hover:shadow-md ${
                    selectedPlanId === p.id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
                  }`}
                  onClick={() => { setSelectedPlanId(p.id); setPayUrl(''); setPaySuccess(false); setPayError(''); }}
                >
                  <div className="text-lg font-bold text-gray-900 mb-1">{p.name}</div>
                  <div className="text-3xl font-bold text-primary-600 mb-2">¥{Number(p.price).toFixed(0)}</div>
                  <div className="text-sm text-gray-500">{p.days} 天</div>
                  <div className="text-xs text-gray-400 mt-1">折合 ¥{(Number(p.price) / p.days).toFixed(1)}/天</div>
                  {selectedPlanId === p.id && (
                    <div className="mt-3">
                      {paySuccess ? (
                        <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" /> 支付成功，会员已续期
                        </div>
                      ) : (
                        <button className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-1"
                          onClick={(e) => { e.stopPropagation(); handlePay(p.id); }}
                          disabled={payLoading}>
                          {payLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                          支付宝支付
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {payError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4"><AlertCircle className="w-4 h-4" />{payError}</div>}

          {payUrl && !paySuccess && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">✅ 订单已创建，请在新打开的支付宝页面完成支付</p>
                  <p className="text-xs text-blue-600">如果未自动跳转，可复制下面链接在浏览器打开</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 truncate max-w-md">{payUrl}</code>
                    <button className="flex items-center gap-1 text-xs text-blue-700 bg-white px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors" onClick={copyPayUrl}>
                      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 我的续期记录 */}
          {myOrders.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">📜 我的续期记录</h3>
              <div className="space-y-2">
                {myOrders.map((o, i) => (
                  <div key={o.id || i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <span className="font-medium">{o.plan_name || '套餐'}</span>
                      <span className="text-gray-400 ml-2">{o.days}天</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary-600">¥{Number(o.amount).toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.status === 'paid' ? 'bg-green-100 text-green-700' :
                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {o.status === 'paid' ? '已支付' : o.status === 'pending' ? '待支付' : o.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(o.created_at, 'MM-DD HH:mm')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ 以下管理员功能保持不变 ════ */}
      {isAdmin && tab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">现有套餐</h3>
            {loading ? <div className="text-center py-8 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div> : (
              <div className="space-y-2">
                {plans.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">暂无套餐，请在右侧新增</div>}
                {plans.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.days}天 / ¥{Number(p.price).toFixed(2)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                        onClick={() => { setEditPlan(p); setPlanForm({ name: p.name, days: p.days, price: Number(p.price), is_active: p.is_active !== false }); }}>编辑</button>
                      <button className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" onClick={() => setDeleteTarget(p)}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{editPlan ? '编辑套餐' : '新增套餐'}</h3>
            <div className="space-y-3">
              <input className="input-field" placeholder="套餐名称（如月卡）" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" type="number" placeholder="天数" value={planForm.days} onChange={e => setPlanForm(f => ({ ...f, days: parseInt(e.target.value) || 0 }))} />
                <input className="input-field" type="number" step="0.01" placeholder="价格（元）" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={planForm.is_active} onChange={e => setPlanForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-primary-600" /> 启用
              </label>
              <div className="flex gap-2">
                <button className="btn-primary flex items-center gap-1 text-sm" onClick={handleSavePlan}><Save className="w-4 h-4" />保存</button>
                {editPlan && <button className="btn-outline text-sm" onClick={() => { setEditPlan(null); setPlanForm({ name: '', days: 30, price: 0, is_active: true }); }}>取消</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && tab === 'renew' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">🔍 搜索用户</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="搜索用户名、姓名或公司名..." value={userQuery} onChange={e => { setUserQuery(e.target.value); setSelectedUser(null); }} />
            </div>
            <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
              {userList.map(u => (
                <div key={u.username}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${selectedUser?.username === u.username ? 'bg-primary-50 border border-primary-300' : 'hover:bg-gray-50 border border-transparent'}`}
                  onClick={() => { setSelectedUser(u); setUserQuery(u.username + ' - ' + u.display_name); setUserList([]); }}>
                  <div><span className="font-medium">{u.display_name}</span><span className="text-gray-400 ml-2">{u.company_name}</span></div>
                  <div className="text-xs text-gray-400">{u.role === 'forwarder' ? '货代' : u.role === 'trader' ? '外贸' : u.role} | {u.trial_end || '永久'}</div>
                </div>
              ))}
              {userQuery && userList.length === 0 && <div className="text-xs text-gray-400 text-center py-4">无匹配用户</div>}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">✏️ 续期设置</h3>
            {!selectedUser ? <div className="text-sm text-gray-400 text-center py-8">请先在左侧搜索并选择用户</div> : (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm"><span className="text-gray-500">用户：</span><strong>{selectedUser.display_name}</strong>（{selectedUser.company_name}）</div>
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm"><span className="text-gray-500">当前到期：</span><strong>{selectedUser.trial_end || '永久有效'}</strong></div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">快捷选择套餐</label>
                  <div className="flex gap-2 flex-wrap">
                    {plans.filter(p => p.is_active !== false).map(p => (
                      <button key={p.id}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${renewDays === p.days ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => { setRenewDays(p.days); setRenewAmount(Number(p.price)); }}>{p.name}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" type="number" placeholder="天数" value={renewDays} onChange={e => setRenewDays(parseInt(e.target.value) || 0)} />
                  <input className="input-field" type="number" step="0.01" placeholder="金额" value={renewAmount} onChange={e => setRenewAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <input className="input-field" placeholder="备注（选填）" value={renewRemark} onChange={e => setRenewRemark(e.target.value)} />
                <button className="btn-primary flex items-center justify-center gap-1 w-full" onClick={handleRenew} disabled={renewing}>
                  {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}确认续期
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && tab === 'records' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">📜 续期记录</h3>
          {loading ? <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div> : records.length === 0 ? (
            <div className="text-center py-10 text-gray-400">暂无续期记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-400 border-b">
                  <th className="pb-2 font-medium pr-3">时间</th><th className="pb-2 font-medium pr-3">用户</th>
                  <th className="pb-2 font-medium pr-3">公司</th><th className="pb-2 font-medium pr-3">天数</th>
                  <th className="pb-2 font-medium pr-3">金额</th><th className="pb-2 font-medium pr-3">操作人</th><th className="pb-2 font-medium">备注</th>
                </tr></thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{formatTime(r.created_at, 'MM-DD HH:mm')}</td>
                      <td className="py-2 pr-3 font-medium">{r.user_name}<span className="text-gray-400 ml-1">({r.username})</span></td>
                      <td className="py-2 pr-3 text-gray-500">{r.company_name}</td>
                      <td className="py-2 pr-3">{r.days}天</td>
                      <td className="py-2 pr-3">¥{Number(r.amount).toFixed(2)}</td>
                      <td className="py-2 pr-3 text-gray-500">{r.creator_name || '--'}</td>
                      <td className="py-2 text-gray-400 text-xs">{r.remark || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ 删除套餐确认弹窗 ════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div><h3 className="font-bold text-gray-900">确认删除</h3><p className="text-xs text-gray-500 mt-0.5">此操作不可撤销</p></div>
            </div>
            <p className="text-sm text-gray-700 mb-2">确定删除套餐 <span className="font-semibold">「{deleteTarget.name}」</span> 吗？</p>
            <p className="text-xs text-gray-400 mb-4">{deleteTarget.days}天 / ¥{Number(deleteTarget.price).toFixed(2)}</p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>取消</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
