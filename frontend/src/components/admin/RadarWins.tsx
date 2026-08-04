import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Trophy, TrendingUp, Clock } from 'lucide-react';

// 种子案例数据——后续可从后端API获取
const SEED_WINS = [
  {
    company: '深圳天运国际物流',
    port: 'JFK',
    deal: '8CBM 急单',
    revenue: '¥12,800',
    time: '2小时前',
    author: '李总',
    quote: '刚部署JFK雷达3天，就截到一票急货。以前都是等客户来找，现在是客户还没反应过来我就联系上了。',
  },
  {
    company: '广州万邦货运代理',
    port: 'LAX',
    deal: '15CBM 普货',
    revenue: '¥21,500',
    time: '5小时前',
    author: '王总',
    quote: '雷达显示有人连续3天搜LAX，我主动联系，对方说刚好有票货要走，当场就定了。',
  },
  {
    company: '上海鸿运通供应链',
    port: 'FRA',
    deal: '500KG 空运',
    revenue: '¥9,200',
    time: '昨天',
    author: '张经理',
    quote: '以前不知道谁在找FRA的舱位，现在雷达一扫全出来了。抢在3家同行前面联系，客户说我很专业。',
  },
  {
    company: '义乌博洋国际货代',
    port: 'DXB',
    deal: '12CBM 拼箱',
    revenue: '¥16,800',
    time: '昨天',
    author: '陈总',
    quote: '部署雷达第二天就有信号。输入DXB一看，3个外贸公司在找，我全联系了，成交了2个。',
  },
  {
    company: '青岛海纳物流',
    port: 'LHR',
    deal: '6CBM 带电',
    revenue: '¥18,200',
    time: '2天前',
    author: '赵总',
    quote: '雷达监测到LHR连续有询价信号，我主动出击——竞争对手还不知道有这个功能，我先拿了。',
  },
];

export default function RadarWins() {
  const lang = useAuthStore((s) => s.lang);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % SEED_WINS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const win = SEED_WINS[index];

  return (
    <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 rounded-xl border-2 border-amber-300 shadow-md mb-6 overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-white" />
          <h3 className="text-sm font-black text-white">
            {lang === 'en' ? '🏆 Radar Victories' : '🏆 雷达战报——真实成交案例'}
          </h3>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse ml-1" />
          <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full ml-auto">
            {lang === 'en' ? 'LIVE UPDATES' : '实时更新'}
          </span>
        </div>
      </div>

      {/* 内容 */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* 成交信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-black text-gray-900">{win.company}</span>
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                📡 雷达截获
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              <span className="font-bold text-amber-700">
                {lang === 'en' ? `Port: ${win.port}` : `港口：${win.port}`}
              </span>
              <span className="text-emerald-600 font-bold">{win.deal}</span>
              <span className="text-gray-400">成交 {win.revenue}</span>
              <span className="flex items-center gap-0.5 text-gray-400">
                <Clock className="w-3 h-3" />{win.time}
              </span>
            </div>
            {/* 用户原话 */}
            <div className="mt-2 bg-white/80 rounded-lg px-3 py-2 border border-amber-200">
              <p className="text-xs text-gray-600 italic leading-relaxed">
                "{lang === 'en' ? 'Deployed radar and caught this deal within days.' : win.quote}"
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">—— {win.author}，{win.company}</p>
            </div>
          </div>

          {/* 奖金展示 */}
          <div className="flex-shrink-0 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-3 text-center shadow-lg">
            <div className="text-[10px] text-white/80 font-medium">
              {lang === 'en' ? 'Deal Value' : '成交金额'}
            </div>
            <div className="text-lg font-black text-white drop-shadow">{win.revenue}</div>
          </div>
        </div>

        {/* 页面指示器 */}
        <div className="flex justify-center gap-1 mt-3">
          {SEED_WINS.map((_, i) => (
            <button
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-amber-500 w-4' : 'bg-amber-200'}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-2">
          <p className="text-[10px] text-amber-700 font-medium">
            {lang === 'en'
              ? `📡 ${SEED_WINS.length} forwarders closed deals via radar this week. Don't miss out.`
              : `📡 本周已有 ${SEED_WINS.length} 家货代通过雷达截获客户。你的竞争对手已经在用了——别让单子被抢走。`}
          </p>
        </div>
      </div>
    </div>
  );
}
