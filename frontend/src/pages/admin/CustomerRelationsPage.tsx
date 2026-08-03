import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import client from '../../api/client';
import {
  Users, Loader2, Gift, MessageSquare, User,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from '../../components/common/Toast';

interface CustomerItem {
  userId: string;
  name: string;
  company: string;
  type: 'coupon_recipient' | 'inquirer';
  count: number;
  lastContact: string | null;
}

export default function CustomerRelationsPage() {
  const lang = useAuthStore((s) => s.lang);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'coupon' | 'inquiry'>('coupon');
  const [contactModal, setContactModal] = useState<CustomerItem | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);

  const loadCouponRecipients = async () => {
    setLoading(true);
    try {
      const res = await client.get('/customs-coupons/my-coupons', { params: { role: 'forwarder', limit: 100 } });
      const coupons = res.data.data || [];
      // Group by trader
      const map = new Map<string, CustomerItem>();
      for (const c of coupons) {
        if (!c.traderName && !c.traderCompany) continue;
        const key = c.traderCompany || c.traderName || '';
        if (!map.has(key)) {
          map.set(key, {
            userId: '',
            name: c.traderName || '',
            company: c.traderCompany || '',
            type: 'coupon_recipient',
            count: 0,
            lastContact: c.sentAt || null,
          });
        }
        const item = map.get(key)!;
        item.count++;
        if (c.sentAt && (!item.lastContact || c.sentAt > item.lastContact)) {
          item.lastContact = c.sentAt;
        }
      }
      setCustomers(Array.from(map.values()));
    } catch {}
    setLoading(false);
  };

  const loadInquirers = async () => {
    setLoading(true);
    try {
      const res = await client.get('/messages/received-inquiries', { params: { limit: 100 } });
      const inquiries = res.data.data || [];
      const map = new Map<string, CustomerItem>();
      for (const q of inquiries) {
        const key = q.senderCompany || q.senderName || q.senderId;
        if (!map.has(key)) {
          map.set(key, {
            userId: q.senderId,
            name: q.senderName || '',
            company: q.senderCompany || '',
            type: 'inquirer',
            count: 0,
            lastContact: null,
          });
        }
        const item = map.get(key)!;
        item.count++;
        if (q.createdAt && (!item.lastContact || q.createdAt > item.lastContact)) {
          item.lastContact = q.createdAt;
        }
      }
      setCustomers(Array.from(map.values()));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'coupon') loadCouponRecipients();
    else loadInquirers();
  }, [tab]);

  const handleContact = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      if (contactModal.userId) {
        await client.post('/messages', { receiver_id: contactModal.userId, content: contactText.trim() });
      } else {
        await client.post('/messages/contact-admin', { content: `[联系客户] ${contactModal.company || contactModal.name}\n\n${contactText.trim()}` });
      }
      toast.success(lang === 'en' ? 'Message sent!' : '消息已发送');
      setContactModal(null);
      setContactText('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (lang === 'en' ? 'Send failed' : '发送失败'));
    }
    setContactSending(false);
  };

  const timeAgo = (t: string) => {
    const diff = Date.now() - new Date(t).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return '今天';
    if (days < 30) return `${days}天前`;
    return t.slice(0, 10);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? '👥 Customer Relations' : '👥 客户关系'}</h1>
          <p className="text-sm text-gray-500">{lang === 'en' ? 'Traders who received your coupons or inquired' : '收过您券的外贸、向您询过价的客户'}</p>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-4 flex">
        <button className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'coupon' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500'}`}
          onClick={() => setTab('coupon')}>
          🎫 {lang === 'en' ? 'Coupon Recipients' : '收券外贸'} {tab === 'coupon' ? `(${customers.length})` : ''}
        </button>
        <button className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === 'inquiry' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500'}`}
          onClick={() => setTab('inquiry')}>
          📩 {lang === 'en' ? 'Inquirers' : '询价客户'} {tab === 'inquiry' ? `(${customers.length})` : ''}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {tab === 'coupon'
              ? (lang === 'en' ? 'No coupon recipients yet' : '暂无收券的外贸用户')
              : (lang === 'en' ? 'No inquirers yet' : '暂无询价客户')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === 'coupon'
              ? (lang === 'en' ? 'Send coupons to traders to build relationships' : '赠送报关券给外贸用户，他们会出现在这里')
              : (lang === 'en' ? 'When traders inquire, they appear here' : '外贸用户向您询价后会显示在这里')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.company || c.name}</p>
                    <p className="text-xs text-gray-400">
                      {c.type === 'coupon_recipient' ? '🎫 ' : '📩 '}
                      {c.type === 'coupon_recipient'
                        ? (lang === 'en' ? `Received ${c.count} coupons` : `收到 ${c.count} 张券`)
                        : (lang === 'en' ? `${c.count} inquiries` : `${c.count} 次询价`)}
                      {c.lastContact && ` · 🕐 ${timeAgo(c.lastContact)}`}
                    </p>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-3 py-1.5 border border-primary-200 transition-colors"
                  onClick={() => setContactModal(c)}>
                  <MessageSquare className="w-3 h-3" />{lang === 'en' ? 'Contact' : '联系'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 联系弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-primary-500" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-3">
              <MessageSquare className="w-4 h-4 inline mr-1.5 text-primary-500" />
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
