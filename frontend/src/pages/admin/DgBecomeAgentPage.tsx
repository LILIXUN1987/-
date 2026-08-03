import { useState } from 'react';
import {
  AlertTriangle, ClipboardList, Building2, HelpCircle, BookOpen,
  CheckCircle, BadgeCheck,
} from 'lucide-react';
import { AC } from '../../components/admin/dangerous-goods/DgColors';
import { CasesTab, AgentsTabAll, FaqTab, KnowledgeTab } from '../../components/admin/dangerous-goods/DgTabs';

export default function DgBecomeAgentPage() {
  const [type, setType] = useState<'air' | 'sea' | 'land'>('air');
  const cfg = AC[type];
  const Icon = cfg.icon;
  const [tab, setTab] = useState<'agent-guide' | 'cases' | 'agents' | 'faq' | 'knowledge'>('agent-guide');

  const tabs = [
    { key: 'agent-guide' as const, label: '入驻指南', icon: BadgeCheck },
    { key: 'cases' as const, label: '走货实例', icon: ClipboardList },
    { key: 'agents' as const, label: '代理信息', icon: Building2 },
    { key: 'faq' as const, label: '常见问题', icon: HelpCircle },
    { key: 'knowledge' as const, label: '知识库', icon: BookOpen },
  ];

  // 入驻引导流程（驻留在页面顶部）
  if (tab === 'agent-guide') {
    return (
      <div className="max-w-5xl mx-auto">
        {/* 页面头部 */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-7 h-7 ${cfg.text}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">成为危险品代理</h1>
            <p className="text-sm text-gray-500 mt-0.5">提交走货实例 → 入驻代理 → FAQ → 知识库</p>
          </div>
        </div>

        {/* 运输方式切换 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
          {(['air', 'sea', 'land'] as const).map(t => {
            const c = AC[t];
            const Ti = c.icon;
            const active = type === t;
            return (
              <button key={t}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                  active
                    ? `${c.bg} ${c.textDeeper} shadow-sm ring-1 ${c.ring}`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setType(t)}
              >
                <Ti className="w-5 h-5" />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* 头部分类Tab */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
          {tabs.map(t => {
            const Ti = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Ti className="w-5 h-5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Step guide */}
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border border-red-200 rounded-xl mb-5 overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-gray-800">📋 成为危险品代理，只需4步</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { step: '1', title: '提交走货实例', desc: '填写1个您操作过的UN编号危险品实例，附操作流程说明，提交即发布', icon: ClipboardList, color: 'bg-blue-500', bg: 'bg-blue-50' },
                { step: '2', title: '自动发布', desc: '无需管理员审核，提交后立即展示给所有用户查看', icon: CheckCircle, color: 'bg-green-500', bg: 'bg-green-50' },
                { step: '3', title: '提交代理信息', desc: '填写公司名、联系人等信息，满足条件自动通过（≥3个UN实例/≥2条评价/已上传名片）', icon: Building2, color: 'bg-purple-500', bg: 'bg-purple-50' },
                { step: '4', title: '自动上线', desc: '满足条件即时成为代理，客户可直接联系您询价送货', icon: BadgeCheck, color: 'bg-orange-500', bg: 'bg-orange-50' },
              ].map((s, i) => {
                const Si = s.icon;
                return (
                  <div key={i} className={`${s.bg} rounded-xl border border-red-100 p-4 relative`}>
                    {i < 3 && <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-red-300 text-xl">→</div>}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 ${s.color} text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm`}>{s.step}</div>
                      <Si className="w-4 h-4 text-gray-500" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-800 mb-0.5">{s.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                    {i === 0 && (
                      <button className="mt-2 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg px-2.5 py-1 transition-colors w-full text-center"
                        onClick={() => setTab('cases')}>去提交实例 →</button>
                    )}
                    {i === 2 && (
                      <button className="mt-2 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg px-2.5 py-1 transition-colors w-full text-center"
                        onClick={() => setTab('agents')}>去提交代理信息 →</button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-amber-700 mt-3 flex items-center gap-1 bg-amber-100/70 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>提交即发布，无需审核。满足以下<strong>任意一条</strong>自动成为代理：<strong>≥3个不同UN实例</strong> / <strong>≥2条用户评价</strong> / <strong>已上传名片</strong>。同一公司不同业务员需使用不同UN号。</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-7 h-7 ${cfg.text}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成为危险品代理</h1>
          <p className="text-sm text-gray-500 mt-0.5">走货实例 · 代理入驻 · FAQ · 知识库</p>
        </div>
      </div>

      {/* 运输方式切换 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        {(['air', 'sea', 'land'] as const).map(t => {
          const c = AC[t];
          const Ti = c.icon;
          const active = type === t;
          return (
            <button key={t}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                active
                  ? `${c.bg} ${c.textDeeper} shadow-sm ring-1 ${c.ring}`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setType(t)}
            >
              <Ti className="w-5 h-5" />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 头部分类Tab */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        {tabs.slice(1).map(t => {
          const Ti = t.icon;
          const active = tab === t.key;
          const isRed = t.key === 'agents';
          return (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                active
                  ? `${isRed ? 'bg-red-600 text-white shadow-md' : 'bg-primary-600 text-white shadow-md'}`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Ti className="w-5 h-5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'cases' && <CasesTab type={type} />}
      {tab === 'agents' && <AgentsTabAll />}
      {tab === 'faq' && <FaqTab type={type} />}
      {tab === 'knowledge' && <KnowledgeTab />}
    </div>
  );
}
