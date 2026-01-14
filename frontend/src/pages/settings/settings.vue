<template>
  <view class="settings-container" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 设置页面卡片 -->
    <view class="settings-card pokemon-card">
      <!-- 标题 -->
      <view class="header">
        <text class="page-title">⚙️ 设置</text>
        <view class="divider"></view>
      </view>

      <!-- 主题切换 -->
      <view class="setting-item">
        <view class="setting-info">
          <text class="setting-icon">🌓</text>
          <view class="setting-text">
            <text class="setting-label">明暗主题</text>
            <text class="setting-desc">{{ isDark ? '暗色模式' : '亮色模式' }}</text>
          </view>
        </view>
        <view class="theme-toggle-btn" @tap="toggleTheme">
          <text class="theme-icon theme-icon-light">☀️</text>
          <text class="theme-icon theme-icon-dark">🌙</text>
        </view>
      </view>

      <!-- 其他设置项（占位） -->
      <view class="setting-item">
        <view class="setting-info">
          <text class="setting-icon">🔔</text>
          <view class="setting-text">
            <text class="setting-label">消息通知</text>
            <text class="setting-desc">管理推送通知设置</text>
          </view>
        </view>
        <text class="setting-arrow">→</text>
      </view>

      <view class="setting-item">
        <view class="setting-info">
          <text class="setting-icon">🔒</text>
          <view class="setting-text">
            <text class="setting-label">隐私设置</text>
            <text class="setting-desc">管理个人隐私选项</text>
          </view>
        </view>
        <text class="setting-arrow">→</text>
      </view>

      <view class="setting-item">
        <view class="setting-info">
          <text class="setting-icon">📱</text>
          <view class="setting-text">
            <text class="setting-label">关于我们</text>
            <text class="setting-desc">版本信息和使用条款</text>
          </view>
        </view>
        <text class="setting-arrow">→</text>
      </view>

      <!-- 返回按钮 -->
      <view class="back-section">
        <gameboy-button
          text="返回"
          type="secondary"
          size="medium"
          @tap="goBack"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { isDark, toggleTheme } = useTheme();

onMounted(() => {
  // 应用当前主题到页面
  applyTheme();
});

function applyTheme() {
  const theme = isDark.value ? 'dark' : 'light';
  // 页面会自动通过 :data-theme 绑定更新
}

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  padding: 40rpx 30rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.settings-card {
  width: 100%;
  max-width: 600rpx;
  margin: 0 auto;
  padding: 60rpx 40rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

/* 标题区域 */
.header {
  margin-bottom: 50rpx;
  text-align: center;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
  margin-bottom: 20rpx;
}

.divider {
  width: 100%;
  height: 4px;
  background: var(--color-border);
  border-radius: 2rpx;
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  background: var(--color-bg-input);
  border: 3px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 3px 3px 0px 0px var(--color-shadow-hard);
}

.setting-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.setting-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
  width: 60rpx;
  text-align: center;
}

.setting-text {
  display: flex;
  flex-direction: column;
}

.setting-label {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.setting-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.setting-arrow {
  font-size: 36rpx;
  color: var(--color-text-secondary);
  font-weight: bold;
}

/* 主题切换按钮 */
.theme-toggle-btn {
  position: relative;
  width: 120rpx;
  height: 60rpx;
  background: var(--color-bg-card);
  border: 3px solid var(--color-border);
  border-radius: 30rpx;
  box-shadow: 3px 3px 0px 0px var(--color-shadow-hard);
  display: flex;
  align-items: center;
  padding: 4rpx;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.theme-toggle-btn::before {
  content: '';
  position: absolute;
  width: 48rpx;
  height: 48rpx;
  background: var(--color-primary);
  border-radius: 50%;
  left: 4rpx;
  transition: all 0.3s ease;
  box-shadow: 2px 2px 0px 0px var(--color-shadow-hard);
}

[data-theme="dark"] .theme-toggle-btn::before {
  left: calc(100% - 52rpx);
  background: var(--color-info);
}

.theme-icon {
  width: 40rpx;
  height: 40rpx;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  z-index: 1;
}

.theme-icon-light {
  left: 8rpx;
}

.theme-icon-dark {
  right: 8rpx;
}

/* 返回按钮区域 */
.back-section {
  margin-top: 50rpx;
  display: flex;
  justify-content: center;
}
</style>
