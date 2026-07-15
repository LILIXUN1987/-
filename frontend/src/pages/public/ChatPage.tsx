import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Ship, LogIn, UserPlus, TrendingUp, Plane, MapPin, Loader2, Search, AlertTriangle, Eye, Clock, Users, ArrowRight, Rocket, Zap, Shield, Sparkles, Bot } from 'lucide-react';
import client from '../../api/client';
import { FEATURES } from '../../config/features';
import AiAskPanel from '../../components/ai/AiAskPanel';

export default function ChatPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/cargo-spaces/trending').then(r => {
      setData(r.data);
    }).catch((err) => { console.warn('[ChatPage] failed to load trending:', err); }).finally(() => setLoading(false));
  }, []);

  if (isAuthenticated) {
    // 已登录跳转首页
    window.location.href = '/admin/files';
    return null;
  }

  const hotSearches = data?.hotSearches || [];
  const latestItems = data?.latest || [];
  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50">
      {/* ── Hero区域 ── */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-5 shadow-lg">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            123共享外贸物流社区
          </h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-6">
            国际物流行业内部 · 货代 · 外贸公司 · 工厂<br />免费沟通与舱位查询平台
          </p>

          {/* ── 新手专属 ── */}
          <div className="max-w-lg mx-auto mb-8 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-bold text-yellow-300">货代新手专享</span>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              刚入行货代？没有人脉、没有客户、不知道哪里找舱位？<br />
              在这里免费发布你的第一条货源信息，全平台都能看到。<br />
              <span className="text-yellow-200 font-medium">AI 帮你写信息，3秒搞定！</span>
            </p>
          </div>

          {/* 实时数据统计 */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">{latestItems.length}+</div>
              <div className="text-[10px] text-white/70">货源动态</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">{hotSearches.length}</div>
              <div className="text-[10px] text-white/70">热门航线</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">10+</div>
              <div className="text-[10px] text-white/70">入驻企业</div>
            </div>
          </div>

          {/* CTA按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {FEATURES.REGISTRATION ? (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-primary-700 rounded-xl font-bold text-base hover:bg-blue-50 transition-colors shadow-lg shadow-black/10"
                >
                  <UserPlus className="w-5 h-5" />
                  免费注册，马上开始推广
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white border border-white/30 rounded-xl font-medium text-base hover:bg-white/20 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  已有账号？去登录
                </button>
              </>
            ) : (
              <p className="text-white/60 text-sm mt-2">
                系统维护中，敬请期待
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 核心价值 ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🚀', title: '告别微信群发', desc: '货源信息一键录入，AI自动解析，全平台共享' },
            { icon: '🔍', title: '即时查询舱位', desc: '输入港口代码，秒查全球最新舱位与价格信息' },
            { icon: '🤝', title: '真实同行社区', desc: '货代·外贸·报关·律师·检测·保险，一站式对接' },
          ].map((item, i) => (
            <div key={i} className="text-center p-2">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 货代新手为什么选择我们 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-800">🌟 货代新手为什么选择我们？</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: '🎯', title: '没有客户资源？', desc: '你的货源信息直接展示给全国外贸公司和同行货代，每天都有搜索和询价。' },
              { icon: '📝', title: '不会写推广文案？', desc: 'AI智能解析——你用大白话说"深圳到洛杉矶有仓位"，系统自动整理成标准格式。' },
              { icon: '⏰', title: '没时间天天发朋友圈？', desc: '录入一次，7天内持续展示。不用再复制粘贴几百遍发给微信好友。' },
              { icon: '🔒', title: '怕同行抢客户？', desc: '联系方式仅对询价用户开放，保护你的客户资源不被骚扰。' },
              { icon: '🆓', title: '怕花钱没效果？', desc: '完全免费！15天体验期，不满意随时退出，没有任何隐藏费用。' },
              { icon: '🤝', title: '遇到问题没人教？', desc: '社区律师、检测认证、运输保险一站式对接。还有管理员在线答疑。' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white/70 rounded-lg p-3">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 本周热门搜索 ── */}
      {hotSearches.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-gray-800">🔥 本周大家都在搜</h2>
              <span className="text-[10px] text-gray-400 ml-auto">{hotSearches.length}个热门航线</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotSearches.map((item: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 rounded-full border border-orange-100">
                  <Search className="w-3 h-3" />
                  {item.keyword?.substring(0, 25)}
                  <span className="text-orange-400 text-[10px] font-bold ml-0.5">{item.cnt}次</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── AI 物流助手 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-800">🤖 物流AI助手</h2>
          <span className="text-[10px] text-gray-400 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">社区数据实时问答</span>
        </div>
        <AiAskPanel />
        <p className="text-[10px] text-gray-400 text-center mt-2">
          💡 回答基于社区实时数据 + AI生成，仅供参考。注册后可查看更多详情。
        </p>
      </div>

      {/* ── 最新推广信息 ── */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-800">📦 最新货源动态</h2>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{latestItems.length}条</span>
          </div>
          <span className="text-[10px] text-gray-400">预览</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : latestItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Eye className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">暂无信息</p>
          </div>
        ) : (
          <div className="space-y-2">
            {latestItems.map((item: any, i: number) => (
              <div key={item.id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 航线 */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-base font-bold text-gray-900">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span>{item.origin_port || '?'}</span>
                        <span className="text-gray-300 mx-0.5">✈️</span>
                        <span className="text-gray-900">{item.dest_port || '?'}</span>
                      </div>
                      {item.airline_code && (
                        <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-mono text-[10px] font-bold">
                          {item.airline_code}
                        </span>
                      )}
                    </div>
                    {/* 公司名称 + 新手标识 */}
                    {item.company_name && (
                      <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                        <span className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">🏢 {item.company_name}</span>
                        {item.is_newbie && <span className="inline-block bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-medium">🆕 新手上路</span>}
                      </p>
                    )}
                    {/* 描述 */}
                    {item.notes && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                        {item.notes.substring(0, 120)}
                      </p>
                    )}
                    {/* 有效期 */}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(item.valid_from || '').substring(5, 10)} ~ {(item.valid_to || '').substring(5, 10)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Plane className="w-3 h-3" />
                        {(item.created_at || '').substring(0, 10)}
                      </span>
                    </div>
                  </div>
                  {/* 查看联系方式按钮 - 网安模式禁用 */}
                  <span className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">
                    仅限注册用户查看
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部引导 */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-400 mb-1">🔒 联系方式仅对注册用户开放</p>
        </div>
      </div>

      {/* ── 底部备案信息 ── */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-gray-400">
            © 2026 济南佑田信息科技有限公司 版权所有<br />
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">鲁ICP备2026037717号</a>
          </p>
        </div>
      </div>
    </div>
  );
}
