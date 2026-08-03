import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { FEATURES } from '../../config/features';
import { getRoleChecks } from '../../types';
import { Globe, Languages } from 'lucide-react';
import { LangContext, t, PAGE_T as T, type Lang } from './ddp/shared';
import InquiryTab from './ddp/InquiryTab';
import AgentsTab from './ddp/AgentsTab';
import QuotesTab from './ddp/QuotesTab';
import MyInquiriesTab from './ddp/MyInquiriesTab';
import StatsTab from './ddp/StatsTab';
import { AgentOnboarding, AgentProfileCard } from './ddp/Onboarding';

type TabKey = 'inquiry' | 'agents' | 'quotes' | 'stats' | 'inquiries';

export default function DDPPage() {
  const user = useAuthStore((s) => s.user);
  const authLang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>();
  const [lang, setLang] = useState<Lang>(authLang);
  const [agentRegistered, setAgentRegistered] = useState<boolean | null>(null);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [agentProfile, setAgentProfile] = useState<any>(null);

  const rc = getRoleChecks(user?.role);
  const isAgent = rc.isOverseasAgent;
  const effectiveTab = tab || (isAgent ? 'inquiries' : 'inquiry');
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">{t(T.noAccess, lang)}</div>;
  }

  useEffect(() => {
    if (isAgent) {
      client.get('/ddp/agents/my-status').then(r => setAgentRegistered(r.data.registered)).catch(() => setAgentRegistered(false));
      client.get('/overseas/my-profile').then(r => { if (r.data?.profile) setAgentProfile(r.data.profile); }).catch(() => {});
      client.get('/overseas/inquiries', { params: { limit: 1 } }).then(r => { setInquiryCount(r.data?.total || 0); }).catch(() => {});
    }
  }, [isAgent]);

  if (!rc.isAdmin && !rc.isForwarder && !rc.isTrader && !rc.isOverseasAgent) {
    return <div className="text-center py-16 text-gray-400">{t(T.noAccess, lang)}</div>;
  }

  return (
    <LangContext.Provider value={lang}>
      <div>
        {/* 标题 + 语言切换 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-7 h-7 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t(T.pageTitle, lang)}</h1>
              <p className="text-sm text-gray-500">{t(T.pageSubtitle, lang)}</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:text-primary-700 transition-colors bg-white text-gray-500"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
            <Languages className="w-3.5 h-3.5" />{lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        {/* 海外代理入驻引导 */}
        {isAgent && agentRegistered === false && <AgentOnboarding />}
        {isAgent && agentRegistered && agentProfile && <AgentProfileCard profile={agentProfile} lang={lang} />}

        {/* Tab 栏 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {[
            { key: 'inquiry' as TabKey, label: T.tabInquiry, activeBg: 'from-primary-500 to-indigo-600', icon: '📮' },
            { key: 'agents' as TabKey, label: isAgent ? { zh: '🤝 中国代理', en: '🤝 Chinese Forwarders' } : T.tabAgents, activeBg: 'from-emerald-500 to-teal-600', icon: '🤝' },
            { key: 'quotes' as TabKey, label: { zh: '💰 报价单', en: '💰 Quotes' }, activeBg: 'from-rose-500 to-pink-600', icon: '💰' },
            { key: 'stats' as TabKey, label: T.tabStats, activeBg: 'from-amber-500 to-orange-600', icon: '📊' },
            { key: 'inquiries' as TabKey, label: inquiryCount > 0 ? { zh: `📬 我的询价 (${inquiryCount})`, en: `📬 My Inquiries (${inquiryCount})` } : { zh: '📬 我的询价', en: '📬 My Inquiries' }, activeBg: 'from-violet-500 to-purple-600', icon: '📬' },
          ].map(tItem => (
            <button key={tItem.key}
              className={`relative overflow-hidden rounded-xl py-3 px-3 text-sm font-bold transition-all duration-200 ${
                effectiveTab === tItem.key
                  ? `bg-gradient-to-r ${tItem.activeBg} text-white shadow-lg shadow-black/10 scale-[1.02]`
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setTab(tItem.key)}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{tItem.icon}</span>
                <span>{t(tItem.label, lang)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        {effectiveTab === 'inquiry' && <InquiryTab isAgent={isAgent} />}
        {effectiveTab === 'agents' && <AgentsTab isAgent={isAgent} />}
        {effectiveTab === 'quotes' && <QuotesTab isAgent={isAgent} />}
        {effectiveTab === 'stats' && <StatsTab />}
        {effectiveTab === 'inquiries' && <MyInquiriesTab isAgent={isAgent} />}

        {/* 使用提示 */}
        <div className="mt-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-[1px]">
          <div className="bg-white rounded-2xl p-5 h-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{t(T.infoTitle, lang)}</span>
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">{t(T.infoDesc1, lang)}</p>
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {isAgent ? (lang === 'en' ? 'All Chinese forwarders here are community-verified.' : '本社区的中国货代均为群友验证或推荐的靠谱合作方。') : t(T.infoDesc2, lang)}
                  <a href="/admin/inbox" className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                    {t(T.infoDesc2Link, lang)}<span className="text-xs">→</span>
                  </a>
                  {t(T.infoDesc2End, lang)}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">💡 DDP</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">🌍 全球</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">🤝 群友验证</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LangContext.Provider>
  );
}
