import { useState, lazy, Suspense } from 'react';
import {
  BarChart3, ClipboardList, Shield, AlertTriangle, CreditCard,
  Building2, FileUp, Camera, Loader2, Gift,
} from 'lucide-react';

// 懒加载各组页面
const AdminStatsPage = lazy(() => import('./AdminStatsPage'));
const AuditLogPage = lazy(() => import('./AuditLogPage'));
const AdminRenewPage = lazy(() => import('./AdminRenewPage'));
const CompanyVerificationPage = lazy(() => import('./CompanyVerificationPage'));
const DgReviewPage = lazy(() => import('./DgReviewPage'));
const RiskCenterPage = lazy(() => import('./RiskCenterPage'));
const AdminImportPage = lazy(() => import('./AdminImportPage'));
const ExpoQuickEntry = lazy(() => import('./ExpoQuickEntry'));
const BrokerManagementPage = lazy(() => import('./BrokerManagementPage'));

function Loader() {
  return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
}

/** 每组配置 */
const GROUPS = [
  {
    key: 'ops',
    label: '🏢 运营中心',
    items: [
      { key: 'stats', label: '运营看板', icon: BarChart3, comp: <AdminStatsPage /> },
      { key: 'audit', label: '审核日志', icon: ClipboardList, comp: <AuditLogPage /> },
    ],
  },
  {
    key: 'users',
    label: '👥 用户管理',
    items: [
      { key: 'renew', label: '会员续期', icon: CreditCard, comp: <AdminRenewPage /> },
      { key: 'verify', label: '企业认证', icon: Building2, comp: <CompanyVerificationPage /> },
    ],
  },
  {
    key: 'review',
    label: '🛡️ 内容审核',
    items: [
      { key: 'dg', label: '危险品监控', icon: AlertTriangle, comp: <DgReviewPage /> },
      { key: 'risk', label: '风控中心', icon: Shield, comp: <RiskCenterPage /> },
    ],
  },
  {
    key: 'cards',
    label: '📇 名片管理',
    items: [
      { key: 'import', label: '导入名片', icon: FileUp, comp: <AdminImportPage /> },
      { key: 'expo', label: '展会现场录入', icon: Camera, comp: <ExpoQuickEntry /> },
    ],
  },
  {
    key: 'business',
    label: '🎫 报关券',
    items: [
      { key: 'brokers', label: '报关行管理', icon: Gift, comp: <BrokerManagementPage /> },
    ],
  },
];

export default function AdminCenter() {
  const [activeGroup, setActiveGroup] = useState('ops');
  const [activeItem, setActiveItem] = useState('stats');

  const group = GROUPS.find(g => g.key === activeGroup);
  const item = group?.items.find(i => i.key === activeItem);

  const handleGroupChange = (groupKey: string) => {
    setActiveGroup(groupKey);
    const g = GROUPS.find(g => g.key === groupKey);
    if (g) setActiveItem(g.items[0].key);
  };

  // 子Tab切换时更新URL（可选，方便刷新保留状态）
  const handleItemChange = (itemKey: string) => {
    setActiveItem(itemKey);
  };

  return (
    <div>
      {/* 一级 Tab：四大分组 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        {GROUPS.map(g => (
          <button key={g.key}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              activeGroup === g.key
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => handleGroupChange(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 二级 Tab：组内子页面 */}
      {group && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
          {group.items.map(item => (
            <button key={item.key}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeItem === item.key
                  ? 'bg-gray-100 text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => handleItemChange(item.key)}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* 内容区 */}
      <div className="min-h-[400px]">
        <Suspense fallback={<Loader />}>
          {item?.comp}
        </Suspense>
      </div>
    </div>
  );
}
