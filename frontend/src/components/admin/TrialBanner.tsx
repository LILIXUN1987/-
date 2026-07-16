import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Clock, AlertTriangle } from 'lucide-react';
import { isBusinessRole } from '../../types';

export default function TrialBanner() {
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

  const containerBg = isExpired
    ? 'bg-red-50 border-red-200'
    : isWarning
      ? 'bg-amber-50 border-amber-200'
      : 'bg-blue-50 border-blue-200';

  const textColor = isExpired
    ? 'text-red-800'
    : isWarning
      ? 'text-amber-800'
      : 'text-blue-800';

  return (
    <div className={`${containerBg} border rounded-2xl p-6 shadow-sm h-full flex flex-col items-center justify-center text-center`}>
      {isExpired ? (
        <>
          <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm font-bold text-red-800">
            {lang === 'en' ? 'Trial period has ended. Limited functionality:' : '体验期已结束，以下功能受限：'}
          </p>
          <ul className="text-xs text-red-700 mt-2 text-left list-disc pl-4 space-y-1">
            <li>{lang === 'en' ? '❌ Data entry (text parsing, file upload, edit/delete)' : '❌ 数据录入（文本解析录入、文件上传、修改删除）'}</li>
            <li>{lang === 'en' ? '✅ Search & browse normal' : '✅ 查询功能正常'}</li>
            <li>{lang === 'en' ? '✅ Inbox receives messages, but cannot reply to inquiries' : '✅ 收件箱可接收消息，但无法回复询价'}</li>
          </ul>
          <p className="text-xs text-red-600 mt-3 font-medium">
            {lang === 'en' ? 'Contact admin to renew and restore full functionality' : '请联系管理员续期以恢复全部功能'}
          </p>
        </>
      ) : (
        <>
          <Clock className={`w-8 h-8 mb-2 ${isWarning ? 'text-amber-500' : 'text-blue-500'}`} />
          <p className={`text-sm font-medium ${textColor}`}>
            {lang === 'en' ? 'Free trial: ' : '免费体验剩余 '}
            <span className="font-bold text-2xl">{remaining}</span>
            {lang === 'en' ? ' days' : ' 天'}
          </p>
          <p className={`text-xs ${isWarning ? 'text-amber-600' : 'text-blue-600'}`}>
            {isWarning
              ? (lang === 'en' ? 'Expiring soon, please contact admin' : '即将到期，请及时联系管理员')
              : (lang === 'en' ? '30-day trial period' : '30个自然日体验期')}
          </p>
        </>
      )}
    </div>
  );
}
