const app = getApp();
Page({
  data: {
    form: { username: '', password: '', display_name: '', company_name: '', phone: '', email: '', emailCode: '', role: 'trader' },
    codeSending: false, codeSent: false, loading: false, error: ''
  },
  update(e) { const f = this.data.form; f[e.currentTarget.dataset.field] = e.detail.value; this.setData({ form: f }); },
  selectRole(e) { const f = this.data.form; f.role = e.currentTarget.dataset.role; this.setData({ form: f }); },
  async sendCode() {
    if (!this.data.form.email) { this.setData({ error: '请先填写邮箱' }); return; }
    this.setData({ codeSending: true, error: '' });
    try {
      await app.request('POST', '/auth/send-code', { email: this.data.form.email });
      this.setData({ codeSent: true, codeSending: false });
      wx.showToast({ title: '验证码已发送', icon: 'success' });
    } catch (e) {
      this.setData({ error: e.error || '发送失败', codeSending: false });
    }
  },
  async submit() {
    const f = this.data.form;
    this.setData({ error: '' });
    if (!f.username || !f.password || !f.display_name || !f.company_name) {
      this.setData({ error: '请填写所有必填项' }); return;
    }
    if (!f.email || !f.emailCode) { this.setData({ error: '请先验证邮箱' }); return; }
    this.setData({ loading: true });
    try {
      await app.request('POST', '/register', {
        username: f.username, password: f.password, display_name: f.display_name,
        company_name: f.company_name, email: f.email, email_code: f.emailCode,
        phone: f.phone, role: f.role
      });
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 1500);
    } catch (e) {
      this.setData({ error: e.error || '注册失败' });
    } finally { this.setData({ loading: false }); }
  }
});
