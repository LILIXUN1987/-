import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { registerApi, CompanyMate } from '../../api/register.api';
import { authApi } from '../../api/auth.api';
import { Ship, Camera, X, CheckCircle, Mail, Loader2, Users, AlertCircle } from 'lucide-react';
import { t, RegT, type Lang } from '../../i18n';
import { FEATURES } from '../../config/features';

/** 后端错误消息 → 字段名映射 */
const BACKEND_ERROR_MAP: Record<string, string> = {
  USERNAME_EXISTS: 'username',
  EMAIL_EXISTS: 'email',
  PHONE_EXISTS: 'phone',
  INVALID_EMAIL: 'email',
  MISSING_CODE: 'emailCode',
  INVALID_CODE: 'emailCode',
  WEAK_PASSWORD: 'password',
  MISSING_PHONE: 'phone',
  INVALID_USERNAME: 'username',
  EMPTY_TEXT: 'company_name',
};

function ErrorTip({ field, errors }: { field: string; errors: Record<string, string> }) {
  if (!errors[field]) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {errors[field]}
    </p>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 注册功能关闭时重定向到首页
  useEffect(() => { if (!FEATURES.REGISTRATION) navigate('/', { replace: true }); }, [navigate]);
  const refCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({
    username: '', password: '', display_name: '',
    gender: '', company_name: '', phone: '', email: '', emailCode: '',
    role: 'trader', jc_trans_id: '', wca_id: '',
    is_newbie: false,
  });
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const lang: Lang = form.role === 'overseas_agent' ? 'en' : 'zh';
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

  // 同公司同事查询
  const [companyMates, setCompanyMates] = useState<CompanyMate[]>([]);
  const [matesLoading, setMatesLoading] = useState(false);

  // 公司名输入防抖查询同公司同事
  useEffect(() => {
    if (companyTimerRef.current) clearTimeout(companyTimerRef.current);
    const q = form.company_name.trim();
    if (q.length < 2) { setCompanyMates([]); return; }
    setMatesLoading(true);
    companyTimerRef.current = setTimeout(async () => {
      try {
        const data = await registerApi.companyMates(q);
        setCompanyMates(data);
      } catch { setCompanyMates([]); }
      setMatesLoading(false);
    }, 600);
    return () => { if (companyTimerRef.current) clearTimeout(companyTimerRef.current); };
  }, [form.company_name]);

  const update = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    // 输入时清除对应字段错误
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    setServerError('');
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCardImage(file);
    setFieldErrors(prev => { const n = { ...prev }; delete n['card']; return n; });
    const reader = new FileReader();
    reader.onload = () => setCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  /** 设置某个字段的校验错误 */
  const setFieldError = (field: string, msg: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: msg }));
  };

  const handleSendCode = async () => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFieldError('email', '请先填写有效的邮箱地址');
      return;
    }
    setCodeSending(true);
    try {
      await authApi.sendEmailCode(form.email, form.role);
      setCodeSent(true);
      setCodeTimer(60);
      timerRef.current = setInterval(() => {
        setCodeTimer(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      setFieldError('email', (err as any)?.response?.data?.error || '发送验证码失败');
    } finally { setCodeSending(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setServerError('');

    // 逐字段校验
    const newErrors: Record<string, string> = {};
    if (!form.display_name.trim()) newErrors.display_name = '请填写姓名';
    if (!form.company_name.trim()) newErrors.company_name = '请填写公司全称';
    if (form.role !== 'trader' && form.role !== 'overseas_agent' && !form.phone.trim()) newErrors.phone = '请填写手机号';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = '请填写有效的邮箱地址';
    if (!form.emailCode) newErrors.emailCode = '请先获取并填写邮箱验证码';
    if (!form.username.trim()) newErrors.username = '请设置用户名';
    if (!form.password.trim()) newErrors.password = '请设置密码';
    else if (form.password.length < 6) newErrors.password = '密码长度不能少于6位';
    if ((form.role === 'forwarder' || form.role === 'lawyer' || form.role === 'inspector' || form.role === 'insurer' || form.role === 'overseas_agent') && !cardImage) newErrors.card = '请上传公司名片';

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await registerApi.register({
        ...form,
        card_image: (form.role === 'forwarder' || form.role === 'lawyer' || form.role === 'inspector' || form.role === 'insurer' || form.role === 'overseas_agent') && cardImage ? cardImage : undefined,
        ref: refCode,
      });
      setRegisteredRole(form.role);
      setSuccess(true);
    } catch (err: unknown) {
      const respData = (err as any)?.response?.data;
      const errCode = respData?.code;
      const errMsg = respData?.error || '注册失败';
      // 尝试将后端错误映射到具体字段
      const field = errCode && BACKEND_ERROR_MAP[errCode];
      if (field) {
        setFieldError(field, errMsg);
      } else {
        setServerError(errMsg);
      }
    } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md w-full">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t(RegT.title, lang)}</h2>
          <p className="text-gray-500 mb-2">
            {registeredRole === 'forwarder' ? t(RegT.forwarderSuccess, lang) :
             registeredRole === 'lawyer' ? t(RegT.lawyerSuccess, lang) :
             registeredRole === 'overseas_agent' ? t(RegT.agentSuccess, lang) :
             registeredRole === 'inspector' || registeredRole === 'insurer' ? t(RegT.restrictedSuccess, lang) :
             t(RegT.loginDefault, lang)}
          </p>
          <p className="text-sm font-bold text-red-600 mb-6">{t(RegT.warning, lang)}</p>
          <button className="btn-primary w-full" onClick={() => navigate('/login')}>{t(RegT.goLogin, lang)}</button>
        </div>
      </div>
    );
  }

  const inputCls = (field: string) =>
    `input-field ${fieldErrors[field] ? 'border-red-400 bg-red-50 focus:ring-red-400' : ''}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-3">
            <Ship className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t(RegT.title, lang)}</h1>
          <p className="text-gray-500 mt-1">{t(RegT.subtitle, lang)}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-4">
          {/* 服务端通用错误（无法映射到具体字段的错误） */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{serverError}</div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t(RegT.selectRole, lang)}</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'trader' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'trader')}>
                <div className="text-lg mb-1">🌏</div>
                <div className="font-medium text-sm">{t(RegT.traderLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.traderDesc, lang)}</div>
              </button>
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'forwarder' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'forwarder')}>
                <div className="text-lg mb-1">🚚</div>
                <div className="font-medium text-sm">{t(RegT.forwarderLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.forwarderDesc, lang)}</div>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'lawyer' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'lawyer')}>
                <div className="text-lg mb-1">⚖️</div>
                <div className="font-medium text-sm">{t(RegT.lawyerLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.lawyerDesc, lang)}</div>
              </button>
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'inspector' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'inspector')}>
                <div className="text-lg mb-1">🔬</div>
                <div className="font-medium text-sm">{t(RegT.inspectorLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.inspectorDesc, lang)}</div>
              </button>
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'insurer' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'insurer')}>
                <div className="text-lg mb-1">🛡️</div>
                <div className="font-medium text-sm">{t(RegT.insurerLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.insurerDesc, lang)}</div>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <button type="button"
                className={`p-3 rounded-xl border-2 text-center transition-all ${form.role === 'overseas_agent' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => update('role', 'overseas_agent')}>
                <div className="text-lg mb-1">🌍</div>
                <div className="font-medium text-sm">{t(RegT.agentLabel, lang)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t(RegT.agentDesc, lang)}</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.name, lang)}</label>
              <input className={inputCls('display_name')} value={form.display_name} onChange={e => update('display_name', e.target.value)} placeholder={t(RegT.namePlaceholder, lang)} />
              <ErrorTip field="display_name" errors={fieldErrors} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.gender, lang)}</label>
              <select className="input-field" value={form.gender} onChange={e => update('gender', e.target.value)}>
                <option value="">{t(RegT.genderSelect, lang)}</option>
                <option value="male">{t(RegT.male, lang)}</option>
                <option value="female">{t(RegT.female, lang)}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.company, lang)}</label>
            <input className={inputCls('company_name')} value={form.company_name} onChange={e => update('company_name', e.target.value)} placeholder={t(RegT.companyPlaceholder, lang)} />
            <ErrorTip field="company_name" errors={fieldErrors} />
            <p className="text-xs text-amber-600 mt-1">{t(RegT.companyWarning, lang)}</p>

            {/* 同公司同事提示 */}
            {matesLoading && form.company_name.trim().length >= 2 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                <Loader2 className="w-3 h-3 animate-spin" /> {lang === 'en' ? 'Searching...' : '查询中...'}
              </div>
            )}
            {!matesLoading && companyMates.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mt-2">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800 space-y-0.5">
                    <p className="font-medium">{t(RegT.companyMatesTitle, lang)}</p>
                    {companyMates.slice(0, 3).map((mate, i) => (
                      <p key={i} className="text-xs text-green-700">
                        · {mate.company_name} — <strong>{mate.display_name}</strong>
                      </p>
                    ))}
                    {companyMates.length > 3 && (
                      <p className="text-xs text-green-600">{t(RegT.companyMatesMore(companyMates.length - 3), lang)}</p>
                    )}
                    <p className="text-xs text-green-700 mt-1">{t(RegT.companyMatesJoin, lang)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {form.role !== 'trader' && form.role !== 'overseas_agent' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.phone, lang)}</label>
            <input className={inputCls('phone')} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder={lang === 'en' ? 'Your phone number' : '11位手机号'} />
            <ErrorTip field="phone" errors={fieldErrors} />
          </div>
          ) : form.role === 'overseas_agent' ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <p className="text-sm text-purple-800">
              {lang === 'en' ? '✅ Phone number is optional for overseas agents. You can add it later in your profile.' : '✅ 海外代理无需填写手机号，登录后可在个人中心添加。'}
            </p>
          </div>
          ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <p className="text-sm text-blue-800">
              {lang === 'en' ? '✅ Phone number is optional for traders.' : '✅ 外贸行业用户无需填写手机号，登录后可在个人中心添加手机号。'}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              🔒 {lang === 'en' ? 'Your privacy is protected' : '我们将严格保护您的隐私，尊重您更新手机号码的权利'}
            </p>
          </div>
          )}

          {/* Email + Verification Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.email, lang)}</label>
            <div className="flex gap-2">
              <input className={`${inputCls('email')} flex-1`} type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder={t(RegT.emailPlaceholder, lang)} />
              <button
                type="button"
                className="btn-outline text-sm whitespace-nowrap px-3"
                onClick={handleSendCode}
                disabled={codeSending || codeTimer > 0}
              >
                {codeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : codeTimer > 0 ? `${codeTimer}s` : codeSent ? t(RegT.resend, lang) : t(RegT.sendCode, lang)}
              </button>
            </div>
            <ErrorTip field="email" errors={fieldErrors} />
          </div>
          {codeSent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.emailCode, lang)}</label>
            <input className={inputCls('emailCode')} value={form.emailCode} onChange={e => update('emailCode', e.target.value)} placeholder={t(RegT.emailCodePlaceholder, lang)} maxLength={6} />
            <ErrorTip field="emailCode" errors={fieldErrors} />
          </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.username, lang)}</label>
              <input className={inputCls('username')} value={form.username} onChange={e => update('username', e.target.value)} placeholder={t(RegT.usernamePlaceholder, lang)} />
              <ErrorTip field="username" errors={fieldErrors} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.password, lang)}</label>
              <input className={inputCls('password')} type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder={t(RegT.passwordPlaceholder, lang)} />
              <ErrorTip field="password" errors={fieldErrors} />
            </div>
          </div>

          {/* JC TRANS & WCA 会员号 + Card */}
          {(form.role === 'forwarder' || form.role === 'lawyer' || form.role === 'inspector' || form.role === 'insurer' || form.role === 'overseas_agent') && (
            <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.jcTrans, lang)}</label>
              <input className="input-field" value={form.jc_trans_id} onChange={e => update('jc_trans_id', e.target.value)} placeholder={t(RegT.jcTransPlaceholder, lang)} />
              <p className="text-xs text-amber-600 mt-1">{t(RegT.jcTransNote, lang)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(RegT.wca, lang)}</label>
              <input className="input-field" value={form.wca_id} onChange={e => update('wca_id', e.target.value)} placeholder={t(RegT.wcaPlaceholder, lang)} />
              <p className="text-xs text-amber-600 mt-1">{t(RegT.wcaNote, lang)}</p>
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t(RegT.cardLabel, lang)}</label>
              {cardPreview ? (
                <div className="relative inline-block">
                  <img src={cardPreview} alt={lang === 'en' ? 'Business card' : '名片'} className="max-h-40 rounded-lg border" />
                  <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5" onClick={() => { setCardImage(null); setCardPreview(null); setFieldErrors(prev => { const n = {...prev}; delete n.card; return n; }); }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${fieldErrors.card ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-primary-400'}`}>
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

            {/* ── 新手标识选项 ── */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_newbie}
                  onChange={e => setForm(f => ({ ...f, is_newbie: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                />
                <div>
                  <p className="text-sm font-medium text-indigo-900">{t(RegT.newbieLabel, lang)}</p>
                  <p className="text-xs text-indigo-600 mt-0.5">{t(RegT.newbieDesc, lang)}</p>
                </div>
              </label>
            </div>
            </>)}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base font-medium mt-4">
            {loading ? t(RegT.submitting, lang) : t(RegT.submit, lang)}
          </button>

          <p className="text-center text-sm text-gray-400">
            {t(RegT.hasAccount, lang)}<a href="/login" className="text-primary-600 hover:underline">{t(RegT.hasAccountLink, lang)}</a>
          </p>
        </form>
      </div>
    </div>
  );
}
