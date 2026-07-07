import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import { Handshake } from 'lucide-react';
import PartnersTab from '../../components/admin/overseas-partners/PartnersTab';
import RegisterTab from '../../components/admin/overseas-partners/RegisterTab';
import DisputesTab from '../../components/admin/overseas-partners/DisputesTab';

type TabKey = 'partners' | 'disputes' | 'register';

export default function OverseasPartnersPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>('partners');

  const rc = getRoleChecks(user?.role);
  const isAgent = rc.isOverseasAgent;

  if (!rc.isForwarder && !rc.isOverseasAgent && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'No access' : '暂无权限查看'}</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Handshake className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAgent
              ? (lang === 'en' ? '🤝 My Chinese Forwarder Partners' : '🤝 我的中国合作货代')
              : (lang === 'en' ? '🤝 My Overseas Partners' : '🤝 我的海外合作商')}
          </h1>
          <p className="text-sm text-gray-500">
            {lang === 'en'
              ? 'Track collaborations · Credit scores · Dispute resolution'
              : '合作记录 · 信用评分 · 争议调解'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 max-w-lg">
        {[
          { key: 'partners' as TabKey, label: lang === 'en' ? '🤝 My Partners' : '🤝 我的合作商' },
          { key: 'register' as TabKey, label: lang === 'en' ? '📝 Register Cooperation' : '📝 登记合作' },
          { key: 'disputes' as TabKey, label: lang === 'en' ? '⚖️ Disputes' : '⚖️ 争议调解' },
        ].map((t) => (
          <button key={t.key}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'partners' && <PartnersTab isAgent={isAgent} />}
      {tab === 'register' && <RegisterTab isAgent={isAgent} />}
      {tab === 'disputes' && <DisputesTab />}
    </div>
  );
}
