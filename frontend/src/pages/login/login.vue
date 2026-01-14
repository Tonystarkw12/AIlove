<template>
  <view class="login-container">
    <!-- GameBoy 风格登录卡片 -->
    <view class="login-card pokemon-card">
      <!-- Logo和标题 -->
      <view class="logo-section">
        <text class="pokemon-icon">🎮</text>
        <text class="app-name">AIlove</text>
        <text class="app-slogan">欢迎来到AIlove，快使用精灵球捕获你心仪的对象吧！！</text>
        <view class="divider"></view>
      </view>

      <!-- 登录表单 -->
      <view class="form-section">
        <view class="form-item">
          <text class="form-label">邮箱</text>
          <input
            class="input-field gameboy-border"
            type="text"
            placeholder="请输入邮箱"
            v-model="email"
          />
        </view>

        <view class="form-item">
          <text class="form-label">密码</text>
          <input
            class="input-field gameboy-border"
            type="password"
            placeholder="请输入密码"
            v-model="password"
          />
        </view>

        <!-- 登录按钮 -->
        <gameboy-button
          text="登录"
          sub-text="继续你的冒险"
          type="primary"
          size="large"
          :loading="isLoading"
          :disabled="isLoading"
          @tap="handleLogin"
        />

        <!-- 分割线 -->
        <view class="divider-section">
          <view class="divider-line"></view>
          <text class="divider-text">或</text>
          <view class="divider-line"></view>
        </view>

        <!-- 微信一键登录 -->
        <!-- #ifdef MP-WEIXIN -->
        <button
          class="wechat-login-btn"
          open-type="getUserInfo"
          @getuserinfo="handleWechatLogin"
          :loading="isWechatLoading"
        >
          <text class="wechat-icon">💚</text>
          <text class="wechat-text">微信一键登录</text>
        </button>
        <!-- #endif -->

        <!-- 底部链接 -->
        <view class="footer-links">
          <text class="link-text" @tap="goToRegister">注册新账号</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import request from '@/utils/request';

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const isWechatLoading = ref(false);

// 微信一键登录
async function handleWechatLogin(e) {
  // 如果用户拒绝授权
  if (!e.detail.userInfo) {
    uni.showToast({
      title: '需要授权才能登录',
      icon: 'none'
    });
    return;
  }

  isWechatLoading.value = true;

  try {
    // 1. 获取微信登录code
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      });
    });

    if (!loginRes.code) {
      throw new Error('获取微信登录code失败');
    }

    // 2. 调用后端微信登录API
    const response = await request({
      url: '/api/auth/wechat-login',
      method: 'POST',
      data: {
        code: loginRes.code,
        userInfo: e.detail.userInfo,
        encryptedData: e.detail.encryptedData,
        iv: e.detail.iv
      }
    });

    // 3. 保存token和用户信息
    uni.setStorageSync('token', response.token);
    uni.setStorageSync('userData', response.user);

    // 4. 播放背景音乐
    playBackgroundMusic();

    uni.showToast({
      title: '登录成功！',
      icon: 'success',
      duration: 2000
    });

    // 5. 跳转到首页
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      });
    }, 2000);

  } catch (error) {
    console.error('微信登录失败:', error);

    let errorMsg = '微信登录失败';
    if (error.data && error.data.error) {
      errorMsg = error.data.error.message || errorMsg;
    } else if (error.message) {
      errorMsg = error.message;
    }

    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
    });

  } finally {
    isWechatLoading.value = false;
  }
}

async function handleLogin() {
  if (!email.value.trim() || !password.value.trim()) {
    uni.showToast({
      title: '请输入邮箱和密码',
      icon: 'none'
    });
    return;
  }

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailReg.test(email.value)) {
    uni.showToast({
      title: '请输入正确的邮箱格式',
      icon: 'none'
    });
    return;
  }

  isLoading.value = true;

  try {
    const response = await request({
      url: '/api/auth/login',
      method: 'POST',
      data: {
        email: email.value,
        password: password.value
      }
    });

    // 保存 token
    uni.setStorageSync('token', response.token);

    // 保存用户信息
    uni.setStorageSync('userData', response.user);

    // 播放背景音乐
    playBackgroundMusic();

    uni.showToast({
      title: '登录成功！',
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转到首页
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index'
      });
    }, 2000);

  } catch (error) {
    console.error('登录失败:', error);

    let errorMsg = '登录失败，请重试';
    if (error.data && error.data.error) {
      errorMsg = error.data.error.message || errorMsg;
    } else if (error.message) {
      errorMsg = error.message;
    }

    uni.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 3000
    });

  } finally {
    isLoading.value = false;
  }
}

function goToRegister() {
  uni.navigateTo({
    url: '/pages/login/register'
  });
}

function playBackgroundMusic() {
  try {
    // 检查是否已经播放过
    const hasPlayed = uni.getStorageSync('backgroundMusicPlayed');
    if (hasPlayed) {
      return;
    }

    // 使用 uni.createInnerAudioContext 创建音频对象
    const audio = uni.createInnerAudioContext();
    audio.src = '/static/baokemeng.mp3';
    audio.loop = true;
    audio.autoplay = true;

    audio.onCanplay(() => {
      console.log('背景音乐开始播放');
    });

    audio.onError((err) => {
      console.error('背景音乐播放失败:', err);
    });

    // 标记已播放
    uni.setStorageSync('backgroundMusicPlayed', true);

    // 将音频对象保存到全局，方便后续控制
    getApp().globalData.backgroundMusic = audio;

  } catch (error) {
    console.error('播放背景音乐出错:', error);
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #9BBC0F 0%, #8BAC0F 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
  padding-bottom: 80rpx;
}

.login-card {
  width: 100%;
  max-width: 600rpx;
  padding: 60rpx 50rpx;
  background: rgba(255, 255, 255, 0.98);
  border: 4px solid #000000;
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px #000000;
  position: relative;
  z-index: 10;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50rpx;
  text-align: center;
}

.pokemon-icon {
  font-size: 100rpx;
  margin-bottom: 20rpx;
  animation: bounce-subtle 2s infinite;
}

@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20rpx);
  }
}

.app-name {
  font-size: 56rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 12rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  letter-spacing: 2rpx;
}

.app-slogan {
  font-size: 24rpx;
  color: #666666;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  text-align: center;
  line-height: 1.6;
  padding: 0 20rpx;
  font-weight: 600;
}

.divider {
  width: 100%;
  height: 4px;
  background: #000000;
  margin-top: 30rpx;
  border-radius: 2rpx;
}

/* 表单区域 */
.form-section {
  width: 100%;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 12rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.input-field {
  width: 100%;
  padding: 24rpx 20rpx;
  font-size: 28rpx;
  background: #ffffff;
  border-radius: 12rpx;
  box-sizing: border-box;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  position: relative;
  z-index: 100;
  pointer-events: auto;
}

.input-field::placeholder {
  color: #999999;
}

/* GameBoy 边框样式 */
.gameboy-border {
  border: 3px solid #000000 !important;
  box-shadow: 3px 3px 0px 0px #000000;
}

/* 确保输入框可点击 */
.form-item {
  position: relative;
  z-index: 50;
}

/* 分割线 */
.divider-section {
  display: flex;
  align-items: center;
  margin: 40rpx 0;
}

.divider-line {
  flex: 1;
  height: 2px;
  background: #000000;
}

.divider-text {
  padding: 0 20rpx;
  font-size: 24rpx;
  color: #666666;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 微信登录按钮 */
.wechat-login-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 20rpx;
  background: #07C160;
  border: 3px solid #000000;
  border-radius: 12rpx;
  box-shadow: 3px 3px 0px 0px #000000;
  font-size: 28rpx;
  color: #ffffff;
  font-weight: bold;
  margin-top: 20rpx;
  position: relative;
  z-index: 50;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.wechat-login-btn::after {
  border: none;
}

.wechat-login-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px #000000;
}

.wechat-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.wechat-text {
  color: #ffffff;
}

/* 底部链接 */
.footer-links {
  margin-top: 40rpx;
  text-align: center;
  font-size: 26rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.link-text {
  color: #3B4CCA;
  font-weight: bold;
  text-decoration: underline;
}
</style>
