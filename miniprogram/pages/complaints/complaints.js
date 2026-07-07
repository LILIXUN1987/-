
const app = getApp();
Page({
  data: { complaints: [], loading: true, form: { target_company: '', target_person: '', reason: '' }, submitting: false },
  onShow() { this.fetch(); },
  update(e) { const f = this.data.form; f[e.currentTarget.dataset.field] = e.detail.value; this.setData({ form: f }); },
  async fetch() {
    this.setData({ loading: true });
    try { const r = await app.request('GET', '/complaints'); this.setData({ complaints: r.data || [] }); } catch {}
    this.setData({ loading: false });
  },
  async submit() {
    const f = this.data.form;
    if (!f.target_company || !f.target_person || !f.reason) { wx.showToast({ title: '请填写完整', icon: 'none' }); return; }
    this.setData({ submitting: true });
    try {
      await app.request('POST', '/complaints', { complaint_company: app.globalData.userInfo?.company_name || '', complaint_person: app.globalData.userInfo?.display_name || '', target_company: f.target_company, target_person: f.target_person, reason: f.reason });
      wx.showToast({ title: '吐槽成功', icon: 'success' });
      this.setData({ form: { target_company: '', target_person: '', reason: '' } });
      this.fetch();
    } catch (e) { wx.showToast({ title: e.error || '提交失败', icon: 'none' }); } finally { this.setData({ submitting: false }); }
  }
});
