const app = getApp();
Page({
  data: {
    username: '',
    password: '',
    loading: false,
    error: '',
  },
  onLoad() {
    if (app.globalData.isLoggedIn) {
      wx.reLaunch({ url: '/pages/search/search' });
    }
  },
  onUsernameInput(e) { this.setData({ username: e.detail.value }); },
  onPasswordInput(e) { this.setData({ password: e.detail.value }); },
  async login() {
    const { username, password } = this.data;
    if (!username || !password) {
      this.setData({ error: '请输入用户名和密码' }); return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const res = await app.request('POST', '/auth/login', { username, password });
      app.login(res.token, res.user);
      wx.showToast({ title: '登录成功', icon: 'success' });
      wx.reLaunch({ url: '/pages/search/search' });
    } catch (err) {
      this.setData({ error: err.error || '登录失败' });
    } finally {
      this.setData({ loading: false });
    }
  },
  goRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },
});
