const app = getApp();
Page({
  data: {
    tab: 'inbox',
    messages: [],
    unread: 0,
    inquiries: [],
    sentMessages: [],
    loading: true,
    replyTarget: null,
    replyText: '',
  },

  onShow() {
    if (!app.globalData.isLoggedIn) { wx.reLaunch({ url: '/pages/login/login' }); return; }
    this.fetchInbox();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    if (tab === 'inbox') this.fetchInbox();
    else if (tab === 'inquiries') this.fetchInquiries();
    else if (tab === 'sent') this.fetchSent();
  },

  async fetchInbox() {
    this.setData({ loading: true });
    try {
      const res = await app.request('GET', '/messages/inbox');
      this.setData({ messages: res.data || [], unread: res.unread || 0, loading: false });
    } catch { this.setData({ loading: false }); }
  },

  async fetchInquiries() {
    this.setData({ loading: true });
    try {
      const res = await app.request('GET', '/messages/my-inquiries');
      this.setData({ inquiries: res.data || [], loading: false });
    } catch { this.setData({ loading: false }); }
  },

  async fetchSent() {
    this.setData({ loading: true });
    try {
      const res = await app.request('GET', '/messages/outbox');
      this.setData({ sentMessages: res.data || [], loading: false });
    } catch { this.setData({ loading: false }); }
  },

  async markRead(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await app.request('PUT', '/messages/' + id + '/read');
      this.fetchInbox();
    } catch {}
  },

  showReply(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({ replyTarget: { id, name }, replyText: '' });
  },
  onReplyInput(e) { this.setData({ replyText: e.detail.value }); },

  async sendReply() {
    if (!this.data.replyText.trim()) return;
    try {
      await app.request('POST', '/messages', {
        receiver_id: this.data.replyTarget.id,
        content: this.data.replyText.trim(),
      });
      wx.showToast({ title: '已发送', icon: 'success' });
      this.setData({ replyTarget: null, replyText: '' });
      this.fetchInbox();
    } catch { wx.showToast({ title: '发送失败', icon: 'none' }); }
  },

  closeReply() { this.setData({ replyTarget: null }); },
});
