import { Search, X, Mail, Trash2 } from 'lucide-react';
import { formatTime } from '../../../utils/time';
import { Conversation } from '../../../api/messages.api';
import { InboxT, t, Lang } from '../../../i18n';

interface InboxSidebarProps {
  conversations: Conversation[];
  total: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onOpenChat: (conv: Conversation) => void;
  onDeleteTarget: (conv: Conversation) => void;
  onLoadMore: () => void;
  lang: Lang;
}

export function InboxSidebar({
  conversations,
  total,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onOpenChat,
  onDeleteTarget,
  onLoadMore,
  lang,
}: InboxSidebarProps) {
  return (
    <div>
      {/* 搜索栏 */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-10 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 placeholder-gray-400 bg-white transition-all"
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Mail className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p>{searchQuery ? '未找到匹配的联系人' : '暂无消息'}</p>
            <p className="text-xs mt-1 text-gray-300">
              {searchQuery ? '请尝试其他关键词' : '当有人给您发送消息时，将在这里显示'}
            </p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => {
              const hasUnread = conv.unread_count > 0;
              return (
                <div
                  key={conv.contact_id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onOpenChat(conv)}
                >
                  {/* 头像 */}
                  <div className="relative w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold text-sm">
                      {conv.display_name?.charAt(0) || '?'}
                    </span>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${hasUnread ? 'font-bold' : 'font-semibold'} text-gray-800 truncate`}>
                        {conv.company_name || conv.display_name}
                      </span>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                          {formatTime(conv.last_message_at, 'MM-DD')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {conv.last_is_outgoing ? t(InboxT.you, lang) : ''}{conv.last_message?.substring(0, 40) || '暂无消息'}
                      </p>
                      <button
                        className="p-1 text-gray-200 hover:text-red-500 flex-shrink-0 ml-1 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDeleteTarget(conv); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 加载更多对话 */}
            {conversations.length < total && (
              <button
                className="w-full py-3 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-b-xl transition-colors"
                onClick={onLoadMore}
              >
                {t(InboxT.loadMore(total - conversations.length), lang)}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
