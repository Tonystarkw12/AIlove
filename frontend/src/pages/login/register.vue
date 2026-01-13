<template>
  <view class="register-container">
    <view class="register-card">
      <!-- Logo和标题 -->
      <view class="logo-section">
        <image class="logo" src="/static/logo.png" mode="aspectFit"></image>
        <text class="app-name">AIlove</text>
        <text class="app-slogan">发现真爱，从简单开始</text>
      </view>

      <!-- 注册表单 -->
      <view class="form-section">
        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="person" size="20" color="#999"></uni-icons>
            <input
              class="input-field"
              type="text"
              placeholder="设置昵称"
              v-model="formData.nickname"
              maxlength="20"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="email" size="20" color="#999"></uni-icons>
            <input
              class="input-field"
              type="email"
              placeholder="邮箱地址"
              v-model="formData.email"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="locked" size="20" color="#999"></uni-icons>
            <input
              class="input-field"
              type="password"
              placeholder="设置密码（6-20位）"
              v-model="formData.password"
              maxlength="20"
            />
          </view>
        </view>

        <view class="form-item">
          <view class="input-wrapper">
            <uni-icons type="locked" size="20" color="#999"></uni-icons>
            <input
              class="input-field"
              type="password"
              placeholder="确认密码"
              v-model="formData.confirmPassword"
              maxlength="20"
            />
          </view>
        </view>

        <!-- 注册按钮 -->
        <button
          class="register-btn"
          :class="{ 'btn-loading': isLoading }"
          :disabled="isLoading"
          @tap="handleRegister"
        >
          <text v-if="!isLoading">注册并登录</text>
          <text v-else>注册中...</text>
        </button>

        <!-- 已有账号提示 -->
        <view class="login-tip">
          <text class="tip-text">已有账号？</text>
          <text class="link-text" @tap="goToLogin">立即登录</text>
        </view>
      </view>
    </view>

    <!-- 协议提示 -->
    <view class="agreement-tip">
      <text class="agreement-text">
        注册即表示同意《用户协议》和《隐私政策》
      </text>
    </view>
  </view>
</template>

<script>
import request from '@/utils/request';

export default {
  data() {
    return {
      formData: {
        nickname: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      isLoading: false
    };
  },

  methods: {
    /**
     * 处理注册
     */
    async handleRegister() {
      // 表单验证
      if (!this.validateForm()) {
        return;
      }

      this.isLoading = true;

      try {
        // 调用注册API
        await request({
          url: '/api/auth/register',
          method: 'POST',
          data: {
            nickname: this.formData.nickname.trim(),
            email: this.formData.email.trim(),
            password: this.formData.password
          }
        });

        // 注册成功，自动登录
        uni.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1500
        });

        // 自动登录获取token
        await this.autoLogin();

      } catch (error) {
        console.error('注册失败:', error);

        let errorMsg = '注册失败，请重试';
        if (error.data && error.data.error) {
          errorMsg = error.data.error.message || errorMsg;
        } else if (error.statusCode === 409) {
          errorMsg = '该邮箱已被注册';
        } else if (error.statusCode === 400) {
          errorMsg = '请检查输入信息';
        }

        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });

      } finally {
        this.isLoading = false;
      }
    },

    /**
     * 自动登录
     */
    async autoLogin() {
      try {
        const response = await request({
          url: '/api/auth/login',
          method: 'POST',
          data: {
            email: this.formData.email.trim(),
            password: this.formData.password
          }
        });

        // 存储token
        uni.setStorageSync('token', response.token);

        // 存储用户基本信息
        uni.setStorageSync('userData', {
          userId: response.userId,
          nickname: response.nickname,
          email: this.formData.email.trim()
        });

        // 跳转到首页（使用reLaunch清空页面栈）
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/index/index'
          });
        }, 500);

      } catch (error) {
        console.error('自动登录失败:', error);
        uni.showToast({
          title: '注册成功，请手动登录',
          icon: 'none'
        });
      }
    },

    /**
     * 表单验证
     */
    validateForm() {
      const { nickname, email, password, confirmPassword } = this.formData;

      // 验证昵称
      if (!nickname || nickname.trim().length === 0) {
        uni.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return false;
      }

      if (nickname.trim().length < 2) {
        uni.showToast({
          title: '昵称至少2个字符',
          icon: 'none'
        });
        return false;
      }

      // 验证邮箱
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim())) {
        uni.showToast({
          title: '请输入有效的邮箱地址',
          icon: 'none'
        });
        return false;
      }

      // 验证密码
      if (!password || password.length < 6) {
        uni.showToast({
          title: '密码至少6位',
          icon: 'none'
        });
        return false;
      }

      if (password.length > 20) {
        uni.showToast({
          title: '密码最多20位',
          icon: 'none'
        });
        return false;
      }

      // 验证确认密码
      if (password !== confirmPassword) {
        uni.showToast({
          title: '两次密码不一致',
          icon: 'none'
        });
        return false;
      }

      return true;
    },

    /**
     * 跳转到登录页
     */
    goToLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.register-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.logo-section {
  text-align: center;
  margin-bottom: 60rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}

.app-name {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.app-slogan {
  display: block;
  font-size: 26rpx;
  color: #999;
}

.form-section {
  .form-item {
    margin-bottom: 30rpx;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: #f5f7fa;
    border-radius: 10rpx;
    padding: 20rpx 30rpx;
    border: 2rpx solid transparent;
    transition: all 0.3s;

    &:focus-within {
      border-color: #667eea;
      background: #ffffff;
    }
  }

  .input-field {
    flex: 1;
    margin-left: 20rpx;
    font-size: 28rpx;
    color: #333;
  }
}

.register-btn {
  width: 100%;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10rpx;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin-top: 40rpx;
  transition: all 0.3s;

  &:active {
    opacity: 0.8;
    transform: scale(0.98);
  }

  &.btn-loading {
    opacity: 0.6;
  }
}

.login-tip {
  text-align: center;
  margin-top: 40rpx;

  .tip-text {
    font-size: 26rpx;
    color: #999;
  }

  .link-text {
    font-size: 26rpx;
    color: #667eea;
    margin-left: 10rpx;
  }
}

.agreement-tip {
  text-align: center;
  margin-top: 40rpx;

  .agreement-text {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
