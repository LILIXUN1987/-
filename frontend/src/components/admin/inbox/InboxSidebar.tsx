import { useState } from 'react';
import { Search, X, Mail, Trash2, Target, Bell, MessageSquare } from 'lucide-react';
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

function tagBadge(tag: MsgTag, lang: Lang) {
  switch (tag) {
    case 'inquiry': return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: lang === 'en' ? 'Lead' : '商机' };
    case 'system': return { bg: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: lang === 'en' ? 'System' : '系统' };
    default: return null;
  }
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

  const TABS = [
    { key: 'all' as MsgTag, label: lang === 'en' ? 'All' : '全部', icon: Mail },
    { key: 'unread' as MsgTag, label: lang === 'en' ? 'Unread' : '未读', count: unreadCount, icon: Bell },
    { key: 'inquiry' as MsgTag, label: lang === 'en' ? 'Leads' : '商机', count: inquiryCount, icon: Target },
    { key: 'system' as MsgTag, label: lang === 'en' ? 'System' : '系统', count: systemCount, icon: MessageSquare },
  ];

  return (
    <div style={{height: 'calc(100vh - 260px)', minHeight: 400, display: 'flex', flexDirection: 'column'}}>
      {/* ── 筛选 Tabs ── */}
      <div className="flex gap-0.5 p-1 bg-slate-100/80 rounded-xl mb-4" style={{flexShrink: 0}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTag(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTag === tab.key
                ? 'bg-white text-slate-800 shadow-sm shadow-slate-200/50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                tab.key === 'unread' && activeTag !== 'unread'
                  ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 搜索栏 ── */}
      <div className="relative mb-4" style={{flexShrink: 0}}>
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

      {/* ── 对话列表 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden" style={{flex: 1, position: 'relative', minHeight: 0}}>
        {/* 空状态 */}
        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {searchQuery ? t(InboxT.noMatch, lang) : (activeTag !== 'all' ? (lang === 'en' ? 'No messages in this category' : '该分类暂无消息') : t(InboxT.noMessages, lang))}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? t(InboxT.searchHint, lang) : t(InboxT.emptyHint, lang)}
            </p>
          </div>
        </div>

        {/* 列表 */}
        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'hidden' : 'visible', overflowY: 'auto'}} className="divide-y divide-slate-50">
          {displayList.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const msgTag = detectTag(conv.last_message);
            const badge = tagBadge(msgTag, lang);
            const summary = shortSummary(conv.last_message);
            return (
              <div
                key={conv.contact_id}
                className={`flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-all duration-150 group ${
                  hasUnread
                    ? 'bg-indigo-50/30 hover:bg-indigo-50/60'
                    : 'hover:bg-slate-50'
                }`}
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
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm shadow-red-200 ring-2 ring-white">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {conv.company_name || conv.display_name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${badge.bg}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${badge.dot} mr-1 align-middle`} />
                          {badge.label}
                        </span>
                      )}
                      {conv.last_message_at && (
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {formatTime(conv.last_message_at, 'MM-DD')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${hasUnread ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                      {conv.last_is_outgoing && <span className="text-slate-300 mr-1">{t(InboxT.you, lang)}</span>}
                      {summary}
                    </p>
                    <button
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg ml-2"
                      onClick={(e) => { e.stopPropagation(); onDeleteTarget(conv); }}
                      title={lang === 'en' ? 'Delete' : '删除'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {displayList.length < total && (
            <div className="p-4 text-center">
              <button
                className="text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
                onClick={onLoadMore}
              >
                {t(InboxT.loadMore(total - displayList.length), lang)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
