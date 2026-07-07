import client from './client';

// ── 类型定义 ──

export interface Message {
  id: string;
  content: string;
  attachments?: string | null; // JSON string of file attachments
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender_id?: string;
  sender_name?: string;
  sender_company?: string;
  receiver_id?: string;
  receiver_name?: string;
  receiver_company?: string;
}

/** 解析附件 JSON */
export function parseAttachments(msg: Message): Attachment[] {
  if (!msg.attachments) return [];
  try {
    return JSON.parse(msg.attachments);
  } catch {
    return [];
  }
}

export interface Attachment {
  path: string;
  original_name: string;
  mime_type: string;
  size: number;
}

/** 判断是否为可预览图片 */
export function isImageAttachment(att: Attachment): boolean {
  return att.mime_type.startsWith('image/');
}

/** 获取附件访问 URL */
export function attachmentUrl(att: Attachment): string {
  return '/api/uploads/' + att.path.replace(/^uploads[/\\]/, '');
}

export interface Conversation {
  contact_id: string;
  display_name: string;
  company_name: string | null;
  avatar: string | null;
  last_message: string;
  last_message_at: string | null;
  last_is_outgoing: boolean;
  unread_count: number;
}

export interface ConversationListResponse {
  data: Conversation[];
  total: number;
  page: number;
  limit: number;
}

export interface ConversationMessagesResponse {
  data: Message[];
  hasMore: boolean;
}

export interface InboxResponse {
  data: Message[];
  unread: number;
  total: number;
  page: number;
  limit: number;
}

export interface OutboxResponse {
  data: Message[];
  total: number;
  page: number;
  limit: number;
}

export interface InquiryItem {
  id: string;
  content: string;
  created_at: string;
  receiver_id: string;
  receiver_name: string;
  receiver_company: string;
  inquiry_keyword: string;
  has_reply: boolean;
  reply_count: number;
}

export interface MyInquiriesResponse {
  data: InquiryItem[];
  total: number;
  page: number;
  limit: number;
}

// ── API 方法 ──

export const messagesApi = {
  /** 获取发布者信息 */
  getPosterByRawMessage: (rawMessageId: string) =>
    client.get<{ id: string; display_name: string; company_name: string }>(`/messages/poster/${rawMessageId}`).then(r => r.data),

  /** 发送消息（支持文件附件） */
  send: (receiverId: string, content: string, rawMessageId?: string, files?: File[]) => {
    if (files && files.length > 0) {
      const fd = new FormData();
      fd.append('receiver_id', receiverId);
      fd.append('content', content);
      if (rawMessageId) fd.append('raw_message_id', rawMessageId);
      files.forEach((f) => fd.append('files', f));
      return client.post('/messages', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    }
    return client.post('/messages', { receiver_id: receiverId, content, raw_message_id: rawMessageId }).then(r => r.data);
  },

  /** 对话列表（按联系人分组） */
  conversations: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get<ConversationListResponse>('/messages/conversations', { params }).then(r => r.data),

  /** 与某人的聊天记录（支持关键词搜索） */
  conversationMessages: (contactId: string, params?: { page?: number; limit?: number; before?: string; search?: string }) =>
    client.get<ConversationMessagesResponse>(`/messages/conversations/${contactId}/messages`, { params }).then(r => r.data),

  /** 收件箱 */
  inbox: (params?: { page?: number; limit?: number }) =>
    client.get<InboxResponse>('/messages/inbox', { params }).then(r => r.data),

  /** 已发送 */
  outbox: (params?: { page?: number; limit?: number }) =>
    client.get<OutboxResponse>('/messages/outbox', { params }).then(r => r.data),

  /** 标记已读 */
  markRead: (id: string) =>
    client.put(`/messages/${id}/read`).then(r => r.data),

  /** 标记某联系人全部已读 */
  markAllRead: (userId: string) =>
    client.put(`/messages/read-all/${userId}`).then(r => r.data),

  /** 标记所有已读 */
  markAllInboxRead: () =>
    client.put('/messages/read-all').then(r => r.data),

  /** 删除与某人的所有对话 */
  deleteConversation: (userId: string) =>
    client.delete(`/messages/conversation/${userId}`).then(r => r.data),

  /** 我的询价 */
  myInquiries: (params?: { page?: number; limit?: number }) =>
    client.get<MyInquiriesResponse>('/messages/my-inquiries', { params }).then(r => r.data),
};
