import { useState, useEffect } from 'react';
import client from '../../../api/client';
import { useAuthStore } from '../../../store/authStore';
import type { Cooperation, CreditScore } from '../../../api/cooperation.api';
import {
  Loader2, MessageSquare, X, Send, Award, Star, CheckCircle, ChevronDown,
} from 'lucide-react';

// ── 信用分徽章子组件 ──
function CreditScoreBadge({ userId }: { userId: string }) {
  const [score, setScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    client.get(`/cooperations/credit-score/${userId}`)
      .then(res => setScore(res.data))
      .catch((err) => { console.warn('[PartnersTab] failed to load credit score:', err); })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
  if (!score) return null;

  const color = score.score >= 75 ? 'text-green-600' : score.score >= 50 ? 'text-amber-600' : 'text-gray-400';
  return (
    <div className={`flex items-center gap-0.5 text-xs font-bold ${color}`} title={score.level}>
      <Award className="w-3.5 h-3.5" />
      {score.score}
    </div>
  );
}

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
        .catch((err) => { console.warn('[PartnersTab] failed to load credit score:', err); })
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
      await client.post('/messages', {
        receiver_id: receiverId,
        content: contactText.trim(),
      });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch { alert(lang === 'en' ? 'Send failed' : '发送失败'); }
    setContactSending(false);
  };

  // Tab: Pending / All
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const filtered = showPendingOnly ? partners.filter(p => p.status === 'pending') : partners;

  return (
    <div className="space-y-6">
      {/* 我的信用分卡片 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">{lang === 'en' ? 'My Credit Score' : '我的信用分'}</p>
            {scoreLoading ? (
              <div className="mt-1"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
            ) : creditScore ? (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">{creditScore.score}</span>
                <span className="text-sm text-white/80">/ 100</span>
                <span className="ml-2 text-sm bg-white/20 px-2 py-0.5 rounded-full">{creditScore.level}</span>
              </div>
            ) : (
              <p className="text-sm text-white/60 mt-1">—</p>
            )}
          </div>
          {creditScore && (
            <div className="text-right text-xs text-white/70 space-y-0.5">
              <p>⭐ {lang === 'en' ? 'Reviews' : '评价'}: {creditScore.details.reviewCount}条 / {creditScore.details.avgRating}</p>
              <p>🤝 {lang === 'en' ? 'Deals' : '合作'}: {creditScore.details.totalCoops}笔</p>
              <p>📅 {lang === 'en' ? 'Registered' : '注册'}: {creditScore.details.daysSinceReg}天</p>
            </div>
          )}
        </div>
      </div>

      {/* 合作状态说明横幅 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <span className="text-base">💡</span>
        </div>
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-semibold text-sm mb-1">{lang === "en" ? "About Cooperation Status" : "关于合作状态"}</p>
          <div className="space-y-1">
            <p><span className="inline-block bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium text-[10px] mr-1">{lang === "en" ? "Pending" : "待确认"}</span>
              {lang === "en" ? "— Waiting for the overseas agent to confirm. Only confirmed cooperations count toward your credit score (+0.5 each)." : "— 等待海外代理确认。确认后会计入信用分（每笔 +0.5分）。"}</p>
            <p><span className="inline-block bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium text-[10px] mr-1">{lang === "en" ? "Confirmed" : "已确认"}</span>
              {lang === "en" ? "— Both sides have confirmed. This cooperation is now on record." : "— 双方均已确认，合作正式记录在案。"}</p>
            <p><span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium text-[10px] mr-1">{lang === "en" ? "Disputed" : "争议中"}</span>
              {lang === "en" ? "— There is an active dispute. The responsible party will lose 15 credit score points." : "— 存在争议纠纷。责任方将被扣除 15 分信用分。"}</p>
          </div>
        </div>
      </div>

      {/* 信用分说明卡片 */}
      <details className="group bg-white rounded-xl border border-gray-200 shadow-sm">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-xl transition-colors select-none">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Award className="w-4 h-4 text-amber-500" />
            {lang === 'en' ? '📖 How is Credit Score Calculated?' : '📖 信用分如何计算？'}
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-500 mb-3">
            {lang === 'en'
              ? 'Credit score ranges from 0 to 100. The higher your score, the more trustworthy you appear to potential partners.'
              : '信用分范围为 0-100 分，分数越高表示信誉越好，越容易获得合作机会。'}
          </div>
          <div className="space-y-2">
            {[
              { icon: '🏆', label: lang === 'en' ? 'Base Score' : '基础分', score: '+50', desc: lang === 'en' ? 'Every registered member starts with 50 points' : '每位注册用户默认获得 50 分基础分' },
              { icon: '⭐', label: lang === 'en' ? 'Reviews' : '评价分', score: '+0~30', desc: lang === 'en' ? 'Average rating / 5 × 30 (no reviews yet: +10)' : '平均评分 / 5 × 30 分（暂无评价给 10 分）' },
              { icon: '🤝', label: lang === 'en' ? 'Cooperations' : '合作分', score: '+0~25', desc: lang === 'en' ? 'Each confirmed cooperation: +0.5, capped at 25' : '每笔已确认合作 +0.5 分，封顶 25 分' },
              { icon: '🪪', label: lang === 'en' ? 'Business Card' : '名片认证', score: '+10', desc: lang === 'en' ? 'Upload your business card and get verified' : '上传公司名片并通过认证' },
              { icon: '📅', label: lang === 'en' ? 'Registered ≥ 1 year' : '注册满 1 年', score: '+5', desc: lang === 'en' ? 'Active member for over 1 year' : '注册时间超过 1 年' },
              { icon: '📅', label: lang === 'en' ? 'Registered ≥ 2 years' : '注册满 2 年', score: '+10', desc: lang === 'en' ? 'Active member for over 2 years (cumulative)' : '注册时间超过 2 年（可累积）' },
              { icon: '⚖️', label: lang === 'en' ? 'Disputes' : '争议扣分', score: '-15/次', desc: lang === 'en' ? 'Each dispute case against you deducts 15 points' : '每有一笔针对您的争议扣 15 分', color: 'text-red-600' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 ${item.color || ''}`}>
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <span className={`text-xs font-bold ${item.color || 'text-primary-600'}`}>{item.score}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
              <Award className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Score Levels' : '等级说明'}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
              {[
                { range: '≥ 90', label: lang === 'en' ? '⭐⭐⭐⭐⭐ Gold' : '⭐⭐⭐⭐⭐ 行业金口碑', color: 'text-amber-700 bg-amber-100' },
                { range: '≥ 75', label: lang === 'en' ? '⭐⭐⭐⭐ Trusted' : '⭐⭐⭐⭐ 非常可靠', color: 'text-green-700 bg-green-100' },
                { range: '≥ 60', label: lang === 'en' ? '⭐⭐⭐ Good' : '⭐⭐⭐ 信誉良好', color: 'text-blue-700 bg-blue-100' },
                { range: '≥ 40', label: lang === 'en' ? '⭐⭐ Basic' : '⭐⭐ 基础可信', color: 'text-gray-700 bg-gray-100' },
              ].map((lv, i) => (
                <div key={i} className={`text-center rounded-lg px-2 py-1.5 ${lv.color}`}>
                  <div className="text-xs font-bold">{lv.range}</div>
                  <div className="text-[9px] mt-0.5">{lv.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* 合作列表标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {lang === 'en' ? 'Cooperation Records' : '合作记录'}
          <span className="text-gray-400 font-normal ml-1">({partners.length})</span>
        </h3>
        <button
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            showPendingOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500'
          }`}
          onClick={() => setShowPendingOnly(!showPendingOnly)}
        >
          {showPendingOnly
            ? (lang === 'en' ? 'Show All' : '显示全部')
            : (lang === 'en' ? `Pending (${partners.filter(p => p.status === 'pending').length})` : `待确认 (${partners.filter(p => p.status === 'pending').length})`)}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {lang === 'en' ? 'No cooperation records yet. Register one!' : '暂无合作记录，快去登记合作吧'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((coop) => {
            const partnerId = isAgent ? coop.forwarder_user_id : coop.agent_user_id;
            const partnerName = coop.partner_name || (isAgent ? coop.forwarder_user_id : coop.agent_user_id);
            const partnerCompany = coop.partner_company || (isAgent ? coop.forwarder_company : coop.agent_company);

            return (
              <div key={coop.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{partnerCompany || partnerName}</h4>
                      {coop.status === 'confirmed' ? (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium" title={lang === 'en' ? 'Both sides have confirmed this cooperation' : '双方已确认此项合作'}>{lang === 'en' ? 'Confirmed' : '已确认'}</span>
                      ) : coop.status === 'disputed' ? (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium" title={lang === 'en' ? 'There is an active dispute on this cooperation' : '该合作存在争议纠纷'}>{lang === 'en' ? 'Disputed' : '争议中'}</span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Pending' : '待确认'}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{partnerName}</p>
                    {coop.service_type && <p className="text-xs text-gray-400 mt-0.5">{lang === 'en' ? 'Service' : '服务类型'}: {coop.service_type}</p>}
                    {coop.description && <p className="text-xs text-gray-500 mt-1">{coop.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{coop.created_at?.slice(0, 10)}</p>
                  </div>

                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    {/* 信用分展示 */}
                    <CreditScoreBadge userId={partnerId} />
                    {/* 评价数 */}
                    {coop.review_count !== undefined && (
                      <span className="text-xs text-amber-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        {coop.avg_rating || '-'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg py-2 transition-colors"
                    onClick={() => { setContactModal(coop); setContactSent(false); setContactText(''); }}>
                    <MessageSquare className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Message' : '联系'}
                  </button>
                  {coop.status === 'pending' && isAgent && (
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg py-2 transition-colors"
                      onClick={() => handleConfirm(coop.id)}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'Confirm' : '确认合作'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 联系弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">{lang === 'en' ? 'Send Message' : '发送消息'}</h3>
              <button onClick={() => setContactModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Message sent' : '消息已发送'}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">{lang === 'en' ? 'Send a message via internal mail' : '通过站内信发送消息'}</p>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3" placeholder={lang === 'en' ? 'Type your message...' : '请输入消息内容...'} value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send' : '发送'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
