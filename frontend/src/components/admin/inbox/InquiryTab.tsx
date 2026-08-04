import { useState } from 'react';
// InquiryTab v3 — 询盘商机管理重构 2026-08-04
import { Loader2, Mail, MessageSquare, Phone, Star, Clock, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import { formatTime } from '../../../utils/time';
import { InquiryItem } from '../../../api/messages.api';
import { InboxT, t, Lang } from '../../../i18n';

interface InquiryTabProps {
  inquiries: InquiryItem[];
  total: number;
  page: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  lang: Lang;
}

/** 解析货物关键词，提取结构化字段 */
function parseCargo(keyword: string): { port: string; pieces: string; weight: string; volume: string; extra: string; isUrgent: boolean } {
  const port = keyword.match(/([A-Z]{3})/)?.at(1) || '';
  const pieces = keyword.match(/(\d+)\s*件/)?.at(1) || '';
  const weight = keyword.match(/(\d+(?:\.\d+)?)\s*(?:KG|kg|公斤)/)?.at(1) || '';
  const volume = keyword.match(/(\d+(?:\.\d+)?)\s*(?:CBM|cbm|立方)/)?.at(1) || '';
  const extra = keyword
    .replace(/(\d+)\s*件/, '')
    .replace(/(\d+(?:\.\d+)?)\s*(?:KG|kg|公斤)/, '')
    .replace(/(\d+(?:\.\d+)?)\s*(?:CBM|cbm|立方)/, '')
    .replace(/[A-Z]{3}/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 30);
  const isUrgent = /急|加急|特价|马上|立即|尽快|今天/.test(keyword) || (parseFloat(weight) > 500);
  return { port, pieces, weight, volume, extra, isUrgent };
}

export function InquiryTab({ inquiries, total, page, isLoading, onPageChange, lang }: InquiryTabProps) {
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('unreplied');
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState('');

  // 提取所有航线类型
  const routeTypes = [...new Set(inquiries.map(i => {
    const m = i.inquiry_keyword?.match(/\[(.*?)\]/);
    return m ? m[1] : '';
  }).filter(Boolean))];

  let filtered = inquiries;
  if (filter === 'unreplied') filtered = filtered.filter(i => !i.has_reply);
  else if (filter === 'replied') filtered = filtered.filter(i => i.has_reply);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(i =>
      i.inquiry_keyword?.toLowerCase().includes(q) ||
      (i.receiver_company || '').toLowerCase().includes(q) ||
      (i.receiver_name || '').toLowerCase().includes(q)
    );
  }
  if (routeFilter) {
    filtered = filtered.filter(i => i.inquiry_keyword?.includes(`[${routeFilter}]`));
  }

  const unrepliedCount = inquiries.filter(i => !i.has_reply).length;
  const repliedCount = inquiries.filter(i => i.has_reply).length;

  return (
    <div>
      {/* ── 状态筛选条 ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100/80 rounded-xl p-1">
          {[
            { key: 'unreplied' as const, label: lang === 'en' ? 'Unreplied' : '未回复', count: unrepliedCount, color: 'bg-red-500' },
            { key: 'replied' as const, label: lang === 'en' ? 'Replied' : '已回复', count: repliedCount, color: 'bg-green-500' },
            { key: 'all' as const, label: lang === 'en' ? 'All' : '全部', count: inquiries.length, color: 'bg-slate-500' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${
                filter === f.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <span className={`w-2 h-2 rounded-full ${f.color}`} />
              {f.label}
              <span className="text-slate-400">{f.count}</span>
            </button>
          ))}
        </div>
        {/* 航线快捷筛选 */}
        {routeTypes.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {routeTypes.slice(0, 5).map(rt => (
              <button key={rt} onClick={() => setRouteFilter(routeFilter === rt ? '' : rt)}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border transition-all ${
                  routeFilter === rt ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                {rt}
              </button>
            ))}
          </div>
        )}
        {/* 搜索 */}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-40 text-xs pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-200 placeholder-slate-400"
            placeholder={lang === 'en' ? 'Search...' : '搜索...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── 询价列表 ── */}
      {isLoading && inquiries.length === 0 ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
          <Mail className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">
            {filter === 'unreplied' ? (lang === 'en' ? 'All inquiries replied! 🎉' : '全部已回复！🎉') : t(InboxT.noInquiries, lang)}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => {
            const cargo = parseCargo(item.inquiry_keyword || '');
            const hasReply = item.has_reply;
            return (
              <div key={i}
                className={`relative bg-white rounded-xl border p-4 transition-all hover:shadow-md group ${
                  hasReply ? 'border-slate-100' : 'border-red-200 shadow-sm shadow-red-50'
                }`}
              >
                {/* 左侧状态条 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  hasReply ? 'bg-slate-200' : cargo.isUrgent ? 'bg-red-500' : 'bg-amber-400'
                }`} />

                <div className="pl-3">
                  {/* 头部：状态 + 接收方 + 时间 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {hasReply ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />{lang === 'en' ? 'Replied' : '已回复'}
                          {item.reply_count > 0 && <span className="text-slate-300">· {item.reply_count} {lang === 'en' ? 'replies' : '条回复'}</span>}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">
                          <AlertCircle className="w-3 h-3" />{lang === 'en' ? 'AWAITING REPLY' : '待回复'}
                        </span>
                      )}
                      {cargo.isUrgent && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">🔥 {lang === 'en' ? 'URGENT' : '紧急'}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">
                      {formatTime(item.created_at, 'MM-DD HH:mm')}
                    </span>
                  </div>

                  {/* 接收方 */}
                  <div className="text-xs text-slate-500 mb-2">
                    → {item.receiver_company || item.receiver_name || (lang === 'en' ? 'Forwarder' : '货代')}
                  </div>

                  {/* 核心货物信息——放大加粗 */}
                  <div className={`flex items-center gap-2 flex-wrap mb-2 ${hasReply ? '' : 'bg-red-50/50 -mx-1 px-1 py-1 rounded-lg'}`}>
                    {cargo.port && (
                      <span className="text-sm font-black text-slate-900">📍 {cargo.port}</span>
                    )}
                    {(cargo.pieces || cargo.weight || cargo.volume) && (
                      <span className="text-slate-300">|</span>
                    )}
                    {cargo.pieces && (
                      <span className="text-sm font-bold text-slate-800">{cargo.pieces}{lang === 'en' ? 'pcs' : '件'}</span>
                    )}
                    {cargo.weight && (
                      <span className="text-sm font-bold text-slate-800">{cargo.weight}KG</span>
                    )}
                    {cargo.volume && (
                      <span className="text-sm font-bold text-slate-800">{cargo.volume}CBM</span>
                    )}
                    {cargo.extra && (
                      <span className="text-xs text-slate-500 truncate max-w-[200px]" title={cargo.extra}>{cargo.extra}</span>
                    )}
                  </div>

                  {/* 原始信息折叠 */}
                  <details className="text-[11px]">
                    <summary className="text-slate-400 cursor-pointer hover:text-slate-600">
                      {lang === 'en' ? 'Full message' : '查看完整信息'}
                    </summary>
                    <p className="text-slate-500 mt-1 bg-slate-50 p-2 rounded-lg">{item.inquiry_keyword}</p>
                  </details>

                  {/* 快捷操作 */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors shadow-sm">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'Reply' : '快速回复'}
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                      {lang === 'en' ? 'Contact' : '联系'}
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors ml-auto">
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length < total && (
            <button className="w-full py-3 text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors"
              onClick={() => onPageChange(page + 1)}>
              {t(InboxT.loadMoreInquiries(total - filtered.length), lang)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
