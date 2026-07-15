import { useAuthStore } from '../../store/authStore';
import AiAskPanel from '../../components/ai/AiAskPanel';
import { Bot, Sparkles } from 'lucide-react';

export default function AiAskPage() {
  const lang = useAuthStore((s) => s.lang);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6 text-amber-500" />
            {lang === 'en' ? '🤖 Logistics AI Assistant' : '🤖 物流AI助手'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'en'
              ? 'Ask about routes, rates, company reputation, or market trends — all based on community data.'
              : '查航线、问价格、看公司口碑、了解市场趋势——基于社区实时数据回答你的问题。'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">{lang === 'en' ? 'Community Data' : '社区数据驱动'}</span>
        </div>
      </div>

      <AiAskPanel />

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">
          {lang === 'en' ? '💡 Tips:' : '💡 使用提示：'}
        </p>
        <ul className="space-y-1 text-xs">
          <li>{lang === 'en' ? '• Ask about specific routes like "Shenzhen to LAX air freight"' : '• 可以直接问具体航线，如「深圳到LAX空运多少钱」'}</li>
          <li>{lang === 'en' ? '• Check company reputation: "Which forwarders have complaints?"' : '• 可以查公司口碑，如「哪家货代被投诉最多」'}</li>
          <li>{lang === 'en' ? '• Market trends: "What are the hottest routes this week?"' : '• 可以问市场趋势，如「本周最热门的航线是什么」'}</li>
          <li>{lang === 'en' ? '• Answers combine AI with real community data for accuracy' : '• 回答结合AI+社区实时数据，仅供参考，不构成交易建议'}</li>
        </ul>
      </div>
    </div>
  );
}
