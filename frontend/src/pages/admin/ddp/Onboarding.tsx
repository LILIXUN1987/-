import { useState, useEffect, useRef } from 'react';
import client from '../../../api/client';
import { useLang, t, type Lang } from './shared';
import { Globe, Loader2, Send, Save, Edit3, AlertCircle } from 'lucide-react';

export const SERVICE_TYPE_OPTIONS = [
  { key: 'DDP', label: { zh: 'DDP', en: 'DDP' } },
  { key: 'DDU', label: { zh: 'DDU', en: 'DDU' } },
  { key: 'Customs Clearance', label: { zh: '清关', en: 'Customs Clearance' } },
  { key: 'Delivery', label: { zh: '派送', en: 'Delivery' } },
  { key: 'Warehousing', label: { zh: '仓储', en: 'Warehousing' } },
];

const T = {
  onboardTitle: { zh: '🌍 入驻海外代理', en: '🌍 Register as Overseas Agent' },
  onboardDesc: { zh: '填写以下信息，入驻后您的公司将展示在海外代理列表中，中国货代可直接向您询价', en: 'Fill in your details to appear in the overseas agent list and receive inquiries from Chinese forwarders' },
  onboardCompany: { zh: '公司英文名称 *', en: 'Company Name (English) *' },
  onboardContact: { zh: '联系人', en: 'Contact Person' },
  onboardCountry: { zh: '所在国家 *', en: 'Country *' },
  onboardPorts: { zh: '可操作港口 *', en: 'Operable Ports *' },
  onboardAirPorts: { zh: '✈️ 空运港口', en: '✈️ Air Ports' },
  onboardSeaPorts: { zh: '🚢 海运港口', en: '🚢 Sea Ports' },
  onboardPortsHint: { zh: '每个港口占一行，一行一个', en: 'One port per line' },
  onboardServices: { zh: '服务类型', en: 'Service Types' },
  onboardPrice: { zh: '参考报价', en: 'Reference Price' },
  onboardDescLabel: { zh: '业务介绍', en: 'Description' },
  onboardBtn: { zh: '提交入驻', en: 'Submit' },
  onboardSuccess: { zh: '✅ 入驻成功！您的信息已展示在海外代理列表中', en: '✅ Registered! Your company is now listed in the overseas agents directory' },
  profileTitle: { zh: '编辑服务资料', en: 'Edit Service Profile' },
  profileDesc: { zh: '完善您的服务信息，让中国货代更容易找到您', en: 'Complete your profile so Chinese forwarders can find you' },
};

export function AgentOnboarding() {
  const lang = useLang();
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [airPorts, setAirPorts] = useState('');
  const [seaPorts, setSeaPorts] = useState('');
  const [services, setServices] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const draftTimer = useRef<NodeJS.Timeout | null>(null);

  const saveDraft = () => {
    if (done) return;
    const hasPorts = airPorts.trim() || seaPorts.trim();
    const step = companyName ? (country ? (hasPorts ? 3 : 2) : 2) : 1;
    client.post('/ddp/onboarding-draft', {
      company_name: companyName || null, country: country || null,
      air_ports: airPorts.trim() || null, sea_ports: seaPorts.trim() || null,
      contact_person: contactPerson || null,
      phone: null, step_reached: step,
    }).catch(() => {});
  };

  const onFieldChange = (setter: any) => (e: any) => {
    setter(e);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(saveDraft, 3000);
  };

  useEffect(() => {
    client.get('/ddp/onboarding-draft').then(r => {
      const d = r.data?.data;
      if (d) {
        if (d.company_name) setCompanyName(d.company_name);
        if (d.country) setCountry(d.country);
        if (d.contact_person) setContactPerson(d.contact_person);
        if (d.air_ports) setAirPorts(d.air_ports);
        if (d.sea_ports) setSeaPorts(d.sea_ports);
      }
    }).catch(() => {});
    return () => { if (draftTimer.current) { clearTimeout(draftTimer.current); saveDraft(); } };
  }, []);

  const handleSubmit = async () => {
    if (!companyName.trim() || !country.trim() || (!airPorts.trim() && !seaPorts.trim())) {
      setError(lang === 'en' ? 'Please fill in company name, country and at least one port' : '请填写公司名称、国家和至少一个可操作港口');
      return;
    }
    setSubmitting(true); setError('');
    try {
      await client.post('/ddp/agents/self-onboard', {
        company_name: companyName.trim(), contact_person: contactPerson.trim() || undefined,
        country: country.trim(), city: city.trim() || undefined,
        air_ports: airPorts.trim() || undefined, sea_ports: seaPorts.trim() || undefined,
        service_types: services.trim() || undefined,
        description: description.trim() || undefined, reference_price: price.trim() || undefined,
      });
      setDone(true);
    } catch (err: any) { setError(err?.response?.data?.error || (lang === 'en' ? 'Submission failed' : '提交失败')); }
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
        <div><h2 className="text-lg font-bold text-gray-900">{t(T.onboardTitle, lang)}</h2><p className="text-sm text-gray-500">{t(T.onboardDesc, lang)}</p></div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4"><AlertCircle className="w-4 h-4 inline mr-1" />{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardCompany, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="Global Logistics Solutions Inc." value={companyName}
            onChange={e => { setCompanyName(e.target.value); setError(''); }} /></div>
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardContact, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="John Smith" value={contactPerson} onChange={e => setContactPerson(e.target.value)} /></div>
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardCountry, lang)}</label>
          <input className="input-field w-full text-sm" placeholder={lang === 'en' ? 'e.g. USA, Germany' : '如：美国、德国'} value={country} onChange={e => { setCountry(e.target.value); setError(''); }} /></div>
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'City' : '所在城市'}</label>
          <input className="input-field w-full text-sm" placeholder="Los Angeles" value={city} onChange={e => setCity(e.target.value)} /></div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardAirPorts, lang)}</label>
          <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={lang === 'en' ? 'LAX\nJFK\nORD' : 'LAX\nJFK\nORD'}
            value={airPorts} onChange={e => { setAirPorts(e.target.value.toUpperCase()); setError(''); }} />
          <p className="text-[10px] text-gray-400 mt-1">{t(T.onboardPortsHint, lang)}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardSeaPorts, lang)}</label>
          <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={lang === 'en' ? 'LOS ANGELES\nNEW YORK\nHAMBURG' : 'LOS ANGELES\nNEW YORK\nHAMBURG'}
            value={seaPorts} onChange={e => { setSeaPorts(e.target.value.toUpperCase()); setError(''); }} />
          <p className="text-[10px] text-gray-400 mt-1">{t(T.onboardPortsHint, lang)}</p>
        </div>
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardServices, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="DDP,DDU,清关,派送" value={services} onChange={e => setServices(e.target.value)} /></div>
        <div><label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardPrice, lang)}</label>
          <input className="input-field w-full text-sm" placeholder="LCL: USD8/CBM起" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t(T.onboardDescLabel, lang)}</label>
          <textarea className="input-field w-full text-sm min-h-[80px]" placeholder={lang === 'en' ? 'Introduce your company...' : '介绍您的公司和服务优势...'} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>
      <button className="btn-primary mt-4 inline-flex items-center gap-2 text-sm py-2.5 px-6" onClick={handleSubmit} disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? (lang === 'en' ? 'Submitting...' : '提交中...') : t(T.onboardBtn, lang)}
      </button>
    </div>
  );
}

export function AgentProfileCard({ profile, lang }: { profile: any; lang: Lang }) {
  const airPorts = (profile.air_ports || '').split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
  const seaPorts = (profile.sea_ports || '').split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
  const legacyPorts = (!profile.air_ports && !profile.sea_ports)
    ? (profile.service_ports || '').split(',').map((p: string) => p.trim()).filter(Boolean) : [];
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><span className="text-lg">🏢</span></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base">{profile.company_name}</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{lang === 'en' ? 'Registered' : '已入驻'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{profile.country}{profile.city ? ' - ' + profile.city : ''}</p>
        </div>
      </div>
      {/* Air Ports */}
      {airPorts.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1.5">✈️ {lang === 'en' ? 'Air Ports' : '空运港口'}</p>
          <div className="flex flex-wrap gap-1.5">
            {airPorts.map((port: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-sky-50 border-sky-200 text-sky-800 font-medium">
                {port}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Sea Ports */}
      {seaPorts.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-gray-600 mb-1.5">🚢 {lang === 'en' ? 'Sea Ports' : '海运港口'}</p>
          <div className="flex flex-wrap gap-1.5">
            {seaPorts.map((port: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-800 font-medium">
                {port}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Legacy (backward compatible) */}
      {legacyPorts.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">{lang === 'en' ? 'Operable Ports:' : '可操作港口：'}</p>
          <div className="flex flex-wrap gap-1.5">
            {legacyPorts.map((port: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-gray-50 border-gray-200 text-gray-600">
                {port}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.reference_price && <div className="mt-2 text-xs text-gray-500">💰 {profile.reference_price}</div>}
    </div>
  );
}
