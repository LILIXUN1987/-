import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { getRoleChecks } from '../../types';
import {
  Gift, CheckCircle, Loader2, ArrowRight, Sparkles,
  Users, Send, TrendingUp, Shield, Star, Zap, Clock,
  Package,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface SubInfo {
  subscribed: boolean;
  currentMonth: string | null;
  totalIssued: number;
  sent: number;
  used: number;
}

export default function SubscribePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const rc = getRoleChecks(user?.role);
  const isForwarder = rc.isForwarder || rc.isAdmin;

  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    client.get('/customs-coupons/my-subscription').then(r => {
      const d = r.data;
      setSubInfo({
        subscribed: d.subscribed,
        currentMonth: d.currentMonth || null,
        totalIssued: d.totalIssued || 0,
        sent: d.sent || 0,
        used: d.used || 0,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await client.post('/customs-coupons/subscribe');
      toast.success(res.data.message);
      // 重新加载
      const r = await client.get('/customs-coupons/my-subscription');
      const d = r.data;
      setSubInfo({
        subscribed: d.subscribed,
        currentMonth: d.currentMonth || null,
        totalIssued: d.totalIssued || 0,
        sent: d.sent || 0,
        used: d.used || 0,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Subscription failed' : '开通失败'));
    }
    setSubscribing(false);
  };

  if (!isForwarder) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'Only available to forwarders' : '仅货代用户可开通'}</div>;
  }

  const benefits = [
    { icon: <Gift className="w-5 h-5" />, title: lang === 'en' ? 'Monthly Coupon' : '每月获赠报关券', desc: lang === 'en' ? '1 coupon every month, worth ¥50 each' : '每月1张，面值50元，送外贸客户抵扣报关费' },
    { icon: <Users className="w-5 h-5" />, title: lang === 'en' ? 'Client Relationship' : '维护客户关系', desc: lang === 'en' ? 'Send coupons as gifts to strengthen ties' : '送券给外贸客户，既是福利又是专业体现' },
    { icon: <TrendingUp className="w-5 h-5" />, title: lang === 'en' ? 'Client Activation' : '激活沉默客户', desc: lang === 'en' ? 'Make clients come back with coupon benefits' : '客户收到券后更愿意回头找你下单' },
    { icon: <Shield className="w-5 h-5" />, title: lang === 'en' ? 'Platform Guarantee' : '平台担保', desc: lang === 'en' ? 'Only charged when coupon is actually used' : '券不使用不收费，社区做担保方' },
  ];

  const steps = [
    { num: '①', title: lang === 'en' ? 'Subscribe' : '开通月费', desc: lang === 'en' ? '¥19.9/month' : '19.9元/月' },
    { num: '②', title: lang === 'en' ? 'Get Coupon' : '每月获券', desc: lang === 'en' ? '1 coupon worth ¥50 issued monthly' : '每月1张面值50元报关券到账' },
    { num: '③', title: lang === 'en' ? 'Send to Client' : '赠送给客户', desc: lang === 'en' ? 'Gift it to your trader clients' : '送给您的外贸客户用于报关' },
    { num: '④', title: lang === 'en' ? 'Win-Win' : '共赢', desc: lang === 'en' ? 'Client saves, you gain loyalty' : '客户省报关费，您维护关系' },
  ];

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ═══ 头部 ═══ */}
      <div className="bg-gradient-to-r from-pink-600 via-emerald-600 to-teal-600 rounded-2xl shadow-lg p-8 text-white text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {lang === 'en' ? 'Monthly Customs Coupon' : '🎫 月费报关券'}
        </h1>
        <p className="text-white/80 text-lg mb-6">
          {lang === 'en' ? '¥19.9/month' : '19.9元/月'}
        </p>
        {subInfo?.subscribed ? (
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-6 py-3">
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span className="font-bold text-lg">{lang === 'en' ? '✅ Subscribed' : '✅ 已开通'}</span>
          </div>
        ) : (
          <button
            className="inline-flex items-center gap-2 bg-white text-emerald-700 rounded-full px-8 py-3.5 font-bold text-lg hover:bg-emerald-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {subscribing
              ? (lang === 'en' ? 'Opening...' : '开通中...')
              : (lang === 'en' ? '🔥 Subscribe Now' : '🔥 立即开通')}
          </button>
        )}
        <p className="text-white/60 text-sm mt-3">
          {lang === 'en' ? 'Cancel anytime · Coupons expire in 2 months' : '随时取消 · 券有效期2个月'}
        </p>
        <p className="text-amber-200 text-xs mt-2">
          {lang === 'en' ? '💡 Already enjoying a 30-day free trial from registration' : '💡 注册时已有30天试用期，开通月费立即生效'}
        </p>
      </div>

      {subInfo?.subscribed && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 text-center">
          <p className="text-sm text-emerald-800 font-medium mb-3">
            {lang === 'en' ? '🎉 You are subscribed! Go send coupons to your clients.' : '🎉 已开通，去赠送报关券给客户吧！'}
          </p>
          <button className="btn-primary text-sm" onClick={() => navigate('/admin/coupons')}>
            {lang === 'en' ? 'Send Coupons' : '去送券'}
          </button>
        </div>
      )}

      {/* ═══ 核心玩法 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-5 text-center">
          {lang === 'en' ? '💡 How It Works' : '💡 报关券玩法'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xl font-bold flex items-center justify-center mx-auto mb-2 shadow-md">
                {s.num}
              </div>
              <div className="text-sm font-bold text-gray-800">{s.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
              {i < 3 && <div className="hidden sm:block text-emerald-300 text-lg mt-1">→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 核心权益 ═══ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-5 text-center">
          {lang === 'en' ? '✨ Benefits' : '✨ 四大权益'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                {b.icon}
              </div>
              <div>
                <div className="text-sm font-bold text-gray-800">{b.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 价格对比 ═══ */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6">
        <h2 className="text-sm font-bold text-amber-800 mb-3 text-center">
          {lang === 'en' ? '💰 Pricing' : '💰 定价策略'}
        </h2>
        <div className="max-w-sm mx-auto space-y-2">
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
            <span className="text-sm text-gray-600">{lang === 'en' ? 'Monthly fee' : '月费'}</span>
            <span className="text-lg font-bold text-amber-700">¥19.9</span>
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-amber-100">
            <span className="text-sm text-gray-600">{lang === 'en' ? 'Coupon face value' : '券面值'}</span>
            <span className="text-lg font-bold text-gray-800">¥50</span>
          </div>
          <p className="text-xs text-amber-600 text-center pt-2">
            {lang === 'en' ? '💡 Coupon not used = no extra cost for you' : '💡 外贸客户不使用券=您不产生额外费用'}
          </p>
        </div>
      </div>

      {/* ═══ 未开通广告 ═══ */}
      {!subInfo?.subscribed && (
        <div className="text-center bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-8">
          <Gift className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {lang === 'en' ? '🎯 Start Building Client Loyalty Today' : '🎯 马上开始维护客户关系'}
          </h2>
          <p className="text-sm text-gray-500 mb-5 max-w-md mx-auto">
            {lang === 'en'
              ? 'Each coupon you send brings your clients back. Subscribe now!'
              : '每送出一张券，都是在告诉客户「我在乎你」。立即开通！'}
          </p>
          <button
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full px-8 py-3.5 font-bold text-lg hover:shadow-lg hover:scale-105 transition-all"
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {subscribing
              ? (lang === 'en' ? 'Opening...' : '开通中...')
              : (lang === 'en' ? '🔥 Subscribe Now' : '🔥 立即开通')}
          </button>
        </div>
      )}
    </div>
  );
}
