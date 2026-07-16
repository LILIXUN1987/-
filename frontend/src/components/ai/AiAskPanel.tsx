import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import { Send, Loader2, Sparkles, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AiAskPanel() {
  const lang = useAuthStore((s) => s.lang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const greetingShown = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载热搜作为快捷问题
  useEffect(() => {
    client.get('/cargo-spaces/trending').then((r: any) => {
      const hot = (r.data?.hotSearches || []).slice(0, 4).map((h: any) => h.keyword);
      if (hot.length >= 2) setTrending(hot);
    }).catch(() => {});
  }, []);

  // 初始问候语（只显示一次）
  if (messages.length === 0 && !greetingShown.current) {
    greetingShown.current = true;
    const greeting = lang === 'en'
      ? { role: 'assistant' as const, content: `👋 Hi! I'm the logistics AI assistant. I can check community data to answer your questions about:\n\n📦 **Freight rates & routes** – real listings from forwarders\n🛡️ **Company reputation** – community complaints & blacklist\n📊 **Market trends** – popular routes this week\n\nTry asking one of the suggestions below, or type your own question!` }
      : { role: 'assistant' as const, content: `👋 你好！我是物流AI助手，可以帮你查社区数据来回答：\n\n📦 **运价与航线** — 社区货代发布的真实舱位信息\n🛡️ **公司口碑** — 社区避雷投诉数据\n📊 **市场趋势** — 本周热门航线搜索\n\n试试问下面的热门问题，或者直接输入你的问题！` };
    setMessages([greeting]);
  }

  // 快捷问题：优先用热搜，没有则用默认
  const suggestions = trending.length >= 2 ? trending : [
    lang === 'en' ? 'Air freight from Shenzhen to LAX' : '深圳到洛杉矶空运多少钱',
    lang === 'en' ? 'Hottest routes this week' : '最近哪条航线最热门',
    lang === 'en' ? 'Guangzhou to New York sea freight' : '广州到纽约海运推荐',
    lang === 'en' ? 'Most complained forwarders' : '哪家货代被投诉最多',
  ];

  const handleSubmit = async (question?: string) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await client.post('/ai/ask', { question: q });
      const answer = res.data.answer || (lang === 'en' ? 'Sorry, no answer could be generated.' : '抱歉，暂时无法回答这个问题。');
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: lang === 'en' ? '❌ Service temporarily unavailable, please try again later.' : '❌ 服务暂时不可用，请稍后再试。',
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">
            {lang === 'en' ? '🤖 Logistics AI' : '🤖 物流AI助手'}
          </h3>
          <p className="text-[10px] text-gray-500">
            {lang === 'en' ? 'Powered by DeepSeek + community data' : '基于DeepSeek + 社区实时数据'}
          </p>
        </div>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary-500 text-white rounded-br-md'
                : 'bg-white text-gray-700 border border-gray-200 shadow-sm rounded-bl-md'
            }`}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-xl rounded-bl-md px-4 py-3 border border-gray-200 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-white">
          <p className="text-[10px] text-gray-400 mb-1.5">
            {lang === 'en' ? '💡 Try asking:' : '💡 试试问：'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button key={i}
                className="text-[11px] px-2 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
                onClick={() => handleSubmit(s)}
                disabled={loading}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-gray-100 p-3 bg-white">
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            placeholder={lang === 'en' ? 'Ask about routes, prices, companies...' : '输入航线、价格、公司等问题...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={loading}
          />
          <button
            className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center"
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1.5 text-center">
          {lang === 'en' ? 'Answers reference community data, for reference only' : '回答基于社区数据生成，仅供参考'}
        </p>
      </div>
    </div>
  );
}
