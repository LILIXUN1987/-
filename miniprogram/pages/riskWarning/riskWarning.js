const app = getApp();
Page({
  data: { alerts: [], loading: true, searchQuery: '' },
  onShow() { this.fetch(); },
  onSearchInput(e) {
    this.setData({ searchQuery: e.detail.value });
    this.filterAlerts();
  },
  async fetch() {
    this.setData({ loading: true });
    try {
      const r = await app.request('GET', '/risk-alerts/approved');
      this.setData({ alerts: r.data || [], loading: false });
    } catch { this.setData({ loading: false }); }
  },
  filterAlerts() {
    const q = this.data.searchQuery.trim().toLowerCase();
    if (!q) { this.setData({ filtered: null }); return; }
    const filtered = this.data.alerts.filter(a => a.target_company.toLowerCase().includes(q));
    this.setData({ filtered });
  }
});
