<script>
export default {
  onLaunch: function() {
    console.log('App Launch - 检查Token');

    // 检查Token（而非userInfo）
    const token = uni.getStorageSync('token');

    // 获取当前页面路由
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage ? currentPage.route : '';

    console.log('当前页面路由:', currentRoute);
    console.log('Token存在:', !!token);

    // 公共路由列表（不需要Token就能访问的页面）
    const publicRoutes = [
      'pages/login/register',  // 注册页
      'pages/login/login'      // 登录页
    ];

    // 如果没有Token，且当前不在公共页面，强制跳转到注册页
    if (!token && !publicRoutes.includes(currentRoute)) {
      console.log('未登录，强制跳转到注册页');

      uni.reLaunch({
        url: '/pages/login/register',
        success: () => {
          console.log('✅ 成功跳转到注册页');
        },
        fail: (err) => {
          console.error('❌ 跳转失败:', err);
        }
      });

      return; // 阻止后续执行
    }

    // 如果有Token，验证Token有效性
    if (token) {
      this.validateToken(token);
    }
  },

  onShow: function() {
    console.log('App Show - 检查Token');

    // 每次显示App时都检查Token（防止Token过期）
    const token = uni.getStorageSync('token');

    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage ? currentPage.route : '';

    const publicRoutes = [
      'pages/login/register',
      'pages/login/login'
    ];

    // 如果没有Token且不在公共页面，强制跳转
    if (!token && !publicRoutes.includes(currentRoute)) {
      console.log('App Show: Token无效，跳转到注册页');

      uni.reLaunch({
        url: '/pages/login/register'
      });

      return;
    }
  },

  onHide: function() {
    console.log('App Hide');
  },

  methods: {
    /**
     * 验证Token有效性
     * 通过调用API验证Token是否有效
     */
    async validateToken(token) {
      try {
        // 调用用户状态API验证Token
        const response = await uni.request({
          url: this.$baseUrl + '/api/users/me/status',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 5000 // 5秒超时
        });

        if (response.statusCode === 200) {
          console.log('✅ Token有效，用户已登录');

          // 存储用户信息
          const userData = response.data;
          uni.setStorageSync('userData', userData);

          return true;
        } else {
          // Token无效或过期，清除本地存储
          console.log('❌ Token无效，清除本地数据');
          this.clearAuthData();

          // 跳转到注册页
          uni.reLaunch({
            url: '/pages/login/register'
          });

          return false;
        }
      } catch (error) {
        console.error('Token验证失败:', error);

        // 如果是网络错误，暂时不跳转（可能是网络问题）
        // 但如果是401/403错误，说明Token确实无效
        if (error.statusCode === 401 || error.statusCode === 403) {
          this.clearAuthData();
          uni.reLaunch({
            url: '/pages/login/register'
          });
        }

        return false;
      }
    },

    /**
     * 清除认证数据
     */
    clearAuthData() {
      uni.removeStorageSync('token');
      uni.removeStorageSync('userData');
      uni.removeStorageSync('userInfo');

      // 清除可能的缓存数据
      try {
        uni.clearStorageSync();
        // 重新存储必要的配置（如果有）
      } catch (e) {
        console.log('清除缓存失败:', e);
      }
    }
  }
}
</script>

<style lang="scss">
/* 全局样式 */
page {
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 清除默认button样式 */
button::after {
  border: none;
}

button {
  margin: 0;
  border: none;
}

/* 全局容器 */
.container-global {
  padding: 20rpx;
  box-sizing: border-box;
}

/* 防止页面滚动回弹（iOS） */
page {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

/* 状态栏安全区域适配 */
.status-bar {
  /* #ifdef APP-PLUS */
  height: var(--status-bar-height);
  /* #endif */
}
</style>
