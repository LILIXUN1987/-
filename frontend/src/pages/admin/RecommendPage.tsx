import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import RecommendPeerCard from '../../components/admin/RecommendPeerCard';
import { Gift, ChevronDown, ChevronUp, Loader2, TrendingUp } from 'lucide-react';
import { getRoleChecks } from '../../types';

export default function RecommendPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);

  const rc = getRoleChecks(user?.role);
  if (rc.isTrader) {
    return <div className="text-center py-16 text-gray-400">{lang === 'en' ? 'No access' : '暂无权限查看'}</div>;
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'en' ? '🎯 Recommend Colleagues' : '🎯 推荐国内同行或同事'}
          </h1>
          <p className="text-sm text-gray-500">
            {lang === 'en'
              ? 'Recommend your forwarder friends, earn tiered rewards'
              : '推荐您的货代同行加入社区，获得阶梯奖励'}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <RecommendPeerCard />
      </div>

      {/* 我的推荐码 */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-5 max-w-2xl">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          {lang === 'en' ? '🔗 Your Referral Link' : '🔗 我的推荐链接'}
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          {lang === 'en'
            ? 'Share this link with your friends. They register and you both get bonuses!'
            : '分享推荐链接给同行，对方注册后双方都获得奖励'}
        </p>
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm bg-gray-50 text-gray-600"
            value={`${window.location.origin}/register?ref=${user?.referral_code || ''}`}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="btn-outline text-sm"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user?.referral_code || ''}`);
              alert(lang === 'en' ? '✅ Copied!' : '✅ 已复制到剪贴板');
            }}
          >
            {lang === 'en' ? 'Copy' : '复制'}
          </button>
        </div>
      </div>
    </div>
  );
}
