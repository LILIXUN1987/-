import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Clock, AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { isBusinessRole } from '../../types';

export default function TrialBanner() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const role = (user as any)?.role;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isBusinessRole(role)) return;

    const calcRemaining = () => {
      const trialEnd = (user as any)?.trial_end;
      if (!trialEnd) return;
      const now = new Date();
      const end = new Date(trialEnd + 'T23:59:59');
      const diff = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      setRemaining(Math.max(0, diff));
    };

    calcRemaining();
    const timer = setInterval(calcRemaining, 3600000);
    return () => clearInterval(timer);
  }, [user, role]);

  if (remaining === null) return null;

  const isExpired = remaining <= 0;
  const isWarning = remaining <= 7 && remaining > 0;

  if (isExpired) {
    return (
      <div className="w-full h-full bg-gradient-to-r from-red-600 via-rose-500 to-pink-500 rounded-2xl shadow-lg p-5 text-white min-h-[90px] flex items-center">
        <div className="flex items-start gap-4 w-full">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black drop-shadow-sm">
              {lang === 'en' ? '⚠️ Trial Expired' : '⚠️ 体验期已结束'}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/90">
              <span>{lang === 'en' ? '❌ Data entry / file upload' : '❌ 数据录入、文件上传'}</span>
              <span className="text-green-200">✅ {lang === 'en' ? 'Search & browse' : '查询功能正常'}</span>
              <span>{lang === 'en' ? '❌ Reply to inquiries' : '❌ 回复询价'}</span>
              <span className="text-green-200">✅ {lang === 'en' ? 'Inbox receives' : '收件箱可接收'}</span>
            </div>
            <button
              onClick={() => navigate('/admin/renew')}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold bg-white text-red-700 px-4 py-2 rounded-xl hover:bg-red-50 transition-all shadow-sm hover:shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              {lang === 'en' ? 'Renew Now — ¥19.9/mo' : '立即续期 — ¥19.9/月'}
            </button>
          </div>
          <div className="flex-shrink-0 hidden sm:flex items-center">
            <div className="text-right">
              <div className="text-3xl font-black text-white/80">!</div>
              <div className="text-[10px] text-white/60">{lang === 'en' ? 'Expired' : '已过期'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isWarning) {
    return (
      <div className="w-full h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-400 rounded-2xl shadow-lg p-5 text-white min-h-[90px] flex items-center">
        <div className="flex items-start gap-4 w-full">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black drop-shadow-sm">
              {lang === 'en' ? `⏰ ${remaining} days left in trial` : `⏰ 免费体验剩余 ${remaining} 天`}
            </p>
            <p className="text-xs text-white/80 mt-1">
              {lang === 'en' ? 'Renew now to keep all features active' : '续期后即可继续使用全部功能'}
            </p>
            <button
              onClick={() => navigate('/admin/renew')}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold bg-white text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-50 transition-all shadow-sm hover:shadow-md"
            >
              <CreditCard className="w-4 h-4" />
              {lang === 'en' ? 'Renew Now' : '立即续期'}
            </button>
          </div>
          <div className="flex-shrink-0 hidden sm:flex items-center">
            <div className="text-right">
              <div className="text-3xl font-black text-white/80">{remaining}</div>
              <div className="text-[10px] text-white/60">{lang === 'en' ? 'days' : '天'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 正常试用期（>7天）— 保持简洁
  return (
    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-4 text-white min-h-[90px] flex items-center">
      <div className="flex items-center gap-3 w-full">
        <Clock className="w-5 h-5 text-white/80 flex-shrink-0" />
        <p className="text-sm font-medium">
          {lang === 'en' ? `Free trial: ${remaining} days remaining` : `免费体验剩余 ${remaining} 天`}
        </p>
        <button
          onClick={() => navigate('/admin/subscribe')}
          className="ml-auto text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          {lang === 'en' ? 'View Plans →' : '查看套餐 →'}
        </button>
      </div>
    </div>
  );
}
