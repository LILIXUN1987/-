const app = getApp();
Page({
  data: { results: null, keyword: '', category: '', loading: true },
  onLoad(options) {
    this.setData({ keyword: options.keyword || '', category: options.category || '空运出口' });
    this.doSearch();
  },
  async doSearch() {
    this.setData({ loading: true });
    try {
      const r = await app.request('GET', '/cargo-spaces/search-by-category', { category: this.data.category, keyword: this.data.keyword });
      this.setData({ results: r, loading: false });
    } catch { this.setData({ loading: false }); }
  }
});
