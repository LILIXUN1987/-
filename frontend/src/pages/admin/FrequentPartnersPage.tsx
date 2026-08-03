import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Star, Loader2, User, MessageSquare, Building2,
  Globe, AlertTriangle, Search, X,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface Partner {
  id: string;
  name: string;
  company: string;
  role: string;
  roleLabel: string;
  lastContact?: string;
}

type PartnerTab = 'favorites' | 'brokers' | 'overseas' | 'dg';

export default function FrequentPartnersPage() {
  const lang = useAuthStore((s) => s.lang);
  const [tab, setTab] = useState<PartnerTab>('favorites');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [contactModal, setContactModal] = useState<Partner | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);

  const tabs = [
    { key: 'favorites' as PartnerTab, label: lang === 'en' ? '⭐ Favorites' : '⭐ 我的收藏', icon: Star },
    { key: 'brokers' as PartnerTab, label: lang === 'en' ? '🏢 Brokers' : '🏢 报关行', icon: Building2 },
    { key: 'overseas' as PartnerTab, label: lang === 'en' ? '🌍 Overseas' : '🌍 海外代理', icon: Globe },
    { key: 'dg' as PartnerTab, label: lang === 'en' ? '☣️ DG Agents' : '☣️ 危险品代理', icon: AlertTriangle },
  ];

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/favorites', { params: { limit: 100 } });
      const items = (res.data?.data || res.data || []).map((f: any) => ({
        id: f.id || f.cargo_id || '',
        name: f.contact_info || '',
        company: f.origin_port && f.dest_port ? `${f.origin_port}→${f.dest_port}` : (f.region || ''),
        role: 'cargo',
        roleLabel: lang === 'en' ? 'Cargo Space' : '舱位',
        lastContact: f.favorited_at || f.created_at || null,
      }));
      setPartners(items);
    } catch {}
    setLoading(false);
  }, [lang]);

  const loadBrokerDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/customs-coupons/broker-directory', { params: { limit: 50 } });
      const items = (res.data.data || []).map((b: any) => ({
        id: b.userId || b.id, // ← 用关联的 user ID 发站内信
        name: b.contactPerson || '',
        company: b.companyName || '',
        role: 'broker',
        roleLabel: lang === 'en' ? 'Broker' : '报关行',
        lastContact: null,
      }));
      setPartners(items);
    } catch {}
    setLoading(false);
  }, [lang]);

  const loadOverseasAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/ddp/agents', { params: { limit: 50 } });
      const items = (res.data?.data || []).map((a: any) => ({
        id: a.created_by || a.id, // ← created_by 是关联的 user ID
        name: a.contact_person || '',
        company: a.company_name || '',
        role: 'overseas_agent',
        roleLabel: lang === 'en' ? 'Overseas Agent' : '海外代理',
        lastContact: null,
      }));
      setPartners(items);
    } catch {}
    setLoading(false);
  }, [lang]);

  const loadDGAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get('/dg/agents', { params: { limit: 50 } });
      const items = (res.data?.data || []).map((a: any) => ({
        id: a.user_id || a.created_by || a.id, // ← 用关联的 user ID 发站内信
        name: a.display_name || a.contact_person || '',
        company: a.company_name || '',
        role: 'dg_agent',
        roleLabel: lang === 'en' ? 'DG Agent' : '危险品代理',
        lastContact: null,
      }));
      setPartners(items);
    } catch {}
    setLoading(false);
  }, [lang]);

  const loadMap: Record<PartnerTab, () => Promise<void>> = {
    favorites: loadFavorites,
    brokers: loadBrokerDirectory,
    overseas: loadOverseasAgents,
    dg: loadDGAgents,
  };

  useEffect(() => { loadMap[tab](); }, [tab, loadMap]);

  const filtered = searchQ.trim()
    ? partners.filter(p => (p.company + p.name).toLowerCase().includes(searchQ.toLowerCase()))
    : partners;

  const handleContact = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', { receiver_id: contactModal.id, content: contactText.trim() });
      toast.success(lang === 'en' ? 'Message sent!' : '消息已发送');
      setContactModal(null);
      setContactText('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setContactSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Star className="w-7 h-7 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '⭐ Frequent Partners' : '⭐ 常往来合作商'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Quick access to your partners' : '常用报关行、海外代理、危险品代理快速联系'}</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${tab === t.key ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setTab(t.key)}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
          placeholder={lang === 'en' ? 'Search partners...' : '搜索合作商...'} value={searchQ} onChange={e => setSearchQ(e.target.value)} />
        {searchQ && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setSearchQ('')}><X className="w-3 h-3" /></button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">{lang === 'en' ? 'No partners found' : '暂未找到合作商'}</p>
          <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Save favorites or explore the directory' : '收藏常用的舱位，或从各黄页目录添加合作商'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((p, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all hover:border-amber-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.company || p.name}</p>
                    <p className="text-xs text-gray-400">{p.roleLabel}{p.name ? ` · ${p.name}` : ''}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-2.5 py-1.5 border border-primary-200 transition-colors flex-shrink-0"
                  onClick={() => setContactModal(p)}>
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 联系弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">
              <MessageSquare className="w-4 h-4 inline mr-1.5 text-amber-500" />
              {lang === 'en' ? `Contact ${contactModal.company || contactModal.name}` : `联系 ${contactModal.company || contactModal.name}`}
            </h3>
            <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
              placeholder={lang === 'en' ? 'Enter your message...' : '输入消息内容...'}
              value={contactText} onChange={e => setContactText(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button className="flex-1 btn-outline text-sm" onClick={() => setContactModal(null)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="flex-1 btn-primary text-sm flex items-center justify-center gap-1" onClick={handleContact} disabled={contactSending || !contactText.trim()}>
                {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {lang === 'en' ? 'Send' : '发送'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
