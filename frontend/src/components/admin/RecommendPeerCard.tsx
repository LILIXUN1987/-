import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Gift, Send, Loader2, CheckCircle, Users, ChevronDown, ChevronUp,
  Award, TrendingUp, Star,
} from 'lucide-react';

export default function RecommendPeerCard() {
  const lang = useAuthStore((s) => s.lang);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; username: string; bonus_days: number } | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [showRecords, setShowRecords] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await client.get('/referral/recommendations');
      setRecords(res.data.data || []);
    } catch {}
    setRecordsLoading(false);
  };

  useEffect(() => {
    if (showRecords && records.length === 0) fetchRecords();
  }, [showRecords]);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError(lang === 'en' ? 'Please fill in name and email' : '请填写姓名和邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(lang === 'en' ? 'Invalid email format' : '邮箱格式不正确');
      return;
    }
    setSending(true);
    setError('');
    setDone(false);
    setResult(null);
    try {
      const res = await client.post('/referral/recommend', {
        referee_name: name.trim(),
        referee_email: email.trim(),
        referee_company: company.trim() || undefined,
      });
      setResult(res.data);
      setDone(true);
      setName('');
      setEmail('');
      setCompany('');
      fetchRecords();
    } catch (err: any) {
      const errCode = err?.response?.data?.code;
      const errMsg = err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败');
      if (errCode === 'ALREADY_REGISTERED' || errCode === 'ALREADY_INVITED') {
        setError(`⚠️ ${errMsg}`);
      } else {
        setError(errMsg);
      }
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
      {/* ═══ 醒目 BANNER ═══ */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white text-sm">
            {lang === 'en' ? '🎯 Recommend a Colleague & Earn Rewards!' : '🎯 推荐国内同行或同事加入，双方都有奖励！'}
          </h3>
        </div>
        <p className="text-xs text-white/80 mt-1">
          {lang === 'en'
            ? 'Recommend your forwarder friends or colleagues, we auto-create their account and send them an activation email'
            : '推荐您的货代同行或同事，系统自动创建账号并发送开通邮件'}
        </p>
      </div>

      {/* ═══ 阶梯奖励说明（醒目） ═══ */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Award className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-bold text-amber-800">
              {lang === 'en' ? '📈 Tiered Rewards — The More You Recommend, The More You Get!' : '📈 阶梯奖励 — 推荐越多，奖励越多！'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { tier: lang === 'en' ? '1st-2nd' : '第1~2人', days: '+3', icon: '🥉' },
                { tier: lang === 'en' ? '3rd-5th' : '第3~5人', days: '+5', icon: '🥈' },
                { tier: lang === 'en' ? '6th+' : '第6人起', days: '+7', icon: '🥇' },
              ].map((item, i) => (
                <div key={i} className="bg-white/80 rounded-lg p-2.5 text-center border border-amber-100">
                  <div className="text-lg">{item.icon}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.tier}</div>
                  <div className="text-sm font-bold text-amber-700">{item.days}{lang === 'en' ? ' days' : '天'}</div>
                  <div className="text-[9px] text-amber-500">{lang === 'en' ? 'per referral' : '/人'}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-600">
              {lang === 'en'
                ? '💡 Auto-create account + send activation email. The colleague gets 30-day free trial too!'
                : '💡 自动创建账号+发送开通邮件给对方。被推荐人也享受 30 天免费试用期！'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {done && result ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-green-800">{result.message}</p>
            <div className="mt-3 bg-white rounded-lg p-3 text-left text-xs text-gray-600 border border-green-100">
              <p><strong>{lang === 'en' ? 'Username' : '用户名'}:</strong> {result.username}</p>
              <p className="text-gray-400 mt-1">
                {lang === 'en' ? '💡 The colleague will receive an email with login details.' : '💡 对方将收到开通邮件，内含用户名和密码。'}
              </p>
            </div>
            <button className="mt-3 text-xs text-primary-600 hover:underline" onClick={() => setDone(false)}>
              {lang === 'en' ? 'Recommend another colleague →' : '继续推荐另一位同行 →'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-xs">{error}</div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? "Colleague's Name *" : '同行姓名 *'}
              </label>
              <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. Zhang San' : '如：张三'} value={name} onChange={e => { setName(e.target.value); setError(''); }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? "Colleague's Email *" : '同行邮箱 *'}
              </label>
              <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. zhangsan@forwarder.com' : '如：zhangsan@forwarder.com'} value={email} onChange={e => { setEmail(e.target.value); setError(''); }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {lang === 'en' ? "Colleague's Company" : '同行公司名'}
              </label>
              <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. Shenzhen ABC Logistics' : '如：深圳ABC物流'} value={company} onChange={e => setCompany(e.target.value)} />
            </div>

            <button
              className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6 w-full justify-center"
              onClick={handleSubmit}
              disabled={sending || !name.trim() || !email.trim()}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending
                ? (lang === 'en' ? 'Processing...' : '提交中...')
                : (lang === 'en' ? '🎯 Recommend & Earn Days' : '🎯 推荐并拿奖励')}
            </button>

            <p className="text-xs text-gray-400">
              {lang === 'en'
                ? '💡 System will auto-create account, send activation email, and add trial days to your account immediately.'
                : '💡 系统将自动创建账号、发送开通邮件，奖励天数即时到账。'}
            </p>
          </div>
        )}

        {/* 推荐记录 */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          <button
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            onClick={() => setShowRecords(!showRecords)}
          >
            {showRecords ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {lang === 'en' ? `Recommendation History (${records.length})` : `推荐记录 (${records.length})`}
          </button>
          {showRecords && (
            <div className="mt-2 space-y-1.5">
              {recordsLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : records.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">{lang === 'en' ? 'No recommendations yet' : '暂无推荐记录'}</p>
              ) : (
                records.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{r.referee_name} · {r.referee_company || '-'}</p>
                      <p className="text-[10px] text-gray-400">{r.referee_email}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                        +{r.bonus_days}{lang === 'en' ? ' days' : '天'}
                      </span>
                      <span className="text-[10px] text-gray-400">{r.created_at?.slice(0, 10)}</span>
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
