import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { getRoleChecks } from '../../types';
import { getRoleLabel } from '../../utils/roles';
import {
  Search, Users, Phone, Building2, Loader2, Mail, User, Download, FileSpreadsheet, Upload,
  MessageSquare, Send, X, CheckCircle, Clock, FolderOpen, ChevronRight, Trash2, Edit,
  Tag, TrendingUp, Filter, DownloadCloud,
} from 'lucide-react';

const TAG_OPTIONS = ['VIP', '潜在客户', '已联系', '已合作', '无意向', '待跟进'];

interface BatchItem {
  id: string;
  name: string;
  notes: string | null;
  total: number;
  actual: number;
  registered: number;
  created_at: string;
}

interface DirectoryCard {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
  registered_user_id: string | null;
  batch_id: string;
  tag: string | null;
  is_registered: boolean;
  batch_name: string | null;
  created_at: string;
}

interface TagItem {
  tag: string;
  cnt: number;
}

export default function CardDirectoryPage() {
  const lang = useAuthStore((s) => s.lang);
  const user = useAuthStore((s) => s.user);
  const rc = getRoleChecks(user?.role);
  const isAdmin = rc.isAdmin;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [editModal, setEditModal] = useState<BatchItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [contactModal, setContactModal] = useState<{ userId: string; name: string; company: string } | null>(null);
  const [contactText, setContactText] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  // Batches
  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['directory-batches'],
    queryFn: () => client.get<{ data: BatchItem[] }>('/cards/directory/batches').then(r => r.data),
    refetchInterval: 30000,
  });
  const batches = batchesData?.data || [];

  // Tags
  const { data: tagsData } = useQuery({
    queryKey: ['directory-tags', selectedBatch],
    queryFn: () => client.get<{ data: TagItem[] }>('/cards/directory/tags', { params: { batch_id: selectedBatch || undefined } }).then(r => r.data),
  });
  const tags = tagsData?.data || [];

  const currentBatch = batches.find(b => b.id === selectedBatch);

  const { data: cardsData, isLoading } = useQuery({
    queryKey: ['card-directory', search, selectedBatch, selectedTag],
    queryFn: () => client.get<{ data: DirectoryCard[]; total: number }>('/cards/directory', {
      params: { q: search || undefined, batch_id: selectedBatch || undefined, tag: selectedTag || undefined },
    }).then(r => r.data),
  });
  const cards = cardsData?.data || [];
  const registeredCount = cards.filter(c => c.is_registered).length;

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

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['card-directory'] });
    queryClient.invalidateQueries({ queryKey: ['directory-batches'] });
    queryClient.invalidateQueries({ queryKey: ['directory-tags'] });
  }, [queryClient]);

  const handleContactSend = async () => {
    if (!contactModal || !contactText.trim()) return;
    setContactSending(true);
    try {
      await client.post('/messages', { receiver_id: contactModal.userId, content: contactText.trim() });
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

  const handleDeleteBatch = async (bid: string, name: string) => {
    if (!confirm(lang === 'en' ? `Delete "${name}"?` : `确定删除「${name}」？`)) return;
    try {
      await client.delete(`/cards/directory/batch/${bid}`);
      if (selectedBatch === bid) setSelectedBatch('');
      refetch();
    } catch (err: any) { alert(err?.response?.data?.error || '删除失败'); }
  };

  const handleSaveBatch = async () => {
    if (!editModal) return;
    try {
      await client.put(`/cards/directory/batch/${editModal.id}`, { name: editName.trim(), notes: editNotes.trim() || null });
      setEditModal(null);
      refetch();
    } catch (err: any) { alert(err?.response?.data?.error || '保存失败'); }
  };

  const handleDownloadSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) { alert(lang === 'en' ? 'Select contacts first' : '请先选择联系人'); return; }
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cards/directory/download?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert(lang === 'en' ? 'Download failed' : '下载失败'); return; }
      const blob = await res.blob();
      const filename = `selected_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { alert(lang === 'en' ? 'Download failed' : '下载失败'); }
    setDownloading(false);
  };

  const handleDownloadBatch = async (bid: string, name: string) => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cards/directory/download?batch_id=${bid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert(lang === 'en' ? 'Download failed' : '下载失败'); return; }
      const blob = await res.blob();
      const filename = `${name.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { alert(lang === 'en' ? 'Download failed' : '下载失败'); }
    setDownloading(false);
  };

  const handleSetTag = async (cardId: string, tag: string) => {
    const newTag = tag === '__clear' ? null : tag;
    try {
      await client.put(`/cards/directory/card/${cardId}/tag`, { tag: newTag });
      refetch();
    } catch {}
  };

  const TAG_COLORS: Record<string, string> = {
    'VIP': 'bg-rose-100 text-rose-700 border-rose-200',
    '潜在客户': 'bg-blue-100 text-blue-700 border-blue-200',
    '已联系': 'bg-amber-100 text-amber-700 border-amber-200',
    '已合作': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    '无意向': 'bg-gray-100 text-gray-600 border-gray-200',
    '待跟进': 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
            <FolderOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'Card Directory' : '展会通讯录'}</h1>
            <p className="text-sm text-gray-500">{lang === 'en' ? 'Manage contacts with tags & categories' : '标签分类管理展会联系人'}</p>
          </div>
        </div>
        {isAdmin && (
          <button className="flex items-center gap-1.5 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-indigo-600 rounded-xl px-4 py-2.5 shadow-md hover:shadow-lg transition-all"
            onClick={() => window.location.href = '/admin/batch-import'}>
            <Upload className="w-4 h-4" />{lang === 'en' ? 'Upload' : '上传通讯录'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEFT */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
            <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-gray-500" />
                {lang === 'en' ? 'Categories' : '分类'} <span className="text-[10px] text-gray-400">({batches.length})</span>
              </h2>
            </div>

            {batchesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs px-4">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {lang === 'en' ? 'No categories' : '暂无分类'}
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                <div className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedBatch === '' ? 'bg-primary-50 border-l-2 border-primary-500' : 'border-l-2 border-transparent'}`}
                  onClick={() => { setSelectedBatch(''); setSelectedIds(new Set()); setSelectedTag(''); }}>
                  <span className="text-sm font-medium text-gray-800">{lang === 'en' ? 'All' : '全部'}</span>
                  <span className="text-xs text-gray-400 ml-2">{batches.reduce((s, b) => s + Number(b.actual || 0), 0)}</span>
                </div>

                {batches.map(b => {
                  const isActive = selectedBatch === b.id;
                  const convRate = Number(b.actual) > 0 ? Math.round((Number(b.registered) / Number(b.actual)) * 100) : 0;
                  return (
                    <div key={b.id} className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${isActive ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}
                      onClick={() => { setSelectedBatch(b.id); setSelectedIds(new Set()); setSelectedTag(''); }}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span>{Number(b.actual || 0)}{lang === 'en' ? ' ctc' : '人'}</span>
                            {Number(b.registered) > 0 && <span className="text-green-600 font-medium">✓{b.registered}</span>}
                            <span className={convRate >= 50 ? 'text-emerald-600 font-medium' : 'text-amber-500'}>{convRate}%</span>
                          </div>
                          {b.notes && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 bg-gray-50 rounded px-2 py-0.5">💬 {b.notes}</p>}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 ml-2 ${isActive ? 'text-emerald-500' : ''}`} />
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button className="flex items-center gap-1 text-[11px] font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg px-2.5 py-1.5 transition-colors shadow-sm"
                          onClick={e => { e.stopPropagation(); handleDownloadBatch(b.id, b.name); }} disabled={downloading}>
                          <Download className="w-3 h-3" />{lang === 'en' ? 'DL' : '下载'}
                        </button>
                        {isAdmin && (
                          <button className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-100 hover:bg-amber-200 rounded-lg px-2.5 py-1.5 transition-colors shadow-sm"
                            onClick={e => { e.stopPropagation(); setEditModal(b); setEditName(b.name); setEditNotes(b.notes || ''); }}>
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        {isAdmin && (
                          <button className="flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg px-2.5 py-1.5 transition-colors shadow-sm"
                            onClick={e => { e.stopPropagation(); handleDeleteBatch(b.id, b.name); }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tag filter */}
            {tags.length > 0 && (
              <div className="border-t border-gray-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">{lang === 'en' ? 'Tags' : '标签'}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTag && (
                    <button className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                      onClick={() => setSelectedTag('')}>全部</button>
                  )}
                  {tags.map((t: any) => (
                    <button key={t.tag}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${selectedTag === t.tag ? `${TAG_COLORS[t.tag] || 'bg-primary-100 text-primary-700 border-primary-200'} ring-1` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                      onClick={() => setSelectedTag(selectedTag === t.tag ? '' : t.tag)}>
                      {t.tag} ({t.cnt})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {selectedBatch ? (
                  <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">📂 {currentBatch?.name || (lang === 'en' ? 'Selected' : '已选')}</span>
                ) : (
                  <span className="text-sm font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg">📂 {lang === 'en' ? 'All' : '全部'}</span>
                )}
                <span className="text-xs text-gray-400">({cards.length})</span>
                {selectedTag && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{selectedTag}</span>}
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      onClick={handleBatchSend}>
                      <Send className="w-3 h-3" />{lang === 'en' ? `Message ${selectedIds.size}` : `发信 ${selectedIds.size}`}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      onClick={handleDownloadSelected} disabled={downloading}>
                      {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <DownloadCloud className="w-3 h-3" />}
                      {lang === 'en' ? 'Export' : '导出选中'}
                    </button>
                  </>
                )}
                {selectedBatch && (
                  <>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg transition-all shadow-sm"
                      onClick={async () => {
                        if (!selectedBatch || !confirm(lang === 'en' ? 'Invite all uninvited contacts in this batch?' : '确认邀请该批次所有未邀请的联系人？')) return;
                        try {
                          const res = await client.post('/cards/directory/batch-invite', { batch_id: selectedBatch });
                          alert(res.data?.message || (lang === 'en' ? 'Invitation sent!' : '邀请已发送！'));
                          queryClient.invalidateQueries({ queryKey: ['card-directory'] });
                          queryClient.invalidateQueries({ queryKey: ['directory-tags'] });
                        } catch (err: any) { alert(err?.response?.data?.error || (lang === 'en' ? 'Failed' : '邀请失败')); }
                      }}>
                      <Send className="w-3 h-3" />
                      {lang === 'en' ? 'Invite All' : '一键邀请注册'}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      onClick={() => handleDownloadBatch(selectedBatch, currentBatch?.name || '')} disabled={downloading}>
                      {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {lang === 'en' ? 'Export' : '导出全部'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="w-full pl-10 pr-3 py-2.5 text-sm bg-gray-50 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white transition-all"
                placeholder={lang === 'en' ? 'Search name or company...' : '搜索姓名或公司名...'} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 px-1">
              <span><Users className="w-3.5 h-3.5 inline mr-0.5" />{cards.length} {lang === 'en' ? 'contacts' : '人'}</span>
              {registeredCount > 0 && <span className="text-green-600">✓ {registeredCount} {lang === 'en' ? 'registered' : '已注册'}</span>}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-gray-400" /></div>
            ) : cards.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-base font-bold text-gray-600">
                  {search ? (lang === 'en' ? 'No results' : '未找到') : selectedTag ? (lang === 'en' ? 'No contacts with this tag' : '该标签暂无联系人') : (lang === 'en' ? 'No contacts' : '暂无联系人')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                      checked={selectAll} onChange={toggleSelectAll} />
                    <span className="text-xs text-gray-500">
                      {selectAll ? (lang === 'en' ? `All ${allIds.length}` : `已选全部 ${allIds.length}`) :
                       selectedIds.size > 0 ? (lang === 'en' ? `${selectedIds.size} selected` : `已选 ${selectedIds.size}`) :
                       (lang === 'en' ? 'Select all' : '全选')}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cards.map((card: DirectoryCard) => (
                    <div key={card.id}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        selectedIds.has(card.id) ? 'border-primary-300 ring-2 ring-primary-100 bg-primary-50/30' : 'border-gray-100 hover:border-emerald-200 hover:shadow-md bg-white'
                      }`}>
                      <label className="pt-1 cursor-pointer flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                          checked={selectedIds.has(card.id)} onChange={() => toggleSelect(card.id)} />
                      </label>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm truncate">{card.name}</span>
                          {card.is_registered && (
                            <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 font-medium">✓ {lang === 'en' ? 'Reg' : '已注册'}</span>
                          )}
                        </div>
                        {card.company && <p className="text-xs text-gray-500 mt-1 truncate"><Building2 className="w-3 h-3 inline mr-0.5" />{card.company}</p>}
                        {card.phone && <p className="text-xs text-gray-400 mt-0.5"><Phone className="w-3 h-3 inline mr-0.5" />{card.phone}</p>}
                        {card.batch_name && <p className="text-[10px] text-gray-400 mt-0.5">📂 {card.batch_name}</p>}

                        {/* Tag selector */}
                        <div className="flex items-center gap-1 mt-1.5">
                          {card.tag ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${TAG_COLORS[card.tag] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {card.tag}
                              {isAdmin && (
                                <button className="ml-1 hover:opacity-60" onClick={() => handleSetTag(card.id, '__clear')}>✕</button>
                              )}
                            </span>
                          ) : (
                            isAdmin && (
                              <span className="text-[10px] text-gray-400 italic">{lang === 'en' ? 'No tag' : '无标签'}</span>
                            )
                          )}
                          {isAdmin && (
                            <div className="relative group">
                              <Tag className="w-3 h-3 text-gray-300 hover:text-primary-500 cursor-pointer" />
                              <div className="absolute left-0 top-4 z-20 hidden group-hover:flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[80px]">
                                {TAG_OPTIONS.map(t => (
                                  <button key={t}
                                    className={`text-[10px] text-left px-2 py-1 rounded hover:bg-gray-100 ${card.tag === t ? 'font-bold text-primary-600' : 'text-gray-600'}`}
                                    onClick={() => handleSetTag(card.id, t)}>{t}</button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1.5 mt-2 pt-2 border-t border-gray-100">
                          {card.registered_user_id && (
                            <button className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1.5 transition-colors"
                              onClick={() => { setContactModal({ userId: card.registered_user_id!, name: card.name, company: card.company || '' }); setContactSent(false); setContactText(''); }}>
                              <MessageSquare className="w-3 h-3" />{lang === 'en' ? 'Message' : '发信'}
                            </button>
                          )}
                          {card.email && (
                            <a href={`mailto:${card.email}`}
                              className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors">
                              <Mail className="w-3 h-3" />{lang === 'en' ? 'Email' : '邮件'}
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
        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border-t-4 border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900"><Edit className="w-5 h-5 inline mr-1.5 text-amber-500" />{lang === 'en' ? 'Edit Category' : '编辑分类'}</h3>
              <button onClick={() => setEditModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Name' : '分类名称'}</label>
                <input className="input-field text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{lang === 'en' ? 'Notes' : '备注说明'}</label>
                <textarea className="input-field text-sm min-h-[60px]" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button className="btn-outline text-sm" onClick={() => setEditModal(null)}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="btn-primary text-sm" onClick={handleSaveBatch}>{lang === 'en' ? 'Save' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!contactSending) setContactModal(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 modal-mobile" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-base"><MessageSquare className="w-5 h-5 text-primary-500 inline mr-1" />{lang === 'en' ? 'Send Message' : '发送站内信'} — {contactModal.name}</h3>
              <button onClick={() => setContactModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {contactSent ? (
              <div className="text-center py-6 text-green-600 text-sm font-medium">✅ {lang === 'en' ? 'Sent' : '已发送'}</div>
            ) : (
              <>
                <textarea className="input-field w-full min-h-[100px] text-sm resize-none mb-3"
                  placeholder={lang === 'en' ? 'Type your message...' : '请输入消息内容...'}
                  value={contactText} onChange={e => setContactText(e.target.value)} disabled={contactSending} autoFocus />
                <button className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
                  onClick={handleContactSend} disabled={contactSending || !contactText.trim()}>
                  {contactSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {lang === 'en' ? 'Send' : '发送'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
