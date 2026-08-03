import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth.api';
import { FEATURES } from '../../config/features';
import { getRoleChecks } from '../../types';
import {
  User, Camera, Save, Loader2, CheckCircle, AlertCircle,
  Building2, Phone, UserCircle, Image, Bell, FileText, Shield, Scale,
  Award, Trash2, FileImage,
} from 'lucide-react';
import client from '../../api/client';
import RatingSection from '../../components/common/RatingSection';
import { ProfileT, t } from '../../i18n';
import { isBusinessRole } from '../../types';
import { getRoleLabel } from '../../utils/roles';

/** 提取后端错误消息 */
function extractError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
}

export default function ProfilePage() {
  const { user, checkAuth, lang } = useAuthStore();
  const rc = getRoleChecks(user?.role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 网安审核模式：非管理员隐藏个人信息
  if (FEATURES.AUDIT_MODE && !rc.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-sm">个人信息功能维护中</p>
      </div>
    );
  }

  const phoneRef = useRef<HTMLInputElement>(null);
  const jcRef = useRef<HTMLInputElement>(null);
  const wcaRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreview, setCardPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [error, setError] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySite, setNotifySite] = useState(true);
  const [notifyAllMessages, setNotifyAllMessages] = useState(false);
  const [isNewbie, setIsNewbie] = useState(user?.is_newbie === true);
  const [creditScore, setCreditScore] = useState<{ score: number; level: string } | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  const [notifySaving, setNotifySaving] = useState(false);

  // ── 营业执照拖拽上传 ──
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);

  const handleLicenseFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLicenseUploading(true); setError(''); setSuccess('');
    try {
      const fd = new FormData(); fd.append('license', file);
      const res = await client.post('/auth/upload-license', fd);
      setSuccess(res.data?.message || '✅ 营业执照已上传，等待管理员审核');
      await checkAuth();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.error || (err as any)?.message || '上传失败，请重试');
    }
    finally { setLicenseUploading(false); }
    // 重置 input 以允许重复上传同一文件
    if (licenseInputRef.current) licenseInputRef.current.value = '';
  }, [checkAuth]);

  const licenseInputRef = useRef<HTMLInputElement>(null);

  // ── 注销账号 ──
  const [deletePwd, setDeletePwd] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await client.post('/auth/delete-account', { password: deletePwd });
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (err: unknown) {
      setDeleteError(extractError(err, '注销失败'));
    }
    setDeleteLoading(false);
  };

  // 信用分
  useEffect(() => {
    if (user?.id) {
      setScoreLoading(true);
      client.get(`/cooperations/credit-score/${user.id}`)
        .then(res => setCreditScore(res.data))
        .catch((err) => { console.warn('[ProfilePage] failed to load credit score:', err); })
        .finally(() => setScoreLoading(false));
    }
  }, [user?.id]);

  // 通知设置
  const [notifyLoaded, setNotifyLoaded] = useState(false);
  useEffect(() => {
    if (user && !notifyLoaded) {
      client.get('/auth/me').then(r => {
        const d = r.data as any;
        setNotifyEmail(d.notify_inquiry_email !== false);
        setNotifySite(d.notify_inquiry_site !== false);
        setNotifyAllMessages(d.notify_all_messages_email === true);
        setNotifyLoaded(true);
      }).catch((err) => { console.warn('[ProfilePage] failed to load notification settings:', err); });
    }
  }, [user, notifyLoaded]);

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCardFile(file);
    const reader = new FileReader();
    reader.onload = () => setCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarSuccess(false);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await client.post('/auth/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      useAuthStore.setState({ user: res.data.user });
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: unknown) {
      alert(extractError(err, '头像上传失败'));
    }
    setAvatarUploading(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const fd = new FormData();
      fd.append('phone', phoneRef.current?.value || '');
      fd.append('jc_trans_id', jcRef.current?.value || '');
      fd.append('wca_id', wcaRef.current?.value || '');
      fd.append('bio', bioRef.current?.value || '');

      const newCompany = companyRef.current?.value || '';
      const companyChanged = newCompany !== (user?.company_name || '');
      if (companyChanged) {
        fd.append('company_name', newCompany);
        if (!cardFile) {
          const createdAt = user?.created_at ? new Date(user.created_at).getTime() : 0;
          const daysSinceReg = (Date.now() - createdAt) / 86400000;
          if (daysSinceReg < 30) {
            setError(`注册未满30天，修改公司名称需要先上传最新的公司名片（注册已 ${Math.floor(daysSinceReg)} 天）`);
            setLoading(false);
            return;
          }
        }
      }

      if (cardFile) {
        fd.append('card_image', cardFile);
      }

      await authApi.updateProfile(fd);
      setSuccess(lang === 'en' ? 'Profile updated' : '个人信息更新成功');
      setCardFile(null);
      await checkAuth();
    } catch (err: unknown) {
      setError(extractError(err, '更新失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const saveNewbieSetting = async (value: boolean) => {
    try { await client.put('/auth/profile', { is_newbie: value }); } catch {}
  };

  const handleSaveNotify = async () => {
    setNotifySaving(true);
    try {
      await client.put('/auth/profile', { notify_inquiry_email: notifyEmail, notify_inquiry_site: notifySite, notify_all_messages_email: notifyAllMessages });
      setSuccess('通知设置已更新');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError(lang === 'en' ? 'Save failed' : '保存失败'); }
    setNotifySaving(false);
  };

  const isCompanyChanged = false; // 改用ref，不实时对比

  // ── 分组卡片样式 ──
  function SectionCard({ icon: Icon, title, desc, children }: { icon: any; title: string; desc?: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-5 py-3.5 flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
          </div>
        </div>
        <div className="p-5">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(ProfileT.title, lang)}</h1>
      <p className="text-gray-500 mb-6">{t(ProfileT.subtitle, lang)}</p>

      <div className="max-w-2xl space-y-4">
        {/* ── 名片上传提醒 ── */}
        {(isBusinessRole(user?.role) || user?.role === 'overseas_agent') && !user?.card_image && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <Image className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">{t(ProfileT.cardRemind1, lang)}</p>
                <p className="text-xs text-amber-600 mt-1">{t(ProfileT.cardRemind2, lang)}</p>
                <p className="text-xs text-amber-500 mt-1">{t(ProfileT.cardRemind3, lang)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════ */}
        {/* 头像 */}
        {/* ════════════════════════════════ */}
        <SectionCard icon={User} title={t(ProfileT.sectionAvatar, lang)} desc={t(ProfileT.avatarNote, lang)}>
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-primary-200">
                {user?.avatar ? (
                  <img src={`/api/uploads/${user.avatar.replace(/^uploads[\/\\]/, '')}`} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-primary-600" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 shadow-sm transition-colors" title={t(ProfileT.uploadAvatar, lang)}>
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold text-gray-900">{user?.display_name}</div>
              <div className="text-sm text-gray-500">
                {getRoleLabel(user?.role, lang)}
              </div>
              <div className="text-xs text-gray-400 mt-1">用户名: {user?.username}</div>
              {avatarUploading && <div className="flex items-center gap-1 mt-1 text-xs text-primary-600"><Loader2 className="w-3 h-3 animate-spin" /> {t(ProfileT.uploading, lang)}</div>}
              {avatarSuccess && <div className="flex items-center gap-1 mt-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> {t(ProfileT.avatarSuccess, lang)}</div>}
            </div>
          </div>
        </SectionCard>

        {/* ════════════════════════════════ */}
        {/* 基本信息 */}
        {/* ════════════════════════════════ */}
        <SectionCard icon={UserCircle} title={t(ProfileT.sectionBasic, lang)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(ProfileT.name, lang)}</label>
              <input className="input-field bg-gray-100 text-gray-500 cursor-not-allowed" value={displayName} disabled />
              <p className="text-xs text-amber-600 mt-1">{t(ProfileT.nameUnchangeable, lang)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(ProfileT.gender, lang)}</label>
              <select className="input-field bg-gray-100 text-gray-500 cursor-not-allowed" value={gender} disabled>
                <option value="">{t(ProfileT.genderSelect, lang)}</option>
                <option value="男">{t(ProfileT.male, lang)}</option>
                <option value="女">{t(ProfileT.female, lang)}</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline mr-1" />{t(ProfileT.phone, lang)}</label>
            <input className="input-field" ref={phoneRef} defaultValue={user?.phone || ''} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">✉️ {t(ProfileT.email, lang)}</label>
            <input className="input-field bg-gray-100 text-gray-500 cursor-not-allowed" value={user?.email || ''} disabled />
            <p className="text-xs text-gray-400 mt-1">{t(ProfileT.emailNote, lang)}</p>
          </div>
        </SectionCard>

        {/* ════════════════════════════════ */}
        {/* 认证与资质（角色专属） */}
        {/* ════════════════════════════════ */}
        <SectionCard icon={Shield} title={t(ProfileT.sectionCert, lang)}>
          {/* 信用分 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-600">{t(ProfileT.creditScore, lang)}</p>
                {scoreLoading ? (
                  <div className="mt-1"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>
                ) : creditScore ? (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-indigo-700">{creditScore.score}</span>
                    <span className="text-xs text-indigo-500">/ 100</span>
                    <span className="ml-1 text-xs bg-white/70 text-indigo-600 px-2 py-0.5 rounded-full">{creditScore.level}</span>
                  </div>
                ) : <p className="text-sm text-indigo-400 mt-1">—</p>}
              </div>
              <Award className="w-8 h-8 text-indigo-300" />
            </div>
          </div>

          {/* 信誉评分 */}
          {user?.id && <RatingSection userId={user.id} />}

          {/* 律师自我介绍 */}
          {user?.role === 'lawyer' && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-medium text-gray-700">{t(ProfileT.lawyerBio, lang)}</h3>
              </div>
              <p className="text-xs text-gray-400 mb-2">{t(ProfileT.lawyerBioHint, lang)}</p>
              <textarea className="input-field w-full min-h-[100px] text-sm resize-none" placeholder={t(ProfileT.lawyerBioPlaceholder, lang)} ref={bioRef} defaultValue={user?.bio || ''} />
            </div>
          )}

          {/* 企业认证（仅货代） */}
          {user?.role === 'forwarder' && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-medium text-gray-700">{t(ProfileT.certTitle, lang)}</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                {user?.is_verified_company ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> {t(ProfileT.certVerified, lang)}
                  </span>
                ) : user?.company_license ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t(ProfileT.certPending, lang)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-gray-500 mb-3">{t(ProfileT.certDesc, lang)}</p>
              {/* ── 营业执照上传 ── */}
              <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed rounded-xl px-5 py-4 transition-all ${
                licenseUploading
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-gray-50 border-gray-300 hover:bg-blue-50 hover:border-blue-400'
              }`}>
                <input
                  ref={licenseInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                  className="hidden"
                  onChange={handleLicenseFile}
                  disabled={licenseUploading}
                />
                {licenseUploading ? (
                  <><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /><span className="text-sm text-blue-600 font-medium">上传中...</span></>
                ) : (
                  <><FileImage className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">{user?.company_license ? '重新上传营业执照' : '点击上传营业执照'}</span><span className="text-xs text-gray-400 ml-auto">JPG/PNG/PDF ≤10MB</span></>
                )}
              </label>
              {success && (
                <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mt-2 font-medium">{success}</p>
              )}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mt-2">{error}</p>
              )}
            </div>
          )}

          {/* JC TRANS & WCA */}
          <div className="border-t border-gray-100 pt-4 mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(ProfileT.jcTrans, lang)}</label>
              <input className="input-field" ref={jcRef} defaultValue={user?.jc_trans_id || ''} placeholder={t(ProfileT.optional, lang)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(ProfileT.wca, lang)}</label>
              <input className="input-field" ref={wcaRef} defaultValue={user?.wca_id || ''} placeholder={t(ProfileT.optional, lang)} />
            </div>
          </div>
        </SectionCard>

        {/* ════════════════════════════════ */}
        {/* 通知设置 */}
        {/* ════════════════════════════════ */}
        <SectionCard icon={Bell} title={t(ProfileT.sectionNotify, lang)}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">{lang === 'en' ? 'Manage how you receive notifications' : '管理您接收通知的方式'}</p>
            <button className="text-xs font-medium text-primary-600 hover:text-primary-800 px-3 py-1 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1" onClick={handleSaveNotify} disabled={notifySaving}>
              {notifySaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {t(ProfileT.notifySave, lang)}
            </button>
          </div>
          <div className="space-y-3 bg-gray-50 rounded-lg p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">{t(ProfileT.notifyEmailLabel, lang)}</p>
                <p className="text-xs text-gray-400">{t(ProfileT.notifyEmailDesc, lang)}</p>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary-600 cursor-pointer" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
            </label>
            <div className="border-t border-gray-200" />
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">{t(ProfileT.notifySiteLabel, lang)}</p>
                <p className="text-xs text-gray-400">{t(ProfileT.notifySiteDesc, lang)}</p>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary-600 cursor-pointer" checked={notifySite} onChange={(e) => setNotifySite(e.target.checked)} />
            </label>
            <div className="border-t border-gray-200" />
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-700">{t(ProfileT.notifyAllLabel, lang)}</p>
                <p className="text-xs text-gray-400">{t(ProfileT.notifyAllDesc, lang)}</p>
              </div>
              <input type="checkbox" className="w-5 h-5 accent-primary-600 cursor-pointer" checked={notifyAllMessages} onChange={(e) => setNotifyAllMessages(e.target.checked)} />
            </label>
          </div>
        </SectionCard>

        {/* ════════════════════════════════ */}
        {/* 新手标识 + 所属公司 */}
        {/* ════════════════════════════════ */}
        <SectionCard icon={Building2} title={t(ProfileT.sectionCompany, lang)}>
          {/* 新手标识 */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer" checked={isNewbie} onChange={e => { setIsNewbie(e.target.checked); saveNewbieSetting(e.target.checked); }} />
              <div>
                <p className="text-sm font-medium text-indigo-900">{t(ProfileT.newbieLabel, lang)}</p>
                <p className="text-xs text-indigo-600 mt-0.5">{t(ProfileT.newbieDesc, lang)}</p>
              </div>
            </label>
          </div>

          {/* 所属公司 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-gray-500" />
              <label className="block text-sm font-medium text-gray-700">{t(ProfileT.company, lang)}</label>
            </div>
            <p className="text-xs text-gray-400 mb-3">{t(ProfileT.companyChange, lang)}</p>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input className={`input-field ${isCompanyChanged ? 'border-yellow-400 bg-yellow-50' : ''}`}
                  ref={companyRef} defaultValue={user?.company_name || ''} placeholder={t(ProfileT.companyPlaceholder, lang)} />
              </div>
              <div className="flex-shrink-0">
                {cardPreview ? (
                  <div className="relative">
                    <img src={cardPreview} alt={t(ProfileT.cardPreview, lang)} className="w-24 h-16 object-cover rounded-lg border cursor-pointer" onClick={() => fileInputRef.current?.click()} />
                    <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 text-xs"
                      onClick={() => { setCardFile(null); setCardPreview(null); }}>✕</button>
                  </div>
                ) : user?.card_image ? (
                  <div className="relative">
                    <img src={'/api/' + user.card_image.replace(/\\/g, '/')} alt={t(ProfileT.currentCardTip, lang)} className="w-24 h-16 object-cover rounded-lg border cursor-pointer" onClick={() => fileInputRef.current?.click()} title={t(ProfileT.changeCard, lang)} />
                    <button type="button" className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-0.5 text-xs" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-3 h-3" />
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5 text-center">{t(ProfileT.currentCardTip, lang)}</p>
                  </div>
                ) : (
                  <button type="button" className="w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <Image className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">{t(ProfileT.uploadCard, lang)}</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCardChange} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 消息 */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
          </div>
        )}

        {/* 保存按钮 */}
        <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? t(ProfileT.saving, lang) : t(ProfileT.saveBtn, lang)}
        </button>

        {/* ════════════════════════════════ */}
        {/* 注销账号 */}
        {/* ════════════════════════════════ */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-white border-b border-red-100 px-5 py-3.5 flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">{t(ProfileT.sectionDanger, lang)}</h3>
          </div>
          <div className="p-5">
            <details className="group">
              <summary className="text-sm font-medium text-red-500 cursor-pointer hover:text-red-600 select-none">
                {t(ProfileT.deleteAccount, lang)}
              </summary>
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-700 mb-3 leading-relaxed">{t(ProfileT.deleteDesc, lang)}</p>
                <input type="password" className="input-field text-sm mb-2" placeholder={t(ProfileT.deletePlaceholder, lang)} value={deletePwd} onChange={(e) => setDeletePwd(e.target.value)} />
                {deleteError && <p className="text-xs text-red-600 mb-2">{deleteError}</p>}
                <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50" onClick={handleDeleteAccount} disabled={deleteLoading || !deletePwd}>
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : null}
                  {t(ProfileT.deleteBtn, lang)}
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
