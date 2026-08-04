import { useState } from 'react';
import { Search, X, Mail, Trash2, Target, Bell, MessageSquare, Zap } from 'lucide-react';
import { formatTime } from '../../../utils/time';
import { Conversation } from '../../../api/messages.api';
import { InboxT, t, Lang } from '../../../i18n';

interface InboxSidebarProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  total: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenChat: (conv: Conversation) => void;
  onDeleteTarget: (conv: Conversation) => void;
  onLoadMore: () => void;
  lang: Lang;
}

type MsgTag = 'all' | 'unread' | 'inquiry' | 'system';

function detectTag(msg: string): MsgTag {
  if (!msg) return 'all';
  if (/询价|报价|舱位|航线|空运|海运|件数|KG|CBM|📦|📢/.test(msg)) return 'inquiry';
  if (/系统|审核|认证|到期|通知|公告|申诉|风控|⚖️|【/.test(msg)) return 'system';
  return 'all';
}

function shortSummary(msg: string): string {
  return msg
    .replace(/有群友在\s*\[.*?\]\s*搜索需求，当前社区暂无匹配舱位[：:]?\s*/g, '')
    .replace(/【.*?】/g, '')
    .substring(0, 50) || '暂无消息';
}

export function InboxSidebar({
  conversations, filteredConversations, total,
  searchQuery, onSearchChange, onClearSearch,
  onOpenChat, onDeleteTarget, onLoadMore, lang,
}: InboxSidebarProps) {
  const [activeTag, setActiveTag] = useState<MsgTag>('all');

  const allData = searchQuery.trim() ? filteredConversations : conversations;
  const unreadCount = allData.filter(c => c.unread_count > 0).length;
  const inquiryCount = allData.filter(c => detectTag(c.last_message) === 'inquiry').length;
  const systemCount = allData.filter(c => detectTag(c.last_message) === 'system').length;

  let displayList = allData;
  if (activeTag === 'unread') displayList = allData.filter(c => c.unread_count > 0);
  else if (activeTag === 'inquiry') displayList = allData.filter(c => detectTag(c.last_message) === 'inquiry');
  else if (activeTag === 'system') displayList = allData.filter(c => detectTag(c.last_message) === 'system');

  const isEmpty = displayList.length === 0;

  return (
    <div style={{height: 'calc(100vh - 260px)', minHeight: 400, display: 'flex', flexDirection: 'column'}}>
      {/* ── 商机统计条 ── */}
      <div className="grid grid-cols-3 gap-2 mb-4" style={{flexShrink: 0}}>
        <button onClick={() => setActiveTag('unread')} className={`relative overflow-hidden rounded-2xl p-3 text-left transition-all duration-200 ${activeTag === 'unread' ? 'ring-2 ring-red-400 scale-[1.02]' : 'hover:scale-[1.01]'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-90" />
          <div className="relative">
            <div className="text-2xl font-black text-white">{unreadCount}</div>
            <div className="text-[11px] font-bold text-red-100 mt-0.5">{lang === 'en' ? 'Unread' : '未读'}</div>
          </div>
        </button>
        <button onClick={() => setActiveTag('inquiry')} className={`relative overflow-hidden rounded-2xl p-3 text-left transition-all duration-200 ${activeTag === 'inquiry' ? 'ring-2 ring-amber-400 scale-[1.02]' : 'hover:scale-[1.01]'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90" />
          <div className="relative">
            <div className="text-2xl font-black text-white">{inquiryCount}</div>
            <div className="text-[11px] font-bold text-amber-100 mt-0.5">{lang === 'en' ? 'Leads' : '商机'}</div>
          </div>
        </button>
        <button onClick={() => setActiveTag('all')} className={`relative overflow-hidden rounded-2xl p-3 text-left transition-all duration-200 ${activeTag === 'all' ? 'ring-2 ring-indigo-400 scale-[1.02]' : 'hover:scale-[1.01]'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 opacity-90" />
          <div className="relative">
            <div className="text-2xl font-black text-white">{allData.length}</div>
            <div className="text-[11px] font-bold text-indigo-100 mt-0.5">{lang === 'en' ? 'Total' : '全部'}</div>
          </div>
        </button>
      </div>

      {/* ── 搜索栏 ── */}
      <div className="relative mb-3" style={{flexShrink: 0}}>
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-200 focus:bg-white placeholder-slate-400 transition-all"
          placeholder={t(InboxT.searchContact, lang)}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5" onClick={onClearSearch}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 分类标签 ── */}
      <div className="flex gap-1.5 mb-3" style={{flexShrink: 0}}>
        {[
          { key: 'all' as MsgTag, label: lang === 'en' ? 'All' : '全部' },
          { key: 'unread' as MsgTag, label: lang === 'en' ? 'Unread' : '未读', hot: unreadCount > 0 },
          { key: 'inquiry' as MsgTag, label: lang === 'en' ? 'Leads' : '商机', hot: inquiryCount > 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTag(tab.key)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all ${
              activeTag === tab.key
                ? 'bg-slate-800 text-white shadow-sm'
                : tab.hot
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {tab.label}
            {tab.hot && activeTag !== tab.key && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-500 inline-block align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* ── 对话列表 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" style={{flex: 1, position: 'relative', minHeight: 0}}>
        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">
              {searchQuery ? t(InboxT.noMatch, lang) : (activeTag !== 'all' ? (lang === 'en' ? 'All clear!' : '暂无此类消息') : t(InboxT.noMessages, lang))}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? t(InboxT.searchHint, lang) : t(InboxT.emptyHint, lang)}
            </p>
          </div>
        </div>

        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'hidden' : 'visible', overflowY: 'auto'}} className="divide-y divide-slate-50">
          {displayList.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const msgTag = detectTag(conv.last_message);
            const isInquiry = msgTag === 'inquiry';
            const summary = shortSummary(conv.last_message);
            return (
              <div
                key={conv.contact_id}
                className={`flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-all duration-150 group ${
                  hasUnread ? 'bg-gradient-to-r from-red-50/80 to-white' : 'hover:bg-slate-50'
                } ${isInquiry && hasUnread ? 'border-l-[3px] border-l-amber-400' : 'border-l-[3px] border-l-transparent'}`}
                onClick={() => onOpenChat(conv)}
              >
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                    hasUnread
                      ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {conv.display_name?.charAt(0) || '?'}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] bg-red-500 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 shadow-md shadow-red-200 ring-2 ring-white leading-none">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm truncate ${hasUnread ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {conv.company_name || conv.display_name}
                      </span>
                      {isInquiry && (
                        <span className="flex-shrink-0 text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200">
                          💰 {lang === 'en' ? 'LEAD' : '商机'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.last_message_at && (
                        <span className={`text-[11px] tabular-nums ${hasUnread ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                          {formatTime(conv.last_message_at, 'MM-DD')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${hasUnread ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                      {conv.last_is_outgoing && <span className="text-slate-300 mr-1">{t(InboxT.you, lang)}</span>}
                      {summary}
                    </p>
                    {hasUnread && (
                      <span className="flex-shrink-0 text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full ml-2 animate-pulse">
                        {lang === 'en' ? 'NEW' : '新消息'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {displayList.length < total && (
            <div className="p-4 text-center">
              <button className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors" onClick={onLoadMore}>
                {t(InboxT.loadMore(total - displayList.length), lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
