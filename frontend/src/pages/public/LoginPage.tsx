import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Ship, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Mail, Lock, KeyRound, ArrowLeft, Languages } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import client from '../../api/client';
import { LoginT, t, type Lang } from '../../i18n';
import { getRoleChecks } from '../../types';
import { getRoleLabel } from '../../utils/roles';

export default function LoginPage() {
  const { lang, setLang } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── 找回密码状态 ──
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStep, setFpStep] = useState<'email' | 'reset'>('email');
  const [fpEmail, setFpEmail] = useState('');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPwd, setFpNewPwd] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpTimer, setFpTimer] = useState(0);

  // ── 登录成功时提示同公司同事 ──
  const [loginMates, setLoginMates] = useState<{ mates: { display_name: string; role: string }[]; count: number } | null>(null);

  // ── 海外代理欢迎提示 ──
  const [overseasWelcome, setOverseasWelcome] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError(t(LoginT.enterCredentials, lang));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const { token, user, company_mates_count, company_mates } = res;
      localStorage.setItem('token', token);
      useAuthStore.setState({ token, user, isAuthenticated: true, isLoading: false });

      // 有同公司同事 → 先提示，不立即跳转
      if (company_mates_count && company_mates_count > 0 && company_mates) {
        setLoginMates({ mates: company_mates, count: company_mates_count });
        setLoading(false);
        return;
      }

      goToDashboard(user.role || '');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || t(LoginT.loginFailed, lang);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  function goToDashboard(role: string) {
    const rc = getRoleChecks(role);
    if (rc.isOverseasAgent) {
      setOverseasWelcome(true);
      setTimeout(() => {
        navigate('/admin/ddp', { replace: true });
      }, 2000);
    } else if (rc.isAdmin || rc.isForwarder || rc.isLawyer || rc.isInspector || rc.isInsurer) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/chat', { replace: true });
    }
  }

  // ── 发送重置验证码 ──
  const handleSendCode = async () => {
    if (!fpEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) {
      setFpError(lang === 'en' ? 'Please enter a valid email' : '请输入有效的邮箱地址');
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      await client.post('/auth/forgot-password', { email: fpEmail });
      setFpStep('reset');
      setFpTimer(60);
      const t = setInterval(() => {
        setFpTimer(prev => {
          if (prev <= 1) { clearInterval(t); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setFpError(err?.response?.data?.error || '发送失败');
    } finally {
      setFpLoading(false);
    }
  };

  // ── 重置密码 ──
  const handleReset = async () => {
    if (!fpCode || fpCode.length !== 6) {
      setFpError(t(LoginT.codeError, lang));
      return;
    }
    if (!fpNewPwd || fpNewPwd.length < 6) {
      setFpError(t(LoginT.pwdLengthError, lang));
      return;
    }
    setFpLoading(true);
    setFpError('');
    try {
      await client.post('/auth/reset-password', {
        email: fpEmail,
        code: fpCode,
        new_password: fpNewPwd,
      });
      setFpSuccess(t(LoginT.resetSuccess, lang));
      setFpStep('email');
      setTimeout(() => {
        setForgotOpen(false);
        setFpSuccess('');
        setFpEmail('');
        setFpCode('');
        setFpNewPwd('');
      }, 2000);
    } catch (err: any) {
      setFpError(err?.response?.data?.error || '重置失败');
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Ship className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t(LoginT.title, lang)}</h1>
          <p className="text-gray-500 mt-1">{t(LoginT.subtitle, lang)}</p>
          <button
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:text-primary-700 transition-colors bg-white text-gray-500"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          {loginMates && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <div className="text-center mb-3">
                <div className="text-2xl mb-2">🏢</div>
                <p className="text-sm font-bold text-green-800" dangerouslySetInnerHTML={{ __html: t(LoginT.companyMatesTitle(loginMates.count), lang) }} />
              </div>
              <div className="space-y-1.5 mb-3">
                {loginMates.mates.map((mate, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="font-medium text-green-900">{mate.display_name}</span>
                    <span className="text-xs text-green-600 ml-auto">
                      {getRoleLabel(mate.role, lang)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary w-full text-sm"
                onClick={() => goToDashboard(useAuthStore.getState().user?.role || '')}
              >
                {t(LoginT.companyMatesBtn, lang)}
              </button>
            </div>
          )}
          {overseasWelcome && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-6 text-center">
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-sm font-bold text-purple-800 mb-1">
                {lang === 'en' ? 'Welcome, Overseas Agent!' : '欢迎您，海外代理！'}
              </p>
              <p className="text-xs text-purple-600">
                {lang === 'en'
                  ? 'You have 30-day trial access. Complete your agent profile to receive inquiries from Chinese forwarders.'
                  : '您已获得30天试用期，完善代理资料后即可接收中国货代询价。'}
              </p>
              <p className="text-xs text-purple-400 mt-2">{lang === 'en' ? 'Redirecting...' : '正在跳转...'}</p>
            </div>
          )}
          {!loginMates && (<>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(LoginT.username, lang)}</label>
            <input className="input-field" value={username} onChange={e => setUsername(e.target.value)}
              placeholder={t(LoginT.usernamePlaceholder, lang)} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t(LoginT.password, lang)}</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                value={password} onChange={e => setPassword(e.target.value)} placeholder={t(LoginT.passwordPlaceholder, lang)} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end -mt-2">
            <button type="button" className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
              onClick={() => { setForgotOpen(true); setFpStep('email'); setFpError(''); setFpSuccess(''); }}>
              {t(LoginT.forgotPwd, lang)}
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base font-medium">
            {loading ? t(LoginT.loggingIn, lang) : t(LoginT.loginBtn, lang)}
          </button>
          </>)}
        </form>

        <div className="text-center space-y-2 mt-6">
          <p className="text-sm text-gray-400">
            {t(LoginT.noAccount, lang)}<a href="/register" className="text-primary-600 hover:underline font-medium">{t(LoginT.register, lang)}</a>
          </p>
        </div>
      </div>

      {/* ════ 忘记密码弹窗 ════ */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!fpLoading) setForgotOpen(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center gap-2 mb-5">
              <KeyRound className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">{t(LoginT.forgotTitle, lang)}</h2>
            </div>

            {fpSuccess ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3 mb-4">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />{fpSuccess}
              </div>
            ) : (
              <>
                {fpError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{fpError}
                  </div>
                )}

                {fpStep === 'email' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">{t(LoginT.forgotDesc, lang)}</p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t(LoginT.forgotEmail, lang)}</label>
                      <input className="input-field" type="email" value={fpEmail}
                        onChange={e => setFpEmail(e.target.value)}
                        placeholder={t(LoginT.forgotEmailPlaceholder, lang)} />
                    </div>
                    <button className="btn-primary w-full py-2.5 flex items-center justify-center gap-1"
                      onClick={handleSendCode} disabled={fpLoading}>
                      {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      {fpLoading ? t(LoginT.sendingCode, lang) : t(LoginT.sendCode, lang)}
                    </button>
                  </div>
                )}

                {fpStep === 'reset' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: t(LoginT.codeSent(fpEmail), lang) }} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t(LoginT.codeLabel, lang)}</label>
                      <input className="input-field" value={fpCode} maxLength={6}
                        onChange={e => setFpCode(e.target.value)}
                        placeholder={t(LoginT.codePlaceholder, lang)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t(LoginT.newPwdLabel, lang)}</label>
                      <input className="input-field" type="password" value={fpNewPwd}
                        onChange={e => setFpNewPwd(e.target.value)}
                        placeholder={t(LoginT.newPwdPlaceholder, lang)} />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-outline flex-1 py-2.5 flex items-center justify-center gap-1"
                        onClick={() => setFpStep('email')}>
                        <ArrowLeft className="w-4 h-4" /> {t(LoginT.back, lang)}
                      </button>
                      <button className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-1"
                        onClick={handleReset} disabled={fpLoading}>
                        {fpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {fpLoading ? t(LoginT.resetting, lang) : t(LoginT.resetBtn, lang)}
                      </button>
                    </div>
                    <div className="text-center">
                      <button className="text-xs text-gray-400 hover:text-gray-600"
                        onClick={handleSendCode} disabled={fpTimer > 0}>
                        {fpTimer > 0 ? t(LoginT.resendTimer(fpTimer), lang) : t(LoginT.resendCode, lang)}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="text-center mt-4">
              <button className="text-sm text-gray-400 hover:text-gray-600"
                onClick={() => setForgotOpen(false)}>
                {t(LoginT.backToLogin, lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
