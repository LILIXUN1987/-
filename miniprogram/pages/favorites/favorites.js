const app = getApp();
Page({
  data: { items: [], loading: true },
  onShow() { this.fetch(); },
  async fetch() {
    this.setData({ loading: true });
    try { const r = await app.request('GET', '/favorites/list'); this.setData({ items: r.data || [] }); } catch {}
    this.setData({ loading: false });
  },
  async remove(e) {
    const id = e.currentTarget.dataset.id;
    try { await app.request('POST', '/favorites/toggle', { cargo_id: id }); this.fetch(); } catch {}
  }
});
