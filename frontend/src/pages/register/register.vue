<template>
  <view class="mobile-preview">
    <view class="header">
      <image src="/static/logo.png" class="logo-icon" mode="aspectFit"></image>
      <text class="h1-text">创建您的AI月老账户</text>
      <text class="p-text">开启您的缘分之旅</text>
    </view>
    <view class="register-form">
      <view class="input-group">
        <text class="label">昵称</text>
        <input 
          type="text" 
          :value="nickname" 
          @input="nickname = $event.detail.value" 
          placeholder="请输入您的昵称" 
          class="input-field-test" 
        />
      </view>
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
        <text class="label">设置密码</text>
        <input 
          type="password" 
          :value="password"
          @input="password = $event.detail.value"
          placeholder="请输入密码 (至少8位)" 
          class="input-field-test" 
        />
      </view>
      <view class="input-group">
        <text class="label">确认密码</text>
        <input 
          type="password" 
          :value="confirmPassword"
          @input="confirmPassword = $event.detail.value"
          placeholder="请再次输入密码" 
          class="input-field-test" 
        />
      </view>
      <button class="register-button" @click="handleRegister">立即注册</button>
      <view class="terms">
        <text>注册即表示您同意我们的 </text>
        <text class="link-text-inline" @click="viewTerms">服务条款</text>
        <text> 和 </text>
        <text class="link-text-inline" @click="viewPrivacy">隐私政策</text>
        <text>.</text>
      </view>
      <view class="footer-links">
        <text class="link-text" @click="goToLogin">已有账户? 直接登录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';

const nickname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const API_BASE_URL = 'http://localhost:3000/api'; // Correct API base URL

const handleRegister = async () => {
  if (!nickname.value || !email.value || !password.value || !confirmPassword.value) {
    uni.showToast({ title: '请填写所有必填项！', icon: 'none' });
    return;
  }
  if (password.value !== confirmPassword.value) {
    uni.showToast({ title: '两次输入的密码不一致！', icon: 'none' });
    return;
  }
  // Basic client-side validation for password length and email format
  if (password.value.length < 8) { // Assuming API also checks, but good for UX
    uni.showToast({ title: '密码长度至少为8位！', icon: 'none' });
    return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.value)) {
    uni.showToast({ title: '请输入有效的邮箱地址！', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '注册中...' });

  try {
    const response = await uni.request({
      url: `${API_BASE_URL}/auth/register`,
      method: 'POST',
      data: {
        nickname: nickname.value,
        email: email.value,
        password: password.value
      },
      header: {
        'Content-Type': 'application/json'
      }
    });

    uni.hideLoading();

    if (response.statusCode === 201) {
      const responseData = response.data;
      uni.setStorageSync('token', responseData.token);
      uni.setStorageSync('userId', responseData.userId);
      // Storing nickname locally as API returns it upon login, but not register.
      // It's good practice to store what's available for immediate use.
      uni.setStorageSync('nickname', nickname.value); 

      uni.showToast({
        title: responseData.message || '注册成功',
        icon: 'success',
        duration: 1500
      });
      uni.reLaunch({
        url: '/pages/index/index' // Or a profile completion page if that's the flow
      });
    } else {
      const errorData = response.data; 
      let errorMessage = '注册失败，请稍后再试';
      if (errorData && errorData.error && errorData.error.message) {
        errorMessage = errorData.error.message;
      } else if (response.statusCode === 400) {
        errorMessage = '输入信息不符合要求，请检查。';
      } else if (response.statusCode === 409) {
        errorMessage = '邮箱或昵称已被占用。';
      }
      uni.showToast({ title: errorMessage, icon: 'none', duration: 2500 });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('Registration error:', error);
    uni.showToast({ title: '网络错误或服务器无响应', icon: 'none', duration: 2500 });
  }
};

const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  });
};

const viewTerms = () => {
  uni.showToast({ title: '查看服务条款', icon: 'none' });
};

const viewPrivacy = () => {
  uni.showToast({ title: '查看隐私政策', icon: 'none' });
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
  padding: 70rpx 40rpx 50rpx;
  text-align: center;
  border-bottom-left-radius: 60rpx;
  border-bottom-right-radius: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15rpx;
}

.logo-icon {
  width: 110rpx;
  height: 110rpx;
  margin-bottom: 8rpx;
}

.h1-text {
  display: block;
  font-size: 48rpx;
  font-weight: 600;
  margin: 0;
}

.p-text {
  display: block;
  margin: 5rpx 0 0;
  font-size: 28rpx;
  opacity: 0.9;
}

.register-form {
  padding: 50rpx;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  flex-grow: 1;
  justify-content: center;
}

.input-group {
  position: relative;
  width: 100%;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #555;
  margin-bottom: 16rpx;
  font-weight: 500;
}

/* 简化后的 input 样式 */
.input-field-test {
  width: 100%;
  height: 88rpx;
  padding: 0 20rpx;
  border: 1px solid #000000; /* 显式黑色边框 */
  border-radius: 16rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  color: #000000; /* 显式黑色文字 */
  background-color: #ffffff; /* 显式白色背景 */
}

.input-field-test::placeholder, uni-input::placeholder {
  color: #999;
}

.register-button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 28rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 36rpx;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15rpx;
}

.terms {
  font-size: 24rpx;
  color: #777;
  text-align: center;
  margin-top: 30rpx;
  line-height: 1.6;
}

.link-text-inline {
  color: #6e8efb;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}

.footer-links {
  text-align: center;
  margin-top: 30rpx;
}

.link-text {
  color: #6e8efb;
  font-size: 28rpx;
  cursor: pointer;
}
</style>
