App({
  globalData: {
    userInfo: null,
    token: '',
    baseUrl: 'http://192.168.1.11:3001/api',
    isLoggedIn: false,
  },

  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.isLoggedIn = true;
      this.checkAuth();
    }
  },

  checkAuth() {
    const token = this.globalData.token;
    if (!token) return;
    wx.request({
      url: this.globalData.baseUrl + '/auth/me',
      header: { 'Authorization': 'Bearer ' + token },
      success: (res) => {
        if (res.statusCode === 200) {
          this.globalData.userInfo = res.data;
          this.globalData.isLoggedIn = true;
        } else {
          this.logout();
        }
      },
      fail: () => {}
    });
  },

  login(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('token', token);
  },

  logout() {
    this.globalData.token = '';
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('token');
    wx.reLaunch({ url: '/pages/login/login' });
  },

  request(method, path, data) {
    const token = this.globalData.token;
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + path,
        method: method || 'GET',
        data: data,
        header: {
          'Content-Type': 'application/json',
          'Authorization': token ? 'Bearer ' + token : ''
        },
        success: (res) => {
          if (res.statusCode === 401) {
            this.logout();
            reject(res.data);
          } else if (res.statusCode >= 400) {
            reject(res.data);
          } else {
            resolve(res.data);
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络错误', icon: 'none' });
          reject(err);
        }
      });
    });
  },

  upload(path, filePath, formData) {
    const token = this.globalData.token;
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: this.globalData.baseUrl + path,
        filePath: filePath,
        name: 'file',
        formData: formData || {},
        header: {
          'Authorization': token ? 'Bearer ' + token : ''
        },
        success: (res) => {
          try {
            resolve(JSON.parse(res.data));
          } catch { reject(res.data); }
        },
        fail: reject
      });
    });
  }
});
