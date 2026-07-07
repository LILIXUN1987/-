import { useState, useEffect, useCallback, useMemo } from 'react';
import { favoritesApi, FavoriteItem } from '../../api/favorites.api';
import client from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import {
  Star, Loader2, Trash2, AlertTriangle,
  Plane, MapPin, Package, ExternalLink,
  ChevronLeft, ChevronRight, Search, X, Send, MessageSquare, CheckCircle,
} from 'lucide-react';
import { formatTime } from '../../utils/time';
import dayjs from 'dayjs';

const LIMIT = 20;

function formatPrice(item: FavoriteItem): string {
  const parts: string[] = [];
  if (item.price_per_cbm) parts.push(`${item.price_per_cbm} ${item.currency || 'CNY'}/CBM`);
  if (item.price_per_kg) parts.push(`${item.price_per_kg} ${item.currency || 'CNY'}/KG`);
  return parts.join(' · ') || '-';
}

export default function FavoritesPage() {
  const lang = useAuthStore((s) => s.lang);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 选中/批量
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<FavoriteItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 联系弹窗
  const [contactInfo, setContactInfo] = useState<string | null>(null);
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const fetchFavorites = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await favoritesApi.list({ page: p, limit: LIMIT });
      setItems(result.data);
      setTotal(result.total);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFavorites(page); }, [page, fetchFavorites]);

  // 本地搜索过滤
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(i =>
      (i.origin_port || '').toLowerCase().includes(q) ||
      (i.dest_port || '').toLowerCase().includes(q) ||
      (i.region || '').toLowerCase().includes(q) ||
      (i.warehouse_name || '').toLowerCase().includes(q) ||
      (i.airline_code || '').toLowerCase().includes(q) ||
      (i.contact_info || '').toLowerCase().includes(q) ||
      (i.notes || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalPages = Math.ceil(total / LIMIT);
  const allIds = items.map(i => i.id);
  const selectAll = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  const isExpired = (item: FavoriteItem): boolean =>
    item.status === 'expired' || (!!item.valid_to && dayjs(item.valid_to).isBefore(dayjs(), 'day'));

  const handleRemove = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await favoritesApi.toggle(deleteTarget.id);
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch {}
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    let removed = 0;
    for (const id of selectedIds) {
      try { await favoritesApi.toggle(id); removed++; } catch {}
    }
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
    setTotal(prev => Math.max(0, prev - removed));
    setSelectedIds(new Set());
    setBatchDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const handleContact = async (contactInfoStr: string) => {
    setContactInfo(contactInfoStr);
    setContactSent(false);
  };

  const handleContactSend = async () => {
    if (!contactInfo) return;
    setContactSending(true);
    try {
      const msg = prompt(lang === 'en' ? `Send message regarding this cargo space:` : `发送站内信咨询此舱位：`);
      if (msg?.trim()) {
        // Try to find the uploader - send to admin as fallback
        await client.post('/messages/contact-admin', {
          content: `[舱位咨询] 我对收藏的航线感兴趣，联系方式：${contactInfo}\n\n${msg.trim()}`,
        });
        setContactSent(true);
        setTimeout(() => { setContactInfo(null); setContactSent(false); }, 2000);
      } else {
        setContactInfo(null);
      }
    } catch { alert(lang === 'en' ? 'Send failed' : '发送失败'); }
    setContactSending(false);
  };

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{lang === 'en' ? 'My Favorites' : '我的收藏'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{lang === 'en' ? 'Saved cargo spaces for quick access' : '收藏的推广信息，方便随时查看'}</p>
        </div>
        {total > 0 && (
          <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
            {lang === 'en' ? `Total ${total}` : `共 ${total} 条`}
          </div>
        )}
      </div>

      {/* 搜索+批量操作栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-8 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
            placeholder={lang === 'en' ? 'Search routes, ports, airline...' : '搜索航线、港口、航司...'} value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearch('')}><X className="w-3 h-3" /></button>}
        </div>
        {selectedIds.size > 0 && (
          <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" onClick={handleBatchDelete} disabled={batchDeleting}>
            {batchDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            {lang === 'en' ? `Remove ${selectedIds.size}` : `取消收藏 ${selectedIds.size}`}
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">{lang === 'en' ? 'No favorites yet' : '暂无收藏'}</p>
          <p className="text-xs text-gray-400 mt-1">{lang === 'en' ? 'Star ⭐ cargo spaces in search results to save them here' : '在查询结果中点 ⭐ 星号即可收藏推广信息'}</p>
        </div>
      ) : (
        <>
          {/* 全选栏 */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                  checked={selectAll} onChange={toggleSelectAll} />
                <span className="text-xs text-gray-500">
                  {selectAll ? (lang === 'en' ? `Selected ${allIds.length}` : `已选全部 ${allIds.length} 条`) :
                   selectedIds.size > 0 ? (lang === 'en' ? `Selected ${selectedIds.size}` : `已选 ${selectedIds.size} 条`) :
                   (lang === 'en' ? 'Select all' : '全选')}
                </span>
              </label>
              {search && <span className="text-xs text-gray-400 ml-2">{lang === 'en' ? `${filtered.length} results` : `匹配 ${filtered.length} 条`}</span>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {filtered.map((item) => {
              const expired = isExpired(item);
              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border transition-all ${
                  expired ? 'border-gray-200 opacity-55' : selectedIds.has(item.id) ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}>
                  <div className="p-4">
                    {/* 第一行：复选框 + 路线 + 状态 */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <label onClick={e => e.stopPropagation()} className="flex-shrink-0 cursor-pointer pt-0.5">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                            checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                        </label>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {(item.origin_port || item.dest_port) ? (
                            <>
                              <span className="font-semibold text-primary-700 text-sm">{item.origin_port || '?'}</span>
                              <span className="text-gray-300 text-sm">→</span>
                              <span className="font-semibold text-gray-800 text-sm">{item.dest_port || '?'}</span>
                            </>
                          ) : (
                            <span className="text-sm font-medium text-gray-700 truncate">{item.warehouse_name || item.region || '—'}</span>
                          )}
                          {item.airline_code && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary-100 text-primary-700">{item.airline_code}</span>}
                          {item.cargo_type && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">{item.cargo_type}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {expired ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">{lang === 'en' ? 'Expired' : '已过期'}</span>
                        : item.status === 'reserved' ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{lang === 'en' ? 'Reserved' : '已预定'}</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">{lang === 'en' ? 'Available' : '可用'}</span>}
                      </div>
                    </div>

                    {/* 第二行：地区+仓库 */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                      {item.region && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.region}</span>}
                      {item.warehouse_name && item.warehouse_name !== (item.origin_port || item.dest_port) && (
                        <span className="flex items-center gap-1"><Package className="w-3 h-3" />{item.warehouse_name}</span>
                      )}
                    </div>

                    {/* 第三行：CBM/KG/价格 */}
                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      {(item.available_cbm != null) && <span className="font-medium tabular-nums">📦 {Number(item.available_cbm).toLocaleString()} CBM</span>}
                      {(item.available_kg != null) && <span className="font-medium tabular-nums">⚖️ {Number(item.available_kg).toLocaleString()} KG</span>}
                      <span className="font-medium text-primary-600">{formatPrice(item)}</span>
                    </div>

                    {/* 备注 */}
                    {item.notes && <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">{item.notes}</p>}

                    {/* 底部：联系方式 + 操作 */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        {item.contact_info ? (
                          <button className="flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline font-medium" onClick={() => handleContact(item.contact_info!)} title={lang === 'en' ? 'Contact' : '联系'}>
                            📞 {item.contact_info}
                          </button>
                        ) : <span className="text-gray-300">{lang === 'en' ? 'No contact' : '无联系方式'}</span>}
                        <span className="text-gray-300">|</span>
                        <span>{lang === 'en' ? 'Saved' : '收藏于'} {formatTime(item.favorited_at, 'MM-DD HH:mm')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={lang === 'en' ? 'Remove' : '取消收藏'} onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
              <span className="text-xs text-gray-500">{lang === 'en' ? `Total ${total}, Page ${page}/${totalPages}` : `共 ${total} 条，第 ${page}/${totalPages} 页`}</span>
              <div className="flex items-center gap-1">
                <button className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors" disabled={page <= 1} onClick={() => { setPage(p => p - 1); setSelectedIds(new Set()); }}>
                  <ChevronLeft className="w-3 h-3" />
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  const start = Math.max(1, page - 2);
                  const end = Math.min(totalPages, page + 2);
                  if (start > 1) pages.push(1);
                  if (start > 2) pages.push('...');
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push('...');
                  if (end < totalPages) pages.push(totalPages);
                  return pages.map((p, i) =>
                    p === '...' ? <span key={i} className="text-xs text-gray-300 px-1 select-none">···</span>
                    : <button key={i} className={`text-xs min-w-[28px] h-7 rounded-lg border transition-colors ${page === p ? 'bg-primary-600 text-white border-primary-600 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => { setPage(p as number); setSelectedIds(new Set()); }}>{p}</button>
                  );
                })()}
                <button className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); setSelectedIds(new Set()); }}>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { if (!isDeleting) setDeleteTarget(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900">{lang === 'en' ? 'Remove Favorite' : '取消收藏'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{lang === 'en' ? 'This cannot be undone' : '此操作不可撤销'}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">{lang === 'en' ? 'Remove this item from favorites?' : '确定要取消收藏这条推广信息吗？'}</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="font-medium text-gray-900">
                {deleteTarget.origin_port || ''}{deleteTarget.origin_port && deleteTarget.dest_port ? ' → ' : ''}{deleteTarget.dest_port || ''}
                {deleteTarget.airline_code && <span className="ml-1 font-mono">({deleteTarget.airline_code})</span>}
              </div>
              <div className="text-xs text-gray-500 mt-1">{deleteTarget.region || deleteTarget.warehouse_name || ''}{deleteTarget.contact_info ? ` · ${deleteTarget.contact_info}` : ''}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>{lang === 'en' ? 'Cancel' : '取消'}</button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5" onClick={handleRemove} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {lang === 'en' ? 'Remove' : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
