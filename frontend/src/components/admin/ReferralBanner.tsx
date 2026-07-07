import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Gift, Users, Calendar, Loader2, Share2, Copy, Check,
  X, ChevronRight, Medal, Target, TrendingUp, Award,
  Zap, Star, ExternalLink, MessageCircle, Mail, BarChart3,
  Crown, Eye
} from 'lucide-react';
import { getRoleChecks } from '../../types';

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_bonus_days: number;
  month_referrals: number;
  register_url: string;
}

interface ReferralHistory {
  id: string;
  bonus_days: number;
  created_at: string;
  company_name: string;
  display_name: string;
  referee_created_at: string;
}

interface LeaderboardEntry {
  display_name: string;
  company_name: string;
  total: number;
  total_days: number;
}

interface Benefits {
  referral_count: number;
  tier: number;
  tier_label: string;
  next_tier_progress: number;
  next_tier_target: number;
  favorites_limit: number;
  compare_limit: number;
  has_subscription: boolean;
  current_bonus_per_person: number;
  is_trader: boolean;
}

const TIER_INFO = [
  { label: '初始', icon: '🌱', color: 'text-gray-500', bg: 'bg-gray-100', desc: '分享推荐码' },
  { label: '铜牌', icon: '🥉', color: 'text-amber-700', bg: 'bg-amber-100', desc: '推荐≥1人' },
  { label: '银牌', icon: '🥈', color: 'text-slate-600', bg: 'bg-slate-200', desc: '推荐≥3人' },
  { label: '金牌', icon: '🥇', color: 'text-yellow-600', bg: 'bg-yellow-100', desc: '推荐≥6人' },
];

export default function ReferralBanner() {
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isTrader = rc.isTrader;
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'history' | 'leaderboard' | 'benefits'>('benefits');
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ allTime: LeaderboardEntry[]; thisMonth: LeaderboardEntry[] }>({ allTime: [], thisMonth: [] });
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get<ReferralStats>('/referral/stats');
      setStats(res.data);
    } catch {}
    setLoading(false);
  };

  const fetchBenefits = async () => {
    try {
      const res = await client.get<Benefits>('/referral/benefits');
      setBenefits(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchStats();
    fetchBenefits();
  }, []);

  const openModal = async (tab: 'history' | 'leaderboard' | 'benefits') => {
    setShowModal(true);
    setModalTab(tab);
    if (tab === 'history') {
      setHistoryLoading(true);
      try {
        const res = await client.get<{ data: ReferralHistory[] }>('/referral/history');
        setHistory(res.data.data || []);
      } catch {}
      setHistoryLoading(false);
    } else if (tab === 'leaderboard') {
      setHistoryLoading(true);
      try {
        const res = await client.get<{ data: { allTime: LeaderboardEntry[]; thisMonth: LeaderboardEntry[] } }>('/referral/leaderboard');
        setLeaderboard(res.data.data || { allTime: [], thisMonth: [] });
      } catch {}
      setHistoryLoading(false);
    }
  };

  const handleCopy = () => {
    if (!stats?.register_url) return;
    navigator.clipboard.writeText(stats.register_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!stats?.register_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: '123共享物流社区',
          text: '加入123共享外贸物流社区，免费查询全球口岸舱位信息！',
          url: stats.register_url,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleShareWhatsApp = () => {
    if (!stats?.register_url) return;
    const text = encodeURIComponent(
      `📦 加入 123 共享外贸物流社区！\n免费查询全球口岸最新舱位与价格信息，和货代同行直接沟通。\n\n${stats.register_url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    if (!stats?.register_url) return;
    const subject = encodeURIComponent('邀请您加入 123 共享外贸物流社区');
    const body = encodeURIComponent(
      `您好！\n\n我推荐您加入 123 共享外贸物流社区，这是一个完全免费的国际物流信息平台。\n\n在这里您可以：\n- 查询全球口岸最新舱位与价格\n- 与货代直接沟通\n- 了解行业最新动态\n\n点击链接注册：${stats.register_url}\n\n推荐码：${stats.referral_code}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  if (loading) return null;
  if (!stats) return null;

  const tier = benefits?.tier ?? 0;
  const nextTarget = benefits?.next_tier_target ?? 1;
  const progress = benefits?.referral_count ?? 0;

  return (
    <>
      {/* ════ 推荐卡片 ════ */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border border-green-200 rounded-2xl p-5 shadow-sm h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-900 text-sm">推荐好友进社区</h3>
        </div>

        {/* QR Code + Stats */}
        <div className="flex gap-3 mb-3">
          <div className="bg-white rounded-lg p-2 shadow-sm flex-shrink-0">
            <img
              src={`/api/referral/qr?code=${stats.referral_code}`}
              alt="推广二维码"
              className="w-24 h-24"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>已推荐 <strong className="text-green-700">{stats.total_referrals}</strong> 人</span>
              {stats.month_referrals > 0 && (
                <span className="text-green-500">（本月 +{stats.month_referrals}）</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>已延长 <strong className="text-green-700">{stats.total_bonus_days}</strong> 天体验期</span>
            </div>

            {/* 阶梯可视化 */}
            <div className="flex items-center gap-1 mt-1">
              {TIER_INFO.map((t, i) => (
                <div key={t.label} className="flex items-center gap-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i <= tier ? t.bg + ' ' + t.color : 'bg-gray-100 text-gray-300'}`}
                    title={`${t.label}: ${t.desc}`}>
                    <span>{t.icon}</span>
                  </div>
                  {i < TIER_INFO.length - 1 && (
                    <div className={`w-3 h-0.5 ${i < tier ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {!isTrader && (
              <p className="text-xs text-green-700 font-medium">
                每推荐 <strong>{benefits?.current_bonus_per_person ?? 3}</strong> 天体验阶梯递增
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <button className="inline-flex items-center gap-1 text-xs bg-green-600 text-white rounded-lg px-2.5 py-1.5 hover:bg-green-700 transition-colors"
                onClick={handleShare}>
                <Share2 className="w-3 h-3" /> 分享
              </button>
              <button className="inline-flex items-center gap-1 text-xs bg-white text-green-700 border border-green-300 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors"
                onClick={handleCopy}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制链接'}
              </button>
              <button className="inline-flex items-center gap-1 text-xs bg-white text-green-700 border border-green-300 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors"
                onClick={handleShareWhatsApp}>
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </button>
              <button className="inline-flex items-center gap-1 text-xs bg-white text-green-700 border border-green-300 rounded-lg px-2.5 py-1.5 hover:bg-green-50 transition-colors"
                onClick={handleShareEmail}>
                <Mail className="w-3 h-3" /> 邮件
              </button>
            </div>
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex gap-2 mt-auto pt-2">
          <button className="flex-1 text-xs bg-white/70 text-green-800 border border-green-200 rounded-lg py-2 hover:bg-white transition-colors flex items-center justify-center gap-1"
            onClick={() => openModal('benefits')}>
            <Award className="w-3.5 h-3.5" /> 权益说明
          </button>
          <button className="flex-1 text-xs bg-white/70 text-green-800 border border-green-200 rounded-lg py-2 hover:bg-white transition-colors flex items-center justify-center gap-1"
            onClick={() => openModal('history')}>
            <Users className="w-3.5 h-3.5" /> 推荐记录
          </button>
          <button className="flex-1 text-xs bg-white/70 text-green-800 border border-green-200 rounded-lg py-2 hover:bg-white transition-colors flex items-center justify-center gap-1"
            onClick={() => openModal('leaderboard')}>
            <TrendingUp className="w-3.5 h-3.5" /> 排行榜
          </button>
        </div>

        <div className="bg-white/60 rounded-lg px-3 py-1.5 mt-2 text-xs text-gray-500 text-center">
          推广码：<span className="font-mono font-bold text-green-700">{stats.referral_code}</span>
        </div>
      </div>

      {/* ════ 详情弹窗 ════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            {/* 弹窗头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                推荐中心
              </h2>
              <button className="text-gray-400 hover:text-gray-600 p-1" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab 切换 */}
            <div className="flex gap-1 px-6 pt-4 pb-2 bg-gray-50/50">
              {([
                { key: 'benefits', label: '权益说明', icon: Award },
                { key: 'history', label: '推荐记录', icon: Users },
                { key: 'leaderboard', label: '推荐排行', icon: TrendingUp },
              ] as const).map(tab => (
                <button key={tab.key}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    modalTab === tab.key
                      ? 'bg-white shadow-sm text-green-700 border border-green-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }`}
                  onClick={() => openModal(tab.key)}>
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 弹窗内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {modalTab === 'benefits' && (
                <div className="space-y-5">
                  {/* 当前阶梯 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-800">当前等级</span>
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${TIER_INFO[tier].bg} ${TIER_INFO[tier].color}`}>
                        {TIER_INFO[tier].icon} {TIER_INFO[tier].label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      已推荐 <strong>{progress}</strong> 人 · 距下一级还需 <strong>{Math.max(0, nextTarget - progress)}</strong> 人
                    </div>
                    {/* 进度条 */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (progress / nextTarget) * 100)}%` }} />
                    </div>
                  </div>

                  {/* 权益表格 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500" />
                      {isTrader ? '外贸用户专属权益' : '货代专属权益'}
                    </h4>
                    <div className="space-y-2">
                      {isTrader ? (
                        <>
                          <BenefitRow icon={Star} label="收藏夹容量" unlocked={benefits?.referral_count >= 1} value="200条" fallback="50条" />
                          <BenefitRow icon={Eye} label="对比查询上限" unlocked={benefits?.referral_count >= 3} value="20条" fallback="5条" />
                          <BenefitRow icon={Zap} label="航线订阅推送" unlocked={benefits?.has_subscription ?? false} value="已解锁" fallback="推荐5人解锁" />
                          <BenefitRow icon={Crown} label="推荐达人榜" unlocked={true} value="自动上榜" fallback="" />
                        </>
                      ) : (
                        <>
                          <BenefitRow icon={Calendar} label="第1~2位推荐" unlocked={true} value="+3天/人" fallback="" />
                          <BenefitRow icon={Calendar} label="第3~5位推荐" unlocked={benefits?.referral_count >= 2} value="+5天/人" fallback="推荐3人解锁" />
                          <BenefitRow icon={Calendar} label="第6位+推荐" unlocked={benefits?.referral_count >= 5} value="+7天/人" fallback="推荐6人解锁" />
                          <BenefitRow icon={Award} label="推荐达人榜" unlocked={true} value="自动上榜" fallback="" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* 推荐阶梯说明 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">📊 阶梯奖励说明</h4>
                    <div className="space-y-3">
                      {TIER_INFO.map((t, i) => (
                        <div key={t.label} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.bg}`}>
                            <span>{t.icon}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">{t.label}</div>
                            <div className="text-xs text-gray-500">{t.desc}</div>
                            {i > 0 && (
                              <div className="text-xs text-green-600 mt-0.5">
                                {isTrader
                                  ? ['推荐即可解锁收藏扩容', '解锁对比扩容', '解锁航线订阅'][i - 1]
                                  : `每人 +${[3, 5, 7][i - 1]} 天体验期`
                                }
                              </div>
                            )}
                          </div>
                          {i <= tier && <Check className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'history' && (
                <div>
                  {historyLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无推荐记录</p>
                      <p className="text-xs mt-1">分享您的推荐码邀请好友加入社区</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-gray-800">{h.company_name || h.display_name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(h.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} 加入
                            </div>
                          </div>
                          <div className="text-sm font-medium text-green-600">+{h.bonus_days}天</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'leaderboard' && (
                <div>
                  {historyLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* 本月排行 */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                          <Medal className="w-4 h-4 text-orange-500" />
                          本月推荐达人
                        </h4>
                        {leaderboard.thisMonth.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-sm">本月暂无推荐数据</div>
                        ) : (
                          <div className="space-y-1.5">
                            {leaderboard.thisMonth.map((entry, i) => (
                              <LeaderboardRow key={i} index={i} entry={entry} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 总排行 */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          历史推荐达人
                        </h4>
                        {leaderboard.allTime.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-sm">暂无推荐数据</div>
                        ) : (
                          <div className="space-y-1.5">
                            {leaderboard.allTime.map((entry, i) => (
                              <LeaderboardRow key={i} index={i} entry={entry} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── 权益行 ── */
function BenefitRow({ icon: Icon, label, unlocked, value, fallback }: {
  icon: any; label: string; unlocked: boolean; value: string; fallback: string;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${unlocked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${unlocked ? 'text-green-600' : 'text-gray-300'}`} />
        <span className={`text-sm ${unlocked ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {unlocked ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-medium text-green-600">{value}</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">{fallback}</span>
        )}
      </div>
    </div>
  );
}

/* ── 排行榜行 ── */
function LeaderboardRow({ index, entry }: { index: number; entry: LeaderboardEntry }) {
  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
  const medalIcons = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-bold text-gray-400">
          {index < 3 ? <span className="text-base">{medalIcons[index]}</span> : `#${index + 1}`}
        </span>
        <div>
          <div className="text-sm font-medium text-gray-800">{entry.display_name}</div>
          <div className="text-xs text-gray-400">{entry.company_name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-green-600">{entry.total} 人</div>
        <div className="text-xs text-gray-400">+{entry.total_days}天</div>
      </div>
    </div>
  );
}
