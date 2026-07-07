import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lightbulb, Rocket, TrendingUp, MessageSquare, Star, X, ChevronRight } from 'lucide-react';
import { isBusinessRole } from '../../types';

const NEWBIE_KEY = 'newbie_banner_closed';

const TIPS = [
  { icon: Rocket, title: '先发第一条推广！', desc: '点击「数据录入」输入您的优势航线，AI自动解析入库，全平台可见。', color: 'bg-blue-50 text-blue-700' },
  { icon: TrendingUp, title: '看看大家都在搜什么', desc: '首页实时动态显示本周热门搜索，针对性发布曝光率更高。', color: 'bg-orange-50 text-orange-700' },
  { icon: MessageSquare, title: '及时回复询价', desc: '有客户搜索到您的推广时，收件箱会收到消息，回复即自动带联系方式。', color: 'bg-green-50 text-green-700' },
  { icon: Star, title: '多录入多曝光', desc: '录入越多航线，被搜索到的概率越大。建议至少发布5条以上优势航线。', color: 'bg-purple-50 text-purple-700' },
];

export default function NewbieBanner() {
  const user = useAuthStore((s) => s.user);
  const [closed, setClosed] = useState(() => localStorage.getItem(NEWBIE_KEY) === 'true');

  // 仅货代/检测认证/运输保险角色显示
  if (closed || !user || !isBusinessRole(user.role)) return null;

  // 注册超过7天的不显示
  if (user.created_at) {
    const daysSinceRegister = (Date.now() - new Date(user.created_at).getTime()) / 86400000;
    if (daysSinceRegister > 7) return null;
  }

  const handleClose = () => {
    localStorage.setItem(NEWBIE_KEY, 'true');
    setClosed(true);
  };

  const [tipIndex, setTipIndex] = useState(0);
  const currentTip = TIPS[tipIndex];

  return (
    <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 relative overflow-hidden">
      {/* 关闭按钮 */}
      <button onClick={handleClose} className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-500 transition-colors">
        <X className="w-4 h-4" />
      </button>

      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">🆕 新手专享</span>
        <span className="text-xs text-indigo-500">注册前7天</span>
        <span className="text-xs text-indigo-400 ml-auto">{tipIndex + 1}/{TIPS.length}</span>
      </div>

      {/* Tip内容 */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${currentTip.color.split(' ')[0]} flex items-center justify-center flex-shrink-0`}>
          <currentTip.icon className={`w-5 h-5 ${currentTip.color.split(' ')[1]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-800 mb-0.5">{currentTip.title}</h4>
          <p className="text-xs text-gray-600 leading-relaxed">{currentTip.desc}</p>
        </div>
      </div>

      {/* 切换按钮 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100">
        <button
          className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-30"
          disabled={tipIndex === 0}
          onClick={() => setTipIndex(i => i - 1)}
        >
          上一条
        </button>
        <div className="flex gap-1">
          {TIPS.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === tipIndex ? 'bg-indigo-500' : 'bg-indigo-200'}`} />
          ))}
        </div>
        {tipIndex < TIPS.length - 1 ? (
          <button
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
            onClick={() => setTipIndex(i => i + 1)}
          >
            下一条 <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <button
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={handleClose}
          >
            完成，开始使用 ✨
          </button>
        )}
      </div>
    </div>
  );
}
