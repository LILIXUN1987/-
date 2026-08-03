import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Building2, Loader2, ExternalLink, Edit3, Save, X, Package,
  Eye, MessageSquare, Calendar, Globe, Send,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

export default function AdminCompanyProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const lang = useAuthStore((s) => s.lang);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    client.get(`/auth/profile/${user.id}`).then(r => {
      setData(r.data);
      setBioText(r.data.bio || '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user?.id]);

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      await client.put('/auth/profile', { bio: bioText });
      toast.success(lang === 'en' ? 'Saved!' : '已保存');
      setEditingBio(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '保存失败');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-gray-400">加载失败</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '🏢 Company Profile' : '🏢 公司主页'}</h1>
            <p className="text-sm text-gray-500">{lang === 'en' ? 'Your public company page' : '对外展示的公司名片'}</p>
          </div>
        </div>
        <a href={`/company/${data.id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-3 py-2 border border-primary-200 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />{lang === 'en' ? 'Preview' : '预览公开页'}
        </a>
      </div>

      {/* 预览卡片 */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-5">
        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 p-8 text-white">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
              {data.avatar ? <img src={data.avatar} className="w-full h-full rounded-2xl object-cover" /> : (data.companyName?.charAt(0) || '?')}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data.companyName || data.displayName}</h1>
              <p className="text-white/80 text-sm mt-1">{data.displayName} · {data.memberSince}</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* 公司简介 — 可编辑 */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700">{lang === 'en' ? 'About' : '公司简介'}</h3>
              {!editingBio && (
                <button onClick={() => setEditingBio(true)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />{lang === 'en' ? 'Edit' : '编辑'}
                </button>
              )}
            </div>
            {editingBio ? (
              <div>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-2" value={bioText}
                  onChange={e => setBioText(e.target.value)} placeholder={lang === 'en' ? 'Introduce your company...' : '介绍您的公司...'} />
                <div className="flex gap-2 justify-end">
                  <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => { setEditingBio(false); setBioText(data.bio || ''); }}>
                    <X className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Cancel' : '取消'}
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-1" onClick={handleSaveBio} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}{lang === 'en' ? 'Save' : '保存'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{data.bio || (lang === 'en' ? 'No bio yet. Click Edit to add one.' : '暂无简介，点击编辑添加公司介绍')}</p>
            )}
          </div>

          {/* 联系信息 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {data.phone && <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm"><span className="text-gray-400">📞</span><span className="text-gray-700">{data.phone}</span></div>}
            {data.email && <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm"><span className="text-gray-400">✉️</span><span className="text-gray-700">{data.email}</span></div>}
          </div>

          {/* 统计 */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center"><div className="text-xl font-bold text-gray-900">{data.stats.activeCargos}</div><div className="text-[10px] text-gray-400">{lang === 'en' ? 'Active' : '有效舱位'}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-900">{data.stats.totalCargos}</div><div className="text-[10px] text-gray-400">{lang === 'en' ? 'Total' : '累计发布'}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-900">{data.stats.totalViews}</div><div className="text-[10px] text-gray-400">{lang === 'en' ? 'Views' : '被查看'}</div></div>
            <div className="text-center"><div className="text-xl font-bold text-gray-900">{data.stats.totalInquiries}</div><div className="text-[10px] text-gray-400">{lang === 'en' ? 'Inquiries' : '被询价'}</div></div>
          </div>
        </div>
      </div>

      {/* 推广按钮 */}
      <a href={`/company/${data.id}`} target="_blank" rel="noopener noreferrer"
        className="block w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all text-center mb-5">
        <Send className="w-4 h-4 inline mr-1" />{lang === 'en' ? 'Share My Company Page' : '分享我的公司主页'}
      </a>

      {/* 活跃舱位 */}
      {data.activeCargos?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{lang === 'en' ? 'Active Cargos' : '有效舱位'} ({data.activeCargos.length})</h3>
          <div className="space-y-2">
            {data.activeCargos.map((c: any) => (
              <div key={c.id} className="bg-gray-50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold text-gray-900">{c.originPort || '?'} → {c.destPort || c.region || '?'}</span>
                  {c.airlineCode && <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{c.airlineCode}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  {c.priceCbm && <span className="font-medium text-primary-600">¥{c.priceCbm}/CBM</span>}
                  {c.priceKg && <span className="font-medium text-primary-600">¥{c.priceKg}/KG</span>}
                  <span><Eye className="w-3 h-3 inline" />{c.views}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
