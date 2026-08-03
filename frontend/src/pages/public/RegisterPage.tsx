import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { registerApi, CompanyMate } from '../../api/register.api';
import { authApi } from '../../api/auth.api';
import { Ship, Camera, X, CheckCircle, Loader2, Users, AlertCircle, ArrowRight, Sparkles, Shield, TrendingUp, MessageSquare, Globe } from 'lucide-react';
import { t, RegT, type Lang } from '../../i18n';
import { FEATURES } from '../../config/features';
import { useAuthStore } from '../../store/authStore';

const BACKEND_ERROR_MAP: Record<string, string> = {
  USERNAME_EXISTS: 'username', EMAIL_EXISTS: 'email', PHONE_EXISTS: 'phone',
  INVALID_EMAIL: 'email', MISSING_CODE: 'emailCode', INVALID_CODE: 'emailCode',
  WEAK_PASSWORD: 'password', MISSING_PHONE: 'phone', INVALID_USERNAME: 'username', EMPTY_TEXT: 'company_name',
};

function ErrorTip({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null;
  return <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{errors[field]}</p>;
}

const ROLE_CARDS = [
  { key: 'trader', icon: '🌏', labelZh: '外贸&个人', labelEn: 'Trader & Individual', descZh: '查舱位·物流询价', descEn: 'Search cargo & inquire', color: 'from-emerald-500 to-teal-600' },
  { key: 'forwarder', icon: '📦', labelZh: '货代', labelEn: 'Forwarder', descZh: '发布舱位·找客户', descEn: 'Post cargo & find clients', color: 'from-blue-500 to-indigo-600' },
  { key: 'enterprise_forwarder', icon: '🏢', labelZh: '货代（企业版）', labelEn: 'Enterprise Forwarder', descZh: '169元/月 · 子账号 · API', descEn: 'Y169/mo · Sub-accts · API', color: 'from-amber-500 to-orange-600' },
  { key: 'lawyer', icon: '⚖', labelZh: '律师', labelEn: 'Lawyer', descZh: '货代纠纷·合同审查', descEn: 'Legal consultation', color: 'from-amber-500 to-yellow-600' },
  { key: 'inspector', icon: '🔬', labelZh: '检测认证', labelEn: 'Inspector', descZh: '验货·质检·合规', descEn: 'Inspection & compliance', color: 'from-teal-500 to-cyan-600' },
  { key: 'insurer', icon: '🛡', labelZh: '运输保险', labelEn: 'Insurer', descZh: '货运险·责任险', descEn: 'Cargo insurance', color: 'from-rose-500 to-pink-600' },
  { key: 'overseas_agent', icon: '🌍', labelZh: '海外代理', labelEn: 'Overseas Agent', descZh: '接收DDP询价', descEn: 'Receive DDP inquiries', color: 'from-purple-500 to-violet-600' },
  { key: 'broker', icon: '🏛', labelZh: '报关行', labelEn: 'Customs Broker', descZh: '免费入驻·投放券获客', descEn: 'Free to join & get clients', color: 'from-teal-500 to-emerald-600' },
  { key: 'enterprise_overseas_agent', icon: '🏢', labelZh: '海外代理（企业版）', labelEn: 'Enterprise Agent', descZh: '$169/月 · 子账号 · API', descEn: '$169/mo · Sub-accts · API', color: 'from-indigo-500 to-purple-600' },
];

const BENEFITS = [
  { icon: TrendingUp, title: '500+', sub: '每日舱位数据', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Users, title: '200+', sub: '活跃企业用户', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: MessageSquare, title: '1000+', sub: '月均询价量', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Shield, title: '99%', sub: '合作安全率', color: 'text-rose-500', bg: 'bg-rose-50' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => { if (!FEATURES.REGISTRATION) navigate('/', { replace: true }); }, [navigate]);
  const refCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({
    username: '', password: '', display_name: '', gender: '', company_name: '', phone: '', email: '', emailCode: '',
    role: 'trader', jc_trans_id: '', wca_id: '', is_newbie: false, is_enterprise: false,
  });
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [enterpriseLicense, setEnterpriseLicense] = useState<File | null>(null);
  const [enterpriseLicensePreview, setEnterpriseLicensePreview] = useState<string | null>(null);
  const storeLang = useAuthStore((s) => s.lang);
  const setLang = useAuthStore((s) => s.setLang);
  const lang: Lang = form.role === 'overseas_agent' ? 'en' : storeLang;
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredRole, setRegisteredRole] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeTimer, setCodeTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const companyTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [companyMates, setCompanyMates] = useState<CompanyMate[]>([]);
  const [matesLoading, setMatesLoading] = useState(false);
  const [isIndividual, setIsIndividual] = useState(false);

  useEffect(() => {
    if (companyTimerRef.current) clearTimeout(companyTimerRef.current);
    const q = form.company_name.trim();
    if (q.length < 2) { setCompanyMates([]); return; }
    setMatesLoading(true);
    companyTimerRef.current = setTimeout(async () => {
      try { const data = await registerApi.companyMates(q); setCompanyMates(data); } catch { setCompanyMates([]); }
      setMatesLoading(false);
    }, 600);
    return () => { if (companyTimerRef.current) clearTimeout(companyTimerRef.current); };
  }, [form.company_name]);

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    setServerError('');
    if (field === 'role' && value !== 'trader') setIsIndividual(false);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setFieldError('card', lang === 'en' ? 'Only JPG/PNG/WebP images are accepted' : '仅支持 JPG/PNG/WebP 格式图片');
      e.target.value = ''; return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setFieldError('card', lang === 'en' ? 'File size must be under 20MB' : '文件大小不能超过 20MB');
      e.target.value = ''; return;
    }
    setCardImage(file);
    setFieldErrors(prev => { const n = { ...prev }; delete n['card']; return n; });
    const reader = new FileReader();
    reader.onload = () => setCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleEnterpriseLicense = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnterpriseLicense(file);
    const reader = new FileReader();
    reader.onload = () => setEnterpriseLicensePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const setFieldError = (field: string, msg: string) => { setFieldErrors(prev => ({ ...prev, [field]: msg })); };

  const handleSendCode = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setFieldError('email', '请先填写有效的邮箱地址'); return; }
    setCodeSending(true);
    try {
      await authApi.sendEmailCode(form.email, form.role);
      setCodeSent(true); setCodeTimer(60);
      timerRef.current = setInterval(() => { setCodeTimer(prev => { if (prev <= 1) { clearInterval(timerRef.current); return 0; } return prev - 1; }); }, 1000);
    } catch (err: unknown) { setFieldError('email', (err as any)?.response?.data?.error || '发送验证码失败'); }
    setCodeSending(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({}); setServerError('');
    const newErrors: Record<string, string> = {};
    if (!form.display_name.trim()) newErrors.display_name = '请填写姓名';
    if (!isIndividual && !form.company_name.trim()) newErrors.company_name = '请填写公司全称';
    if (form.role !== 'trader' && form.role !== 'overseas_agent' && !form.phone.trim()) newErrors.phone = '请填写手机号';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = '请填写有效的邮箱地址';
    if (!form.emailCode) newErrors.emailCode = '请先获取并填写邮箱验证码';
    if (!form.username.trim()) newErrors.username = '请设置用户名';
    if (!form.password.trim()) newErrors.password = '请设置密码';
    else if (form.password.length < 6) newErrors.password = '密码长度不能少于6位';
    const effectiveRole = form.role === "enterprise_forwarder" ? "forwarder" : form.role === "enterprise_overseas_agent" ? "overseas_agent" : form.role;
    if ((effectiveRole === "forwarder" || form.role === "lawyer" || form.role === "inspector" || form.role === "insurer" || form.role === "overseas_agent" || form.role === "enterprise_overseas_agent") && !cardImage) newErrors.card = '请上传公司名片';
    if ((form.role === "enterprise_forwarder" || form.role === "enterprise_overseas_agent") && !enterpriseLicense) newErrors.license = "请上传营业执照";
    if (Object.keys(newErrors).length > 0) { setFieldErrors(newErrors); return; }
    const finalCompanyName = isIndividual ? (lang === 'en' ? '(Individual)' : '个人用户') : form.company_name.trim();
    setLoading(true);
    try {
      await registerApi.register({
        ...form, company_name: finalCompanyName, role: effectiveRole,
        is_enterprise: (form.role === "enterprise_forwarder" || form.role === "enterprise_overseas_agent") ? true : undefined,
        card_image: (effectiveRole === "forwarder" || form.role === "lawyer" || form.role === "inspector" || form.role === "insurer" || form.role === "overseas_agent" || form.role === "enterprise_overseas_agent") && cardImage ? cardImage : undefined,
        license_image: (form.role === "enterprise_forwarder" || form.role === "enterprise_overseas_agent") && enterpriseLicense ? enterpriseLicense : undefined,
        ref: refCode,
      });
      setRegisteredRole(effectiveRole);
      setSuccess(true);
    } catch (err: unknown) {
      const respData = (err as any)?.response?.data;
      const errCode = respData?.code;
      const errMsg = respData?.error || '注册失败';
      const field = errCode && BACKEND_ERROR_MAP[errCode];
      if (field) setFieldError(field, errMsg);
      else setServerError(errMsg);
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 flex items-center justify-center px-4">
        <div className="relative">
          {/* Decorative */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center max-w-md w-full relative border border-white/20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t(RegT.title, lang)}</h2>
            <p className="text-gray-500 mb-4">
              {registeredRole === 'forwarder' ? t(RegT.forwarderSuccess, lang) :
               registeredRole === 'lawyer' ? t(RegT.lawyerSuccess, lang) :
               registeredRole === 'overseas_agent' ? t(RegT.agentSuccess, lang) :
               registeredRole === 'inspector' || registeredRole === 'insurer' ? t(RegT.restrictedSuccess, lang) :
               t(RegT.loginDefault, lang)}
            </p>
            {(registeredRole === 'forwarder') && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 mb-3 text-sm text-blue-700">
                <Sparkles className="w-4 h-4 inline mr-1" />{t(RegT.forwarderCouponTip, lang)}
              </div>
            )}
            {(registeredRole === 'trader') && (
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl px-4 py-3 mb-3 text-sm text-pink-700">
                <Sparkles className="w-4 h-4 inline mr-1" />{t(RegT.traderCouponTip, lang)}
              </div>
            )}
            <p className="text-sm font-bold text-red-500 mb-5">{t(RegT.warning, lang)}</p>
            <button className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary-500/25 transition-all" onClick={() => navigate('/login')}>
              {t(RegT.goLogin, lang)} <ArrowRight className="w-4 h-4 inline" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = (field: string) =>
    `w-full px-4 py-2.5 text-sm bg-gray-50 border-2 ${fieldErrors[field] ? 'border-red-300 bg-red-50/50' : 'border-gray-200'} rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:bg-white transition-all duration-200 placeholder:text-gray-400`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 flex">
      {/* ── LEFT: Brand Side ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 relative overflow-hidden items-center justify-center">
        {/* Decorative elements */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary-500/5 to-indigo-500/5 rounded-full" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px'}} />

        <div className="relative z-10 text-center px-16 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl mb-8 shadow-xl border border-white/10">
            <Ship className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4 leading-tight tracking-tight">
                        {lang === 'en' ? <>Join 123 Cargo<br/>Community</> : <>加入123共享<br/>外贸物流社区</>}
          </h1>
          <p className="text-lg text-white/70 mb-10 leading-relaxed">
            {lang === 'en'
              ? 'Connect with 500+ forwarders and 200+ traders. Real-time cargo space, DDP inquiries, and industry insights.'
              : '与500+货代、200+外贸公司一起，实时查询舱位、发布货源、获取DDP询价。'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
                <b.icon className="w-5 h-5 text-white/80 mb-1" />
                <div className="text-2xl font-black text-white">{b.title}</div>
                <div className="text-xs text-white/50">{b.sub}</div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 justify-center mt-8">
            {['货代', '外贸', '报关行', '海外代理', '律师', '保险'].map((r, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Registration Form ── */}
      <div className="w-full lg:w-1/2 flex items-start justify-center px-4 py-8 overflow-y-auto" style={{maxHeight: '100vh'}}>
        <div className="w-full max-w-lg py-4">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl mb-3 shadow-lg">
              <Ship className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{t(RegT.title, lang)}</h1>
            <p className="text-sm text-gray-500 mt-1">{t(RegT.subtitle, lang)}</p>
          </div>

          {/* Lang toggle */}
          <div className="flex justify-end mb-4">
            <button type="button" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm">
              <span className="text-sm">🌐</span>
              <span className="font-semibold">{lang === 'zh' ? 'English' : '中文'}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 space-y-5">
            {serverError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{serverError}
              </div>
            )}

            {/* Step 1: Who are you */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">1</div>
                <h3 className="text-sm font-bold text-gray-800">{t(RegT.selectRole, lang)}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ROLE_CARDS.map(rc => {
                  const isActive = form.role === rc.key || (rc.key === 'forwarder' && form.role === 'enterprise_forwarder');
                  const label = lang === 'en' ? rc.labelEn : rc.labelZh;
                  const desc = lang === 'en' ? rc.descEn : rc.descZh;
                  return (
                    <button type="button" key={rc.key} onClick={() => update('role', rc.key)}
                      className={`group relative p-3 rounded-2xl border-2 text-center transition-all duration-200 ${
                        isActive ? 'border-primary-400 bg-primary-50/50 shadow-sm shadow-primary-200/50' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                      }`}>
                      {isActive && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>}
                      <div className="text-xl mb-1">{rc.icon}</div>
                      <div className={`text-xs font-semibold leading-tight ${isActive ? 'text-primary-700' : 'text-gray-700'}`}>{label}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Enterprise license upload */}
              {(form.role === 'enterprise_forwarder' || form.role === 'enterprise_overseas_agent') && (
                <div className="mt-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                  <label className="block text-sm font-bold text-amber-800 mb-2">📄 上传营业执照 <span className="text-red-500">*</span></label>
                  {enterpriseLicense ? (
                    <div className="relative inline-block">
                      <img src={enterpriseLicensePreview} alt="营业执照" className="max-h-32 rounded-xl border shadow-sm" />
                      <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md" onClick={() => { setEnterpriseLicense(null); setEnterpriseLicensePreview(null); }}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-amber-300 rounded-xl p-5 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all bg-white">
                      <Camera className="w-8 h-8 text-amber-400" />
                      <span className="text-sm text-amber-600 font-medium">点击上传营业执照照片</span>
                      <span className="text-xs text-gray-400">支持 JPG/PNG，建议清晰可见</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleEnterpriseLicense} />
                    </label>
                  )}
                  <div className="mt-2 text-xs text-amber-700">{form.role === 'enterprise_overseas_agent' ? '🏢 Enterprise features unlocked after verification' : '🏢 营业执照审核通过后即可享受全部企业版权益'}</div>
                </div>
              )}
            </div>

            {/* Step 2: Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">2</div>
                <h3 className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Basic Info' : '基本信息'}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.name, lang)}</label>
                  <input className={inputCls('display_name')} value={form.display_name} onChange={e => update('display_name', e.target.value)} placeholder={t(RegT.namePlaceholder, lang)} />
                  <ErrorTip field="display_name" errors={fieldErrors} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.gender, lang)}</label>
                  <select className="w-full px-4 py-2.5 text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400" value={form.gender} onChange={e => update('gender', e.target.value)}>
                    <option value="">{t(RegT.genderSelect, lang)}</option>
                    <option value="male">{t(RegT.male, lang)}</option>
                    <option value="female">{t(RegT.female, lang)}</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.company, lang)}</label>
                <div className="relative">
                  <input className={inputCls('company_name') + (isIndividual ? ' bg-gray-50 text-gray-400' : '')} value={form.company_name}
                    onChange={e => update('company_name', e.target.value)}
                    placeholder={isIndividual ? (lang === 'en' ? '(Individual)' : '个人用户无需填写') : t(RegT.companyPlaceholder, lang)}
                    disabled={isIndividual} />
                </div>
                <ErrorTip field="company_name" errors={fieldErrors} />
                {form.role === 'trader' && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                    <input type="checkbox" checked={isIndividual} onChange={e => { setIsIndividual(e.target.checked); if (e.target.checked) update('company_name', ''); }}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      {lang === 'en' ? '🙋 I\'m an individual (no company)' : '🙋 我是个人用户（没有公司）'}
                    </span>
                  </label>
                )}
                {!isIndividual && <p className="text-xs text-amber-500 mt-1">{t(RegT.companyWarning, lang)}</p>}
                {!isIndividual && matesLoading && form.company_name.trim().length >= 2 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2"><Loader2 className="w-3 h-3 animate-spin" />{lang === 'en' ? 'Searching...' : '查询中...'}</div>
                )}
                {!isIndividual && !matesLoading && companyMates.length > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 mt-2">
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium">{t(RegT.companyMatesTitle, lang)}</p>
                        {companyMates.slice(0, 3).map((mate, i) => <p key={i} className="text-xs text-green-700">· {mate.company_name} — <strong>{mate.display_name}</strong></p>)}
                        {companyMates.length > 3 && <p className="text-xs text-green-600">{t(RegT.companyMatesMore(companyMates.length - 3), lang)}</p>}
                        <p className="text-xs text-green-700 mt-1">{t(RegT.companyMatesJoin, lang)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {form.role !== 'trader' && form.role !== 'overseas_agent' && form.role !== 'enterprise_overseas_agent' ? (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.phone, lang)}</label>
                  <input className={inputCls('phone')} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder={lang === 'en' ? 'Your phone number' : '11位手机号'} />
                  <ErrorTip field="phone" errors={fieldErrors} />
                </div>
              ) : (form.role === 'overseas_agent' || form.role === 'enterprise_overseas_agent') ? (
                <div className="mt-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
                  ✅ {lang === 'en' ? 'Phone optional for overseas agents' : '海外代理无需填写手机号'}
                </div>
              ) : (
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                  ✅ {lang === 'en' ? 'Phone optional for traders' : '外贸行业用户无需填写手机号'}
                </div>
              )}
            </div>

            {/* Step 3: Account */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">3</div>
                <h3 className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Account' : '账号信息'}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.email, lang)}</label>
                  <div className="flex gap-2">
                    <input className={`${inputCls('email')} flex-1`} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder={t(RegT.emailPlaceholder, lang)} />
                    <button type="button" className="btn-outline text-sm whitespace-nowrap px-4 rounded-xl flex-shrink-0" onClick={handleSendCode} disabled={codeSending || codeTimer > 0}>
                      {codeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : codeTimer > 0 ? `${codeTimer}s` : codeSent ? t(RegT.resend, lang) : t(RegT.sendCode, lang)}
                    </button>
                  </div>
                  <ErrorTip field="email" errors={fieldErrors} />
                </div>
                {codeSent && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.emailCode, lang)}</label>
                    <input className={inputCls('emailCode')} value={form.emailCode} onChange={e => update('emailCode', e.target.value)} placeholder={t(RegT.emailCodePlaceholder, lang)} maxLength={6} />
                    <ErrorTip field="emailCode" errors={fieldErrors} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.username, lang)}</label>
                    <input className={inputCls('username')} value={form.username} onChange={e => update('username', e.target.value)} placeholder={t(RegT.usernamePlaceholder, lang)} />
                    <ErrorTip field="username" errors={fieldErrors} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.password, lang)}</label>
                    <input className={inputCls('password')} type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder={t(RegT.passwordPlaceholder, lang)} />
                    <ErrorTip field="password" errors={fieldErrors} />
                  </div>
                </div>
              </div>
            </div>

            {/* JC Trans & WCA + Card */}
            {(form.role === 'forwarder' || form.role === 'lawyer' || form.role === 'inspector' || form.role === 'insurer' || form.role === 'overseas_agent') && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">4</div>
                  <h3 className="text-sm font-bold text-gray-800">{lang === 'en' ? 'Credentials' : '资质认证'}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.jcTrans, lang)}</label>
                    <input className="input-field text-sm" value={form.jc_trans_id} onChange={e => update('jc_trans_id', e.target.value)} placeholder={t(RegT.jcTransPlaceholder, lang)} />
                    <p className="text-xs text-amber-500 mt-1">{t(RegT.jcTransNote, lang)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.wca, lang)}</label>
                    <input className="input-field text-sm" value={form.wca_id} onChange={e => update('wca_id', e.target.value)} placeholder={t(RegT.wcaPlaceholder, lang)} />
                    <p className="text-xs text-amber-500 mt-1">{t(RegT.wcaNote, lang)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t(RegT.cardLabel, lang)}</label>
                  {cardPreview ? (
                    <div className="relative inline-block">
                      <img src={cardPreview} alt="名片" className="max-h-36 rounded-xl border shadow-sm" />
                      <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md" onClick={() => { setCardImage(null); setCardPreview(null); setFieldErrors(prev => { const n = {...prev}; delete n.card; return n; }); }}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-all ${fieldErrors.card ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 bg-gray-50'}`}>
                      <Camera className={`w-8 h-8 ${fieldErrors.card ? 'text-red-400' : 'text-gray-400'}`} />
                      <span className={`text-sm ${fieldErrors.card ? 'text-red-600' : 'text-gray-500'}`}>
                        {fieldErrors.card ? fieldErrors.card : t(RegT.cardUpload, lang)}
                      </span>
                      <span className="text-xs text-gray-400">{t(RegT.cardFormat, lang)}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
                    </label>
                  )}
                  <ErrorTip field="card" errors={fieldErrors} />
                </div>

                {/* Newbie checkbox */}
                <div className="mt-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl px-4 py-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.is_newbie} onChange={e => setForm(f => ({ ...f, is_newbie: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-indigo-900">{t(RegT.newbieLabel, lang)}</p>
                      <p className="text-xs text-indigo-600 mt-0.5">{t(RegT.newbieDesc, lang)}</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 via-primary-600 to-indigo-600 text-white font-bold text-base rounded-2xl hover:shadow-xl hover:shadow-primary-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? t(RegT.submitting, lang) : t(RegT.submit, lang)}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>

            <p className="text-center text-sm text-gray-400">
              {t(RegT.hasAccount, lang)} <a href="/login" className="text-primary-600 font-semibold hover:text-primary-700 hover:underline">{t(RegT.hasAccountLink, lang)}</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
