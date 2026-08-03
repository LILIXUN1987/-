import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUnreadStore } from '../../store/unreadStore';
import { messagesApi, Conversation, Message, InquiryItem } from '../../api/messages.api';
import { FEATURES } from '../../config/features';
import { Mail, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import ReviewDialog from '../../components/common/ReviewDialog';
import { isBusinessRole } from '../../types';
import { InboxT, t, Lang } from '../../i18n';
import { InboxSidebar } from '../../components/admin/inbox/InboxSidebar';
import { ChatView } from '../../components/admin/inbox/ChatView';
import { InquiryTab } from '../../components/admin/inbox/InquiryTab';

/** 判断过期货代/检测认证/运输保险 */
function useIsExpiredForwarder(): boolean {
  const user = useAuthStore((s) => s.user);
  if (!isBusinessRole(user?.role) || !user?.trial_end) return false;
  return new Date(user.trial_end + 'T23:59:59') < new Date();
}

type ActiveTab = 'inbox' | 'inquiries';

export default function InboxPage() {
  const navigate = useNavigate();
  // ── 认证相关 ──
  const user = useAuthStore((s) => s.user);
  const lang: Lang = useAuthStore((s) => s.lang);
  const setGlobalUnread = useUnreadStore((s) => s.setCount);
  const isExpired = useIsExpiredForwarder();
  // 站内信关闭时重定向
  useEffect(() => { if (!FEATURES.INBOX) navigate('/admin/files', { replace: true }); }, [navigate]);

  // ── 选项卡 ──
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');

  // ── 对话列表 ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsTotal, setConversationsTotal] = useState(0);
  const [conversationsPage, setConversationsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // ── 聊天视图 ──
  const [chatWith, setChatWith] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ── 评价对话框 ──
  const [showReview, setShowReview] = useState(false);

  // ── 我的询价 ──
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [inquiriesTotal, setInquiriesTotal] = useState(0);
  const [inquiriesPage, setInquiriesPage] = useState(1);
  const [isLoadingInquiries, setIsLoadingInquiries] = useState(false);

  // ── 删除确认弹窗 ──
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── 加载对话列表 ──
  const fetchConversations = useCallback(async (page: number, _search: string, append = false) => {
    try {
      const result = await messagesApi.conversations({
        page,
        limit: 20,
      });
      if (append) {
        setConversations((prev) => [...prev, ...result.data]);
      } else {
        setConversations(result.data);
        setAllConversations(result.data);
      }
      setConversationsTotal(result.total);
    } catch {
      // ignore
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // 全量对话数据（用于前端过滤搜索）
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);

  // ── 消息分类过滤 ──
  type MsgFilter = 'all' | 'review' | 'express' | 'chat';
  const [msgFilter, setMsgFilter] = useState<MsgFilter>('all');
  const isAdmin = user?.role === 'admin';

  const REVIEW_PATTERNS = ['【企业认证审核】', '⚖️', '【申诉', '风控触发'];
  const EXPRESS_PATTERN = '📦 香港快递出口实时询价';

  // ── 首次加载对话列表（仅一次，不依赖 searchQuery，不跳动） ──
  useEffect(() => {
    fetchConversations(1, '');
  }, []);

  // 纯前端过滤搜索 — 零延迟，不触发任何API，不跳动
  const allData = allConversations.length > 0 ? allConversations : conversations;
  const bySearch = searchQuery.trim()
    ? allData.filter(c =>
        (c.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : allData;

  // 分类过滤
  const filteredConversations = msgFilter === 'all'
    ? bySearch
    : msgFilter === 'review'
      ? bySearch.filter(c => REVIEW_PATTERNS.some(p => (c.last_message || '').includes(p)))
      : msgFilter === 'express'
        ? bySearch.filter(c => (c.last_message || '').includes(EXPRESS_PATTERN))
        : bySearch.filter(c => !REVIEW_PATTERNS.some(p => (c.last_message || '').includes(p)) && !(c.last_message || '').includes(EXPRESS_PATTERN));

  // 审核通知数量
  const reviewCount = allData.filter(c => REVIEW_PATTERNS.some(p => (c.last_message || '').includes(p))).length;
  const expressCount = allData.filter(c => (c.last_message || '').includes(EXPRESS_PATTERN)).length;

  // ── 加载聊天消息（支持搜索） ──
  const fetchMessages = useCallback(async (contactId: string, before?: string, search?: string) => {
    setIsLoadingMessages(true);
    try {
      const result = await messagesApi.conversationMessages(contactId, {
        before,
        limit: 30,
        search,
      });
      if (before) {
        // {t(InboxT.loadOlder, lang)}，追加到前面
        setChatMessages((prev) => [...result.data, ...prev]);
      } else {
        setChatMessages(result.data);
      }
      setHasMoreMessages(result.hasMore);
    } catch {
      // ignore
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // ── 进入聊天 ──
  const openChat = async (conv: Conversation) => {
    setChatWith(conv);
    setChatMessages([]);
    setHasMoreMessages(false);
    await fetchMessages(conv.contact_id);
    // 标记为该联系人已读
    try {
      await messagesApi.markAllRead(conv.contact_id);
      setConversations((prev) =>
        prev.map((c) =>
          c.contact_id === conv.contact_id ? { ...c, unread_count: 0 } : c,
        ),
      );
      // 重新计算全局未读
      refreshUnreadCount();
    } catch {}
  };

  // ── 加载更多历史消息 ──
  const loadOlderMessages = () => {
    if (!chatWith || !hasMoreMessages || isLoadingMessages) return;
    const oldest = chatMessages[0];
    if (oldest) {
      fetchMessages(chatWith.contact_id, oldest.created_at);
    }
  };

  // ── 发送消息（支持附件） ──
  const handleChatSend = useCallback(async (text: string, files: File[]) => {
    if (!chatWith) return;
    try {
      await messagesApi.send(chatWith.contact_id, text, undefined, files.length > 0 ? files : undefined);
      // 延迟刷新聊天记录
      setTimeout(async () => {
        if (chatWith) {
          await fetchMessages(chatWith.contact_id);
          fetchConversations(1, searchQuery);
        }
      }, 500);
    } catch (e: any) {
      alert(e?.response?.data?.error || '发送失败');
      throw e;
    }
  }, [chatWith, fetchMessages, fetchConversations, searchQuery]);

  // ── 删除对话 ──
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await messagesApi.deleteConversation(deleteTarget.contact_id);
      setConversations((prev) => prev.filter((c) => c.contact_id !== deleteTarget.contact_id));
      if (chatWith?.contact_id === deleteTarget.contact_id) {
        setChatWith(null);
      }
      refreshUnreadCount();
    } catch {}
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  // ── 刷新全局未读 ──
  const refreshUnreadCount = async () => {
    try {
      const inbox = await messagesApi.inbox({ page: 1, limit: 1 });
      setGlobalUnread(inbox.unread);
    } catch {}
  };

  // ── 加载询价列表 ──
  useEffect(() => {
    if (activeTab !== 'inquiries') return;
    setIsLoadingInquiries(true);
    messagesApi.myInquiries({ page: inquiriesPage, limit: 20 })
      .then((result) => {
        setInquiries((prev) => inquiriesPage === 1 ? result.data : [...prev, ...result.data]);
        setInquiriesTotal(result.total);
      })
      .catch((err) => { console.warn('[InboxPage] failed to load inquiries:', err); })
      .finally(() => setIsLoadingInquiries(false));
  }, [activeTab, inquiriesPage]);

  // ── 初始加载 + 10秒轮询未读数 ──
  useEffect(() => {
    const refresh = async () => {
      try {
        const inbox = await messagesApi.inbox({ page: 1, limit: 1 });
        setGlobalUnread(inbox.unread);
      } catch {}
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [setGlobalUnread]);

  // 回到对话列表
  const closeChat = () => {
    setChatWith(null);
    setChatMessages([]);
  };

  // 搜索聊天记录回调
  const handleSearchMessages = useCallback((contactId: string, query?: string) => {
    fetchMessages(contactId, undefined, query);
  }, [fetchMessages]);

  // ── 渲染: 全屏加载 ──
  if (isLoadingConversations && conversations.length === 0 && activeTab === 'inbox') {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* ── 页面标题 ── */}
      <div className="flex items-center gap-3 mb-4">
        <Mail className="w-7 h-7 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t(InboxT.title, lang)}</h1>
        </div>
      </div>

      {/* ── 选项卡 ── */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {(['inbox', 'inquiries'] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white shadow-sm text-primary-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => { setActiveTab(tab); setChatWith(null); }}
          >
            {tab === 'inbox' ? t(InboxT.tabInbox, lang) : t(InboxT.tabInquiries, lang)}
          </button>
        ))}
      </div>

      {/* ── 过期货代提示 ── */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center text-sm text-red-800">
          {t(InboxT.expiredWarning, lang)}
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* 收件箱 Tab - 对话列表 */}
      {/* ════════════════════════════════════════════════ */}
      {activeTab === 'inbox' && !chatWith && (
        <>
          {/* ── 消息分类标签（管理员可见） ── */}
          {isAdmin && (
            <div className="flex gap-1 mb-3">
              {[
                { key: 'all', label: lang === 'en' ? 'All' : '全部消息' },
                { key: 'review', label: (lang === 'en' ? '📋 Review' : '📋 审核通知') + (reviewCount > 0 ? ` (${reviewCount})` : '') },
                { key: 'express', label: (lang === 'en' ? '📦 Express' : '📦 快递询价') + (expressCount > 0 ? ` (${expressCount})` : '') },
                { key: 'chat', label: lang === 'en' ? '💬 Chat' : '💬 普通消息' },
              ].map(f => (
                <button key={f.key}
                  onClick={() => setMsgFilter(f.key as MsgFilter)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    msgFilter === f.key
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <InboxSidebar
            conversations={conversations}
            total={conversationsTotal}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            onOpenChat={openChat}
            onDeleteTarget={setDeleteTarget}
            onLoadMore={() => {
              const nextPage = conversationsPage + 1;
              setConversationsPage(nextPage);
              fetchConversations(nextPage, searchQuery, true);
            }}
            lang={lang}
            filteredConversations={filteredConversations}
        />
        </>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* 聊天视图 */}
      {/* ════════════════════════════════════════════════ */}
      {activeTab === 'inbox' && chatWith && (
        <ChatView
          chatWith={chatWith}
          messages={chatMessages}
          hasMore={hasMoreMessages}
          isLoadingMessages={isLoadingMessages}
          isExpired={isExpired}
          lang={lang}
          user={user}
          onClose={closeChat}
          onLoadOlder={loadOlderMessages}
          onSend={handleChatSend}
          onReview={() => setShowReview(true)}
          onDeleteTarget={() => setDeleteTarget(chatWith)}
          onSearchMessages={handleSearchMessages}
        />
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* 我的询价 Tab */}
      {/* ════════════════════════════════════════════════ */}
      {activeTab === 'inquiries' && (
        <InquiryTab
          inquiries={inquiries}
          total={inquiriesTotal}
          page={inquiriesPage}
          isLoading={isLoadingInquiries}
          onPageChange={setInquiriesPage}
          lang={lang}
        />
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* 评价弹窗 */}
      {/* ════════════════════════════════════════════════ */}
      {showReview && chatWith && (
        <ReviewDialog
          userId={chatWith.contact_id}
          userName={chatWith.company_name || chatWith.display_name}
          onClose={() => setShowReview(false)}
          onDone={() => {}}
        />
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* 删除确认弹窗 */}
      {/* ════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { if (!isDeleting) setDeleteTarget(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4 border-t-4 border-red-500"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{t(InboxT.deleteTitle, lang)}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t(InboxT.deleteDesc, lang)}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              {t(InboxT.deleteConfirm(deleteTarget.company_name || deleteTarget.display_name), lang)}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
