const app = getApp();
Page({
  data: {
    categories: [
      { key: '空运出口', label: '空运', icon: '✈️' },
      { key: '海运出口', label: '海运', icon: '🚢' },
      { key: '快递出口', label: '快递', icon: '📦' },
      { key: '陆运出口', label: '陆运', icon: '🚛' },
      { key: '其他', label: '其他', icon: '📋' },
    ],
    activeCategory: '空运出口',
    keyword: '',
    loading: false,
    results: null,
    searchHistory: [],
    showHistory: false,
  },

  onLoad() {
    this.loadHistory();
    if (!app.globalData.isLoggedIn) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },
  onShow() {
    this.setData({ results: null });
  },
  loadHistory() {
    const h = wx.getStorageSync('search_history') || [];
    this.setData({ searchHistory: h.slice(0, 10) });
  },
  saveHistory(kw) {
    let h = wx.getStorageSync('search_history') || [];
    h = [kw, ...h.filter(k => k !== kw)].slice(0, 10);
    wx.setStorageSync('search_history', h);
    this.loadHistory();
  },

  selectCategory(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.key, results: null });
  },
  onKeywordInput(e) { this.setData({ keyword: e.detail.value }); },
  onFocus() { this.loadHistory(); this.setData({ showHistory: true }); },
  onBlur() { setTimeout(() => this.setData({ showHistory: false }), 300); },
  selectHistory(e) {
    this.setData({ keyword: e.currentTarget.dataset.kw, showHistory: false });
    this.doSearch();
  },
  clearHistory() {
    wx.removeStorageSync('search_history');
    this.setData({ searchHistory: [] });
  },

  async doSearch() {
    const kw = this.data.keyword.trim();
    if (!kw) return;
    this.setData({ loading: true, results: null });
    this.saveHistory(kw);
    try {
      const res = await app.request('GET', '/cargo-spaces/search-by-category', {
        category: this.data.activeCategory,
        keyword: kw,
      });
      const parsed = typeof res === 'string' ? JSON.parse(res) : res;
      this.setData({ results: parsed, loading: false });
    } catch (err) {
      wx.showToast({ title: '查询失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  contactDialog(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '联系发布者',
      content: '是否发送询价消息？',
      success: (res) => {
        if (res.confirm) {
          this.sendInquiry(item);
        }
      }
    });
  },

  async sendInquiry(item) {
    if (!item.contact_info) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    const phoneMatch = item.contact_info.match(/(\d{11})/);
    if (!phoneMatch) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    try {
      const user = await app.request('GET', '/auth/lookup?phone=' + phoneMatch[1]);
      const kw = this.data.keyword;
      await app.request('POST', '/messages', {
        receiver_id: user.id,
        content: '📢 我对您的推广信息感兴趣：' + kw.substring(0, 30) + '...，请回复报价。'
      });
      wx.showToast({ title: '询价已发送，请等待回复', icon: 'success' });
    } catch {
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  }
});
