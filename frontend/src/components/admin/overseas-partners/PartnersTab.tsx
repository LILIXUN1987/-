import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import type { Cooperation, CreditScore } from '../../../api/cooperation.api';
import {
  Loader2, MessageSquare, X, Send, Award, Star, Shield, Calendar,
  Building2, ChevronDown, TrendingUp, CheckCircle, Clock, Globe,
  Phone, MapPin, Users, Zap, Heart, Handshake,
} from 'lucide-react';

// ════════════════════════════════════════════
// 信用分仪表盘
// ════════════════════════════════════════════
function CreditGauge({ score, level, details }: { score: number; level: string; details: any }) {
  const lang = useAuthStore((s) => s.lang);
  const percentage = Math.min(100, Math.max(0, score));
  const color = score >= 90 ? 'from-amber-400 to-yellow-500'
    : score >= 75 ? 'from-emerald-400 to-green-500'
    : score >= 60 ? 'from-blue-400 to-cyan-500'
    : score >= 40 ? 'from-gray-400 to-gray-500'
    : 'from-red-400 to-orange-500';

  const levelColor = score >= 90 ? 'bg-amber-100 text-amber-800'
    : score >= 75 ? 'bg-emerald-100 text-emerald-800'
    : score >= 60 ? 'bg-blue-100 text-blue-800'
    : score >= 40 ? 'bg-gray-100 text-gray-700'
    : 'bg-red-100 text-red-800';

  const levelIcon = score >= 90 ? '🏆' : score >= 75 ? '⭐' : score >= 60 ? '👍' : score >= 40 ? '📊' : '⚠️';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-500/5 overflow-hidden">
      {/* Top gradient bar */}
      <div className={`h-2 bg-gradient-to-r ${color}`} />
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Credit Score' : '信用评分'}</h3>
            </div>
            <p className="text-xs text-gray-400">{lang === 'en' ? 'Your reputation in the network' : '您在合作网络中的信誉值'}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${levelColor} text-xs font-bold flex items-center gap-1`}>
            <span>{levelIcon}</span> {level}
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-end gap-4 mb-6">
          <div className="text-6xl font-black text-gray-900 tracking-tighter leading-none">{score}</div>
          <div className="text-sm text-gray-400 pb-1">/ 100</div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`}
            style={{ width: `${percentage}%` }} />
        </div>

        {/* Detail chips */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
            <Star className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-xs font-bold text-gray-700">{details.avgRating}</div>
              <div className="text-[10px] text-gray-400">{lang === 'en' ? 'Avg Rating' : '平均评分'} ({details.reviewCount})</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <div className="text-xs font-bold text-gray-700">{details.totalCoops}</div>
              <div className="text-[10px] text-gray-400">{lang === 'en' ? 'Cooperated' : '合作次数'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
            <Calendar className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-xs font-bold text-gray-700">{details.daysSinceReg}d</div>
              <div className="text-[10px] text-gray-400">{lang === 'en' ? 'Days Joined' : '入驻天数'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
            <Heart className="w-4 h-4 text-pink-500" />
            <div>
              <div className="text-xs font-bold text-gray-700">{details.hasCard ? '✓' : '—'}</div>
              <div className="text-[10px] text-gray-400">{lang === 'en' ? 'Card Verified' : '名片认证'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// 一张合作卡片
// ════════════════════════════════════════════
function CooperationCard({ coop, isAgent, onConfirm, onMessage }: {
  coop: Cooperation; isAgent: boolean;
  onConfirm: (id: string) => void; onMessage: (coop: Cooperation) => void;
}) {
  const lang = useAuthStore((s) => s.lang);
  const partnerName = coop.partner_name || (isAgent ? coop.forwarder_user_id : coop.agent_user_id);
  const partnerCompany = coop.partner_company || (isAgent ? coop.forwarder_company : coop.agent_company);

  const statusConfig: Record<string, { dot: string; label: string; bg: string; text: string }> = {
    confirmed: { dot: '●', label: lang === 'en' ? 'Confirmed' : '已确认', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    pending: { dot: '◐', label: lang === 'en' ? 'Pending' : '待确认', bg: 'bg-amber-50', text: 'text-amber-700' },
    disputed: { dot: '○', label: lang === 'en' ? 'Disputed' : '争议中', bg: 'bg-red-50', text: 'text-red-700' },
  };
  const sc = statusConfig[coop.status] || statusConfig.pending;

  return (
    <div className={`group bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${
      coop.status === 'confirmed' ? 'border-emerald-100 hover:border-emerald-200'
        : coop.status === 'disputed' ? 'border-red-100 hover:border-red-200'
        : 'border-gray-100 hover:border-indigo-200'
    } overflow-hidden`}>
      <div className="p-5">
        {/* Top row: company + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-bold ${
              isAgent ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' : 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600'
            }`}>
              {(partnerCompany || partnerName).charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">{partnerCompany || partnerName}</h4>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3 h-3" />
                {isAgent ? (lang === 'en' ? 'Chinese Forwarder' : '中国货代') : (lang === 'en' ? 'Overseas Agent' : '海外代理')}
                {coop.service_type && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-1">{coop.service_type}</span>
                )}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
            <span className="text-[8px]">{sc.dot}</span> {sc.label}
          </span>
        </div>

        {/* Description */}
        {coop.description && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 mb-3 leading-relaxed italic border-l-2 border-indigo-200">
            "{coop.description}"
          </p>
        )}

        {/* Bottom row: date + actions */}
        <div className="flex items-end justify-between">
          <div className="text-[10px] text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {coop.created_at?.slice(0, 10)}
            {coop.review_count !== undefined && coop.review_count > 0 && (
              <span className="flex items-center gap-0.5 ml-2 text-amber-500">
                <Star className="w-3 h-3 fill-current" /> {coop.avg_rating}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMessage(coop)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-200"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Message' : '联系'}
            </button>
            {coop.status === 'pending' && isAgent && (
              <button
                onClick={() => onConfirm(coop.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/20 transition-all duration-200"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {lang === 'en' ? 'Confirm' : '确认合作'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// PartnersTab 主体
// ════════════════════════════════════════════
export default function PartnersTab({ isAgent }: { isAgent: boolean }) {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const [partners, setPartners] = useState<Cooperation[]>([]);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [contactModal, setContactModal] = useState<Cooperation | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showCreditGuide, setShowCreditGuide] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/cooperations/my-partners');
      setPartners(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (user?.id) {
      setScoreLoading(true);
      client.get(`/cooperations/credit-score/${user.id}`)
        .then(res => setCreditScore(res.data))
        .catch(() => {})
        .finally(() => setScoreLoading(false));
    }
  }, [user?.id]);

  const handleConfirm = async (id: string) => {
    try {
      await client.post(`/cooperations/${id}/confirm`);
      alert(lang === 'en' ? '✅ Cooperation confirmed!' : '✅ 合作已确认！');
      fetchData();
    } catch { alert(lang === 'en' ? 'Confirmation failed' : '确认失败'); }
  };

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      const receiverId = isAgent ? contactModal.forwarder_user_id : contactModal.agent_user_id;
      await client.post('/messages', { receiver_id: receiverId, content: contactText.trim() });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch {}
    setContactSending(false);
  };

  const filtered = showPendingOnly ? partners.filter(p => p.status === 'pending') : partners;

  const confirmedCount = partners.filter(p => p.status === 'confirmed').length;
  const pendingCount = partners.filter(p => p.status === 'pending').length;
  const disputedCount = partners.filter(p => p.status === 'disputed').length;

  return (
    <div className="space-y-6">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credit score gauge */}
        {scoreLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[320px]">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : creditScore ? (
          <CreditGauge score={creditScore.score} level={creditScore.level} details={creditScore.details} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center justify-center min-h-[320px]">
            <div className="text-center text-gray-400">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{lang === 'en' ? 'Loading score...' : '正在加载信用分...'}</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div className="flex flex-col gap-3">
          <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-700">{confirmedCount}</div>
              <div className="text-xs text-emerald-600/70 font-medium">{lang === 'en' ? 'Confirmed Partners' : '已确认合作'}</div>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-3xl font-black text-amber-700">{pendingCount}</div>
              <div className="text-xs text-amber-600/70 font-medium">{lang === 'en' ? 'Pending Confirmation' : '待确认合作'}</div>
            </div>
          </div>
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-400 to-gray-500 flex items-center justify-center shadow-lg shadow-slate-500/20">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-700">{partners.length}</div>
              <div className="text-xs text-gray-500 font-medium">{lang === 'en' ? 'Total Cooperations' : '合作总数'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Credit Score Guide (collapsible) ── */}
      <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 ${showCreditGuide ? 'shadow-lg' : ''}`}>
        <button
          onClick={() => setShowCreditGuide(!showCreditGuide)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-gray-800">{lang === 'en' ? 'How Credit Score Works' : '信用分计算规则'}</div>
              <div className="text-xs text-gray-400">{lang === 'en' ? 'Click to expand details' : '点击查看详细规则'}</div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showCreditGuide ? 'rotate-180' : ''}`} />
        </button>
        {showCreditGuide && (
          <div className="px-6 pb-5 border-t border-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {[
                { icon: '🏆', label: lang === 'en' ? 'Base Score' : '基础分', score: '+50', desc: lang === 'en' ? 'Every member starts with 50 pts' : '注册即获 50 分' },
                { icon: '⭐', label: lang === 'en' ? 'Reviews' : '评价分', score: '+0~30', desc: lang === 'en' ? 'Avg rating / 5 × 30' : '平均评分 / 5 × 30' },
                { icon: '🤝', label: lang === 'en' ? 'Cooperation' : '合作分', score: '+0.5/次', desc: lang === 'en' ? '+0.5 per confirmed, max 25' : '每次确认合作 +0.5，封顶25' },
                { icon: '🪪', label: lang === 'en' ? 'Card Verified' : '名片认证', score: '+10', desc: lang === 'en' ? 'Upload & get verified' : '上传并通过认证' },
                { icon: '📅', label: lang === 'en' ? '1+ Year Member' : '注册满1年', score: '+5', desc: lang === 'en' ? 'Loyalty bonus' : '忠诚奖励' },
                { icon: '📅', label: lang === 'en' ? '2+ Year Member' : '注册满2年', score: '+10', desc: lang === 'en' ? 'Bonus (cumulative)' : '累计奖励' },
                { icon: '⚖️', label: lang === 'en' ? 'Dispute Penalty' : '争议扣分', score: '-15', desc: lang === 'en' ? 'Per confirmed dispute' : '每笔争议扣15分', color: 'text-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                      <span className={`text-xs font-bold ml-2 ${item.color || 'text-indigo-600'}`}>{item.score}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Level badges */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { range: '≥90', label: lang === 'en' ? 'Gold' : '金口碑', color: 'bg-amber-100 text-amber-800 border-amber-200' },
                { range: '≥75', label: lang === 'en' ? 'Trusted' : '很可靠', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                { range: '≥60', label: lang === 'en' ? 'Good' : '信誉好', color: 'bg-blue-100 text-blue-800 border-blue-200' },
                { range: '≥40', label: lang === 'en' ? 'Basic' : '基础', color: 'bg-gray-100 text-gray-600 border-gray-200' },
              ].map((lv, i) => (
                <div key={i} className={`text-center rounded-xl px-2 py-2 border ${lv.color}`}>
                  <div className="text-sm font-black">{lv.range}</div>
                  <div className="text-[10px] font-medium">{lv.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Cooperation list header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            {lang === 'en' ? 'Cooperation Records' : '合作记录'}
            <span className="text-gray-300 font-normal ml-2">· {partners.length}</span>
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPendingOnly(false)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
              !showPendingOnly ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {lang === 'en' ? 'All' : '全部'}
          </button>
          <button
            onClick={() => setShowPendingOnly(true)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all ${
              showPendingOnly ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {lang === 'en' ? 'Pending' : '待确认'} {pendingCount > 0 && `(${pendingCount})`}
          </button>
        </div>
      </div>

      {/* ── Cooperation cards ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Handshake className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400 mb-1">
            {lang === 'en' ? 'No cooperation records yet' : '暂无合作记录'}
          </p>
          <p className="text-xs text-gray-300">
            {lang === 'en' ? 'Go to "New Cooperation" tab to register one' : '前往"登记合作"页面建立合作'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((coop) => (
            <CooperationCard
              key={coop.id}
              coop={coop}
              isAgent={isAgent}
              onConfirm={handleConfirm}
              onMessage={setContactModal}
            />
          ))}
        </div>
      )}

      {/* ── Contact Message Modal ── */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">{lang === 'en' ? 'Send Message' : '发送消息'}</h3>
                <button onClick={() => setContactModal(null)} className="text-white/70 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-white/70 mt-1">
                {lang === 'en' ? 'to' : '发送给'} {contactModal.partner_company || contactModal.partner_name}
              </p>
            </div>
            <div className="p-5">
              {contactSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-emerald-700 font-semibold">{lang === 'en' ? 'Message sent!' : '消息已发送！'}</p>
                </div>
              ) : (
                <>
                  <textarea
                    className="w-full min-h-[120px] text-sm resize-none border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                    placeholder={lang === 'en' ? 'Type your message...' : '输入消息...'}
                    value={contactText}
                    onChange={e => setContactText(e.target.value)}
                    disabled={contactSending}
                    autoFocus
                  />
                  <button
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                    onClick={handleContactSend}
                    disabled={contactSending || !contactText.trim()}
                  >
                    {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {lang === 'en' ? 'Send Message' : '发送'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
