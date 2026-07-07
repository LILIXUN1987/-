import { useState, useEffect } from 'react';
import client from '../../api/client';
import {
  Shield, MessageSquare, Search, Heart, Edit3,
  Gift, Share2, Copy, Check, Users, Star, Eye, Zap, Loader2
} from 'lucide-react';

interface Benefits {
  referral_code: string;
  referral_count: number;
  tier: number;
  favorites_limit: number;
  compare_limit: number;
  has_subscription: boolean;
}

export default function TraderGuide() {
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get<{ data: Benefits }>('/referral/benefits');
        setBenefits(res.data.data);
      } catch {}
    })();
  }, []);

  const handleCopyReferral = () => {
    if (!benefits) return;
    const url = `${window.location.origin}/register?ref=${benefits.referral_code || ''}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900 text-sm">隐私保护与查询指南</h3>
      </div>

      <div className="flex-1 space-y-3 text-sm text-gray-700 leading-relaxed overflow-y-auto">
        <p className="flex gap-2">
          <Shield className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
          <span>首先，我们在注册时不要求您录入手机号码，社区内也不会主动要求您提供手机号码。如果使用过程中有满意的货代，可通过收件箱进行手机号码交货，避免电话营销骚扰！！！</span>
        </p>

        <div className="flex gap-2">
          <Search className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <span>
            <strong>举例空运查询助手：</strong>输入完整的件数+重量+体积+始发港+目的港或者目的国家5要素将自动将你的需求推送给有发布过此始发港与目的港航线的货运代理，也可以只输入始发港+目的港进行粗略查询。
          </span>
        </div>

        <div className="flex gap-2">
          <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <span>以上两种查询均不会主动推送您的手机号码到货代手上，您可以在货代回复您的收件箱中进行交互式沟通，如果对选择的货代满意，您可以主动通过收件箱发送手机号码联系对应的货运代理。</span>
        </div>

        <p className="flex gap-2">
          <Heart className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <span>所有社区查询到的报价都是当天最新报价与特价信息，时效性与准确性非常高，相信对您有所帮助！</span>
        </p>
      </div>

      {/* ── 推荐入口（外贸专属） ── */}
      <div className="mt-4 bg-white/70 rounded-xl border border-purple-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold text-purple-900">邀请好友，解锁更多权益</span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />收藏夹容量</span>
            <span className={benefits && benefits.referral_count >= 1 ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {benefits && benefits.referral_count >= 1 ? '200条 ✅' : '50条 → 推荐1人解锁200条'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1"><Eye className="w-3 h-3 text-blue-400" />对比查询上限</span>
            <span className={benefits && benefits.referral_count >= 3 ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {benefits && benefits.referral_count >= 3 ? '20条 ✅' : '5条 → 推荐3人解锁20条'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />航线订阅推送</span>
            <span className={benefits && benefits.has_subscription ? 'text-green-600 font-medium' : 'text-gray-400'}>
              {benefits && benefits.has_subscription ? '已解锁 ✅' : '推荐5人解锁'}
            </span>
          </div>
        </div>

        <button
          className="w-full flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg py-2 hover:from-pink-600 hover:to-rose-600 transition-colors"
          onClick={handleCopyReferral}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? '链接已复制，分享给外贸朋友吧！' : '📤 复制推荐链接，分享给外贸同行'}
        </button>
      </div>

      <div className="bg-white/70 rounded-lg px-3 py-2 mt-2">
        <p className="flex gap-2 text-sm text-gray-700">
          <Edit3 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <span>如果有任何建议，请在侧边栏「群友建议」处进行提交，你的建议一定会被重视！！！</span>
        </p>
      </div>
    </div>
  );
}
