import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { Send, Loader2, CheckCircle, Users, Mail, ChevronDown, ChevronUp, Clock, Award, Gift, Globe } from 'lucide-react';

export default function InviteAgentCard() {
  const lang = useAuthStore((s) => s.lang);
  const [agentEmail, setAgentEmail] = useState('');
  const [agentName, setAgentName] = useState('');
  const [inviterEnglishName, setInviterEnglishName] = useState('');
  const [inviterEnglishCompany, setInviterEnglishCompany] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await client.get('/invite-agent/my-invitations');
      setInvitations(res.data.data || []);
    } catch {}
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (showHistory && invitations.length === 0) fetchHistory();
  }, [showHistory]);

  const handleSend = async () => {
    if (!agentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agentEmail)) {
      setError(lang === 'en' ? 'Please enter a valid email' : '请填写有效的邮箱地址');
      return;
    }
    if (!inviterEnglishName.trim()) {
      setError(lang === 'en' ? 'Please enter your English name' : '请填写您的英文姓名');
      return;
    }
    setSending(true);
    setError('');
    setDone(false);
    try {
      await client.post('/invite-agent', {
        agent_email: agentEmail.trim(),
        agent_name: agentName.trim() || undefined,
        inviter_english_name: inviterEnglishName.trim(),
        inviter_english_company: inviterEnglishCompany.trim() || undefined,
      });
      setDone(true);
      setAgentEmail('');
      setAgentName('');
      setInviterEnglishName('');
      setInviterEnglishCompany('');
      setTimeout(() => setDone(false), 3000);
      fetchHistory();
    } catch (err: any) {
      setError(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white text-sm">
            {lang === 'en' ? '🌍 Invite Overseas Agents' : '🌍 邀请海外代理入驻'}
          </h3>
        </div>
        <p className="text-xs text-white/80 mt-1">
          {lang === 'en'
            ? 'Invite your overseas partners to join and grow your international network'
            : '邀请您合作过的海外代理加入社区，拓展您的国际网络'}
        </p>
      </div>

      {/* ⭐⭐⭐ 醒目的奖励说明 ⭐⭐⭐ */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Gift className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-amber-800">
              {lang === 'en' ? '🎁 Invite & Earn Trial Extensions!' : '🎁 邀请有奖！立即获得试用期延长'}
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">+15 天</span>
                <span className="text-amber-700">
                  {lang === 'en' ? 'You get 15 extra trial days just for inviting!' : '邀请就送！只要发送邀请，立即获得 15 天试用期延长'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">+60 天</span>
                <span className="text-amber-700">
                  {lang === 'en'
                    ? 'If your agent registers, you get another 45 days + agent gets 60 days free!'
                    : '海外代理接受邀请并注册，您再得 45 天，对方得 60 天免费体验期！'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-amber-600">
              {lang === 'en' ? '💡 The more agents you invite and register, the more trial days you earn — no upper limit!' : '💡 邀请越多注册越多，试用期无限累积，上不封顶！'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">
              {lang === 'en' ? '✅ Invitation sent! +15 trial days granted!' : '✅ 邀请已发送！+15 天试用期已到账！'}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {lang === 'en'
                ? 'An invitation email has been sent. You\'ll be notified when they register.'
                : '邀请邮件已发送至对方邮箱。对方注册后您将收到通知，并获得额外奖励。'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-xs">{error}</div>
            )}

            {/* 邀请人英文姓名（必填） */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? 'Your English Name *' : '您的英文姓名 *'}
                <span className="text-gray-400 font-normal ml-1">
                  ({lang === 'en' ? 'shown in the invitation email' : '老外只看英文名，必填'})
                </span>
              </label>
              <input
                className="input-field w-full text-sm"
                placeholder={lang === 'en' ? 'e.g. Tom Wang' : '如：Tom Wang'}
                value={inviterEnglishName}
                onChange={e => { setInviterEnglishName(e.target.value); setError(''); }}
              />
            </div>

            {/* 邀请人英文公司名 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? 'Your Company Name (English) *' : '贵司英文名称 *'}
                <span className="text-gray-400 font-normal ml-1">
                  ({lang === 'en' ? 'shown in the invitation email' : '老外不认识中文公司名，必填'})
                </span>
              </label>
              <input
                className="input-field w-full text-sm"
                placeholder={lang === 'en' ? 'e.g. Shenzhen Global Logistics Co., Ltd.' : '如：Shenzhen Global Logistics Co., Ltd.'}
                value={inviterEnglishCompany}
                onChange={e => setInviterEnglishCompany(e.target.value)}
              />
            </div>

            <hr className="border-gray-100" />

            {/* 代理邮箱 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? "Agent's Email *" : '海外代理邮箱 *'}
              </label>
              <input
                className="input-field w-full text-sm"
                placeholder={lang === 'en' ? 'e.g. john@forwarder.com' : '如：john@forwarder.com'}
                value={agentEmail}
                onChange={e => { setAgentEmail(e.target.value); setError(''); }}
              />
            </div>

            {/* 代理姓名（选填） */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? "Agent's Name (optional)" : '海外代理姓名（选填）'}
              </label>
              <input
                className="input-field w-full text-sm"
                placeholder={lang === 'en' ? 'e.g. John Smith' : '如：John Smith'}
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
              />
            </div>

            <button
              className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6 w-full justify-center"
              onClick={handleSend}
              disabled={sending || !agentEmail.trim() || !inviterEnglishName.trim()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending
                ? (lang === 'en' ? 'Sending...' : '发送中...')
                : (lang === 'en' ? '✉️ Send Invitation (+15 Days)' : '✉️ 发送邀请（+15天）')}
            </button>

            <p className="text-xs text-gray-400">
              {lang === 'en'
                ? '💡 Your partner will receive an English invitation email. Once they register, you earn another 45 days + they get 60 days free!'
                : '💡 对方将收到英文邀请邮件。入驻后您再得 45 天，对方得 60 天免费体验期！'}
            </p>
          </div>
        )}

        {/* 邀请历史 */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {lang === 'en' ? `Invitation History (${invitations.length})` : `邀请记录 (${invitations.length})`}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {historyLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : invitations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  {lang === 'en' ? 'No invitations yet' : '暂无邀请记录'}
                </p>
              ) : (
                invitations.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">
                        {inv.agent_name || inv.agent_email}
                      </p>
                      <p className="text-[10px] text-gray-400">{inv.agent_email}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {inv.status === 'registered' ? (
                        <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                          {lang === 'en' ? '✅ Registered' : '✅ 已注册'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                          {lang === 'en' ? '⏳ Pending' : '⏳ 待注册'}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{inv.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
