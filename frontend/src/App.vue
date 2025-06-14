<script>
export default {
  onLaunch: function() {
    console.log('App Launch');
    // 检查用户登录状态
    const userInfo = uni.getStorageSync('userInfo');
    const currentPage = thisgetCurrentPages();
    const currentRoute = currentPage.length ? currentPage[currentPage.length - 1].route : '';

    console.log('Current route on launch:', currentRoute);

    if (!userInfo || !userInfo.loggedIn) {
      // 如果未登录，并且当前不是登录或注册页，则跳转到登录页
      if (currentRoute !== 'pages/login/login' && currentRoute !== 'pages/register/register') {
        uni.reLaunch({
          url: '/pages/login/login',
          success: () => {
            console.log('Redirected to login page');
          },
          fail: (err) => {
            console.error('Failed to redirect to login page', err);
          }
        });
      }
    } else {
      console.log('User already logged in or on auth pages.');
    }
  },
  onShow: function() {
    console.log('App Show');
    // 可以在这里添加每次显示应用时都需要执行的逻辑
    // 例如，再次检查登录状态，以防在后台被登出
    const userInfo = uni.getStorageSync('userInfo');
    const currentPage = thisgetCurrentPages();
    const currentRoute = currentPage.length ? currentPage[currentPage.length - 1].route : '';

    if (!userInfo || !userInfo.loggedIn) {
      if (currentRoute !== 'pages/login/login' && currentRoute !== 'pages/register/register') {
        // uni.reLaunch({ // 避免在 onShow 中频繁 reLaunch 导致循环
        //   url: '/pages/login/login'
        // });
        console.log('App Show: User not logged in and not on auth pages. Consider redirecting if necessary.');
      }
    }
  },
  onHide: function() {
    console.log('App Hide');
  },
  methods: {
    getCurrentPages() {
      // uniapp 获取当前页面栈的兼容写法
      // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
      return getCurrentPages();
      // #endif
      // #ifdef APP-PLUS || H5
      // eslint-disable-next-line no-undef
      return getApp().$router.getStack(); // 假设使用了 vue-router，H5环境可能需要调整
      // #endif
      // #ifdef MP-KUAISHOU
      // 快手小程序可能需要特定的API
      // #endif
      return [];
    }
  }
}
</script>

<style lang="scss">
/*每个页面公共css */
/* #ifndef APP-NVUE */
// @import '@/static/customicons.css'; // 如果有自定义图标
// 设置整个项目的背景色
page {
  background-color: #f7f8fa; // 与首页背景色统一
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* #endif */

/* 清除默认的button边框，uniapp在微信小程序平台会有默认边框 */
button::after {
  border: none;
}

button {
  margin: 0; /* 清除button在某些平台的默认外边距 */
}

/* 可以添加一些全局通用的样式 */
.container-global {
  padding: 20rpx;
  box-sizing: border-box;
}
</style>
