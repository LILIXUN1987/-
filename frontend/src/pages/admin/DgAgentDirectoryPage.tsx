import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { dgApi } from '../../api/dg.api';
import client from '../../api/client';
import {
  Building2, Search, Loader2, MapPin, Send, Star, User,
  BadgeCheck, AlertTriangle, X, Plane, Ship, Truck,
  Shield, Phone, ChevronRight, Sparkles,
} from 'lucide-react';
import ReviewDialog from '../../components/common/ReviewDialog';
import type { DgAgent } from '../../api/dg.api';

const TRANSPORT_CONFIG = {
  all: { icon: Sparkles, label: { zh: '全部', en: 'All' }, color: 'from-gray-500 to-gray-600', bg: 'bg-gray-100', activeBg: 'bg-gray-800', text: 'text-gray-700' },
  air: { icon: Plane, label: { zh: '空运', en: 'Air' }, color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', activeBg: 'bg-gradient-to-r from-sky-500 to-blue-600', text: 'text-sky-700' },
  sea: { icon: Ship, label: { zh: '海运', en: 'Sea' }, color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', activeBg: 'bg-gradient-to-r from-cyan-500 to-teal-600', text: 'text-cyan-700' },
  land: { icon: Truck, label: { zh: '陆运', en: 'Land' }, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', activeBg: 'bg-gradient-to-r from-amber-500 to-orange-600', text: 'text-amber-700' },
};

export default function DgAgentDirectoryPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [agents, setAgents] = useState<(DgAgent & { transport_type?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'air' | 'sea' | 'land'>('all');
  const [portSearch, setPortSearch] = useState('');
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string } | null>(null);

  const _t = (zh: string, en: string) => lang === 'en' ? en : zh;

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const types = filterType === 'all' ? ['air', 'sea', 'land'] : [filterType];
      const results = await Promise.allSettled(
        types.map(t => dgApi.agentDirectory({ type: t, port: portSearch || undefined }))
      );
      const combined: (DgAgent & { transport_type?: string })[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          r.value.forEach((a: any) => combined.push({ ...a, transport_type: types[i] }));
        }
      });
      setAgents(combined);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, [filterType, portSearch]);

  const handleContact = async (agent: DgAgent) => {
    if (!agent.contact_person) { alert(_t('暂无联系方式', 'Contact info not available')); return; }
    const msg = prompt(_t(`发站内信给 ${agent.company_name}：`, `Send message to ${agent.company_name}:`));
    if (!msg?.trim()) return;
    try {
      const lu = await client.get('/auth/lookup?phone=' + agent.phone);
      if (lu.data.id) {
        await client.post('/messages', { receiver_id: lu.data.id, content: msg.trim() });
        alert('✅ ' + _t('已发送', 'Sent'));
      }
    } catch {
      alert(_t('该用户暂未在线', 'User not found or offline'));
    }
  };

  const renderContactBtn = (agent: DgAgent) => (
    <button onClick={() => handleContact(agent)}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold rounded-xl hover:from-red-600 hover:to-rose-700 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.97] transition-all duration-200 shadow-md shadow-red-500/10">
      <Send className="w-3.5 h-3.5" />
      {_t('联系TA', 'Contact')}
      <ChevronRight className="w-3 h-3" />
    </button>
  );

  const renderReviewBtn = (agent: DgAgent) => (
    <button onClick={() => setReviewTarget({ id: agent.created_by!, name: agent.company_name })}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-amber-600 text-xs font-bold rounded-xl border border-amber-200 hover:bg-amber-50 hover:border-amber-300 hover:shadow-md active:scale-[0.97] transition-all duration-200">
      <Star className="w-3.5 h-3.5" />
      {_t('评价', 'Review')}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* ══════ Hero Header ══════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 rounded-3xl shadow-2xl mb-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.03)_0%,transparent_60%)]" />

        <div className="relative z-10 px-6 sm:px-10 py-8 sm:py-10">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/30 ring-4 ring-white/10 flex-shrink-0">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {_t('危险品代理黄页', 'DG Agent Directory')}
                </h1>
                <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-[11px] font-bold text-white/80 border border-white/10">
                  🚨 {_t('危险品', 'Dangerous Goods')}
                </span>
              </div>
              <p className="text-sm sm:text-base text-white/60 mt-1.5 max-w-xl leading-relaxed">
                {_t('按口岸和运输方式筛选已入驻的危险品代理，在线联系、合作评价', 'Browse verified dangerous goods agents by port and transport mode. Contact and review directly.')}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 sm:gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{agents.length}</div>
                    <div className="text-[10px] text-white/50">{_t('已入驻代理', 'Agents')}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {new Set(agents.map(a => a.ports).filter(Boolean)).size}
                    </div>
                    <div className="text-[10px] text-white/50">{_t('覆盖口岸', 'Ports')}</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white/80" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {agents.filter(a => a.status === 'approved').length}
                    </div>
                    <div className="text-[10px] text-white/50">{_t('已认证', 'Verified')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Filters ══════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Transport mode */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 mb-2 block tracking-wider uppercase">
              {_t('运输方式', 'Transport')}
            </label>
            <div className="flex gap-1.5">
              {(['all', 'air', 'sea', 'land'] as const).map(t => {
                const cfg = TRANSPORT_CONFIG[t];
                const Ti = cfg.icon;
                const active = filterType === t;
                return (
                  <button key={t}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      active
                        ? `${cfg.activeBg} text-white shadow-lg ${t !== 'all' ? `shadow-${t === 'air' ? 'sky' : t === 'sea' ? 'cyan' : 'amber'}-500/25` : 'shadow-gray-500/25'} scale-105`
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-100'
                    }`}
                    onClick={() => setFilterType(t)}
                  >
                    <Ti className="w-4 h-4" />
                    <span>{t === 'all' ? _t('全部', 'All') : cfg.label[lang === 'en' ? 'en' : 'zh']}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Port search */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 mb-2 block tracking-wider uppercase">
              {_t('口岸搜索', 'Port Search')}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 focus:bg-white transition-all duration-200 placeholder:text-gray-400"
                placeholder={_t('输入口岸名称...', 'Enter port name...')}
                value={portSearch}
                onChange={e => setPortSearch(e.target.value)}
              />
              {portSearch && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-0.5 transition-colors" onClick={() => setPortSearch('')}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick hints */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 mb-2 block tracking-wider uppercase">
              {_t('热门口岸', 'Popular Ports')}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { zh: '广州白云机场', en: 'Guangzhou' },
                { zh: '深圳机场', en: 'Shenzhen' },
                { zh: '上海港', en: 'Shanghai' },
                { zh: '盐田港', en: 'Yantian' },
              ].map(p => (
                <button key={p.zh} onClick={() => setPortSearch(lang === 'en' ? p.en : p.zh)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                    portSearch === (lang === 'en' ? p.en : p.zh)
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <MapPin className="w-3 h-3 inline mr-1" />{lang === 'en' ? p.en : p.zh}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Agent Grid ══════ */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white/80 rounded-2xl border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-red-400 mb-3" />
          <p className="text-sm text-gray-400">{_t('加载中...', 'Loading...')}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center">
            <Building2 className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">
            {filterType !== 'all' || portSearch
              ? _t('未找到匹配的代理', 'No agents match your filters')
              : _t('暂无危险品代理', 'No DG agents yet')}
          </h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            {filterType !== 'all' || portSearch
              ? _t('试试其他口岸或运输方式，扩大搜索范围', 'Try different ports or transport modes')
              : _t('尚未有危险品代理入驻，成为第一个入驻的代理', 'No agents have joined yet. Be the first!')}
          </p>
          {portSearch && (
            <button onClick={() => setPortSearch('')}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl px-4 py-2 transition-colors">
              <X className="w-4 h-4" />{_t('清空口岸筛选', 'Clear port filter')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Result bar */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Search className="w-4 h-4" />
              <span>
                {_t(`共找到 ${agents.length} 家代理`, `Found ${agents.length} agents`)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2.5 py-1">
              <Shield className="w-3 h-3" />
              {_t('已认证代理有绿色标记', 'Verified agents marked')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => {
              const transType = (agent as any).transport_type || 'air';
              const tc = TRANSPORT_CONFIG[transType as keyof typeof TRANSPORT_CONFIG] || TRANSPORT_CONFIG.air;
              const Ti = tc.icon;
              return (
                <div key={agent.id + transType}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-red-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">

                  {/* Card header with gradient accent */}
                  <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-orange-400" />

                  <div className="p-5">
                    {/* Company info row */}
                    <div className="flex items-start gap-3.5">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                          <Building2 className="w-6 h-6 text-red-500" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${tc.bg} flex items-center justify-center shadow-sm border-2 border-white`}>
                          <Ti className="w-2.5 h-2.5" style={{ color: tc.text.replace('text-', '') }} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                            {agent.company_name}
                          </h3>
                          <BadgeCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        </div>
                        {agent.contact_person && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{agent.contact_person}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {agent.service_categories?.split(/[,，、\s]+/).filter(Boolean).slice(0, 3).map((cat, i) => (
                        <span key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-100">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {cat.trim()}
                        </span>
                      ))}
                      {agent.service_categories && agent.service_categories.split(/[,，、\s]+/).filter(Boolean).length > 3 && (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          +{agent.service_categories.split(/[,，、\s]+/).filter(Boolean).length - 3}
                        </span>
                      )}
                    </div>

                    {/* Ports */}
                    {agent.ports && (
                      <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span className="text-[11px] text-gray-600 font-medium leading-relaxed">{agent.ports}</span>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {agent.description && (
                      <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">
                        {agent.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3.5 border-t border-gray-100">
                      {renderContactBtn(agent)}
                      {agent.created_by && renderReviewBtn(agent)}
                      <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1">
                        <Plane className="w-2.5 h-2.5" />
                        {agent.type?.toUpperCase() || 'AIR'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════ Disclaimer ══════ */}
      <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xs text-amber-800 leading-relaxed space-y-1">
            <p className="font-semibold text-sm">{_t('⚠️ 安全提醒', '⚠️ Safety Notice')}</p>
            <p>{_t('本平台仅展示危险品代理信息供用户参考。平台不参与任何运输操作，不担保代理服务质量。', 'This platform only displays DG agent info for reference. We do not participate in transport operations or guarantee service quality.')}</p>
            <p>{_t('合作前请自行核实代理资质证件（危险品运输资质、MSDS 等）。如遇纠纷，建议双方协商解决或向行业主管部门投诉。', 'Please verify credentials (DG transport qualification, MSDS, etc.) with the agent before cooperation.')}</p>
          </div>
        </div>
      </div>

      {reviewTarget && (
        <ReviewDialog
          userId={reviewTarget.id}
          userName={reviewTarget.name}
          onClose={() => setReviewTarget(null)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
