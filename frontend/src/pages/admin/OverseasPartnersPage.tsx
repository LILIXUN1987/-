import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { FEATURES } from '../../config/features';
import { getRoleChecks } from '../../types';
import { Handshake, Shield, Globe, TrendingUp } from 'lucide-react';
import PartnersTab from '../../components/admin/overseas-partners/PartnersTab';
import RegisterTab from '../../components/admin/overseas-partners/RegisterTab';
import DisputesTab from '../../components/admin/overseas-partners/DisputesTab';

type TabKey = 'partners' | 'register' | 'disputes';

export default function OverseasPartnersPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>('partners');

  const rc = getRoleChecks(user?.role);
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'Under maintenance' : '功能维护中'}</div>;
  }

  const isAgent = rc.isOverseasAgent;

  if (!rc.isForwarder && !rc.isOverseasAgent && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'No access' : '暂无权限查看'}</div>;
  }

  const tabs = [
    { key: 'partners' as TabKey, icon: '🤝', label: lang === 'en' ? 'Partners' : '合作商', desc: lang === 'en' ? 'Records & Credit' : '记录与信用' },
    { key: 'register' as TabKey, icon: '📝', label: lang === 'en' ? 'New Cooperation' : '登记合作', desc: lang === 'en' ? 'Build Record' : '建立记录' },
    { key: 'disputes' as TabKey, icon: '⚖️', label: lang === 'en' ? 'Disputes' : '争议调解', desc: lang === 'en' ? 'Resolution' : '解决纠纷' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-8 mb-8 shadow-2xl shadow-indigo-500/10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-400 rounded-full blur-[120px] opacity-20" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-400 rounded-full blur-[100px] opacity-10" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-white/80 text-xs font-medium mb-4">
              {isAgent ? (
                <><Globe className="w-3.5 h-3.5" />{lang === 'en' ? 'Overseas Agent Console' : '海外代理工作台'}</>
              ) : (
                <><Shield className="w-3.5 h-3.5" />{lang === 'en' ? 'Forwarder Partner Hub' : '货代合作中心'}</>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              {isAgent
                ? (lang === 'en' ? 'Chinese Forwarder Partners' : '中国合作货代')
                : (lang === 'en' ? 'Overseas Partner Network' : '海外合作伙伴网络')}
            </h1>
            <p className="text-indigo-200/80 text-sm max-w-xl leading-relaxed">
              {lang === 'en'
                ? 'Build trust, track cooperation history, and grow your global logistics network with verified partners.'
                : '建立信任关系，追踪合作记录，与经过验证的全球物流伙伴共同成长。'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4 py-3 bg-white/10 backdrop-blur rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white"><Handshake className="w-6 h-6 inline mr-1" />100+</div>
              <div className="text-[10px] text-indigo-200/60 mt-0.5">{lang === 'en' ? 'Verified Partners' : '认证合作伙伴'}</div>
            </div>
            <div className="text-center px-4 py-3 bg-white/10 backdrop-blur rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white"><TrendingUp className="w-6 h-6 inline mr-1" />50+</div>
              <div className="text-[10px] text-indigo-200/60 mt-0.5">{lang === 'en' ? 'Active Cooperations' : '活跃合作'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Premium Tab Bar ── */}
      <div className="flex gap-3 mb-8">
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`group relative flex-1 rounded-2xl p-4 text-left transition-all duration-300 ${
              tab === t.key
                ? 'bg-white shadow-xl shadow-indigo-500/10 border border-indigo-100 scale-[1.02]'
                : 'bg-white/60 hover:bg-white hover:shadow-lg border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform duration-300 ${
                tab === t.key
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20 group-hover:scale-110'
                  : 'bg-gray-100 group-hover:bg-indigo-50'
              }`}>
                {t.icon}
              </div>
              <div>
                <div className={`text-sm font-bold transition-colors ${
                  tab === t.key ? 'text-gray-900' : 'text-gray-600'
                }`}>{t.label}</div>
                <div className="text-[11px] text-gray-400">{t.desc}</div>
              </div>
            </div>
            {tab === t.key && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="animate-in fade-in duration-300">
        {tab === 'partners' && <PartnersTab isAgent={isAgent} />}
        {tab === 'register' && <RegisterTab isAgent={isAgent} />}
        {tab === 'disputes' && <DisputesTab />}
      </div>
    </div>
  );
}
