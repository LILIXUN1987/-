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

/** 消息分类检测 */
function detectTag(msg: string): MsgTag {
  if (!msg) return 'all';
  // 询价/商机
  if (/询价|报价|舱位|航线|空运|海运|件数|KG|CBM|📦|📢/.test(msg)) return 'inquiry';
  // 系统通知
  if (/系统|审核|认证|到期|通知|公告|申诉|风控|⚖️|【/.test(msg)) return 'system';
  return 'all';
}

/** 缩短系统消息摘要 */
function shortSummary(msg: string): string {
  return msg
    .replace(/有群友在\s*\[.*?\]\s*搜索需求，当前社区暂无匹配舱位[：:]?\s*/g, '')
    .replace(/【.*?】/g, '')
    .substring(0, 50) || '暂无消息';
}

/** 消息标签颜色 */
function tagBadge(tag: MsgTag, lang: Lang) {
  switch (tag) {
    case 'inquiry': return { bg: 'bg-amber-100 text-amber-700', label: lang === 'en' ? '💰 Lead' : '💰 商机' };
    case 'system': return { bg: 'bg-gray-100 text-gray-500', label: lang === 'en' ? '📢 System' : '📢 系统' };
    default: return null;
  }
}

export function InboxSidebar({
  conversations,
  filteredConversations,
  total,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenChat,
  onDeleteTarget,
  onLoadMore,
  lang,
}: InboxSidebarProps) {
  const [activeTag, setActiveTag] = useState<MsgTag>('all');

  const allData = searchQuery.trim() ? filteredConversations : conversations;

  // 统计
  const unreadCount = allData.filter(c => c.unread_count > 0).length;
  const inquiryCount = allData.filter(c => detectTag(c.last_message) === 'inquiry').length;
  const systemCount = allData.filter(c => detectTag(c.last_message) === 'system').length;

  // 按标签过滤
  let displayList = allData;
  if (activeTag === 'unread') {
    displayList = allData.filter(c => c.unread_count > 0);
  } else if (activeTag === 'inquiry') {
    displayList = allData.filter(c => detectTag(c.last_message) === 'inquiry');
  } else if (activeTag === 'system') {
    displayList = allData.filter(c => detectTag(c.last_message) === 'system');
  }

  const isEmpty = displayList.length === 0;

  const TABS: { key: MsgTag; label: string; count?: number; icon: any }[] = [
    { key: 'all', label: lang === 'en' ? 'All' : '全部', icon: Mail },
    { key: 'unread', label: lang === 'en' ? 'Unread' : '未读', count: unreadCount, icon: Bell },
    { key: 'inquiry', label: lang === 'en' ? 'Leads' : '商机', count: inquiryCount, icon: Target },
    { key: 'system', label: lang === 'en' ? 'System' : '系统', count: systemCount, icon: MessageSquare },
  ];

  return (
    <div style={{height: 'calc(100vh - 260px)', minHeight: 400, display: 'flex', flexDirection: 'column'}}>
      {/* 筛选 Tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-gray-100 rounded-lg" style={{flexShrink: 0}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTag(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-md transition-all ${
              activeTag === tab.key
                ? 'bg-white shadow-sm text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ${
                tab.key === 'unread' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-600'
              }`}>
                {tab.count > 99 ? '99+' : tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 搜索栏 */}
      <div className="relative mb-3" style={{flexShrink: 0}}>
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-10 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 placeholder-gray-400 bg-white"
          placeholder={t(InboxT.searchContact, lang)}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={onClearSearch}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 对话列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{flex: 1, position: 'relative', minHeight: 0}}>
        {/* 空状态 */}
        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="text-center text-gray-400">
            <Mail className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p>{searchQuery ? t(InboxT.noMatch, lang) : (activeTag !== 'all' ? (lang === 'en' ? 'No messages in this category' : '该分类暂无消息') : t(InboxT.noMessages, lang))}</p>
            <p className="text-xs mt-1 text-gray-300">
              {searchQuery ? t(InboxT.searchHint, lang) : t(InboxT.emptyHint, lang)}
            </p>
          </div>
        </div>
        {/* 列表 */}
        <div style={{position: 'absolute', inset: 0, visibility: isEmpty ? 'hidden' : 'visible', overflowY: 'auto'}}>
          {displayList.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            const msgTag = detectTag(conv.last_message);
            const badge = tagBadge(msgTag, lang);
            const summary = shortSummary(conv.last_message);
            return (
              <div
                key={conv.contact_id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors group"
                onClick={() => onOpenChat(conv)}
              >
                {/* 头像 + 角标 */}
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className={`w-full h-full rounded-full flex items-center justify-center font-bold text-sm ${
                    hasUnread ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-700'
                  }`}>
                    {conv.display_name?.charAt(0) || '?'}
                  </div>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                      {conv.company_name || conv.display_name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.bg}`}>
                          {badge.label}
                        </span>
                      )}
                      {conv.last_message_at && (
                        <span className="text-[10px] text-gray-400">
                          {formatTime(conv.last_message_at, 'MM-DD')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${hasUnread ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                      {conv.last_is_outgoing ? <span className="text-gray-300 mr-0.5">{t(InboxT.you, lang)} </span> : null}
                      {summary}
                    </p>
                    {/* 快捷操作 */}
                    <button
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 ml-1"
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
          {/* 加载更多 */}
          {displayList.length < total && (
            <div className="p-3 text-center">
              <button
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
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
