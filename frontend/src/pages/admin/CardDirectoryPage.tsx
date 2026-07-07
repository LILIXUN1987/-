import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleLabel } from '../../utils/roles';
import {
  Search, Users, Phone, Building2, Loader2, Mail, User, Download, FileSpreadsheet,
  MessageSquare, Send, X, CheckCircle, BadgeCheck, Clock,
} from 'lucide-react';

interface DirectoryCard {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  registered_user_id: string | null;
  is_registered: boolean;
  batch_name: string | null;
  created_at: string;
}

export default function CardDirectoryPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactModal, setContactModal] = useState<{ userId: string; name: string; company: string } | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['card-directory', search],
    queryFn: () => client.get<{ data: DirectoryCard[]; total: number }>('/cards/directory', { params: { q: search || undefined } }).then(r => r.data),
  });

  const cards = data?.data || [];

  const allIds = cards.map(c => c.id);
  const selectAll = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (selectAll) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', {
        receiver_id: contactModal.userId,
        content: contactText.trim(),
      });
      setContactSent(true);
      setTimeout(() => { setContactModal(null); setContactSent(false); setContactText(''); }, 2000);
    } catch { alert(lang === 'en' ? 'Send failed' : '发送失败'); }
    setContactSending(false);
  };

  const handleBatchSend = async () => {
    const registeredIds = cards.filter(c => selectedIds.has(c.id) && c.registered_user_id).map(c => c.registered_user_id!);
    if (registeredIds.length === 0) {
      alert(lang === 'en' ? 'No registered users selected' : '选中的人中无已注册用户');
      return;
    }
    const msg = prompt(lang === 'en' ? `Send message to ${registeredIds.length} user(s):` : `给 ${registeredIds.length} 位已注册用户发站内信：`);
    if (!msg?.trim()) return;
    let sent = 0;
    for (const uid of registeredIds) {
      try { await client.post('/messages', { receiver_id: uid, content: msg.trim() }); sent++; } catch {}
    }
    alert(lang === 'en' ? `✅ Sent to ${sent} user(s)` : `✅ 已发送给 ${sent} 位用户`);
    setSelectedIds(new Set());
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cards/directory/download', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert(lang === 'en' ? 'No file available' : '暂无通讯录文件可供下载'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `directory_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert(lang === 'en' ? 'Download failed' : '下载失败'); }
    setDownloading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Card Directory' : '展会通讯录'}</h1>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 text-sm font-medium bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors shadow-sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? (lang === 'en' ? 'Downloading...' : '下载中...') : (lang === 'en' ? 'Download Excel' : '下载通讯录 Excel')}
        </button>
      </div>
      <p className="text-gray-500 mb-6">{lang === 'en' ? 'View all business cards collected from logistics exhibitions' : '查看在物流展会中收集的所有同行名片'}</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        {/* 搜索 + 操作栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
              placeholder={lang === 'en' ? 'Search name or company...' : '搜索姓名或公司名...'} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {selectedIds.size > 0 && (
            <button
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              onClick={handleBatchSend}
            >
              <Send className="w-3.5 h-3.5" />
              {lang === 'en' ? `Message ${selectedIds.size}` : `发站内信 ${selectedIds.size} 人`}
            </button>
          )}
        </div>

        {/* 统计 */}
        {data && (
          <div className="text-xs text-gray-400 mb-4 flex items-center gap-3">
            <span>{lang === 'en' ? `Total ${data.total} contacts` : `共 ${data.total} 位同行`}</span>
            <span className="text-green-600">{lang === 'en' ? `${cards.filter(c => c.is_registered).length} registered` : `${cards.filter(c => c.is_registered).length} 人已注册`}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{search ? (lang === 'en' ? 'No matching contacts' : '未找到匹配的同行') : (lang === 'en' ? 'No cards yet' : '暂无名片数据')}</p>
            <p className="text-xs mt-1 text-gray-300">
              {search ? (lang === 'en' ? 'Try different keywords' : '请尝试其他关键词') : (lang === 'en' ? 'Cards will appear here after admin imports them' : '管理员录入展会名片后将在这里显示')}
            </p>
          </div>
        ) : (
          <>
            {/* 全选栏 */}
            <div className="flex items-center gap-2 px-1 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                  checked={selectAll} onChange={toggleSelectAll} />
                <span className="text-xs text-gray-500">
                  {selectAll ? (lang === 'en' ? `Selected ${allIds.length}` : `已选全部 ${allIds.length} 条`) :
                   selectedIds.size > 0 ? (lang === 'en' ? `Selected ${selectedIds.size}` : `已选 ${selectedIds.size} 条`) :
                   (lang === 'en' ? 'Select all' : '全选')}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card: DirectoryCard) => (
                <div key={card.id}
                  className={`relative flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    selectedIds.has(card.id) ? 'border-primary-300 ring-1 ring-primary-200 bg-primary-50/30' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {/* 复选框 */}
                  <label className="pt-1 cursor-pointer flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                      checked={selectedIds.has(card.id)} onChange={() => toggleSelect(card.id)} />
                  </label>
                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-primary-700 font-bold text-sm">{card.name?.charAt(0) || '?'}</span>
                    {card.is_registered && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-800 text-sm truncate">{card.name}</span>
                      {card.is_registered && (
                        <span className="text-[10px] text-green-600 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap flex-shrink-0">
                          {lang === 'en' ? 'Registered' : '已注册'}
                        </span>
                      )}
                    </div>
                    {card.company && (
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{card.company}</span>
                      </div>
                    )}
                    {card.phone && (
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        {card.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">
                        {card.role ? getRoleLabel(card.role, lang) : ''}
                      </span>
                      {card.batch_name && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded" title={lang === 'en' ? 'Source batch' : '来源批次'}>
                          📂 {card.batch_name}
                        </span>
                      )}
                    </div>
                    {/* 操作按钮 */}
                    <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-50">
                      {card.registered_user_id && (
                        <button
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg px-2.5 py-1 transition-colors"
                          onClick={() => { setContactModal({ userId: card.registered_user_id!, name: card.name, company: card.company || '' }); setContactSent(false); setContactText(''); }}
                        >
                          <MessageSquare className="w-3 h-3" />
                          {lang === 'en' ? 'Message' : '发站内信'}
                        </button>
                      )}
                      {card.email && (
                        <a href={`mailto:${card.email}`}
                          className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1 transition-colors">
                          <Mail className="w-3 h-3" />
                          {lang === 'en' ? 'Email' : '发邮件'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 联系弹窗 */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary-500" />
                {lang === 'en' ? 'Send Message' : '发送站内信'} — {contactModal.name}
              </h3>
              <button onClick={() => setContactModal(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Message sent' : '消息已发送'}</div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  {contactModal.company && <span className="block">{contactModal.company}</span>}
                  {lang === 'en' ? 'Send a message via internal mail.' : '通过站内信发送消息，对方将在收件箱中收到。'}
                </p>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3" placeholder={lang === 'en' ? 'Type your message...' : '请输入消息内容...'} value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5" onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send' : '发送站内信'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
