const app = getApp();
Page({
  onLoad() {
    if (app.globalData.isLoggedIn) wx.reLaunch({ url: '/pages/search/search' });
  },
  goLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
  goRegister() { wx.navigateTo({ url: '/pages/register/register' }); },
});
