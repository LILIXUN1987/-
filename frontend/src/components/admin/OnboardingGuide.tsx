import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Ship, Search, FileUp, Mail, MessageSquare, Shield, Star, X, ChevronRight, Check } from 'lucide-react';
import { getRoleChecks } from '../../types';

const ONBOARDING_KEY = 'onboarding_completed_v1';

const TRADER_STEPS = [
  { icon: Search, title: '搜索推广信息', desc: '在查询助手中输入港口代码，如 CAN-SGN 或 广州-洛杉矶，秒出所有相关推广信息。' },
  { icon: Star, title: '收藏感兴趣的推广', desc: '在搜索结果中点击 ⭐ 星号收藏，方便日后随时查看。' },
  { icon: Mail, title: '发起询价', desc: '输入始发港+目的港+件数+重量+体积，系统自动推送给相关货代，等待报价回复。' },
  { icon: MessageSquare, title: '查看回复', desc: '货代回复后，收件箱会收到消息。可以在「我的询价」中查看哪些已回复、哪些在等待。' },
  { icon: Shield, title: '合作前先查风险', desc: '在「风险代理查询」中搜索公司名，查看是否有被投诉记录，避免踩坑。' },
];

const FORWARDER_STEPS = [
  { icon: FileUp, title: '录入推广信息', desc: '在数据录入区输入仓位信息，AI 自动解析为结构化数据，一条推广永久有效。' },
  { icon: Search, title: '查看推广统计', desc: '录入后可在统计面板看到每条推广的浏览量和询价量，知道哪条航线最受欢迎。' },
  { icon: Mail, title: '回复询价', desc: '有客户搜索到您的推广时，收件箱会收到询价通知，及时回复获取订单。' },
  { icon: MessageSquare, title: '回复自动带联系方式', desc: '在收件箱回复询价时，系统会自动在末尾加上您的姓名和手机号，方便客户联系。' },
  { icon: Star, title: '关注热门航线', desc: '定期查看统计数据，了解哪些航线被搜索最多，针对性更新推广信息。' },
];

export default function OnboardingGuide() {
  const user = useAuthStore((s) => s.user);
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed && user) {
      setShow(true);
    }
  }, [user]);

  if (!show || !user) return null;

  const rc = getRoleChecks(user.role);
  const isTrader = rc.isTrader;
  const steps = isTrader ? TRADER_STEPS : FORWARDER_STEPS;
  const totalSteps = steps.length;
  const current = steps[step];

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShow(false);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5" />
              <span className="font-bold text-sm">123共享外贸物流社区</span>
            </div>
            <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h2 className="text-lg font-bold mt-2">
            👋 欢迎，{user.display_name}！
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {isTrader ? '外贸行业' : rc.isLawyer ? '社区律师' : '货运代理'} · 快速上手 {totalSteps} 步
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-5 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-primary-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <current.icon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900 text-base mb-1">
                步骤 {step + 1}：{current.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{current.desc}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5 pt-2 border-t border-gray-100">
          <button
            className={`text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 ${step === 0 ? 'invisible' : ''}`}
            onClick={handlePrev}
          >
            上一步
          </button>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            {step + 1}/{totalSteps}
          </div>

          <button
            className="btn-primary flex items-center gap-1 text-sm px-5 py-2"
            onClick={handleNext}
          >
            {step < totalSteps - 1 ? (
              <>下一步 <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>完成 <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
