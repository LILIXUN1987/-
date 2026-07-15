import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Gift, Loader2, Plus, X, Save, Building2, Phone, User, CheckCircle,
  BarChart3, TrendingUp, DollarSign, Receipt,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface Broker {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  port_code: string;
  port_name: string | null;
  unit_price: number;
  daily_limit: number;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  totalIssued: number;
  totalSent: number;
  totalUsed: number;
  pendingOrders: number;
  completedOrders: number;
  activeSubscriptions: number;
  monthUsed: number;
}

export default function BrokerManagementPage() {
  const lang = useAuthStore((s) => s.lang);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editBroker, setEditBroker] = useState<Broker | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', port_code: '5141', port_name: '广州白云机场', unit_price: 50, daily_limit: 50 });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        client.get('/customs-coupons/admin/brokers'),
        client.get('/customs-coupons/admin/stats'),
      ]);
      setBrokers(bRes.data.data);
      setStats(sRes.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error(lang === 'en' ? 'Please enter company name' : '请填写公司名'); return; }
    setSaving(true);
    try {
      const payload = editBroker ? { ...form, id: editBroker.id } : form;
      const res = await client.post('/customs-coupons/admin/brokers', payload);
      toast.success(res.data.message);
      setShowForm(false);
      setEditBroker(null);
      fetchData();
    } catch (err: any) { toast.error(err?.response?.data?.error || '保存失败'); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-emerald-700">{stats.activeSubscriptions}</div><div className="text-xs text-emerald-600">{lang === 'en' ? 'Active Subs' : '活跃订阅'}</div></div>
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-blue-700">{stats.monthUsed}</div><div className="text-xs text-blue-600">{lang === 'en' ? 'Used This Month' : '本月使用'}</div></div>
              <Gift className="w-6 h-6 text-blue-300" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-amber-700">{stats.pendingOrders}</div><div className="text-xs text-amber-600">{lang === 'en' ? 'Pending Orders' : '待处理订单'}</div></div>
              <Receipt className="w-6 h-6 text-amber-300" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-purple-700">{stats.totalUsed}</div><div className="text-xs text-purple-600">{lang === 'en' ? 'Total Used' : '累计使用'}</div></div>
              <BarChart3 className="w-6 h-6 text-purple-300" />
            </div>
          </div>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{lang === 'en' ? 'Customs Brokers' : '合作报关行'} ({brokers.length})</h3>
        <button className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
          onClick={() => { setEditBroker(null); setForm({ company_name: '', contact_person: '', phone: '', port_code: '5141', port_name: '广州白云机场', unit_price: 50, daily_limit: 50 }); setShowForm(true); }}>
          <Plus className="w-3 h-3" />{lang === 'en' ? 'Add Broker' : '新增报关行'}
        </button>
      </div>

      {/* 报关行列表 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-3">{lang === 'en' ? 'Company' : '公司名'}</th>
              <th className="text-left px-4 py-3">{lang === 'en' ? 'Port' : '口岸'}</th>
              <th className="text-right px-4 py-3">{lang === 'en' ? 'Price' : '结算价'}</th>
              <th className="text-right px-4 py-3">{lang === 'en' ? 'Daily Limit' : '日上限'}</th>
              <th className="text-center px-4 py-3">{lang === 'en' ? 'Status' : '状态'}</th>
              <th className="text-right px-4 py-3">{lang === 'en' ? 'Actions' : '操作'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brokers.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{b.company_name}</p>
                  {b.contact_person && <p className="text-xs text-gray-400">{b.contact_person} {b.phone ? `· ${b.phone}` : ''}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{b.port_name || b.port_code}</td>
                <td className="px-4 py-3 text-right font-medium">¥{b.unit_price}</td>
                <td className="px-4 py-3 text-right">{b.daily_limit}{lang === 'en' ? '/day' : '票/天'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {b.is_active ? (lang === 'en' ? 'Active' : '启用') : (lang === 'en' ? 'Disabled' : '停用')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs text-primary-600 hover:underline"
                    onClick={() => { setEditBroker(b); setForm({ company_name: b.company_name, contact_person: b.contact_person || '', phone: b.phone || '', port_code: b.port_code, port_name: b.port_name || '', unit_price: Number(b.unit_price), daily_limit: b.daily_limit }); setShowForm(true); }}>
                    {lang === 'en' ? 'Edit' : '编辑'}
                  </button>
                </td>
              </tr>
            ))}
            {brokers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">{lang === 'en' ? 'No brokers yet' : '暂无报关行'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editBroker ? (lang === 'en' ? 'Edit Broker' : '编辑报关行') : (lang === 'en' ? 'Add Broker' : '新增报关行')}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Company Name *' : '公司名 *'}</label><input className="input-field text-sm" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Contact' : '联系人'}</label><input className="input-field text-sm" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Phone' : '电话'}</label><input className="input-field text-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Port Code' : '关区代码'}</label><input className="input-field text-sm" value={form.port_code} onChange={e => setForm(f => ({ ...f, port_code: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Port Name' : '口岸名'}</label><input className="input-field text-sm" value={form.port_name} onChange={e => setForm(f => ({ ...f, port_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Price (¥)' : '结算价(¥)'}</label><input className="input-field text-sm" type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: Number(e.target.value) || 0 }))} /></div>
                <div><label className="text-xs font-medium text-gray-600 mb-1 block">{lang === 'en' ? 'Daily Limit' : '日上限(票)'}</label><input className="input-field text-sm" type="number" value={form.daily_limit} onChange={e => setForm(f => ({ ...f, daily_limit: Number(e.target.value) || 0 }))} /></div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="flex-1 btn-outline text-sm" onClick={() => setShowForm(false)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? (lang === 'en' ? 'Saving...' : '保存中...') : (lang === 'en' ? 'Save' : '保存')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 周结区域 */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          {lang === 'en' ? 'Weekly Settlement' : '周结管理'}
        </h3>
        <p className="text-xs text-gray-500 mb-3">{lang === 'en' ? 'Settle completed orders with brokers' : '确认已完成订单并结算给报关行'}</p>
        <SettlementPanel />
      </div>
    </div>
  );
}

function SettlementPanel() {
  const lang = useAuthStore((s) => s.lang);
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSettle = async () => {
    if (!confirm(lang === 'en' ? 'Confirm settlement for all completed unpaid orders this week?' : '确认结算本周所有完成的未付订单？')) return;
    setSettling(true);
    setResult(null);
    try {
      const res = await client.post('/customs-coupons/admin/settlement', {});
      setResult(res.data.message);
      toast.success(res.data.message);
    } catch (err: any) {
      setResult(err?.response?.data?.error || '结算失败');
    }
    setSettling(false);
  };

  return (
    <div>
      <button className="btn-primary text-xs" onClick={handleSettle} disabled={settling}>
        {settling ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
        {settling ? (lang === 'en' ? 'Settling...' : '结算中...') : (lang === 'en' ? 'Settle This Week' : '📊 本周结算')}
      </button>
      {result && <p className="text-xs text-gray-600 mt-2">{result}</p>}
    </div>
  );
}
