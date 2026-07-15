import { useState, useEffect, useMemo } from 'react';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../components/common/Toast';
import {
  Globe, Search, Loader2, Send, X, MessageSquare, Clock,
  TrendingUp, Users, MapPin, Phone, Mail, Building2, FileText,
  Star, ChevronLeft, ChevronRight, RefreshCw, CheckCircle,
  AlertCircle, Edit3, Save, ListChecks, BarChart3,
} from 'lucide-react';

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════
type Lang = 'zh' | 'en';
interface LangText { zh: string; en: string }

function tl(text: LangText, lang: Lang): string { return text[lang]; }

interface ServiceProfile {
  id: string;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string;
  city: string | null;
  service_ports: string | null;
  service_types: string | null;
  description: string | null;
  reference_price: string | null;
  status: string;
  created_at: string;
}

interface ForwarderItem {
  id: string;
  display_name: string;
  company_name: string;
  phone: string | null;
  credit_score: number | null;
  cooperation_count: number;
  role: string;
}

interface ForwarderPage {
  data: ForwarderItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface InquiryItem {
  id: string;
  sender_company: string;
  content: string;
  created_at: string;
  status: string;
}

interface StatsData {
  total_inquiries: number;
  pending_replies: number;
  cooperations: number;
  confirmed_deals: number;
}

// ════════════════════════════════════════════
// Bilingual Text Map
// ════════════════════════════════════════════
const T = {
  pageTitle: { zh: '🌍 海外代理工作台', en: '🌍 Overseas Agent Console' },
  pageSubtitle: { zh: '管理服务资料 · 查找中国货代 · 查看询价统计', en: 'Manage profile · Find Chinese forwarders · View stats' },

  tabProfile: { zh: '📋 我的服务资料', en: '📋 My Service Profile' },
  tabSearch: { zh: '🔍 搜索中国货代', en: '🔍 Search Forwarders' },
  tabStats: { zh: '📊 我的数据', en: '📊 My Stats' },

  // Profile tab
  profileTitle: { zh: '编辑服务资料', en: 'Edit Service Profile' },
  profileDesc: { zh: '完善您的服务信息，让中国货代更容易找到您', en: 'Complete your profile so Chinese forwarders can find you' },
  companyName: { zh: '公司名称 *', en: 'Company Name *' },
  companyPlaceholder: { zh: '如：Global Logistics Solutions Inc.', en: 'e.g. Global Logistics Solutions Inc.' },
  contactPerson: { zh: '联系人', en: 'Contact Person' },
  contactPlaceholder: { zh: '如：John Smith', en: 'e.g. John Smith' },
  emailLabel: { zh: '邮箱', en: 'Email' },
  emailPlaceholder: { zh: 'business@company.com', en: 'business@company.com' },
  phoneLabel: { zh: '电话', en: 'Phone' },
  phonePlaceholder: { zh: '+1-555-1234', en: '+1-555-1234' },
  countryLabel: { zh: '国家 *', en: 'Country *' },
  countryPlaceholder: { zh: '如：USA', en: 'e.g. USA' },
  cityLabel: { zh: '城市', en: 'City' },
  cityPlaceholder: { zh: '如：Los Angeles', en: 'e.g. Los Angeles' },
  servicePortsLabel: { zh: '服务港口', en: 'Service Ports' },
  servicePortsPlaceholder: { zh: '如：New York, Los Angeles, Chicago', en: 'e.g. New York, Los Angeles, Chicago' },
  serviceTypesLabel: { zh: '服务类型', en: 'Service Types' },
  descriptionLabel: { zh: '业务介绍', en: 'Description' },
  descriptionPlaceholder: { zh: '介绍您的公司、优势和服务...', en: 'Introduce your company and services...' },
  refPriceLabel: { zh: '参考报价', en: 'Reference Price' },
  refPricePlaceholder: { zh: '如：LCL from $50/CBM, FCL from $200/container', en: 'e.g. LCL from $50/CBM, FCL from $200/container' },
  saveBtn: { zh: '保存资料', en: 'Save Profile' },
  saving: { zh: '保存中...', en: 'Saving...' },
  saveSuccess: { zh: '资料已更新', en: 'Profile updated successfully' },
  loadFailed: { zh: '加载资料失败', en: 'Failed to load profile' },
  notRegistered: { zh: '尚未注册服务资料，请填写以下信息', en: 'Not yet registered. Please fill in your details below.' },

  // Service type checkboxes
  stDDP: { zh: 'DDP', en: 'DDP' },
  stDDU: { zh: 'DDU', en: 'DDU' },
  stClearance: { zh: '清关', en: 'Customs Clearance' },
  stDelivery: { zh: '派送', en: 'Delivery' },
  stWarehousing: { zh: '仓储', en: 'Warehousing' },

  // Search tab
  searchPlaceholder: { zh: '搜索公司名称或联系人...', en: 'Search company name or contact...' },
  searchBtn: { zh: '搜索', en: 'Search' },
  noResults: { zh: '未找到匹配的货代', en: 'No forwarders found' },
  searchPrompt: { zh: '输入关键词搜索中国货代', en: 'Enter keywords to search forwarders' },
  creditScore: { zh: '信用分', en: 'Credit Score' },
  cooperations: { zh: '合作次数', en: 'Cooperations' },
  sendMsg: { zh: '发送消息', en: 'Send Message' },
  msgTitle: { zh: '发送消息给', en: 'Send message to' },
  msgPlaceholder: { zh: '请输入您的消息内容...', en: 'Type your message here...' },
  msgSent: { zh: '✅ 消息已发送', en: '✅ Message sent' },
  msgSending: { zh: '发送中...', en: 'Sending...' },
  msgFail: { zh: '发送失败', en: 'Failed to send' },
  prevPage: { zh: '上一页', en: 'Previous' },
  nextPage: { zh: '下一页', en: 'Next' },
  pageInfo: (page: number, total: number) => ({ zh: `第 ${page}/${total} 页`, en: `Page ${page}/${total}` }),

  // Stats tab
  totalInquiries: { zh: '总询价数', en: 'Total Inquiries' },
  pendingReplies: { zh: '待回复', en: 'Pending Replies' },
  cooperationsTitle: { zh: '合作数', en: 'Cooperations' },
  confirmedDeals: { zh: '已成交', en: 'Confirmed Deals' },
  recentInquiries: { zh: '最近询价', en: 'Recent Inquiries' },
  noInquiries: { zh: '暂无询价', en: 'No inquiries yet' },
  refreshStats: { zh: '刷新数据', en: 'Refresh' },
  company: { zh: '公司', en: 'Company' },
  date: { zh: '日期', en: 'Date' },
  content: { zh: '内容', en: 'Content' },
};

// ── Service type options ──
const SERVICE_TYPE_OPTIONS = [
  { key: 'DDP', label: T.stDDP },
  { key: 'DDU', label: T.stDDU },
  { key: 'Customs Clearance', label: T.stClearance },
  { key: 'Delivery', label: T.stDelivery },
  { key: 'Warehousing', label: T.stWarehousing },
];

// ════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════
type TabKey = 'profile' | 'search' | 'stats';

export default function OverseasAgentCenter() {
  const authLang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<TabKey>('profile');
  const [lang] = useState<Lang>(authLang);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tl(T.pageTitle, lang)}</h1>
          <p className="text-sm text-gray-500">{tl(T.pageSubtitle, lang)}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { key: 'profile' as TabKey, label: T.tabProfile, activeBg: 'from-blue-500 to-indigo-600' },
          { key: 'search' as TabKey, label: T.tabSearch, activeBg: 'from-emerald-500 to-teal-600' },
          { key: 'stats' as TabKey, label: T.tabStats, activeBg: 'from-amber-500 to-orange-600' },
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
              <span>{tl(tItem.label, lang)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'profile' && <ProfileTab lang={lang} />}
      {tab === 'search' && <SearchTab lang={lang} />}
      {tab === 'stats' && <StatsTab lang={lang} />}
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 1: My Service Profile
// ════════════════════════════════════════════
function ProfileTab({ lang }: { lang: Lang }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [servicePorts, setServicePorts] = useState('');
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [referencePrice, setReferencePrice] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.get('/overseas/my-profile');
      const data = res.data as ServiceProfile | null;
      if (data) {
        setCompanyName(data.company_name || '');
        setContactPerson(data.contact_person || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setCountry(data.country || '');
        setCity(data.city || '');
        setServicePorts(data.service_ports || '');
        setServiceTypes((data.service_types || '').split(',').map(s => s.trim()).filter(Boolean));
        setDescription(data.description || '');
        setReferencePrice(data.reference_price || '');
      }
    } catch {
      // 404 means not registered yet — form stays empty
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const toggleServiceType = (st: string) => {
    setServiceTypes(prev =>
      prev.includes(st) ? prev.filter(x => x !== st) : [...prev, st]
    );
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      setError(lang === 'en' ? 'Company name is required' : '公司名称为必填项');
      return;
    }
    if (!country.trim()) {
      setError(lang === 'en' ? 'Country is required' : '国家为必填项');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await client.put('/overseas/my-profile', {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        country: country.trim(),
        city: city.trim() || null,
        service_ports: servicePorts.trim() || null,
        service_types: serviceTypes.join(',') || null,
        description: description.trim() || null,
        reference_price: referencePrice.trim() || null,
      });
      toast.success(tl(T.saveSuccess, lang));
    } catch (err: any) {
      const msg = err?.response?.data?.error || (lang === 'en' ? 'Save failed' : '保存失败');
      setError(msg);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Edit3 className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-base font-bold text-gray-800">{tl(T.profileTitle, lang)}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">{tl(T.profileDesc, lang)}</p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {/* Company Name */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.companyName, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.companyPlaceholder, lang)}
            value={companyName}
            onChange={e => { setCompanyName(e.target.value); setError(''); }}
          />
        </div>

        {/* Contact Person */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.contactPerson, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.contactPlaceholder, lang)}
            value={contactPerson}
            onChange={e => setContactPerson(e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.emailLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.emailPlaceholder, lang)}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.phoneLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.phonePlaceholder, lang)}
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        {/* Country */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.countryLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.countryPlaceholder, lang)}
            value={country}
            onChange={e => { setCountry(e.target.value); setError(''); }}
          />
        </div>

        {/* City */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.cityLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.cityPlaceholder, lang)}
            value={city}
            onChange={e => setCity(e.target.value)}
          />
        </div>

        {/* Service Ports */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.servicePortsLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.servicePortsPlaceholder, lang)}
            value={servicePorts}
            onChange={e => setServicePorts(e.target.value)}
          />
        </div>

        {/* Service Types (multi-select checkboxes) */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-2 block">{tl(T.serviceTypesLabel, lang)}</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPE_OPTIONS.map(opt => {
              const selected = serviceTypes.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                  onClick={() => toggleServiceType(opt.key)}
                >
                  {selected ? '✓ ' : ''}{tl(opt.label, lang)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference Price */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.refPriceLabel, lang)}</label>
          <input
            className="input-field w-full text-sm"
            placeholder={tl(T.refPricePlaceholder, lang)}
            value={referencePrice}
            onChange={e => setReferencePrice(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{tl(T.descriptionLabel, lang)}</label>
          <textarea
            className="input-field w-full text-sm min-h-[100px] resize-none"
            placeholder={tl(T.descriptionPlaceholder, lang)}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Save Button */}
        <div className="md:col-span-2 flex justify-end">
          <button
            className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? tl(T.saving, lang) : tl(T.saveBtn, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 2: Search Chinese Forwarders
// ════════════════════════════════════════════
function SearchTab({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ForwarderItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const pageSize = 10;

  // Contact modal state
  const [contactTarget, setContactTarget] = useState<ForwarderItem | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const doSearch = async (p: number) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await client.get<ForwarderPage>('/overseas/forwarders', {
        params: { q: query.trim(), page: p, pageSize },
      });
      setResults(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    doSearch(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSendMessage = async () => {
    if (!contactTarget || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', {
        receiver_id: contactTarget.id,
        content: contactText.trim(),
      });
      setContactSent(true);
      setTimeout(() => {
        setContactTarget(null);
        setContactSent(false);
        setContactText('');
      }, 1500);
    } catch {
      toast.error(tl(T.msgFail, lang));
    }
    setContactSending(false);
  };

  const getCreditColor = (score: number | null): string => {
    if (score === null) return 'text-gray-400';
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Search bar */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder-gray-400"
            placeholder={tl(T.searchPlaceholder, lang)}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="btn-primary inline-flex items-center gap-1.5 text-sm px-4 py-2"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {tl(T.searchBtn, lang)}
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !searched ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          {tl(T.searchPrompt, lang)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          {tl(T.noResults, lang)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map(fw => (
              <div key={fw.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-primary-200 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      <Building2 className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                      {fw.company_name || fw.display_name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Users className="w-3 h-3 inline mr-0.5" />
                      {fw.display_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 text-xs">
                  {fw.credit_score !== null && (
                    <span className={`inline-flex items-center gap-1 font-medium ${getCreditColor(fw.credit_score)}`}>
                      <Star className="w-3 h-3" />
                      {tl(T.creditScore, lang)}: {fw.credit_score}
                    </span>
                  )}
                  {fw.cooperation_count > 0 && (
                    <span className="text-gray-500 inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {tl(T.cooperations, lang)}: {fw.cooperation_count}
                    </span>
                  )}
                </div>

                {fw.phone && (
                  <p className="text-xs text-gray-500 mb-3">
                    <Phone className="w-3 h-3 inline mr-0.5" />{fw.phone}
                  </p>
                )}

                <button
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg py-2 transition-colors"
                  onClick={() => { setContactTarget(fw); setContactSent(false); setContactText(''); }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {tl(T.sendMsg, lang)}
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => doSearch(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {tl(T.prevPage, lang)}
              </button>
              <span className="text-xs text-gray-500">{tl(T.pageInfo(page, totalPages), lang)}</span>
              <button
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={page >= totalPages}
                onClick={() => doSearch(page + 1)}
              >
                {tl(T.nextPage, lang)}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Contact Modal */}
      {contactTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-blue-500 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-600" />
                {tl(T.msgTitle, lang)} {contactTarget.company_name || contactTarget.display_name}
              </h3>
              <button onClick={() => setContactTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {contactSent ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-600 text-sm font-medium">{tl(T.msgSent, lang)}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {lang === 'en' ? 'Send a message. They will reply in your inbox.' : '发送消息，对方将在收件箱中回复。'}
                </p>

                <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600">
                  <p><Building2 className="w-3 h-3 inline mr-1" />{contactTarget.company_name || contactTarget.display_name}</p>
                  <p className="mt-1"><Users className="w-3 h-3 inline mr-1" />{contactTarget.display_name}</p>
                  {contactTarget.credit_score !== null && (
                    <p className="mt-1"><Star className="w-3 h-3 inline mr-1" />{tl(T.creditScore, lang)}: {contactTarget.credit_score}</p>
                  )}
                </div>

                <textarea
                  className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder={tl(T.msgPlaceholder, lang)}
                  value={contactText}
                  onChange={e => setContactText(e.target.value)}
                  disabled={contactSending}
                  autoFocus
                />

                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                  onClick={handleSendMessage}
                  disabled={contactSending || !contactText.trim()}
                >
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {contactSending ? tl(T.msgSending, lang) : tl(T.sendMsg, lang)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// Tab 3: My Stats
// ════════════════════════════════════════════
function StatsTab({ lang }: { lang: Lang }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, inqRes] = await Promise.all([
        client.get<StatsData>('/overseas/my-stats').catch(() => ({ data: null })),
        client.get<{ data: InquiryItem[] }>('/overseas/inquiries').catch(() => ({ data: { data: [] } })),
      ]);
      setStats(statsRes.data);
      setInquiries(inqRes.data?.data || []);
    } catch {
      // silent
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = stats
    ? [
        { label: T.totalInquiries, value: stats.total_inquiries, icon: BarChart3, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50' },
        { label: T.pendingReplies, value: stats.pending_replies, icon: Clock, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
        { label: T.cooperationsTitle, value: stats.cooperations, icon: Users, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50' },
        { label: T.confirmedDeals, value: stats.confirmed_deals, icon: CheckCircle, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50' },
      ]
    : [];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map(card => (
          <div key={card.label.zh} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 bg-gradient-to-r ${card.color} bg-clip-text text-transparent`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{tl(card.label, lang)}</p>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end mb-3">
        <button
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {tl(T.refreshStats, lang)}
        </button>
      </div>

      {/* Recent Inquiries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">{tl(T.recentInquiries, lang)}</h3>
        </div>

        {inquiries.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
            {tl(T.noInquiries, lang)}
          </div>
        ) : (
          <div className="space-y-2">
            {inquiries.map(inq => (
              <div key={inq.id} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100 hover:border-primary-200 transition-all">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {inq.sender_company}
                    </p>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {inq.created_at?.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{inq.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {inq.status === 'pending' ? (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                        {tl(T.pendingReplies, lang)}
                      </span>
                    ) : inq.status === 'replied' ? (
                      <span className="text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        {lang === 'en' ? 'Replied' : '已回复'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
