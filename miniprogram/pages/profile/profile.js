const app = getApp();
Page({
  data: { user: null },
  onShow() { this.setData({ user: app.globalData.userInfo }); },
  logout() {
    wx.showModal({ title: '确认退出', content: '确定退出登录吗？', success: (r) => { if (r.confirm) app.logout(); } });
  },
  goRisk() { wx.navigateTo({ url: '/pages/riskWarning/riskWarning' }); },
  goComplaints() { wx.navigateTo({ url: '/pages/complaints/complaints' }); },
});
