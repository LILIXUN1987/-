import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import client from '../../api/client';
import {

  CheckCircle, Loader2, ArrowRight, Sparkles,
  Users, TrendingUp, Shield, Clock,
  CreditCard, Crown, X, Smartphone,
} from 'lucide-react';

interface PayPlan {
  id: string; name: string; days: number; price: number; is_active: boolean;
}

interface PlanInfo {
  tier: string; price: number; label: string; currency: string;
  limits: { maxCargoPosts: number; maxInquiries: number; dailyAiQueries: number; couponsPerMonth: number; canContactOverseasAgent: boolean; canUseDDP: boolean; maxDirectoryDownloads: number; canManageTeam: boolean; canUseApi: boolean; };
}

const PLAN_META: Record<string, { icon: string; gradient: string; badge: string; color: string; features: { key: string; label: string }[] }> = {
  free: {
    icon: '🌱', gradient: 'from-gray-400 to-gray-500', badge: 'bg-gray-100 text-gray-600', color: 'text-gray-600',
    features: [
      { key: 'maxCargoPosts', label: '月发布舱位' }, { key: 'maxInquiries', label: '月询价额度' },
      { key: 'dailyAiQueries', label: 'AI问答/天' }, { key: 'couponsPerMonth', label: '报关券' },
      { key: 'canContactOverseasAgent', label: '联系海外代理' }, { key: 'canUseDDP', label: '海外DDP' },
      { key: 'maxDirectoryDownloads', label: '通讯录下载' }, { key: 'canManageTeam', label: '团队子账号' },
      { key: 'canUseApi', label: 'API密钥' },
    ],
  },
  standard: {
    icon: '⭐', gradient: 'from-emerald-400 to-teal-500', badge: 'bg-emerald-100 text-emerald-700', color: 'text-emerald-600',
    features: [
      { key: 'maxCargoPosts', label: '月发布舱位' }, { key: 'maxInquiries', label: '月询价额度' },
      { key: 'dailyAiQueries', label: 'AI问答/天' }, { key: 'couponsPerMonth', label: '报关券' },
      { key: 'canContactOverseasAgent', label: '联系海外代理' }, { key: 'canUseDDP', label: '海外DDP' },
      { key: 'maxDirectoryDownloads', label: '通讯录下载' }, { key: 'canManageTeam', label: '团队子账号' },
      { key: 'canUseApi', label: 'API密钥' },
    ],
  },
  pro: {
    icon: '👑', gradient: 'from-purple-400 to-indigo-500', badge: 'bg-purple-100 text-purple-700', color: 'text-purple-600',
    features: [
      { key: 'maxCargoPosts', label: '月发布舱位' }, { key: 'maxInquiries', label: '月询价额度' },
      { key: 'dailyAiQueries', label: 'AI问答/天' }, { key: 'couponsPerMonth', label: '报关券' },
      { key: 'canContactOverseasAgent', label: '联系海外代理' }, { key: 'canUseDDP', label: '海外DDP' },
      { key: 'maxDirectoryDownloads', label: '通讯录下载' }, { key: 'canManageTeam', label: '团队子账号' },
      { key: 'canUseApi', label: 'API密钥' },
    ],
  },
  enterprise: {
    icon: '🏢', gradient: 'from-amber-400 to-orange-500', badge: 'bg-amber-100 text-amber-700', color: 'text-amber-600',
    features: [
      { key: 'maxCargoPosts', label: '月发布舱位' }, { key: 'maxInquiries', label: '月询价额度' },
      { key: 'dailyAiQueries', label: 'AI问答/天' }, { key: 'couponsPerMonth', label: '报关券' },
      { key: 'canContactOverseasAgent', label: '联系海外代理' }, { key: 'canUseDDP', label: '海外DDP' },
      { key: 'maxDirectoryDownloads', label: '通讯录下载' }, { key: 'canManageTeam', label: '团队子账号' },
      { key: 'canUseApi', label: 'API密钥' },
    ],
  },
};

function tierName(t: string): string {
  const map: Record<string, string> = { free: '免费版', standard: '标准版', pro: '专业版', enterprise: '企业版' };
  return map[t] || t;
}

export default function SubscribePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const myTrialEnd = user?.trial_end || '';

  const [plans, setPlans] = useState<PayPlan[]>([]);
  const [currentTier, setCurrentTier] = useState((user as any)?.plan_tier || 'standard');
  const [loading, setLoading] = useState(true);
  const [payPlanId, setPayPlanId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [qrcodeContent, setQrcodeContent] = useState('');
  const [payOrderId, setPayOrderId] = useState('');
  const [paySuccess, setPaySuccess] = useState(false);
  const [payChannel, setPayChannel] = useState<'alipay' | 'wechat' | 'paypal'>('wechat');
  const [alipayConfigured, setAlipayConfigured] = useState(false);
  const [wechatConfigured, setWechatConfigured] = useState(false);
  const [paypalConfigured, setPaypalConfigured] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo[]>([]);
  const [trialExpired, setTrialExpired] = useState(false);
  const rc = getRoleChecks(user?.role);
  const isOverseasAgent = rc.isOverseasAgent;

  useEffect(() => {
    Promise.all([
      client.get('/payment/plans').then((r: any) => {
        setPlans(r.data?.data || []);
        setAlipayConfigured(r.data?.alipay_configured || false);
        setWechatConfigured(r.data?.wechat_configured || false);
        setPaypalConfigured(r.data?.paypal_configured || false);
      }),
      client.get('/plans/info').then((r: any) => {
        setCurrentTier(r.data?.tier || (user as any)?.plan_tier || 'standard');
        setPlanInfo(r.data?.allPlans || []);
        setTrialExpired(r.data?.isExpired === true);
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pollOrder = (orderId: string) => {
    const timer = setInterval(async () => {
      try {
        const r = await client.get(`/payment/query/${orderId}`);
        if (r.data.status === 'paid') {
          setPaySuccess(true);
          clearInterval(timer);
          // 刷新套餐信息
          try {
            const info = await client.get('/plans/info');
            setCurrentTier(info.data?.tier || 'standard');
          } catch {}
        }
      } catch {}
    }, 3000);
    setTimeout(() => clearInterval(timer), 300000);
  };

  const handlePay = async (planId: string, channel: 'alipay' | 'wechat' | 'paypal') => {
    setPayPlanId(planId);
    setPayLoading(true);
    setPayChannel(channel);
    setQrcodeContent('');
    setPaySuccess(false);
    try {
      const r = await client.post('/payment/create-order', { plan_id: planId, channel });
      setPayOrderId(r.data.order_id);
      if (r.data.pay_method === 'redirect') {
        window.open(r.data.pay_content, '_blank');
      } else {
        setQrcodeContent(r.data.pay_content);
      }
      pollOrder(r.data.order_id);
    } catch (err: any) {
      alert(err?.response?.data?.error || (lang === 'en' ? 'Order failed' : '创建订单失败'));
    } finally { setPayLoading(false); }
  };

  const isExpired = myTrialEnd ? new Date(myTrialEnd + 'T23:59:59') < new Date() : false;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative z-10 px-8 py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/30 ring-4 ring-white/10">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {lang === 'en' ? 'Plans & Pricing' : '套餐与定价'}
          </h1>
          <p className="text-white/60 mb-6 max-w-xl mx-auto">
            {isOverseasAgent
              ? (lang === 'en' ? 'Choose the plan that fits your business. Payment via international channels.' : '选择适合您业务的套餐。')
              : lang === 'en' ? 'Choose the plan that fits your business.' : '选择适合您的业务规模的套餐，支付宝/微信扫码支付。'}
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-2 text-sm text-white/80">
            <Clock className="w-4 h-4" />
            {lang === 'en'
              ? `Current: ${currentTier === 'free' ? 'Free' : tierName(currentTier)}${myTrialEnd && !isExpired ? ` · Trial until ${myTrialEnd}` : ''}`
              : `当前：${tierName(currentTier)}${myTrialEnd && !isExpired ? ` · 试用至 ${myTrialEnd}` : ''}`}
          </div>
        </div>
      </div>

      {/* 试用到期提醒 */}
      {currentTier === 'free' && trialExpired && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-900">
                {lang === 'en' ? '⏰ Trial Expired' : '⏰ 30天体验已到期'}
              </h3>
              <p className="text-sm text-amber-800 mt-1">
                {lang === 'en'
                  ? 'Your free trial has ended. Your account has been downgraded to Free plan with limited features. Upgrade to Standard or above to unlock full access.'
                  : '您的免费体验已结束，当前已自动降级为免费版。升级至标准版及以上即可恢复全部功能。'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-5 py-2 shadow-md hover:shadow-lg transition-all"
                  onClick={() => document.getElementById('plans-anchor')?.scrollIntoView({ behavior: 'smooth' })}>
                  {lang === 'en' ? '🔥 Upgrade Now' : '🔥 立即升级'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div id="plans-anchor" />
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const info = planInfo.find(p => Number(p.price) === Number(plan.price)) || planInfo[plans.indexOf(plan)];
            const tier = info?.tier || (plan.name.includes('标准') ? 'standard' : plan.name.includes('专业') ? 'pro' : plan.name.includes('企业') ? 'enterprise' : 'free');
            const meta = PLAN_META[tier] || PLAN_META.free;
            const isCurrent = currentTier === tier;
            const isPaying = payPlanId === plan.id;

            return (
              <div key={plan.id}
                className={`relative bg-white rounded-2xl border-2 shadow-sm transition-all duration-300 overflow-hidden ${
                  isCurrent ? 'border-emerald-300 ring-2 ring-emerald-100 scale-[1.02]' : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                }`}
              >
                {isCurrent && <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${meta.gradient}`} />}

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg">{meta.icon}</span>
                      <h3 className="text-base font-bold text-gray-900 mt-1">{plan.name}</h3>
                    </div>
                    {isCurrent && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
                        {lang === 'en' ? 'Current' : '当前'}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    {Number(plan.price) > 0 ? (
                      <><span className="text-3xl font-bold text-gray-900">{isOverseasAgent ? '$' : '¥'}{Number(plan.price).toFixed(isOverseasAgent ? 2 : 1)}</span>
                        <span className="text-sm text-gray-500 ml-1">/{plan.days}{lang === 'en' ? 'days' : '天'}</span></>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Free' : '免费'}</span>
                    )}
                  </div>

                  <ul className="space-y-2 mb-4">
                    {meta.features.map((f) => {
                      const limits = info?.limits as any;
                      const val = limits?.[f.key];
                      const isInc = val !== undefined && val !== 0 && val !== false;
                      return (
                        <li key={f.key} className="flex items-center gap-2 text-xs">
                          {isInc ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                          <span className={isInc ? 'text-gray-700' : 'text-gray-400'}>
                            {f.label}{isInc && val !== true ? ` ${val === -1 ? (lang === 'en' ? '∞' : '∞') : val}` : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {isCurrent ? (
                    <div className="text-center text-sm font-medium text-emerald-600 bg-emerald-50 rounded-xl py-2.5 border border-emerald-200">
                      <CheckCircle className="w-4 h-4 inline mr-1" />{lang === 'en' ? 'Current Plan' : '当前套餐'}
                    </div>
                  ) : Number(plan.price) === 0 ? (
                    <div className="text-center text-sm text-gray-400 bg-gray-50 rounded-xl py-2.5 border border-gray-200">
                      {lang === 'en' ? 'Free' : '免费'}
                    </div>
                  ) : isPaying && qrcodeContent ? (
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrcodeContent)}`} alt="QR" className="w-36 h-36" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{lang === 'en' ? 'Scan with WeChat/Alipay' : '扫码支付'}</p>
                      <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />{lang === 'en' ? 'Waiting...' : '等待支付...'}
                      </div>
                    </div>
                  ) : paySuccess && isPaying ? (
                    <div className="text-center text-sm font-medium text-green-600 bg-green-50 rounded-xl py-2.5 border border-green-200">
                      <CheckCircle className="w-4 h-4 inline mr-1" />{lang === 'en' ? 'Payment successful!' : '支付成功！套餐已升级'}
                    </div>
                  ) : isOverseasAgent ? (
                    <div className="space-y-2">
                      {paypalConfigured ? (
                        <button className="w-full text-sm font-bold text-white rounded-xl py-2.5 transition-all shadow-md hover:shadow-lg bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 flex items-center justify-center gap-1"
                          onClick={() => handlePay(plan.id, 'paypal')} disabled={payLoading}>
                          {payLoading && payPlanId === plan.id && payChannel === 'paypal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          PayPal
                        </button>
                      ) : (
                        <div className="text-center text-sm text-gray-400 bg-gray-50 rounded-xl py-2.5 border border-gray-200">
                          {lang === 'en' ? 'International payment coming soon' : '国际支付即将上线'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {wechatConfigured && (
                        <button className="w-full text-sm font-bold text-white rounded-xl py-2.5 transition-all shadow-md hover:shadow-lg bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 flex items-center justify-center gap-1"
                          onClick={() => handlePay(plan.id, 'wechat')} disabled={payLoading}>
                          {payLoading && payPlanId === plan.id && payChannel === 'wechat' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                          微信支付
                        </button>
                      )}
                      {alipayConfigured && (
                        <button className="w-full text-sm font-bold text-white rounded-xl py-2.5 transition-all shadow-md hover:shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 flex items-center justify-center gap-1"
                          onClick={() => handlePay(plan.id, 'alipay')} disabled={payLoading}>
                          {payLoading && payPlanId === plan.id && payChannel === 'alipay' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                          支付宝
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
