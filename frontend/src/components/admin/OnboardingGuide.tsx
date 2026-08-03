import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import {
  Ship, Search, FileUp, Mail, MessageSquare, Shield, Star, X, ChevronRight, Check,
  Globe, Users, Gift, Bookmark, AlertTriangle, Truck, Handshake, FileText,
  BarChart3, CreditCard, Sparkles, ArrowRight, MapPin, Bell,
} from 'lucide-react';

const ONBOARDING_KEY = 'onboarding_completed_v3';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to?: string;          // 跳转路由
  highlight?: string;   // 侧边栏匹配关键词
}

function ForwarderSteps(lang: string): OnboardingStep[] {
  const t = (c: string, e: string) => lang === 'en' ? e : c;
  return [
    { icon: <FileUp className="w-6 h-6" />, title: t('发布舱位', 'Post Cargo'), desc: t('在数据录入区输入舱位信息，AI自动解析为结构化数据，一条推广永久有效7天。', 'Enter cargo space info in the data entry area. AI parses it automatically. Each post lasts 7 days.'), to: '/admin/files?tab=entry', highlight: t('发布舱位', 'Post Cargo') },
    { icon: <Search className="w-6 h-6" />, title: t('查询全球舱位', 'Search Cargo'), desc: t('输入港口代码如CAN-SGN，秒查所有相关舱位和价格，找到合适的即可询价。', 'Enter port codes like CAN-SGN to instantly find cargo space and prices.'), to: '/admin/files?tab=query', highlight: t('查舱位', 'Search Cargo') },
    { icon: <MessageSquare className="w-6 h-6" />, title: t('物流询价', 'Inquire'), desc: t('选中合适的舱位，直接在线询价。货代报价后您在收件箱查看回复。', 'Select a cargo space and send an inquiry directly. Forwarders reply in your inbox.'), to: '/admin/quote', highlight: t('物流询价', 'Inquire') },
    { icon: <Mail className="w-6 h-6" />, title: t('查看收件箱', 'Check Inbox'), desc: t('询价回复、客户咨询都在收件箱。回复询价时系统自动附带您的联系方式。', 'Inquiry replies and client messages appear here. Your contact info is auto-attached when replying.'), to: '/admin/inbox', highlight: t('站内信', 'Inbox') },
    { icon: <Gift className="w-6 h-6" />, title: t('领取报关券', 'Get Coupons'), desc: t('每月赠送50元报关券，可以转赠给合作报关行，降低双方成本。', 'Get ¥50 customs coupons monthly. Gift them to your broker to reduce costs.'), to: '/admin/subscribe', highlight: t('开通月费', 'Subscribe') },
    { icon: <Globe className="w-6 h-6" />, title: t('海外DDP询价', 'Overseas DDP'), desc: t('接收海外代理的DDP报价，拓展国际业务，门到门一站式服务。', 'Receive DDP quotes from overseas agents for door-to-door service.'), to: '/admin/ddp', highlight: 'DDP' },
    { icon: <AlertTriangle className="w-6 h-6" />, title: t('查货代口碑', 'Company Lookup'), desc: t('合作前先搜公司名，查看是否被投诉过，保护自己不被坑。', 'Search company names before cooperating to check for complaints.'), to: '/admin/complaints', highlight: t('避雷针', 'Company Lookup') },
    { icon: <Bookmark className="w-6 h-6" />, title: t('下载展会通讯录', 'Download Directory'), desc: t('3000+物流展会真实联系人，标准版以上免费下载全量数据，直接对接同行。', '3000+ real contacts from logistics exhibitions. Standard+ members get full access.'), to: '/admin/card-directory', highlight: t('通讯录', 'Directory') },
  ];
}

function TraderSteps(lang: string): OnboardingStep[] {
  const t = (c: string, e: string) => lang === 'en' ? e : c;
  return [
    { icon: <Search className="w-6 h-6" />, title: t('查舱位', 'Search Cargo'), desc: t('输入始发港和目的港，秒查所有货代发布的舱位和价格，比打电话快10倍。', 'Enter origin and destination ports to instantly find cargo space and prices from all forwarders.'), to: '/admin/files?tab=query', highlight: t('查舱位', 'Search Cargo') },
    { icon: <MessageSquare className="w-6 h-6" />, title: t('发布物流询价', 'Post Inquiry'), desc: t('输入您的货物需求（航线、重量、体积），系统自动推送给相关货代报价。', 'Enter your cargo details and the system pushes your inquiry to relevant forwarders.'), to: '/admin/quote', highlight: t('物流询价', 'Inquire') },
    { icon: <Mail className="w-6 h-6" />, title: t('查看报价回复', 'View Replies'), desc: t('货代报价后收件箱会收到通知，可以对比不同报价选择最合适的。', 'When forwarders reply, you get notified in your inbox. Compare quotes and choose the best.'), to: '/admin/inbox', highlight: t('站内信', 'Inbox') },
    { icon: <Shield className="w-6 h-6" />, title: t('查货代口碑', 'Check Reputation'), desc: t('合作前搜公司名，查看该货代是否有被投诉记录，避免踩坑。', 'Search company names before cooperating to check for complaints.'), to: '/admin/complaints', highlight: t('避雷针', 'Company Lookup') },
    { icon: <Globe className="w-6 h-6" />, title: t('海外DDP', 'Overseas DDP'), desc: t('需要门到门服务？发布DDP需求，海外代理直接报价。', 'Need door-to-door? Post DDP requirements and get quotes from overseas agents.'), to: '/admin/ddp', highlight: 'DDP' },
    { icon: <Gift className="w-6 h-6" />, title: t('领取报关券', 'Get Coupons'), desc: t('外贸用户注册即送体验券，可以用于支付报关费用。', 'Get customs coupons upon registration to pay for customs clearance.'), to: '/admin/coupon-wallet', highlight: t('券包', 'Coupons') },
    { icon: <Bookmark className="w-6 h-6" />, title: t('下载展会通讯录', 'Download Directory'), desc: t('3000+物流展会真实联系人，标准版以上免费下载全量数据，直接对接同行。', '3000+ real contacts from logistics exhibitions. Standard+ members get full access.'), to: '/admin/card-directory', highlight: t('通讯录', 'Directory') },
  ];
}

const ROLE_STEPS: Record<string, (lang: string) => OnboardingStep[]> = {
  forwarder: ForwarderSteps,
  trader: TraderSteps,
};

/** 新手引导主对话框 */
export default function OnboardingGuide() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem(ONBOARDING_KEY);
    if (!flag && user) setShow(true);
  }, [user]);

  if (!show || !user || completed) return null;

  const rc = getRoleChecks(user.role);
  const key = rc.isForwarder ? 'forwarder' : rc.isTrader ? 'trader' : rc.isOverseasAgent ? 'overseas_agent' : '';
  const stepFn = ROLE_STEPS[key];
  const steps = stepFn ? stepFn(lang) : [];
  if (steps.length === 0) return null;

  const totalSteps = steps.length;
  const current = steps[step];

  const goStep = (s: number) => {
    setStep(s);
    const target = steps[s];
    if (target?.to) navigate(target.to);
  };

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setCompleted(true);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      goStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) goStep(step - 1);
  };

  const handleStepClick = (idx: number) => {
    goStep(idx);
  };

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-[100] bg-black/40" />

      {/* 引导对话框 */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden pointer-events-auto" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 p-5 text-white">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Ship className="w-5 h-5" />
                <span className="font-bold text-sm">{lang === 'en' ? '123 Cargo Community' : '123共享外贸物流社区'}</span>
              </div>
              <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold mt-2">
              {lang === 'en' ? `👋 Welcome, ${user.display_name}!` : `👋 欢迎，${user.display_name}！`}
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {lang === 'en' ? 'Quick start guide' : '快速上手'}
              <span className="text-white/60 ml-1">{totalSteps} {lang === 'en' ? 'steps' : '步'}</span>
            </p>
          </div>

          {/* 进度条 */}
          <div className="flex gap-1 px-5 pt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${i <= step ? 'bg-primary-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                onClick={() => handleStepClick(i)}
                title={`${lang === 'en' ? 'Step' : '步骤'} ${i + 1}`}
              />
            ))}
          </div>

          {/* 步骤列表（可滚动） */}
          <div className="p-5 overflow-y-auto" style={{ maxHeight: '50vh' }}>
            {/* 当前步骤详情 */}
            <div className="flex items-start gap-4 mb-5 p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <div className="text-white">{current.icon}</div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  {lang === 'en' ? `Step ${step + 1}` : `步骤 ${step + 1}`}：{current.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{current.desc}</p>
                {current.to && (
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-100 px-3 py-1.5 rounded-full hover:bg-primary-200 transition-colors"
                    onClick={() => navigate(current.to!)}
                  >
                    {lang === 'en' ? 'Go Now' : '立即前往'} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 全部步骤一览 */}
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{lang === 'en' ? 'All Steps' : '全部步骤'}</h4>
            <div className="space-y-1">
              {steps.map((s, i) => {
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <button
                    key={i}
                    onClick={() => handleStepClick(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-primary-50 border border-primary-200 shadow-sm'
                        : isDone
                          ? 'bg-green-50 border border-green-100 opacity-70'
                          : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    {/* 序号/完成标记 */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isDone
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className={`text-sm font-medium truncate ${isActive ? 'text-primary-900' : isDone ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                        {s.title}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">{s.desc}</div>
                    </div>
                    {/* 跳转箭头 */}
                    {s.to && (
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-primary-100 text-primary-600' : 'text-gray-300'
                      }`}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-gray-100">
            <button
              className={`text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 ${step === 0 ? 'invisible' : ''}`}
              onClick={handlePrev}
            >
              {lang === 'en' ? 'Previous' : '上一步'}
            </button>

            <div className="text-xs text-gray-400">
              {step + 1}/{totalSteps}
            </div>

            <button
              className="btn-primary flex items-center gap-1 text-sm px-5 py-2"
              onClick={handleNext}
            >
              {step < totalSteps - 1 ? (
                <>{lang === 'en' ? 'Next' : '下一步'} <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>{lang === 'en' ? 'Done!' : '完成！'} <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** 浮动引导提示（对话框关闭后，侧边栏和首页的醒目引导） */
export function OnboardingFloatingGuide() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const flag = localStorage.getItem(ONBOARDING_KEY);
    // 完成后显示浮动引导（3秒后出现，持续展示）
    if (flag && user) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce">
      <button
        onClick={() => {
          localStorage.removeItem(ONBOARDING_KEY);
          window.location.reload();
        }}
        className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-4 py-3 rounded-2xl shadow-2xl hover:shadow-xl hover:scale-105 transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <div className="text-left">
          <div className="text-sm font-bold">{lang === 'en' ? 'Need help?' : '需要帮助？'}</div>
          <div className="text-[10px] text-white/80">{lang === 'en' ? 'Replay guide' : '重新查看引导'}</div>
        </div>
      </button>
    </div>
  );
}
