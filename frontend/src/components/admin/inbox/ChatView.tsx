import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Search, X, Star, Trash2, Loader2,
  Paperclip, Image, FileText, Send,
} from 'lucide-react';
import { formatTime } from '../../../utils/time';
import {
  Conversation, Message,
  parseAttachments, isImageAttachment, attachmentUrl,
} from '../../../api/messages.api';
import { InboxT, t, Lang } from '../../../i18n';

interface ChatViewProps {
  chatWith: Conversation;
  messages: Message[];
  hasMore: boolean;
  isLoadingMessages: boolean;
  isExpired: boolean;
  lang: Lang;
  user: { id: string } | null;
  onClose: () => void;
  onLoadOlder: () => void;
  onSend: (text: string, files: File[]) => Promise<void>;
  onReview: () => void;
  onDeleteTarget: () => void;
  onSearchMessages: (contactId: string, query?: string) => void;
}

export function ChatView({
  chatWith,
  messages,
  hasMore,
  isLoadingMessages,
  isExpired,
  lang,
  user,
  onClose,
  onLoadOlder,
  onSend,
  onReview,
  onDeleteTarget,
  onSearchMessages,
}: ChatViewProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages.length, chatWith.contact_id]);

  const handleSend = async () => {
    if ((!inputText.trim() && selectedFiles.length === 0) || sending) return;
    setSending(true);
    try {
      await onSend(inputText.trim(), selectedFiles);
      setInputText('');
      setSelectedFiles([]);
    } catch {
      // error handled by parent (alert)
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col" style={{ minHeight: '70vh' }}>
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <button
          className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={onClose}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-primary-700 font-bold text-sm">
            {chatWith.display_name?.charAt(0) || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm">
            {chatWith.company_name || chatWith.display_name}
          </div>
          <div className="text-[10px] text-gray-400">
            {chatWith.display_name} · {t(InboxT.msgCount(messages.length), lang)}
          </div>
        </div>
        {/* 搜索聊天记录 */}
        <button
          className={`p-1.5 rounded-lg transition-colors ${chatSearchOpen ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          onClick={() => {
            setChatSearchOpen(!chatSearchOpen);
            if (chatSearchOpen) {
              setChatSearchQuery('');
              onSearchMessages(chatWith.contact_id);
            }
          }}
          title={t(InboxT.searchChat, lang)}
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 text-amber-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
          onClick={onReview}
          title={t(InboxT.rateUser, lang)}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          onClick={onDeleteTarget}
          title={t(InboxT.deleteChat, lang)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 搜索输入框 */}
      {chatSearchOpen && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder={t(InboxT.chatSearchPlaceholder, lang)}
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearchMessages(chatWith.contact_id, chatSearchQuery.trim() || undefined);
                }
              }}
              autoFocus
            />
            {chatSearchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setChatSearchQuery('');
                  onSearchMessages(chatWith.contact_id);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 消息区 */}
      <div
        ref={chatRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ minHeight: '350px', maxHeight: '500px', background: '#f8f9fa' }}
      >
        {/* 加载更多 */}
        {hasMore && (
          <div className="text-center py-2">
            <button
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              onClick={onLoadOlder}
              disabled={isLoadingMessages}
            >
              {isLoadingMessages ? (
                <span className="flex items-center gap-1 justify-center">
                  <Loader2 className="w-3 h-3 animate-spin" /> 加载中...
                </span>
              ) : (
                '加载更早的消息'
              )}
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">{t(InboxT.noChatMessages, lang)}</div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  {/* 时间 */}
                  <div className={`flex items-center gap-1 mb-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-400">
                      {formatTime(msg.created_at, 'MM-DD HH:mm')}
                    </span>
                    {isOutgoing && msg.read_at && (
                      <span className="text-[10px] text-green-500 font-medium">{t(InboxT.readAt(formatTime(msg.read_at, 'MM-DD HH:mm')), lang)}</span>
                    )}
                    {isOutgoing && !msg.read_at && (
                      <span className="text-[10px] text-gray-300">{t(InboxT.sent, lang)}</span>
                    )}
                  </div>
                  {/* 气泡 */}
                  <div
                    className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isOutgoing
                        ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
                    }`}
                  >
                    {msg.content && msg.content !== '' && <p className="mb-1">{msg.content}</p>}
                    {/* 附件展示 */}
                    {parseAttachments(msg).length > 0 && (
                      <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
                        {parseAttachments(msg).map((att, i) => (
                          isImageAttachment(att) ? (
                            <a key={i} href={attachmentUrl(att)} target="_blank" rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                              <img src={attachmentUrl(att)} alt={att.original_name}
                                className="max-w-[200px] max-h-[200px] object-cover" loading="lazy" />
                            </a>
                          ) : (
                            <a key={i} href={attachmentUrl(att)} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
                              <FileText className="w-3.5 h-3.5" />
                              {att.original_name}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部输入 */}
      <div className="border-t border-gray-200 p-3 bg-white rounded-b-xl">
        {/* 已选文件预览 */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-600">
                {f.type.startsWith('image/') ? (
                  <Image className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button
                  className="text-gray-400 hover:text-red-500 ml-0.5"
                  onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button
            className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title={t(InboxT.addAttachment, lang)}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
              e.target.value = '';
            }}
          />
          <textarea
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 min-h-[44px] max-h-[120px]"
            rows={1}
            placeholder={t(InboxT.inputPlaceholder, lang)}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || isExpired}
          />
          <button
            className="btn-primary px-4 py-2.5 rounded-xl flex items-center gap-1"
            onClick={handleSend}
            disabled={sending || (!inputText.trim() && selectedFiles.length === 0) || isExpired}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
