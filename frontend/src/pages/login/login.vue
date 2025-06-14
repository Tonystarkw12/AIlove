<template>
  <view class="mobile-preview">
    <view class="header">
      <image src="/static/logo.png" class="logo-icon" mode="aspectFit"></image>
      <text class="h1-text">欢迎回来</text>
      <text class="p-text">AI月老为您牵线搭桥</text>
    </view>
    <view class="login-form">
      <view class="input-group">
        <text class="label">邮箱</text>
        <input 
          type="email" 
          :value="email" 
          @input="email = $event.detail.value" 
          placeholder="请输入您的邮箱地址" 
          class="input-field-test" 
        />
      </view>
      <view class="input-group">
        <text class="label">密码</text>
        <input 
          type="password" 
          :value="password"
          @input="password = $event.detail.value"
          placeholder="请输入您的密码" 
          class="input-field-test" 
        />
      </view>
      <button class="login-button" @click="handleLogin">登录</button>
      <view class="footer-links">
        <text class="link-text" @click="goToForgotPassword">忘记密码?</text>
        <text class="link-text" @click="goToRegister">注册新账号</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const email = ref(''); // Changed from username
const password = ref('');

const API_BASE_URL = 'http://localhost:3000/api'; // Correct API base URL

const handleLogin = async () => {
  if (!email.value || !password.value) {
    uni.showToast({ title: '请输入邮箱和密码', icon: 'none' });
    return;
  }

  // Basic email format validation (optional, API should handle robustly)
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value)) {
    uni.showToast({ title: '请输入有效的邮箱地址', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '登录中...' });

  try {
    const response = await uni.request({
      url: `${API_BASE_URL}/auth/login`,
      method: 'POST',
      data: {
        email: email.value,
        password: password.value
      },
      header: {
        'Content-Type': 'application/json'
      }
    });

    uni.hideLoading();

    if (response.statusCode === 200) {
      const responseData = response.data;
      uni.setStorageSync('token', responseData.token);
      uni.setStorageSync('userId', responseData.userId);
      uni.setStorageSync('nickname', responseData.nickname);

      uni.showToast({
        title: responseData.message || '登录成功',
        icon: 'success',
        duration: 1500
      });
      uni.reLaunch({
        url: '/pages/index/index'
      });
    } else {
      const errorData = response.data;
      let errorMessage = '登录失败，请稍后再试';
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage = errorData.error.message;
      } else if (response.statusCode === 400) {
        errorMessage = '输入信息不符合要求，请检查';
      } else if (response.statusCode === 401) {
        errorMessage = '邮箱或密码错误';
      }
      uni.showToast({ title: errorMessage, icon: 'none', duration: 2000 });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('Login error:', error);
    uni.showToast({ title: '网络错误或服务器无响应', icon: 'none', duration: 2000 });
  }
};

const goToRegister = () => {
  uni.navigateTo({
    url: '/pages/register/register'
  });
};

const goToForgotPassword = () => {
  uni.showToast({
    title: '“忘记密码”功能暂未开放',
    icon: 'none'
  });
};
</script>

<style scoped lang="scss">
.mobile-preview {
  width: 100%;
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.header {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 80rpx 40rpx 60rpx;
  text-align: center;
  border-bottom-left-radius: 60rpx;
  border-bottom-right-radius: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15rpx;
}

.logo-icon {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 10rpx;
}

.h1-text {
  display: block;
  font-size: 52rpx;
  font-weight: 600;
  margin: 0;
}

.p-text {
  display: block;
  margin: 5rpx 0 0;
  font-size: 28rpx;
  opacity: 0.9;
}

.login-form {
  padding: 60rpx;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  flex-grow: 1;
  justify-content: center;
}

.input-group {
  position: relative;
  width: 100%; /* 确保 input-group 占据宽度 */
}

.label {
  display: block;
  font-size: 28rpx;
  color: #555;
  margin-bottom: 16rpx;
  font-weight: 500;
}

/* 简化后的 input 样式，确保基本可交互性 */
.input-field-test {
  width: 100%; /* 确保宽度 */
  height: 88rpx; /* 给予足够高度 */
  padding: 0 20rpx; /* 左右内边距 */
  border: 1px solid #000000; /* 显式黑色边框 */
  border-radius: 16rpx;
  font-size: 32rpx;
  box-sizing: border-box;
  color: #000000; /* 显式黑色文字 */
  background-color: #ffffff; /* 显式白色背景 */
  // pointer-events: auto !important; /* 强制允许指针事件 */
  // z-index: 10; /* 尝试提高层级 */
}

/* 针对小程序placeholder样式的调整 */
.input-field-test::placeholder, uni-input::placeholder {
  color: #999;
}


.login-button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 28rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 36rpx;
  font-weight: 600;
  cursor: pointer;
  margin-top: 20rpx;
}

.footer-links {
  text-align: center;
  margin-top: 40rpx;
  display: flex;
  justify-content: space-between;
}

.link-text {
  color: #6e8efb;
  font-size: 28rpx;
  margin: 0 20rpx;
  cursor: pointer;
}
</style>
