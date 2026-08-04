import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import DemandBoard from '../../components/common/DemandBoard';
import {
  Ship, LogIn, UserPlus, Plane, Truck, Globe,
  Shield, Scale, Search, Gift, Handshake, MessageSquare,
  ChevronRight, Star, Users, TrendingUp, ArrowRight,
  CheckCircle, Zap, Building2, FileText, Anchor, Package,
  CreditCard, BarChart3, Languages,
} from 'lucide-react';

// ════════════════════════════════════════════
// 角色定义
// ════════════════════════════════════════════
interface RoleIntro {
  key: string;
  icon: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  color: string;
  features: { zh: string; en: string }[];
  ctaZh: string;
  ctaEn: string;
}

const ROLES: RoleIntro[] = [
  {
    key: 'forwarder',
    icon: '🚢',
    titleZh: '货运代理（庄家 / 一代 / 二代）',
    titleEn: 'Freight Forwarder / Carrier',
    subtitleZh: '上报每日剩余舱位，部署雷达锁定客户，同行来查库存时你排第一',
    subtitleEn: 'Report daily remaining space, deploy radar to lock customers, rank #1 when peers search',
    color: 'from-blue-500 to-cyan-600',
    features: [
      { zh: '📊 上报舱位余量：每天报一次今日剩余，同行一搜就能看到——你是在线庄家', en: '📊 Report remaining space: Update daily, peers find you instantly when they search' },
      { zh: '📡 部署雷达：设置优势航线，有人搜索立即通知——拦截客户于竞争对手之前', en: '📡 Deploy radar: Set your routes, get notified the moment someone searches' },
      { zh: '👥 反向匹配：输入港口代码，找到所有搜索过此航线的外贸用户——你是猎人不是猎物', en: '👥 Reverse match: Find traders searching your routes — you are the hunter now' },
      { zh: '🔍 客户雷达：谁看过你的舱位、谁询过价，一目了然', en: '🔍 Customer radar: See who viewed and inquired — full visibility' },
      { zh: '🎫 报关券裂变：订阅获券→赠送外贸客户→客户回来查舱位→形成闭环', en: '🎫 Coupon flywheel: Subscribe → gift to traders → they come back to search → closed loop' },
    ],
    ctaZh: '注册庄家账号 · 30天免费 · 今日上报舱位',
    ctaEn: 'Register as Carrier · 30-Day Free · Report Space Today',
  },
  {
    key: 'trader',
    icon: '🌏',
    titleZh: '外贸行业（工厂 / 贸易公司）',
    titleEn: 'Trader / Importer / Factory',
    subtitleZh: '查哪个庄家有舱——JFK 还有没有位？一扫就知道，免费',
    subtitleEn: 'Check which carrier has space — JFK still available? Scan to find out. Free.',
    color: 'from-emerald-500 to-teal-600',
    features: [
      { zh: '🔍 查舱位库存：JFK/LAX/FRA 哪个庄家有舱？输入代码秒查实时余量', en: '🔍 Check space inventory: Which carrier has JFK space? Scan to find out instantly' },
      { zh: '🎫 收报关券：庄家赠送的报关券直接入账，报关时抵扣真金白银', en: '🎫 Get coupons: Carriers gift you coupons for customs savings — real money off' },
      { zh: '📩 一键询价：填货量即可向多个庄家询价，让他们报着比', en: '📩 One-click inquiry: Submit cargo details, get quotes from multiple carriers to compare' },
      { zh: '🛡️ 避雷查询：搜公司名查口碑，合作前先看看有没有被投诉过', en: '🛡️ Company lookup: Check complaint history before trusting a carrier' },
      { zh: '⚖️ 免费法律咨询：向注册律师咨询国际物流纠纷问题', en: '⚖️ Free legal: Consult registered lawyers on logistics disputes' },
    ],
    ctaZh: '注册外贸账号 · 永久免费 · 立即查舱',
    ctaEn: 'Register as Trader · Free Forever · Search Now',
  },
  {
    key: 'overseas_agent',
    icon: '🌍',
    titleZh: '海外代理',
    titleEn: 'Overseas Agent',
    subtitleZh: '提供 DDP/DDU/清关/派送服务，对接中国货代',
    subtitleEn: 'Offer DDP/DDU/customs/delivery services to Chinese forwarders',
    color: 'from-purple-500 to-indigo-600',
    features: [
      { zh: 'DDP 服务平台：创建您的代理档案（国家/港口/服务类型/参考价格），中国货代可直接搜索到您', en: 'DDP platform: Create your agent profile, visible to Chinese forwarders searching for overseas partners' },
      { zh: '询价管理：接收中国货代的 DDP 询价请求，在线报价、沟通、成交', en: 'Inquiry management: Receive DDP inquiries from Chinese forwarders, quote and close deals' },
      { zh: '合作登记：与中国货代建立正式合作关系，双方确认后积累信用分', en: 'Cooperation record: Formalize partnerships with Chinese forwarders, build credit history' },
      { zh: '信用评分：评价、合作次数、入驻时长综合计算信用分，高分代理排名靠前', en: 'Credit score: Calculated from reviews, cooperation count, tenure — higher scores rank first' },
      { zh: '标准版30天免费试用，后续订阅即可获得更多曝光和询价配额', en: '30-day free standard trial, subscribe for more exposure and inquiry quota' },
    ],
    ctaZh: '注册海外代理 · 30天免费标准版',
    ctaEn: 'Register as Overseas Agent · 30-Day Free Standard',
  },
  {
    key: 'broker',
    icon: '🏢',
    titleZh: '报关行',
    titleEn: 'Customs Broker',
    subtitleZh: '投放报关券获取客户、核销券赚报关费',
    subtitleEn: 'Contribute coupons to attract clients, verify and earn fees',
    color: 'from-amber-500 to-orange-600',
    features: [
      { zh: '报关行黄页：创建您的报关行档案（口岸/运输方式/报价/服务承诺），货代和外贸可搜索', en: 'Broker directory: Create your profile with port, mode, pricing, commitments — searchable by all users' },
      { zh: '报关券投放：向公共券池投放报关券（¥20/30/50），货代订阅后自动领取', en: 'Coupon contribution: Add coupons to the public pool, auto-claimed when forwarders subscribe' },
      { zh: '券核销：外贸用户使用券报关时，您核销确认并完成报关服务', en: 'Coupon verification: Verify and redeem coupons when traders use them for customs clearance' },
      { zh: '客户积累：每次核销记录在案，回头客自动追踪，建立长期客户关系', en: 'Client tracking: Every verification logged, returning customers auto-tracked' },
      { zh: '评价体系：客户可对您的服务进行评分，高分报关行在黄页中排名优先', en: 'Review system: Clients rate your service, high-rated brokers rank higher in directory' },
    ],
    ctaZh: '入驻报关行',
    ctaEn: 'Join as Broker',
  },
  {
    key: 'lawyer',
    icon: '⚖️',
    titleZh: '社区律师',
    titleEn: 'Community Lawyer',
    subtitleZh: '免费为货代和外贸提供法律咨询，展示专业形象',
    subtitleEn: 'Free legal consultation for community members, build professional presence',
    color: 'from-rose-500 to-pink-600',
    features: [
      { zh: '律师主页：创建个人/律所主页，展示专业领域（如国际物流/货代纠纷/海事法律）', en: 'Lawyer page: Create your profile showcasing expertise in logistics/maritime/trade law' },
      { zh: '免费咨询：社区用户可直接向您发起法律咨询，站内信沟通', en: 'Free consultation: Community members can send legal inquiries directly via internal messaging' },
      { zh: '每日轮替置顶：律师列表按日期轮替排列，每位律师都有均等的曝光机会', en: 'Daily rotation: Lawyers are rotated in the listing, ensuring equal exposure for all' },
      { zh: '咨询管理：统一查看和回复所有法律咨询，管理您的咨询历史', en: 'Consultation management: View, reply to, and track all legal consultations in one place' },
    ],
    ctaZh: '注册律师账号 · 永久免费',
    ctaEn: 'Register as Lawyer · Free Forever',
  },
  {
    key: 'inspector',
    icon: '🔬',
    titleZh: '检测认证',
    titleEn: 'Inspection & Certification',
    subtitleZh: '为外贸和货代提供货物检测与认证服务',
    subtitleEn: 'Provide cargo inspection and certification services',
    color: 'from-teal-500 to-emerald-600',
    features: [
      { zh: '服务展示：创建您的检测认证服务商主页，展示检测范围和资质', en: 'Service profile: Create your provider page showcasing inspection scope and credentials' },
      { zh: '在线咨询：外贸和货代可从检测认证黄页中找到您并发起咨询', en: 'Online inquiry: Traders and forwarders can find you in the directory and send inquiries' },
      { zh: '站内信沟通：所有咨询通过站内信管理，首次咨询同步邮件通知', en: 'Inbox management: All inquiries via internal messaging, first inquiry triggers email alert' },
      { zh: '15天免费体验，后续可订阅继续使用', en: '15-day free trial, subscribe to continue' },
    ],
    ctaZh: '注册检测认证账号 · 15天免费',
    ctaEn: 'Register as Inspector · 15-Day Free Trial',
  },
  {
    key: 'insurer',
    icon: '🛡️',
    titleZh: '运输保险',
    titleEn: 'Transport Insurance',
    subtitleZh: '为外贸和货代提供货物运输保险服务',
    subtitleEn: 'Provide cargo transport insurance services',
    color: 'from-sky-500 to-blue-600',
    features: [
      { zh: '服务展示：创建您的保险服务商主页，展示保险产品和覆盖范围', en: 'Service profile: Create your provider page showcasing insurance products and coverage' },
      { zh: '在线咨询：外贸和货代可从运输保险黄页中找到您并发起咨询', en: 'Online inquiry: Traders and forwarders can find you in the directory and send inquiries' },
      { zh: '站内信沟通：所有咨询通过站内信管理，首次咨询同步邮件通知', en: 'Inbox management: All inquiries via internal messaging, first inquiry triggers email alert' },
      { zh: '15天免费体验，后续可订阅继续使用', en: '15-day free trial, subscribe to continue' },
    ],
    ctaZh: '注册运输保险账号 · 15天免费',
    ctaEn: 'Register as Insurer · 15-Day Free Trial',
  },
  {
    key: 'admin',
    icon: '🛠️',
    titleZh: '社区管理员',
    titleEn: 'Community Admin',
    subtitleZh: '管理用户、审核内容、调解争议、数据分析',
    subtitleEn: 'Manage users, moderate content, resolve disputes, analytics',
    color: 'from-gray-600 to-slate-700',
    features: [
      { zh: '用户管理：审核注册申请、管理角色权限、延长试用期', en: 'User management: Review registrations, manage roles, extend trials' },
      { zh: '内容审核：审核数据录入原始记录，确保信息质量', en: 'Content moderation: Review raw data entries to ensure quality' },
      { zh: '争议调解：处理用户争议申诉，做出公正裁决', en: 'Dispute resolution: Handle disputes and appeals, deliver fair verdicts' },
      { zh: '数据看板：DAU、搜索量、匹配率、转化漏斗等核心指标一目了然', en: 'Analytics: DAU, search volume, match rate, conversion funnel at a glance' },
      { zh: '报关行管理：审核报关行入驻、查看投放与核销统计', en: 'Broker management: Review broker applications, track contribution and verification stats' },
    ],
    ctaZh: '管理员登录',
    ctaEn: 'Admin Login',
  },
];

const STATS = [
  { icon: Users, labelZh: '注册用户', labelEn: 'Members', value: '1000+' },
  { icon: Plane, labelZh: '空运信息', labelEn: 'Air Cargo', value: '500+' },
  { icon: Ship, labelZh: '海运信息', labelEn: 'Sea Cargo', value: '300+' },
  { icon: Globe, labelZh: '覆盖国家', labelEn: 'Countries', value: '50+' },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lang = useAuthStore((s) => s.lang);
  const setLang = useAuthStore((s) => s.setLang);
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(0);

  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const t = (zh: string, en: string) => lang === 'en' ? en : zh;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* ═══════════════════════════════════════
          Navbar
          ═══════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Logo" className="w-9 h-9 rounded-xl" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">
              {t('123查舱位——全球舱位实时库存', '123 Cargo Radar — Live Space Inventory')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Languages className="w-3.5 h-3.5" />
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {t('登录', 'Login')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              {t('免费注册', 'Sign Up Free')}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          Hero
          ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/30" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-cyan-400/10 to-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            {t('货代 · 庄家 · 一代 · 二代 · 外贸——全在一个平台', 'Forwarders · Traders · Agents — All on One Platform')}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6">
            {t('查全球舱位', 'Check Global Cargo')}
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('实时库存——哪个庄家有舱，一扫就知道', 'Live Inventory — Find Who Has Space Instantly')}
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-500 leading-relaxed mb-10">
            {t(
              '庄家每天上报剩余舱位，同行实时查库存找舱。你不是在看广告——你是在看哪个庄家现在有舱位。JFK 还有没有位？一扫就知道。',
              'Carriers report daily remaining space. Forwarders check live inventory. Not browsing ads — checking who has space RIGHT NOW. JFK still available? Scan to find out.'
            )}
          </p>
          {/* ═══ 首页搜索框——核心获客入口 ═══ */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-2xl shadow-blue-500/10 border-2 border-blue-200 focus-within:border-blue-400 focus-within:shadow-blue-500/20 transition-all">
              <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
              <input
                className="hero-search-input flex-1 text-base py-3 px-2 bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400"
                placeholder={t('输入港口代码，如 JFK、LAX、CAN...', 'Enter port code: JFK, LAX, CAN...')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) navigate(`/admin/files?tab=query&q=${encodeURIComponent(val)}`);
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('.hero-search-input') as HTMLInputElement;
                  const val = input?.value?.trim();
                  if (val) navigate(`/admin/files?tab=query&q=${encodeURIComponent(val)}`);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all flex-shrink-0"
              >
                {t('搜舱位', 'Search')}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {t('💡 试试输入 JFK、LAX、FRA——看看哪个庄家现在有舱位', '💡 Try JFK, LAX, FRA — see which carrier has space right now')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl hover:from-blue-600 hover:to-indigo-700 shadow-xl shadow-blue-500/25 transition-all hover:scale-105"
            >
              {t('🚀 立即免费注册', '🚀 Sign Up Free')}
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('roles-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 text-lg font-bold text-gray-600 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 hover:text-gray-800 transition-all"
            >
              {t('📋 了解全部角色', '📋 Explore All Roles')}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {STATS.map((s, i) => (
              <div key={i} className="bg-white/70 backdrop-blur rounded-2xl p-5 border border-gray-100 shadow-sm">
                <s.icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-400 mt-1">{lang === 'en' ? s.labelEn : s.labelZh}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          角色详解
          ═══════════════════════════════════════ */}
      <section id="roles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            {t('选择您的身份，加入社区', 'Choose Your Role, Join the Community')}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            {t(
              '八个角色各有专属功能，点击下方卡片查看详情',
              'Each role has dedicated features. Click a card to learn more.'
            )}
          </p>
        </div>

        {/* Role selector tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {ROLES.map((role, i) => (
            <button
              key={role.key}
              onClick={() => setActiveRole(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeRole === i
                  ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20 scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <span className="text-base">{role.icon}</span>
              <span className="hidden sm:inline">{lang === 'en' ? role.titleEn : role.titleZh}</span>
            </button>
          ))}
        </div>

        {/* Active role detail card */}
        {(() => {
          const role = ROLES[activeRole];
          return (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-gray-500/5 overflow-hidden">
              <div className={`bg-gradient-to-r ${role.color} p-8 md:p-12 text-white`}>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl flex-shrink-0">
                    {role.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black mb-2">
                      {lang === 'en' ? role.titleEn : role.titleZh}
                    </h3>
                    <p className="text-white/80 text-lg">
                      {lang === 'en' ? role.subtitleEn : role.subtitleZh}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">
                  {t('专属功能', 'Exclusive Features')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {role.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 hover:bg-blue-50 transition-colors group">
                      <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-200 transition-colors">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
                        {lang === 'en' ? f.en : f.zh}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={() => navigate('/register')}
                    className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl hover:from-blue-600 hover:to-indigo-700 shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
                  >
                    {lang === 'en' ? role.ctaEn : role.ctaZh}
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {t('已有账号？去登录', 'Already have an account? Login')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ═══════════════════════════════════════
          核心机制
          ═══════════════════════════════════════ */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black mb-4">
              {t('四个核心机制，让社区运转起来', 'Four Core Mechanisms That Power the Community')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('🔍 搜索即匹配', 'Search & Match')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t(
                  '外贸用户输入"青岛 SGN 空运 3CBM 500KG"，系统自动识别始发港和目的港，匹配发布过相关航线的货代，并通过站内信和邮件实时推送需求，让供需双方快速对接。',
                  'A trader types "Qingdao SGN air 3CBM 500KG" — the system parses origin/destination ports, matches forwarders who posted related routes, and pushes the inquiry via inbox + email in real time.'
                )}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('🎫 报关券生态', 'Coupon Ecosystem')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t(
                  '报关行向公共券池投放报关券 → 货代订阅月费（19.9元/月）自动领取 → 赠送给外贸客户抵扣报关费 → 外贸在报关行核销使用。四方共赢，券流动带动客户流动。',
                  'Brokers contribute coupons to the pool → Forwarders subscribe (¥19.9/mo) and auto-receive coupons → Gift to traders for customs fee discounts → Traders redeem at brokers. A win-win-win-win cycle.'
                )}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('🛡️ 信用分体系', 'Credit Score System')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t(
                  '每次合作确认、每次好评、每年资历都在积累您的信用分（0-100）。高分用户在搜索结果中排名优先、更容易获得合作机会。争议纠纷会扣分，倒逼诚信经营。',
                  'Every confirmed cooperation, positive review, and year of membership builds your credit score (0-100). Higher scores rank first in search results and attract more partnership opportunities. Disputes deduct points, incentivizing honest business.'
                )}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mb-4">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3">{t('⚖️ 争议调解 + 避雷', 'Dispute Resolution + Risk Check')}</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t(
                  '合作中出现纠纷？提交争议申请，管理员介入调解。外贸用户搜索货代公司名即可查看是否有投诉记录，"避雷针"功能让不诚信者无处遁形。',
                  'Disputes in cooperation? File a dispute case — admin mediates. Traders can search forwarder company names to check complaint history. The "Risk Alert" feature exposes bad actors.'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          需求看板
          ═══════════════════════════════════════ */}
      <DemandBoard />

      {/* ═══════════════════════════════════════
          Footer CTA
          ═══════════════════════════════════════ */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            {t('准备好了吗？', 'Ready to Join?')}
          </h2>
          <p className="text-gray-500 mb-8">
            {t(
              '无论您是货代、外贸、海外代理、报关行、律师、检测认证还是运输保险——这里都有您的专属空间。',
              'Whether you are a forwarder, trader, overseas agent, broker, lawyer, inspector, or insurer — there is a dedicated space for you here.'
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-10 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl hover:from-blue-600 hover:to-indigo-700 shadow-2xl shadow-blue-500/25 transition-all hover:scale-105"
            >
              {t('🚀 立即免费注册', '🚀 Sign Up Free Now')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-4 text-lg font-bold text-gray-600 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-all"
            >
              {t('已有账号，去登录', 'Already Registered? Login')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            {t(
              '货代/检测认证/运输保险/海外代理新注册用户享30天免费体验期 | 外贸/报关行/律师永久免费使用核心功能',
              'Forwarders/Inspectors/Insurers/Overseas Agents: 30-day free trial | Traders/Brokers/Lawyers: Core features free forever'
            )}
          </p>
          <div className="mt-10 pt-8 border-t border-gray-100 space-y-1">
            <p className="text-xs text-gray-400">
              © 2025-2026 123共享外贸物流社区 | 123 Cargo Community
            </p>
            <p className="text-[11px] text-gray-300 space-x-3">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">
                鲁ICP备2026037717号-1
              </a>
              <a href="http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=37018102001003" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 transition-colors">
                鲁公网安备37018102001003号
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
