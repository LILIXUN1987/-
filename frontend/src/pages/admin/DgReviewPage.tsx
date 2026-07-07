import { useAuthStore } from '../../store/authStore';
import { CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { getRoleChecks } from '../../types';

export default function DgReviewPage() {
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);

  const rc = getRoleChecks(user?.role);
  if (!rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">仅管理员可访问</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Dangerous Goods Review' : '危险品审批'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lang === 'en' ? 'Auto-approval is now enabled' : '已启用自动审核，无需人工审批'}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center max-w-2xl mx-auto mt-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-green-800 mb-3">
          {lang === 'en' ? '✅ Auto-Approval Enabled' : '✅ 已启用自动审核'}
        </h2>
        <div className="text-sm text-green-700 leading-relaxed space-y-2 text-left max-w-sm mx-auto">
          <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{lang === 'en' ? 'Cargo Cases' : '走货实例'}</p>
              <p className="text-xs text-green-600 mt-0.5">{lang === 'en' ? 'Submitted cases are published instantly. No admin review needed.' : '提交即发布，无需管理员审核。'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{lang === 'en' ? 'Agent Registration' : '代理入驻'}</p>
              <p className="text-xs text-green-600 mt-0.5">{lang === 'en' ? 'Auto-approved when conditions are met (≥3 UN cases / ≥2 reviews / uploaded business card).' : '满足条件自动通过（≥3个UN实例 / ≥2条评价 / 已上传名片）。'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{lang === 'en' ? 'FAQ Answers' : 'FAQ回答'}</p>
              <p className="text-xs text-green-600 mt-0.5">{lang === 'en' ? 'Registered dangerous goods agents can answer questions directly.' : '已入驻危险品代理可直接回答问题，管理员仅需处理异常。'}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-green-500 mt-4">
          {lang === 'en' ? '🛡️ Content error reports are sent to you via internal message for review.' : '🛡️ 如用户点击「内容有误」，将通过站内信通知您处理。'}
        </p>
      </div>
    </div>
  );
}
