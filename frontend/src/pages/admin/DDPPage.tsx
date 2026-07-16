import { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { FEATURES } from '../../config/features';
import type { DDPAgent, DDPStatsResponse } from '../../api/ddp.api';
import { getRoleChecks } from '../../types';
import {
  Globe, Search, Loader2, Send, Star, X, MessageSquare, Clock,
  TrendingUp, Users, MapPin, Phone, Mail, Package, Weight, Box,
  RefreshCw, Languages,
} from 'lucide-react';

// ════════════════════════════════════════════
// 语言上下文
// ════════════════════════════════════════════
type Lang = 'zh' | 'en';
interface LangText { zh: string; en: string }
function t(text: LangText, lang: Lang): string { return text[lang]; }
function join(t1: LangText, t2: LangText, sep: string, lang: Lang): string { return t(t1, lang) + sep + t(t2, lang); }

const LangContext = createContext<Lang>('zh');
function useLang() { return useContext(LangContext); }

// ════════════════════════════════════════════
// 双语映射表
// ════════════════════════════════════════════
const T = {
  pageTitle: { zh: '🌍 全球DDP进出口到门服务', en: '🌍 Global DDP Door-to-Door' },
  pageSubtitle: { zh: '中国↔全球双向门到门 · 进出口清关派送 · 群友验证的靠谱海外代理', en: 'China ↔ Worldwide · Import/Export DDP · Community-verified agents' },
  tabInquiry: { zh: '📮 我要询价', en: '📮 Submit Inquiry' },
  tabAgents: { zh: '🤝 海外代理', en: '🤝 Overseas Agents' },
  tabStats: { zh: '📊 需求统计', en: '📊 Demand Stats' },

  inquiryTitle: { zh: '填写您的DDP到门需求', en: 'Fill in your DDP requirements' },
  inquiryDesc: { zh: '提交后系统自动推送给目的国已入驻的海外代理，通过站内信沟通报价', en: 'Your inquiry will be sent to all registered agents in the destination country via internal messages' },
  hotCountries: { zh: '热门国家（点击快速选择）', en: 'Hot destination countries (click to select)' },
  continueNew: { zh: '继续发布新需求', en: 'Submit another inquiry' },
  directionExport: { zh: '🇨🇳 中国出口 → 全球', en: '🇨🇳 Export from China' },
  directionImport: { zh: '🌍 全球进口 → 中国', en: '🌍 Import to China' },
  inquiryDescExport: { zh: '从中国出口到目的国，推送给当地海外代理报价', en: 'Export from China. Sent to agents in destination country.' },
  inquiryDescImport: { zh: '从海外进口到中国，推送给社区中国货代报价', en: 'Import to China. Sent to Chinese forwarders in the community.' },
  originCountry: { zh: '来源国家', en: 'Origin Country' },
  originPort: { zh: '起运港/城市', en: 'Origin Port/City' },
  destCountry: { zh: '目的国家', en: 'Destination Country' },
  destPort: { zh: '目的港/城市', en: 'Destination Port/City' },
  portPlaceholder: { zh: '如：纽约、汉堡、内罗毕', en: 'e.g. New York, Hamburg, Nairobi' },
  goodsDesc: { zh: '货物描述', en: 'Goods Description' },
  goodsPlaceholder: { zh: '如：电子产品、纺织品、机械设备...', en: 'e.g. Electronics, Textiles, Machinery...' },
  hsCode: { zh: 'HS CODE', en: 'HS CODE' },
  hsPlaceholder: { zh: '如：8471.30、6204.62 等', en: 'e.g. 8471.30, 6204.62' },
  notesLabel: { zh: '件数/重量/尺寸', en: 'Pieces/Weight/Dimensions' },
  notesHint: { zh: '必须提供详细的件数、毛重和每件尺寸', en: 'Detailed pieces, gross weight & dimensions required' },
  notesPlaceholder: { zh: '例如：1件 毛重160KG 120*100*80/1\n2件 毛重320KG 120*100*80/1 + 100*80*60/1', en: 'e.g. 1pc GW160KG 120*100*80/1\n2pcs GW320KG 120*100*80/1 + 100*80*60/1' },
  deliveryAddr: { zh: '派送地址', en: 'Delivery Address' },
  addrPlaceholder: { zh: '详细收货地址、门牌号、邮编、收件人及电话等', en: 'Full address, zip code, recipient name & phone...' },
  uploadLabel: { zh: '上传箱单/发票', en: 'Upload Packing List/Invoice' },
  uploadHint: { zh: '选填，支持图片/PDF/Word/Excel', en: 'Optional, supports images/PDF/Word/Excel' },
  uploadClick: { zh: '点击选择文件或将文件拖拽到这里', en: 'Click to select files or drag & drop here' },
  uploadLimit: { zh: '支持 JPG/PNG/PDF/Word/Excel，每文件最大20MB', en: 'Supports JPG/PNG/PDF/Word/Excel, max 20MB each' },
  submitBtn: { zh: '提交需求', en: 'Submit' },
  submitting: { zh: '提交中...', en: 'Submitting...' },
  msgSent: { zh: '✅ 消息已发送，请留意收件箱回复', en: '✅ Message sent, please check your inbox' },

  searchPlaceholder: { zh: '搜索代理名称/国家/港口...', en: 'Search agent name/country/port...' },
  allCountries: { zh: '🌍 全部', en: '🌍 All' },
  noMatch: { zh: '未找到匹配的海外代理', en: 'No matching agents found' },
  noAgent: { zh: '暂无海外代理入驻，请联系管理员推荐', en: 'No agents yet, contact admin to recommend one' },
  completed: { zh: '单已完成', en: ' orders completed' },
  viewReviews: { zh: '查看', en: 'View' },
  operablePorts: { zh: '可操作港口：', en: 'Operable ports: ' },
  refPrice: { zh: '参考报价：', en: 'Reference price: ' },
  contactBtn: { zh: '联系咨询', en: 'Contact' },
  reviewBtn: { zh: '查看评价', en: 'Reviews' },
  reviewTitle: { zh: '评价', en: 'Reviews' },
  noReviews: { zh: '暂无评价', en: 'No reviews yet' },
  contactTitle: { zh: '联系', en: 'Contact' },
  contactDesc: { zh: '发送站内信给', en: 'Send a message to' },
  contactReply: { zh: '对方将在收件箱中回复您。', en: 'They will reply in your inbox.' },
  contactPlaceholder: { zh: '请输入您的咨询内容，如：需要了解从中国到当地的DDP报价...', en: 'e.g. I would like a DDP quote from China to your location...' },
  contactOperable: { zh: '可操作：', en: 'Operable: ' },

  statsTotalInquiries: { zh: '累计询价', en: 'Total Inquiries' },
  statsTotalAgents: { zh: '入驻代理', en: 'Registered Agents' },
  statsPending: { zh: '待审核', en: 'Pending Review' },
  statsHotTitle: { zh: '热门询价目的地 TOP 10', en: 'Hot Inquiry Destinations TOP 10' },
  statsNoInquiries: { zh: '暂无询价记录', en: 'No inquiry records' },
  statsAgentDist: { zh: '代理分布', en: 'Agent Distribution' },
  statsNoAgents: { zh: '暂无代理入驻', en: 'No agents registered' },
  statsRefresh: { zh: '刷新数据', en: 'Refresh' },
  times: { zh: '次', en: ' times' },
  count: { zh: '家', en: ' agents' },
  andMore: { zh: '等', en: ' more' },

  infoTitle: { zh: '💡 什么是DDP到门服务？', en: '💡 What is DDP Door-to-Door?' },
  infoDesc1: { zh: 'DDP (Delivered Duty Paid) 指卖家承担所有运输费用、关税和风险，将货物直接送到买家指定地址。', en: 'DDP (Delivered Duty Paid) means the seller bears all transport costs, duties and risks, delivering goods directly to the buyer\'s address.' },
  infoDesc2: { zh: '本社区的海外代理均为群友验证或推荐的靠谱合作方。如果您有靠谱的海外代理想推荐给群友，请', en: 'All agents here are community-verified. To recommend a reliable overseas agent, please ' },
  infoDesc2Link: { zh: '联系管理员', en: 'contact the admin' },
  infoDesc2End: { zh: '入驻。', en: ' for onboarding.' },
  noAccess: { zh: '暂无权限查看', en: 'No access' },
  reqRequired: { zh: '请填写目的国家', en: 'Please select destination country' },
  reqAddress: { zh: '请填写派送地址', en: 'Please fill in delivery address' },
  reqNotes: { zh: '请填写详细的件数/重量/尺寸信息', en: 'Please provide detailed pieces/weight/dimensions' },
  uploadFailed: { zh: '文件上传失败', en: 'File upload failed' },
  submitFailed: { zh: '提交失败，请重试', en: 'Submission failed, please retry' },
  sendFailed: { zh: '发送失败', en: 'Send failed' },
  required: { zh: '必填', en: 'Required' },
  optional: { zh: '选填', en: 'Optional' },

  // 海外代理自助入驻
  onboardTitle: { zh: '🌍 入驻海外代理', en: '🌍 Register as Overseas Agent' },
  onboardDesc: { zh: '填写以下信息，入驻后您的公司将展示在海外代理列表中，中国货代可直接向您询价', en: 'Fill in your details to appear in the overseas agent list and receive inquiries from Chinese forwarders' },
  onboardCompany: { zh: '公司英文名称 *', en: 'Company Name (English) *' },
  onboardCompanyPlace: { zh: '如：Global Logistics Solutions Inc.', en: 'e.g. Global Logistics Solutions Inc.' },
  onboardContact: { zh: '联系人', en: 'Contact Person' },
  onboardCountry: { zh: '所在国家 *', en: 'Country *' },
  onboardCountryPlace: { zh: '如：美国、德国、肯尼亚', en: 'e.g. USA, Germany, Kenya' },
  onboardCity: { zh: '所在城市', en: 'City' },
  onboardPorts: { zh: '可操作港口 *', en: 'Operable Ports *' },
  onboardPortsPlace: { zh: '如：LAX, Long Beach, Oakland', en: 'e.g. LAX, Long Beach, Oakland' },
  onboardServices: { zh: '服务类型', en: 'Service Types' },
  onboardServicesPlace: { zh: '如：DDP,DDU,清关,派送', en: 'e.g. DDP,DDU,Clearance,Delivery' },
  onboardDescLabel: { zh: '业务介绍', en: 'Description' },
  onboardDescPlace: { zh: '介绍您的公司和服务优势...', en: 'Introduce your company and services...' },
  onboardPrice: { zh: '参考报价', en: 'Reference Price' },
  onboardPricePlace: { zh: '如：海运LCL: USD8/CBM起', en: 'e.g. LCL: USD8/CBM' },
  onboardBtn: { zh: '提交入驻', en: 'Submit' },
  onboardSuccess: { zh: '✅ 入驻成功！您的信息已展示在海外代理列表中', en: '✅ Registered! Your company is now listed in the overseas agents directory' },
  onboardPrompt: { zh: '您尚未填写代理信息，请先完成入驻', en: 'You haven\'t set up your agent profile yet. Please complete your registration.' },
};

// ── 国家国旗映射（常用物流目的国） ──
const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸', 'UK': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷',
  'Japan': '🇯🇵', 'Korea': '🇰🇷', 'Australia': '🇦🇺', 'Canada': '🇨🇦',
  'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳',
  'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Philippines': '🇵🇭', 'UAE': '🇦🇪',
  'Saudi Arabia': '🇸🇦', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'Netherlands': '🇳🇱',
  'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
  'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪', 'Egypt': '🇪🇬',
  'Belgium': '🇧🇪', 'Poland': '🇵🇱', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭',
  'Hong Kong': '🇭🇰', 'Taiwan': '🇹🇼', 'Panama': '🇵🇦', 'Chile': '🇨🇱',
  'Argentina': '🇦🇷', 'Peru': '🇵🇪', 'New Zealand': '🇳🇿',
  'Cambodia': '🇰🇭', 'Bangladesh': '🇧🇩', 'Pakistan': '🇵🇰', 'Sri Lanka': '🇱🇰',
  'Ghana': '🇬🇭', 'Tanzania': '🇹🇿', 'Angola': '🇦🇴',
  'Greece': '🇬🇷', 'Portugal': '🇵🇹', 'Ireland': '🇮🇪',
  'Denmark': '🇩🇰', 'Norway': '🇳🇴', 'Finland': '🇫🇮', 'Ukraine': '🇺🇦',
  英国: '🇬🇧', 德国: '🇩🇪', 法国: '🇫🇷', 日本: '🇯🇵',
  韩国: '🇰🇷', 澳大利亚: '🇦🇺', 加拿大: '🇨🇦', 新加坡: '🇸🇬',
  马来西亚: '🇲🇾', 泰国: '🇹🇭', 越南: '🇻🇳', 印度: '🇮🇳',
  印度尼西亚: '🇮🇩', 菲律宾: '🇵🇭', 阿联酋: '🇦🇪', 沙特阿拉伯: '🇸🇦',
  土耳其: '🇹🇷', 俄罗斯: '🇷🇺', 荷兰: '🇳🇱', 意大利: '🇮🇹',
  西班牙: '🇪🇸', 巴西: '🇧🇷', 墨西哥: '🇲🇽', 南非: '🇿🇦',
  尼日利亚: '🇳🇬', 肯尼亚: '🇰🇪',
};

function getCountryEmoji(country: string): string {
  for (const [key, emoji] of Object.entries(COUNTRY_FLAGS)) {
    if (country.includes(key) || key.includes(country)) return emoji;
  }
  return '🌍';
}

// ════════════════════════════════════════════
// 主页面
// ════════════════════════════════════════════
type TabKey = 'inquiry' | 'agents' | 'stats' | 'inquiries';

export default function DDPPage() {
  const user = useAuthStore((s) => s.user);
  const authLang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>('inquiry');
  const [lang, setLang] = useState<Lang>(authLang);
  const [agentRegistered, setAgentRegistered] = useState<boolean | null>(null);

  // 海外代理检查入驻状态
  const rc = getRoleChecks(user?.role);
  // 网安审核模式：非管理员隐藏
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    return <div className="text-center py-16 text-gray-400">lang === 'en' ? 'Under maintenance' : '功能维护中'</div>;
  }

  const isAgent = rc.isOverseasAgent;
  const [agentProfile, setAgentProfile] = useState<any>(null);

  useEffect(() => {
    if (isAgent) {
      client.get('/ddp/agents/my-status').then(r => setAgentRegistered(r.data.registered)).catch(() => setAgentRegistered(false));
      client.get('/overseas/my-profile').then(r => {
        if (r.data?.profile) setAgentProfile(r.data.profile);
      }).catch(() => {});
    }
  }, [isAgent]);

  if (!rc.isAdmin && !rc.isForwarder && !rc.isTrader && !rc.isOverseasAgent) {
    return <div className="text-center py-16 text-gray-400">{t(T.noAccess, lang)}</div>;
  }

  return (
    <LangContext.Provider value={lang}>
      <div>
        {/* 标题 + 语言切换 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-7 h-7 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t(T.pageTitle, lang)}</h1>
              <p className="text-sm text-gray-500">{t(T.pageSubtitle, lang)}</p>
            </div>
          </div>
          <button
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:text-primary-700 transition-colors bg-white text-gray-500"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        {/* 海外代理入驻引导（未入驻时显示） */}
        {isAgent && agentRegistered === false && <AgentOnboarding />}

        {/* 已入驻代理显示档案 */}
        {isAgent && agentRegistered && agentProfile && <AgentProfileCard profile={agentProfile} lang={lang} />}

        {/* Tab 栏 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { key: 'inquiry' as TabKey, label: T.tabInquiry, activeBg: 'from-primary-500 to-indigo-600', icon: '📮' },
            { key: 'agents' as TabKey, label: T.tabAgents, activeBg: 'from-emerald-500 to-teal-600', icon: '🤝' },
            { key: 'stats' as TabKey, label: T.tabStats, activeBg: 'from-amber-500 to-orange-600', icon: '📊' },
            { key: 'inquiries' as TabKey, label: { zh: '📬 我的询价', en: '📬 My Inquiries' }, activeBg: 'from-violet-500 to-purple-600', icon: '📬' },
          ].map((tItem) => (
            <button
              key={tItem.key}
              className={`relative overflow-hidden rounded-xl py-3 px-3 text-sm font-bold transition-all duration-200 ${
                tab === tItem.key
                  ? `bg-gradient-to-r ${tItem.activeBg} text-white shadow-lg shadow-black/10 scale-[1.02]`
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md border border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setTab(tItem.key)}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{tItem.icon}</span>
                <span>{t(tItem.label, lang)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
                {tab === 'inquiry' && <InquiryTab isAgent={isAgent} />}
        {tab === 'agents' && <AgentsTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'inquiries' && <MyInquiriesTab />}

        {/* 使用提示 — 醒目标识 */}
        <div className="mt-6 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-[1px]">
          <div className="bg-white rounded-2xl p-5 h-full">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{t(T.infoTitle, lang)}</span>
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">{t(T.infoDesc1, lang)}</p>
                <p className="text-xs text-gray-600 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {t(T.infoDesc2, lang)}
                  <a href="/admin/inbox" className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors">
                    {t(T.infoDesc2Link, lang)}
                    <span className="text-xs">→</span>
                  </a>
                  {t(T.infoDesc2End, lang)}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">💡 DDP</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">🌍 全球</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">🤝 群友验证</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LangContext.Provider>
  );
}

// ════════════════════════════════════════════
// Tab 1: 我要询价
// ════════════════════════════════════════════
function InquiryTab({ isAgent }: { isAgent?: boolean }) {
  const lang = useLang();
  const [direction, setDirection] = useState<'export' | 'import'>(isAgent ? 'import' : 'export');
  const [country, setCountry] = useState('');
  const [port, setPort] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countryList, setCountryList] = useState<string[]>([]);
  const [portList, setPortList] = useState<{ code: string; name: string }[]>([]);
  const countryRef = useRef<HTMLDivElement>(null);
  const [goodsDesc, setGoodsDesc] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [files, setFiles] = useState<{ file: File; uploading: boolean; path?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; notified: number } | null>(null);

  const hotCountries = lang === 'zh'
    ? ['中国', '美国', '德国', '英国', '法国', '荷兰', '日本', '韩国', '越南', '泰国', '印度', '阿联酋', '沙特', '巴西', '尼日利亚', '肯尼亚', '澳大利亚']
    : ['China', 'USA', 'Germany', 'UK', 'France', 'Netherlands', 'Japan', 'Korea', 'Vietnam', 'Thailand', 'India', 'UAE', 'Saudi', 'Brazil', 'Nigeria', 'Kenya', 'Australia'];

  const handleUploadFile = async (file: File) => {
    const idx = files.findIndex(f => f.file === file);
    if (idx >= 0) return;
    const entry = { file, uploading: true };
    setFiles(prev => [...prev, entry]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await client.post<{ filePath: string }>('/ddp/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFiles(prev => prev.map(f => f.file === file ? { ...f, uploading: false, path: res.data.filePath } : f));
    } catch {
      alert(t(T.uploadFailed, lang));
      setFiles(prev => prev.filter(f => f.file !== file));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    for (const f of selected) {
      if (files.some(ex => ex.file.name === f.name && ex.file.size === f.size)) continue;
      handleUploadFile(f);
    }
    e.target.value = '';
  };

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };

  const handleSubmit = async () => {
    if (!country.trim()) { alert(t(T.reqRequired, lang)); return; }
    if (!address.trim()) { alert(t(T.reqAddress, lang)); return; }
    if (!notes.trim()) { alert(t(T.reqNotes, lang)); return; }
    setLoading(true);
    setResult(null);
    try {
      const uploadedPaths = files.filter(f => f.path).map(f => f.path!);
      const res = await client.post('/ddp/inquiry', {
        direction: direction,
        country: country.trim(),
        port: port.trim() || undefined,
        goods_desc: goodsDesc.trim() || undefined,
        hs_code: hsCode.trim() || undefined,
        notes: notes.trim(),
        file_paths: uploadedPaths.length > 0 ? uploadedPaths : undefined,
        address: address.trim(),
      });
      setResult(res.data);
    } catch {
      alert(t(T.submitFailed, lang));
    }
    setLoading(false);
  };



  // 加载国家列表
  useEffect(() => {
    client.get('/ddp/destinations').then(r => setCountryList(r.data.countries || [])).catch(() => {});
  }, []);

  // 加载港口列表（选择国家后，保留旧数据防闪烁）
  const [portLoading, setPortLoading] = useState(false);
  useEffect(() => {
    if (country.trim()) {
      setPortLoading(true);
      client.get('/ddp/destinations', { params: { country } }).then(r => {
        setPortList(r.data.ports || []);
        setPortLoading(false);
      }).catch(() => setPortLoading(false));
    } else {
      setPortList([]);
    }
  }, [country]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const resetForm = () => {
    setResult(null);
    setCountry(''); setPort(''); setGoodsDesc(''); setHsCode('');
    setNotes(''); setAddress(''); setFiles([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Package className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-gray-800">{t(T.inquiryTitle, lang)}</h3>
      </div>
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-5 flex items-start gap-2.5 shadow-sm">
        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-sm">📮</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">{lang === 'en' ? 'How it works' : '提交后如何收到回复？'}</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">{direction === 'export' ? t(T.inquiryDescExport, lang) : t(T.inquiryDescImport, lang)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-medium">lang === 'en' ? '① Sent to agents in that country' : '① 推送给该国代理'</span>
            <span className="text-[10px] text-amber-400">→</span>
            <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-medium">lang === 'en' ? '② Agent replies via message' : '② 代理站内信回复'</span>
            <span className="text-[10px] text-amber-400">→</span>
            <span className="text-[10px] bg-amber-200/70 text-amber-800 px-2 py-0.5 rounded-full font-medium">lang === 'en' ? '③ Check your inbox' : '③ 您收件箱查看'</span>
          </div>
        </div>
      </div>

      {!isAgent && (
      <div className="flex items-center gap-2 mb-4 bg-gray-100 rounded-lg p-1 max-w-xs">
        <button
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${direction === 'export' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setDirection('export')}>
          {t(T.directionExport, lang)}
        </button>
        <button
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${direction === 'import' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setDirection('import')}>
          {t(T.directionImport, lang)}
        </button>
      </div>
      )}

      {/* 快速选择国家 */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{direction === 'import' ? (lang === 'en' ? 'Select origin country' : '选择来源国') : (lang === 'en' ? 'Select destination country' : '选择目的国')}</label>
        <div className="flex flex-wrap gap-1.5">
          {hotCountries.map((c) => (
            <button
              key={c}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                country === c
                  ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => { setCountry(c); setCountrySearch(''); setShowCountryDropdown(false); setResult(null); }}
            >
              {getCountryEmoji(c)} {c}
            </button>
          ))}
        </div>
      </div>

      {result ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-green-800 font-medium text-sm">{result.message}</p>
          <button className="mt-4 text-xs text-primary-600 hover:text-primary-700 underline" onClick={resetForm}>
            {t(T.continueNew, lang)}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={countryRef}>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.destCountry, lang)} <span className="text-red-500">*</span></label>
            <input
              className="input-field w-full text-sm"
              placeholder={lang === 'zh' ? '搜索国家...' : 'Search country...'}
              value={showCountryDropdown ? countrySearch : country}
              onChange={e => { setCountrySearch(e.target.value); setShowCountryDropdown(true); setCountry(''); setResult(null); }}
              onFocus={() => { setCountrySearch(country); setShowCountryDropdown(true); }}
            />
            {showCountryDropdown && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {countryList
                  .filter(c => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase()))
                  .slice(0, 30)
                  .map(c => (
                    <button
                      key={c}
                      className={"w-full text-left px-3 py-1.5 text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors " + (country === c ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700')}
                      onClick={() => { setCountry(c); setCountrySearch(''); setShowCountryDropdown(false); setResult(null); }}
                    >{c}</button>
                  ))
                }
                {countryList.filter(c => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400">{lang === 'en' ? 'No country found' : '未找到匹配国家'}</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.destPort, lang)}{portLoading ? <Loader2 className="w-3 h-3 animate-spin inline ml-1 text-gray-400" /> : null}</label>
            <select className="input-field w-full text-sm" value={port} onChange={e => setPort(e.target.value)}>
              <option value="">{lang === 'en' ? 'Auto-detect from country' : '由系统根据目的国推荐'}</option>
              {portList.slice(0, 50).map(p => (
                <option key={p.code} value={p.name}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.goodsDesc, lang)}</label>
            <input className="input-field w-full text-sm" placeholder={t(T.goodsPlaceholder, lang)} value={goodsDesc} onChange={e => setGoodsDesc(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.hsCode, lang)}</label>
            <input className="input-field w-full text-sm" placeholder={t(T.hsPlaceholder, lang)} value={hsCode} onChange={e => setHsCode(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {t(T.notesLabel, lang)} <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">（{t(T.notesHint, lang)}）</span>
            </label>
            <textarea
              className="input-field w-full text-sm min-h-[80px]"
              placeholder={t(T.notesPlaceholder, lang)}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.deliveryAddr, lang)} <span className="text-red-500">*</span></label>
            <textarea className="input-field w-full text-sm min-h-[60px]" placeholder={t(T.addrPlaceholder, lang)} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              {t(T.uploadLabel, lang)}
              <span className="text-gray-400 font-normal ml-1">（{t(T.uploadHint, lang)}）</span>
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 transition-colors cursor-pointer"
              onClick={() => document.getElementById('ddp-file-input')?.click()}>
              <input id="ddp-file-input" type="file" multiple className="hidden" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx,.xls" onChange={handleFileSelect} />
              <p className="text-xs text-gray-400">{t(T.uploadClick, lang)}</p>
              <p className="text-[10px] text-gray-300 mt-1">{t(T.uploadLimit, lang)}</p>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {f.uploading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-gray-400 flex-shrink-0" />
                      ) : (
                        <span className="text-green-500 flex-shrink-0">✅</span>
                      )}
                      <span className="truncate text-gray-700">{f.file.name}</span>
                      <span className="text-gray-400 flex-shrink-0">({(f.file.size / 1024).toFixed(0)}KB)</span>
                    </div>
                    <button className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0" onClick={() => removeFile(f.file)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6"
              onClick={handleSubmit}
              disabled={loading || !country.trim() || !address.trim() || !notes.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? t(T.submitting, lang) : t(T.submitBtn, lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 2: 海外代理列表
// ════════════════════════════════════════════
function AgentsTab() {
  const lang = useLang();
  const [agents, setAgents] = useState<DDPAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [contactModal, setContactModal] = useState<DDPAgent | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ agent: DDPAgent; reviews: any[]; loading: boolean } | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCountry) params.country = selectedCountry;
      const res = await client.get<{ data: DDPAgent[] }>('/ddp/agents', { params });
      setAgents(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAgents(); }, [selectedCountry]);

  const countries = useMemo(() => {
    const set = new Set(agents.map(a => a.country));
    return Array.from(set).sort();
  }, [agents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.trim().toLowerCase();
    return agents.filter(a =>
      a.company_name?.toLowerCase().includes(q) ||
      a.country?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q) ||
      a.service_ports?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }, [agents, search]);

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      const prefix = lang === 'zh' ? `[DDP到门咨询] 您好，我对贵司在${contactModal.country}的DDP到门服务感兴趣，想了解更多详情。\n\n`
        : `[DDP Inquiry] Hello, I'm interested in your DDP service in ${contactModal.country}. \n\n`;
      await client.post('/messages', {
        receiver_id: contactModal.created_by,
        content: prefix + contactText.trim(),
      });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch {
      alert(t(T.sendFailed, lang));
    }
    setContactSending(false);
  };

  const handleViewReviews = async (agent: DDPAgent) => {
    setReviewModal({ agent, reviews: [], loading: true });
    try {
      const res = await client.get(`/reviews/stats/${agent.created_by}`);
      setReviewModal({ agent, reviews: res.data.list || [], loading: false });
    } catch {
      setReviewModal({ agent, reviews: [], loading: false });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder-gray-400"
            placeholder={t(T.searchPlaceholder, lang)}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {countries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              !selectedCountry ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
            onClick={() => setSelectedCountry('')}
          >
            {t(T.allCountries, lang)}
          </button>
          {countries.map(c => (
            <button
              key={c}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                selectedCountry === c ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              onClick={() => setSelectedCountry(c)}
            >
              {getCountryEmoji(c)} {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {search || selectedCountry ? t(T.noMatch, lang) : t(T.noAgent, lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onContact={() => { setContactModal(agent); setContactSent(false); setContactText(''); }}
              onViewReviews={() => handleViewReviews(agent)}
            />
          ))}
        </div>
      )}

      {/* 联系代理弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                {getCountryEmoji(contactModal.country)} {t(T.contactTitle, lang)} {contactModal.company_name}
              </h3>
              <button onClick={() => setContactModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">{t(T.msgSent, lang)}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {t(T.contactDesc, lang)} {contactModal.company_name}（{contactModal.country}），{t(T.contactReply, lang)}
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600 space-y-1">
                  <p>📍 {contactModal.country}{contactModal.city ? ` · ${contactModal.city}` : ''}</p>
                  {contactModal.service_ports && <p>🚢 {t(T.contactOperable, lang)}{contactModal.service_ports}</p>}
                  {contactModal.reference_price && <p>💰 {t(T.refPrice, lang)}{contactModal.reference_price}</p>}
                </div>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3" placeholder={t(T.contactPlaceholder, lang)} value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t(T.contactBtn, lang)}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 查看评价弹窗 */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setReviewModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 border-t-4 border-amber-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base">⭐ {reviewModal.agent.company_name} - {t(T.reviewTitle, lang)}</h3>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {reviewModal.loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : reviewModal.reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{t(T.noReviews, lang)}</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {reviewModal.reviews.map((r: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{r.reviewer_name || '匿名'}{r.reviewer_company ? ` · ${r.reviewer_company}` : ''}</span>
                      <span className="text-amber-500 text-xs">{'⭐'.repeat(r.rating)}</span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600">{r.comment}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{r.created_at?.slice(0, 10)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 4: 我的询价
// ════════════════════════════════════════════
function MyInquiriesTab() {
  const lang = useLang();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await client.get("/ddp/my-inquiries");
      setItems(res.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{lang === "en" ? "📬 My DDP Inquiries" : "📬 我的DDP询价"}</h3>
      <p className="text-xs text-gray-400 mb-4">{lang === "en" ? "Overview of all your DDP inquiries and agent replies" : "查看您所有的DDP询价及各代理的回复情况"}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{lang === "en" ? "No inquiries yet. Submit one from the Inquiry tab!" : "暂无询价记录，去「我要询价」Tab 提交吧！"}</div>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 hover:border-primary-200 transition-all">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800">{item.country}{item.port ? ` / ${item.port}` : ""}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.goods_desc || item.notes?.substring(0, 40) || "-"}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.created_at?.slice(0, 16).replace("T", " ")}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {item.reply_count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                    <MessageSquare className="w-3 h-3" />
                    {item.reply_count}{lang === "en" ? " replies" : "条回复"}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">{lang === "en" ? " Awaiting" : "等待回复"}</span>
                )}
                <button className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  onClick={() => { (window as any).location = "/admin/inbox"; }}>
                  {lang === "en" ? "View →" : "查看 →"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 海外代理自助入驻组件 ──
function AgentOnboarding() {
  const lang = useLang();
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [direction, setDirection] = useState<'export' | 'import'>('export');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [ports, setPorts] = useState<string[]>(['', '', '', '', '', '', '', '', '', '']);
  const [services, setServices] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!companyName.trim() || !country.trim() || !ports.some(p => p.trim())) {
      setError(lang === 'en' ? 'Please fill in company name, country and at least one port' : '请填写公司名称、国家和至少一个可操作港口');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await client.post('/ddp/agents/self-onboard', {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || undefined,
        country: country.trim(),
        city: city.trim() || undefined,
        service_ports: ports.filter(p => p.trim()).join(','),
        service_types: services.trim() || undefined,
        description: description.trim() || undefined,
        reference_price: price.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败'));
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center mb-6">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-800 font-bold text-lg">{t(T.onboardSuccess, lang)}</p>
        <p className="text-green-600 text-sm mt-2">{lang === 'en' ? 'Chinese forwarders can now find you and send inquiries.' : '中国货代现在可以找到您并发送询价了。'}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-6 h-6 text-purple-600" />
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t(T.onboardTitle, lang)}</h2>
          <p className="text-sm text-gray-500">{t(T.onboardDesc, lang)}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardCompany, lang)}</label>
          <input className="input-field w-full text-sm" placeholder={t(T.onboardCompanyPlace, lang)} value={companyName} onChange={e => { setCompanyName(e.target.value); setError(''); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardContact, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="John Smith" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardCountry, lang)}</label>
          <input className="input-field w-full text-sm" placeholder={t(T.onboardCountryPlace, lang)} value={country} onChange={e => { setCountry(e.target.value); setError(''); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardCity, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="Los Angeles" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardPorts, lang)} <span className="text-red-500">*</span></label>
          <p className="text-[10px] text-amber-600 mb-2">{lang === 'en' ? 'Fill in priority order (1 = highest). DDP inquiries will be matched in this order.' : '按优先级填写（1为最高）。DDP询价将按此顺序匹配推送。'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {ports.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                <input
                  className="input-field text-xs py-1.5 w-full"
                  placeholder={lang === 'en' ? 'Port ' + (i + 1) : '港口' + (i + 1)}
                  value={p}
                  onChange={e => {
                    const newPorts = [...ports];
                    newPorts[i] = e.target.value.toUpperCase();
                    setPorts(newPorts);
                    setError('');
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardServices, lang)}</label>
          <input className="input-field w-full text-sm" placeholder={t(T.onboardServicesPlace, lang)} value={services} onChange={e => setServices(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardPrice, lang)}</label>
          <input className="input-field w-full text-sm" placeholder={t(T.onboardPricePlace, lang)} value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardDescLabel, lang)}</label>
          <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={t(T.onboardDescPlace, lang)} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      <button className="btn-primary mt-4 inline-flex items-center gap-2 text-sm py-2.5 px-6" onClick={handleSubmit} disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : t(T.onboardBtn, lang)}
      </button>
    </div>
  );
}

// ── 信用分徽章 ──

// ── 海外代理档案卡片（入驻后显示） ──
function AgentProfileCard({ profile, lang }: { profile: any; lang: Lang }) {
  const ports = (profile.service_ports || '').split(',').map((p: string) => p.trim()).filter(Boolean);
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🏢</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base">{profile.company_name}</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Registered' : '已入驻'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{profile.country}{profile.city ? ' - ' + profile.city : ''}</p>
        </div>
      </div>
      {ports.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">
            {lang === 'en' ? 'Operable Ports (Priority Order):' : '可操作港口（按优先级排序）：'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ports.map((port: string, i: number) => (
              <span key={i}
                className={'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ' + (i < 3 ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium' : 'bg-white border-gray-200 text-gray-600')}>
                <span className={'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ' + (i < 3 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500')}>{i + 1}</span>
                {port}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.reference_price && (
        <div className="mt-2 text-xs text-gray-500">💰 {profile.reference_price}</div>
      )}
    </div>
  );
}


function CreditScoreBadge({ userId }: { userId: string }) {
  const [score, setScore] = useState<{ score: number; level: string } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    client.get(`/cooperations/credit-score/${userId}`).then(res => setScore(res.data)).catch((err) => { console.warn('[DDPPage] failed to load credit score:', err); }).finally(() => setLoading(false));
  }, [userId]);
  if (loading) return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
  if (!score) return null;
  const color = score.score >= 75 ? 'text-green-600' : score.score >= 50 ? 'text-amber-600' : 'text-gray-400';
  return <span className={`text-[10px] font-bold ${color}`} title={score.level}>🏆 {score.score}</span>;
}

// ── 代理卡片子组件 ──
function AgentCard({ agent, onContact, onViewReviews }: { agent: DDPAgent; onContact: () => void; onViewReviews: () => void }) {
  const lang = useLang();
  const serviceTypes = (agent.service_types || 'DDP').split(',').map(s => s.trim());
  const ports = (agent.service_ports || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-primary-200 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{getCountryEmoji(agent.country)}</span>
            <h4 className="font-semibold text-gray-900 text-sm">{agent.company_name}</h4>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {agent.country}{agent.city ? ` · ${agent.city}` : ''}
            {agent.completed_orders > 0 && ` · ${agent.completed_orders}${t(T.completed, lang)}`}{agent.coop_forwarder_count !== undefined && agent.coop_forwarder_count > 0 && ` · 🤝 ${agent.coop_forwarder_count}${lang === 'en' ? ' forwarders' : '家货代合作'}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditScoreBadge userId={agent.created_by} />
          <div className="flex items-center gap-1 text-amber-500 text-xs" title={t(T.viewReviews, lang)}>
            <Star className="w-3 h-3 fill-current" />
            <span onClick={onViewReviews} className="cursor-pointer hover:text-amber-600">{t(T.viewReviews, lang)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {serviceTypes.map((st: string) => (
          <span key={st} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{st}</span>
        ))}
      </div>

      {ports.length > 0 && (
        <p className="text-xs text-gray-500 mb-2">
          <MapPin className="w-3 h-3 inline mr-0.5" />
          {t(T.operablePorts, lang)}<span className="text-gray-700">{ports.slice(0, 4).join(lang === 'zh' ? '、' : ', ')}{ports.length > 4 ? `${t(T.andMore, lang)}${ports.length}` : ''}</span>
        </p>
      )}

      {agent.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{agent.description}</p>
      )}

      {agent.reference_price && (
        <p className="text-xs font-medium text-emerald-600 mb-3">
          💰 {t(T.refPrice, lang)}{agent.reference_price}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-3">
        {agent.contact_person && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{agent.contact_person}</span>}
        {agent.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{agent.phone}</span>}
        {agent.email && <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" />{agent.email}</span>}
      </div>

      <div className="flex gap-2">
        <button className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg py-2 transition-colors" onClick={onContact}>
          <MessageSquare className="w-3.5 h-3.5" />
          {t(T.contactBtn, lang)}
        </button>
        <button className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg py-2 transition-colors" onClick={onViewReviews}>
          <Star className="w-3.5 h-3.5" />
          {t(T.reviewBtn, lang)}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 3: 需求统计
// ════════════════════════════════════════════
function StatsTab() {
  const lang = useLang();
  const [stats, setStats] = useState<DDPStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await client.get<DDPStatsResponse>('/ddp/stats');
      setStats(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!stats) return <div className="text-center py-12 text-gray-400 text-sm">{t(T.statsNoInquiries, lang)}</div>;

  const maxInquiryCount = Math.max(...stats.inquiryStats.map(s => s.count), 1);
  const maxAgentCount = Math.max(...stats.agentStats.map(s => s.count), 1);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: T.statsTotalInquiries, value: stats.overview.totalInquiries, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: T.statsTotalAgents, value: stats.overview.totalAgents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: T.statsPending, value: stats.overview.pendingAgents, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card) => (
          <div key={card.label.zh} className={`${card.bg} rounded-xl p-4 text-center border border-gray-100`}>
            <card.icon className={`w-5 h-5 mx-auto mb-1.5 ${card.color}`} />
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t(card.label, lang)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            {t(T.statsHotTitle, lang)}
          </h3>
          {stats.inquiryStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">{t(T.statsNoInquiries, lang)}</div>
          ) : (
            <div className="space-y-2">
              {stats.inquiryStats.slice(0, 10).map((item, idx) => (
                <div key={item.country} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{idx + 1}</span>
                  <span className="text-sm">{getCountryEmoji(item.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{item.country}</span>
                      <span className="text-xs font-bold text-blue-600">{item.count}{t(T.times, lang)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(item.count / maxInquiryCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            {t(T.statsAgentDist, lang)}
          </h3>
          {stats.agentStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">{t(T.statsNoAgents, lang)}</div>
          ) : (
            <div className="space-y-2">
              {stats.agentStats.map((item, idx) => (
                <div key={item.country} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{idx + 1}</span>
                  <span className="text-sm">{getCountryEmoji(item.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-gray-700 truncate">{item.country}</span>
                      <span className="text-xs font-bold text-emerald-600">{item.count}{t(T.count, lang)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(item.count / maxAgentCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-right">
        <button className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1" onClick={fetchStats}>
          <RefreshCw className="w-3 h-3" /> {t(T.statsRefresh, lang)}
        </button>
      </div>
    </div>
  );
}
