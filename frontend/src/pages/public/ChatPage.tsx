import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Ship, LogIn, UserPlus, TrendingUp, Plane, MapPin, Loader2, Search, AlertTriangle, Eye, Clock, Users, ArrowRight, Rocket, Zap, Shield, Sparkles, Globe, FileText, Scale } from 'lucide-react';
import client from '../../api/client';
import { FEATURES } from '../../config/features';

export default function ChatPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lang = useAuthStore((s) => s.lang);
  const setLang = useAuthStore((s) => s.setLang);
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const t = (zh: string, en: string) => lang === 'en' ? en : zh;

  useEffect(() => {
    client.get('/cargo-spaces/trending').then(r => {
      setData(r.data);
    }).catch((err) => { console.warn('[ChatPage] failed to load trending:', err); }).finally(() => setLoading(false));
  }, []);

  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const hotSearches = data?.hotSearches || [];
  const latestItems = data?.latest || [];
  const recentSearches = data?.recentSearches || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearched(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await client.get('/cargo-spaces/search-users', { params: { q } });
        setSearchResults(res.data.data || []);
        setSearched(true);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-indigo-50">
      {/* Language toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl border-2 border-white/40 bg-white/20 backdrop-blur text-white hover:bg-white/30 hover:border-white/60 transition-all shadow-lg">
          <span className="text-base">🌐</span>
          <span>{lang === 'zh' ? 'English' : '中文'}</span>
        </button>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-5 shadow-lg">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
            {t('123共享外贸物流社区', '123 Cargo Logistics Community')}
          </h1>
          <p className="text-lg text-white/80 max-w-xl mx-auto mb-6">
            {t('国际物流行业内部 · 货代 · 外贸公司 · 工厂', 'Logistics · Forwarders · Traders · Factories')}<br />
            {t('免费沟通与舱位查询平台', 'Free communication & cargo platform')}
          </p>

          {/* Role cards — all roles (vertical layout, larger) */}
          <div className="max-w-4xl mx-auto mb-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { Icon: Rocket, color: 'text-yellow-300', title: t('货代', 'Forwarder'), desc: t('免费发布舱位，AI帮写，触达全网', 'Post cargo free, AI parses it for you') },
                { Icon: TrendingUp, color: 'text-emerald-300', title: t('外贸', 'Trader'), desc: t('搜索全球舱位比价询价，对接全国货代', 'Search cargo & compare, find forwarders') },
                { Icon: Globe, color: 'text-purple-300', title: t('海外代理', 'Overseas Agent'), desc: t('免费接收DDP询价，拓展中国市场', 'Free DDP inquiries, expand in China') },
                { Icon: FileText, color: 'text-amber-300', title: t('报关行', 'Broker'), desc: t('对接货代报关需求，拓展企业客户', 'Connect with forwarders for customs') },
                { Icon: Shield, color: 'text-rose-300', title: t('运输保险', 'Insurer'), desc: t('为货物运输提供保险，对接真实需求', 'Offer cargo insurance to shippers') },
                { Icon: Search, color: 'text-teal-300', title: t('检测认证', 'Inspector'), desc: t('对接贸易企业检测认证需求，获取客户', 'Connect with traders for inspection') },
                { Icon: Scale, color: 'text-orange-300', title: t('律师', 'Lawyer'), desc: t('为物流外贸企业提供法律咨询与服务', 'Legal services for logistics & trade') },
              ] as const).map((item, i) => (
                <div key={i} className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20 flex flex-col items-center gap-2.5 hover:bg-white/25 hover:scale-[1.02] transition-all cursor-default group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color.replace('text-', 'bg-').replace('300', '500/20')}`}>
                    <item.Icon className={`w-6 h-6 ${item.color} group-hover:scale-110 transition-transform`} />
                  </div>
                  <div className="text-center min-w-0">
                    <div className="font-bold text-[15px] text-white leading-tight">{item.title}</div>
                    <div className="text-xs text-white/70 leading-relaxed mt-1 line-clamp-2">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">{latestItems.length}+</div>
              <div className="text-[10px] text-white/70">{t('舱位发布', 'Cargo Posts')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">{hotSearches.length}</div>
              <div className="text-[10px] text-white/70">{t('热门航线', 'Hot Routes')}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="text-2xl font-bold">10+</div>
              <div className="text-[10px] text-white/70">{t('入驻企业', 'Companies')}</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {FEATURES.REGISTRATION ? (
              <>
                <button onClick={() => navigate('/register')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-primary-700 rounded-xl font-bold text-base hover:bg-blue-50 transition-colors shadow-lg shadow-black/10">
                  <UserPlus className="w-5 h-5" />
                  {t('免费注册，马上开始推广', 'Register Free & Start')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 text-white border border-white/30 rounded-xl font-medium text-base hover:bg-white/20 transition-colors">
                  <LogIn className="w-4 h-4" />
                  {t('已有账号？去登录', 'Log In')}
                </button>
              </>
            ) : (
              <p className="text-white/60 text-sm mt-2">{t('系统维护中', 'Under maintenance')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Live marquee - cargo */}
      {latestItems.length > 0 && (
        <div className="relative mb-6 -mt-2">
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">LIVE</span>
                <span className="text-[10px] text-gray-400 font-medium ml-auto">{latestItems.length}{t('条舱位', ' posts')}</span>
              </div>
              <div className="relative overflow-hidden py-3 px-2">
                <style>{`@keyframes marquee-scroll{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}}.marquee-track{display:flex;animation:marquee-scroll 120s linear infinite;width:max-content}.marquee-track:hover{animation-play-state:paused}.marquee-track-slow{display:flex;animation:marquee-scroll 160s linear infinite;width:max-content}.marquee-track-slow:hover{animation-play-state:paused}`}</style>
                <div className="marquee-track gap-4">
                  {[...latestItems, ...latestItems].map((item, i) => (
                    <div key={i} onClick={() => { document.getElementById('search-sec')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-2.5 bg-gradient-to-r from-gray-50 to-white rounded-xl px-3.5 py-2 border border-gray-100 shadow-sm whitespace-nowrap flex-shrink-0 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
                      <span className="text-base">{item.airline_code ? '✈️' : item.notes?.includes('DDP') ? '🌍' : '🚢'}</span>
                      <span className="text-sm font-bold text-gray-900">{item.origin_port || '?'}<span className="text-gray-300 mx-1">→</span>{item.dest_port || '?'}</span>
                      {item.company_name && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.company_name.length > 8 ? item.company_name.substring(0, 8) + '…' : item.company_name}</span>}
                      {item.price_per_cbm && <span className="text-xs font-bold text-emerald-600">¥{item.price_per_cbm}/CBM</span>}
                      <span className="text-[10px] text-gray-400">{item.created_at?.substring(5, 10) || ''}</span>
                      {item.is_newbie && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">NEW</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500" />
            </div>
          </div>
        </div>
      )}

      {/* Live marquee - inquiries */}
      {recentSearches.length > 0 && (
        <div className="relative mb-6">
          <div className="max-w-5xl mx-auto px-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">INQUIRIES</span>
                <span className="text-[10px] text-gray-400 font-medium ml-auto">{recentSearches.length}{t('条实时需求', ' inquiries')}</span>
              </div>
              <div className="relative overflow-hidden py-3 px-2">
                <div className="marquee-track-slow gap-4">
                  {[...recentSearches, ...recentSearches].map((item, i) => (
                    <div key={i} onClick={() => { document.getElementById('search-sec')?.scrollIntoView({ behavior: 'smooth' }); }} className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-white rounded-xl px-3.5 py-2 border border-amber-100 shadow-sm whitespace-nowrap flex-shrink-0 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
                      {item.company_name && <span className="text-xs font-bold text-gray-800 bg-amber-100 px-2 py-0.5 rounded-full">🏢 {item.company_name.length > 10 ? item.company_name.substring(0, 10) + '…' : item.company_name}</span>}
                      {item.goods_desc ? (<><span className="text-sm font-bold text-gray-900">{item.keyword}</span><span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-amber-100">{item.goods_desc.substring(0, 12)}{item.goods_desc.length > 12 ? '…' : ''}</span>{item.weight_kg && <span className="text-xs font-bold text-emerald-600">{Number(item.weight_kg).toFixed(0)}KG</span>}{item.volume_cbm && <span className="text-xs font-bold text-blue-600">{Number(item.volume_cbm).toFixed(1)}CBM</span>}</>) : (<span className="text-sm font-bold text-gray-900">🔍 {item.keyword?.substring(0, 20) || t('正在查询', 'Searching')}</span>)}
                      <span className="text-[10px] text-gray-400">{item.created_at?.substring(5, 10) || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Search users */}
      <div id="search-sec" className="max-w-5xl mx-auto px-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-800">{t('🔍 搜同行 · 找公司', '🔍 Find Partners')}</h2>
            <span className="text-[10px] text-gray-400 ml-auto">{t('输入公司名或姓名', 'Search by company or name')}</span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 bg-gray-50 focus:bg-white" placeholder={t('搜公司名、联系人...', 'Search company or contact...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary-500" />}
          </div>
          <div className="relative mt-3" style={{ minHeight: 120 }}>
            <div style={{ visibility: !searched ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              <div className="flex flex-wrap gap-2">
                {(lang === 'en' ? ['Logistics', 'Forwarders', 'Trade', 'Supply Chain', 'Shipping'] : ['物流', '货运代理', '进出口', '供应链', '贸易']).map((s, i) => (
                  <button key={i} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-primary-50 hover:text-primary-700" onClick={() => setSearchQuery(s)}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ visibility: searched && searchResults.length > 0 ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              {searchResults.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 mb-2">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 ' + (u.role === 'forwarder' ? 'bg-blue-500' : u.role === 'trader' ? 'bg-emerald-500' : u.role === 'lawyer' ? 'bg-amber-500' : u.role === 'overseas_agent' ? 'bg-purple-500' : u.role === 'inspector' ? 'bg-teal-500' : u.role === 'insurer' ? 'bg-rose-500' : 'bg-gray-500')}>
                    {u.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 truncate">{u.company_name || u.display_name}</div>
                    <div className="text-[10px] text-gray-400">
                      {u.role === 'forwarder' ? t('货代', 'Forwarder') : u.role === 'trader' ? t('外贸', 'Trader') : u.role === 'lawyer' ? t('律师', 'Lawyer') : u.role === 'overseas_agent' ? t('海外代理', 'Overseas') : u.role === 'inspector' ? t('检测认证', 'Inspector') : u.role === 'insurer' ? t('运输保险', 'Insurer') : u.role}
                      {u.is_newbie ? ' · NEW' : ''}
                    </div>
                  </div>
                  <button onClick={() => navigate('/register')} className="flex-shrink-0 text-xs font-medium bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg border border-primary-200 hover:bg-primary-100">{t('注册联系 →', 'Register →')}</button>
                </div>
              ))}
            </div>
            <div style={{ visibility: searched && searchResults.length === 0 ? 'visible' : 'hidden', position: 'absolute', left: 0, right: 0 }}>
              <div className="text-center py-8 text-gray-400 text-sm"><Search className="w-6 h-6 mx-auto mb-1 opacity-50" />{t('没有找到匹配的公司或联系人', 'No results found')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core values */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🚀', title: t('告别微信群发', 'No More WeChat'), desc: t('货源信息一键录入，AI自动解析，全平台共享', 'One-click entry, AI parsing, full platform sharing') },
            { icon: '🔍', title: t('即时查询舱位', 'Instant Cargo Search'), desc: t('输入港口代码，秒查全球最新舱位与价格信息', 'Enter port codes, search global cargo instantly') },
            { icon: '🤝', title: t('真实同行社区', 'Real Community'), desc: t('货代·外贸·海外代理·报关·律师·检测·保险，一站式对接', 'Forwarders·Traders·Agents·Customs·Lawyers·Inspection·Insurance') },
          ].map((item, i) => (
            <div key={i} className="text-center p-2">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Overseas agent section */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-gray-800">{t('🌍 海外代理 · 接收中国货代的真实DDP询价', '🌍 Overseas Agents · Get DDP Inquiries from China')}</h2>
            <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold ml-auto">{t('免费加入', 'Free to Join')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: '📩', title: t('免费接收询价', 'Free Inquiries'), desc: t('中国货代每天发布DDP需求，系统自动匹配推送给您，免费版每月5条。', 'Chinese forwarders post DDP needs daily. 5 free inquiries/month.') },
              { icon: '💰', title: t('结构化报价', 'Structured Quotes'), desc: t('在线提交结构化工港报价，提升专业度和成单率。', 'Submit structured quotes to boost professionalism and win rate.') },
              { icon: '📊', title: t('信用分体系', 'Credit Score'), desc: t('完成合作后积累信用评分，高信用代理获得更多优先匹配机会。', 'Build credit through completed deals for more priority matches.') },
              { icon: '🤝', title: t('建立长期合作', 'Partnerships'), desc: t('与中国货代建立长期合作关系，稳定获取中国到全球的物流订单。', 'Build lasting relationships with Chinese forwarders for global orders.') },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white/80 rounded-xl p-3.5 hover:shadow-md hover:bg-white transition-all">
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-all shadow-md">
              <UserPlus className="w-4 h-4" />
              {t('免费注册成为海外代理', 'Register Free as Agent')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Each role's value */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-800">{t('🎯 每个角色都能找到价值', '🎯 Value for Every Role')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { border: 'border-emerald-100', bg: 'bg-emerald-50', color: 'text-emerald-600', Icon: TrendingUp, role: t('外贸公司', 'Trader'), items: [
                t('搜索全国货代最新舱位与运价，实时更新', 'Search nationwide cargo & rates, real-time'),
                t('一键发布运输需求，货代主动报价竞争', 'Post shipping needs, forwarders compete to quote'),
              ]},
              { border: 'border-amber-100', bg: 'bg-amber-50', color: 'text-amber-600', Icon: FileText, role: t('报关行', 'Customs Broker'), items: [
                t('对接货代公司的报关需求，拓展客户群', 'Connect with forwarders needing customs clearance'),
                t('免费入驻，按需报价，无年费无压力', 'Free to join, quote on demand, no annual fee'),
              ]},
              { border: 'border-orange-100', bg: 'bg-orange-50', color: 'text-orange-600', Icon: Scale, role: t('律师', 'Lawyer'), items: [
                t('为物流外贸企业提供合同审核与法律咨询', 'Contract review & legal advice for logistics firms'),
                t('社区展示律师资质与专长，精准获客', 'Showcase expertise, attract relevant clients'),
              ]},
              { border: 'border-teal-100', bg: 'bg-teal-50', color: 'text-teal-600', Icon: Search, role: t('检测认证', 'Inspector'), items: [
                t('对接贸易公司和工厂的检测认证需求', 'Connect with traders & factories needing inspection'),
                t('精准客户资源，告别盲目推销', 'Targeted clients, no more cold calling'),
              ]},
              { border: 'border-rose-100', bg: 'bg-rose-50', color: 'text-rose-600', Icon: Shield, role: t('运输保险', 'Insurer'), items: [
                t('为货主和货代提供货物运输保险方案', 'Offer cargo insurance to shippers & forwarders'),
                t('实时对接真实投保需求，拓展企业客户', 'Real-time connection to real insurance needs'),
              ]},
              { border: 'border-blue-100', bg: 'bg-blue-50', color: 'text-blue-600', Icon: Rocket, role: t('货代', 'Forwarder'), items: [
                t('免费发布舱位，AI自动解析成标准格式', 'Post cargo free, AI parses to standard format'),
                t('接收全国外贸和同行的实时询价', 'Receive real-time inquiries from traders & peers'),
              ]},
            ].map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className={`bg-white/90 rounded-xl p-3.5 border ${item.border} hover:shadow-md transition-all`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <h3 className="font-bold text-sm text-gray-800">{item.role}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {item.items.map((desc, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                        <span className={`mt-0.5 flex-shrink-0 ${item.color}`}>✓</span>
                        {desc}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              {t('💡 还不确定？免费注册后可以随时切换角色，无需重新注册', 'Not sure? Switch roles anytime after free registration')}
            </p>
          </div>
        </div>
      </div>

      {/* Hot searches */}
      {hotSearches.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-gray-800">{t('🔥 本周大家都在搜', '🔥 Trending This Week')}</h2>
              <span className="text-[10px] text-gray-400 ml-auto">{hotSearches.length}{t('个热门航线', ' hot routes')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hotSearches.map((item: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 rounded-full border border-orange-100">
                  <Search className="w-3 h-3" />
                  {item.keyword?.substring(0, 25)}
                  <span className="text-orange-400 text-[10px] font-bold ml-0.5">{item.cnt}{t('次', 'x')}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Latest cargo list */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-gray-800">{t('📦 舱位发布走马灯', '📦 Cargo Marquee')}</h2>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{latestItems.length}{t('条', ' items')}</span>
          </div>
          <span className="text-[10px] text-gray-400">{t('预览', 'Preview')}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : latestItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Eye className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">{t('暂无信息', 'No data')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {latestItems.map((item: any, i: number) => (
              <div key={item.id || i} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-base font-bold text-gray-900">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span>{item.origin_port || '?'}</span>
                        <span className="text-gray-300 mx-0.5">✈️</span>
                        <span className="text-gray-900">{item.dest_port || '?'}</span>
                      </div>
                      {item.airline_code && (
                        <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 font-mono text-[10px] font-bold">{item.airline_code}</span>
                      )}
                    </div>
                    {item.company_name && (
                      <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                        <span className="inline-block bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">🏢 {item.company_name}</span>
                        {item.is_newbie && <span className="inline-block bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-medium">🆕 NEW</span>}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">{item.notes.substring(0, 120)}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(item.valid_from || '').substring(5, 10)} ~ {(item.valid_to || '').substring(5, 10)}</span>
                      <span className="flex items-center gap-1"><Plane className="w-3 h-3" />{(item.created_at || '').substring(0, 10)}</span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg">{t('仅限注册用户查看', 'Registered only')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-4">
          <p className="text-xs text-gray-400">{t('🔒 联系方式仅对注册用户开放', '🔒 Contact info for registered users only')}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-xs text-gray-400">
            {t('© 2026 济南佑田信息科技有限公司 版权所有', '© 2026 Youtian Info Tech. All rights reserved.')}<br />
            <span className="space-x-3">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">鲁ICP备2026037717号-1</a>
              <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37018102001003" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">鲁公网安备37018102001003号</a>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
