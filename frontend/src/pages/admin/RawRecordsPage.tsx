import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rawMessagesApi, LinkedCargo } from '../../api/rawMessages.api';
import { formatTime } from '../../utils/time';
import client from '../../api/client';
import {
  Search, Loader2, FileText, Plane, Ship, Truck, Package,
  ChevronDown, ChevronUp, Trash2, X, AlertTriangle,
  ExternalLink, Database, Table, MapPin, Download,
} from 'lucide-react';

const CATEGORIES = [
  { key: '全部', label: '全部', icon: FileText },
  { key: '空运出口', label: '空运出口', icon: Plane },
  { key: '海运出口', label: '海运出口', icon: Ship },
  { key: '陆运出口', label: '陆运出口', icon: Truck },
  { key: '进口清关', label: '进口清关', icon: FileText },
  { key: '海运进口', label: '海运进口', icon: Ship },
  { key: '出口报关', label: '出口报关', icon: FileText },
  { key: '快递出口', label: '快递出口', icon: Package },
  { key: '快递进口', label: '快递进口', icon: Package },
  { key: '空运包税出口', label: '空运包税出口', icon: Plane },
  { key: '海运包税出口', label: '海运包税出口', icon: Ship },
  { key: 'JC TRANS会员', label: 'JC TRANS会员', icon: Truck },
  { key: 'WCA会员', label: 'WCA会员', icon: Truck },
] as const;

/** 格式化货舱类型为可读文本 */
function cargoTypeLabel(type: string | null): string {
  if (!type) return '普货';
  const map: Record<string, string> = {
    'general': '普货', 'sensitive': '敏感货', 'special': '特货',
    'electronic': '电子', 'liquid': '液体', 'powder': '粉末',
  };
  return map[type] || type;
}

export default function RawRecordsPage() {
  const queryClient = useQueryClient();

  // ── 筛选状态 ──
  const [category, setCategory] = useState('全部');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  // ── UI 状态 ──
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cargoModal, setCargoModal] = useState<{ rawId: string; rawContent: string } | null>(null);

  // ── 数据查询 ──
  const { data, isLoading } = useQuery({
    queryKey: ['raw-messages', category, dateFrom, dateTo, keyword, page],
    queryFn: () =>
      rawMessagesApi.list({
        category: category === '全部' ? undefined : category,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        keyword: keyword || undefined,
        page,
        limit: 30,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  // ── 关联货舱查询 ──
  const { data: cargoData, isLoading: cargoLoading } = useQuery({
    queryKey: ['raw-messages-cargo', cargoModal?.rawId],
    queryFn: () => rawMessagesApi.getLinkedCargo(cargoModal!.rawId),
    enabled: !!cargoModal,
  });

  // ── 批量删除 ──
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => rawMessagesApi.deleteBatch(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw-messages'] });
      setSelectedIds(new Set());
    },
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── 选择逻辑 ──
  const allIds = data?.data.map((d) => d.id) || [];
  const selectAll = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    deleteMutation.mutate([...selectedIds]);
    setConfirmDelete(false);
  };

  // 每次翻页/筛选时清空选择
  const resetFilters = useCallback((updates: Record<string, any>) => {
    if ('category' in updates) setCategory(updates.category);
    if ('dateFrom' in updates) setDateFrom(updates.dateFrom || '');
    if ('dateTo' in updates) setDateTo(updates.dateTo || '');
    if ('keyword' in updates) setKeyword(updates.keyword || '');
    setPage(1);
    setSelectedIds(new Set());
    setExpandedId(null);
  }, []);

  /** 格式化价格展示 */
  function formatPrice(row: LinkedCargo): string {
    const parts: string[] = [];
    if (row.price_per_cbm) parts.push(`${row.price_per_cbm} ${row.currency}/CBM`);
    if (row.price_per_kg) parts.push(`${row.price_per_kg} ${row.currency}/KG`);
    return parts.join(' & ') || '-';
  }

  return (
    <div>
      {/* ── 页面标题 ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据录入原始记录</h1>
          <p className="text-gray-500 text-sm mt-0.5">查看所有通过 AI 解析录入的原始文本记录，自动保留 3 天</p>
        </div>
        {data && data.total > 0 && (
          <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
            共 <span className="font-semibold text-gray-600">{data.total}</span> 条记录
          </div>
        )}
      </div>

      {/* ── 分类筛选标签 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">按分类筛选</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => resetFilters({ category: cat.key })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 筛选栏：日期 + 搜索 + 批量删除 ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">日期从</label>
            <input
              type="date"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={dateFrom}
              onChange={(e) => resetFilters({ dateFrom: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">到</label>
            <input
              type="date"
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-400"
              value={dateTo}
              onChange={(e) => resetFilters({ dateTo: e.target.value })}
            />
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-8 py-1.5 text-xs border-2 border-primary-200 bg-primary-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 placeholder-gray-400"
              placeholder="搜索原文内容..."
              value={keyword}
              onChange={(e) => resetFilters({ keyword: e.target.value })}
            />
            {keyword && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs px-1"
                onClick={() => resetFilters({ keyword: '' })}
              >
                清空
              </button>
            )}
          </div>

          {/* 批量删除按钮 */}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              删除 {selectedIds.size} 条
            </button>
          )}

          {/* 导出 Excel 按钮 */}
          <button
            onClick={async () => {
              try {
                await rawMessagesApi.export({
                  category: category === '全部' ? undefined : category,
                  date_from: dateFrom || undefined,
                  date_to: dateTo || undefined,
                  keyword: keyword || undefined,
                });
              } catch { alert('导出失败'); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors ml-auto"
          >
            <Download className="w-3.5 h-3.5" />
            导出 Excel
          </button>
        </div>
      </div>

      {/* ── 确认删除对话框 ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">确认删除</h3>
                <p className="text-xs text-gray-500 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              确定要删除选中的 <span className="font-semibold text-red-600">{selectedIds.size}</span> 条原始记录吗？
              关联的货舱记录不会被删除。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setConfirmDelete(false)}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 记录列表 ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !data?.data?.length ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">暂无原始记录</p>
          <p className="text-gray-300 text-xs mt-1">请先在数据录入页面录入推广信息</p>
        </div>
      ) : (
        <>
          {/* 全选提示栏 */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
              />
              <span className="text-xs text-gray-500">
                {selectAll
                  ? `已选全部 ${allIds.length} 条`
                  : selectedIds.size > 0
                    ? `已选 ${selectedIds.size} 条`
                    : '全选'
                }
              </span>
            </label>
          </div>

          <div className="space-y-2.5">
            {data.data.map((item) => {
              const isExpanded = expandedId === item.id;
              const isSelected = selectedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border transition-colors ${
                    isSelected
                      ? 'border-primary-300 ring-1 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2 p-4">
                    {/* 序号 */}
                    <span className="pt-1 text-[11px] text-gray-300 font-mono w-5 text-right flex-shrink-0 select-none">
                      {((page - 1) * 30) + data.data.indexOf(item) + 1}
                    </span>
                    {/* 复选框 */}
                    <label className="pt-0.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-400"
                      />
                    </label>

                    {/* 主内容区 */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* 分类标签 + 时间 + 上传人 + 关联货舱数 */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {item.category ? (
                              <span className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {item.category}
                              </span>
                            ) : (
                              <span className="inline-block bg-gray-100 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                                未分类
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTime(item.created_at, 'MM-DD HH:mm')}
                            </span>
                            {(item.uploader_company || item.uploader_name) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const msg = prompt(`发送站内信给 ${item.uploader_company || ''} ${item.uploader_name || ''}：`);
                                  if (msg?.trim()) {
                                    client.post('/messages', { receiver_id: item.uploaded_by, content: msg.trim() })
                                      .then(() => alert('✅ 消息已发送'))
                                      .catch(() => alert('发送失败'));
                                  }
                                }}
                                className="text-xs text-primary-600 hover:text-primary-800 hover:underline font-medium transition-colors"
                                title="点击发站内信"
                              >
                                📧 {item.uploader_company || ''} {item.uploader_name || ''}
                              </button>
                            )}

                            {/* 关联货舱数 - 可点击查看 */}
                            {item.cargo_count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCargoModal({ rawId: item.id, rawContent: item.content });
                                }}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
                              >
                                <Database className="w-3 h-3" />
                                {item.cargo_count} 条货舱
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                          {/* 原文内容（折叠） */}
                          <p className={`text-sm text-gray-700 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                            {item.content}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-gray-300 mt-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── 分页 ── */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            共 <strong className="text-gray-700">{data.total}</strong> 条，第 {page}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              disabled={page <= 1}
              onClick={() => { setPage((p) => p - 1); setSelectedIds(new Set()); }}
            >
              ‹
            </button>
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, page + 2);
              if (start > 1) pages.push(1);
              if (start > 2) pages.push('...');
              for (let i = start; i <= end; i++) pages.push(i);
              if (end < totalPages - 1) pages.push('...');
              if (end < totalPages) pages.push(totalPages);
              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={i} className="text-xs text-gray-300 px-1 select-none">···</span>
                ) : (
                  <button key={p}
                    className={'text-xs min-w-[28px] h-7 rounded-lg border transition-colors ' + (page === p ? 'bg-primary-600 text-white border-primary-600 font-bold shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}
                    onClick={() => { setPage(p); setSelectedIds(new Set()); }}
                  >
                    {p}
                  </button>
                )
              );
            })()}
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              disabled={page >= totalPages}
              onClick={() => { setPage((p) => p + 1); setSelectedIds(new Set()); }}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* ── 关联货舱 Modal ── */}
      {cargoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setCargoModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-base">关联货舱记录</h3>
                {cargoData && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {cargoData.total} 条
                  </span>
                )}
              </div>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setCargoModal(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 原始文本预览 */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1">原始录入文本</p>
              <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{cargoModal.rawContent}</p>
            </div>

            {/* 货舱列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {cargoLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : !cargoData?.data?.length ? (
                <div className="text-center py-12">
                  <Table className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">暂无关联货舱记录</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cargoData.data.map((cargo) => (
                    <div
                      key={cargo.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                    >
                      {/* 第一行：核心信息 */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {cargo.warehouse_name}
                            </span>
                            {cargo.region && (
                              <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {cargo.region}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                            {cargo.airline_code && (
                              <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px]">
                                {cargo.airline_code}
                              </span>
                            )}
                            <span>{cargo.available_cbm} CBM / {cargo.available_kg} KG</span>
                            {cargo.cargo_type && (
                              <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-[11px]">
                                {cargoTypeLabel(cargo.cargo_type)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          cargo.status === 'available'
                            ? 'bg-green-50 text-green-700'
                            : cargo.status === 'expired'
                              ? 'bg-gray-100 text-gray-400'
                              : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {cargo.status === 'available' ? '有效' : cargo.status === 'expired' ? '已过期' : '暂停'}
                        </span>
                      </div>
                      {/* 第二行：价格 + 有效期 */}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="font-medium text-gray-600">{formatPrice(cargo)}</span>
                        <span>
                          {formatTime(cargo.valid_from, 'MM-DD')} ~ {formatTime(cargo.valid_to, 'MM-DD')}
                        </span>
                      </div>
                      {cargo.notes && (
                        <p className="text-xs text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100 leading-relaxed">
                          {cargo.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="p-3 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setCargoModal(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
