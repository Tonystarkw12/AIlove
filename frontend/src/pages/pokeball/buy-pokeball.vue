<template>
  <view class="buy-container" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 页面标题 -->
    <view class="header pokemon-card">
      <text class="page-title">🔮 购买精灵球</text>
      <text class="page-subtitle">1元 = 1个精灵球</text>
      <view class="divider"></view>
    </view>

    <!-- 价格说明 -->
    <view class="price-info pokemon-card">
      <text class="info-title">💰 价格说明</text>
      <view class="price-list">
        <view class="price-item">
          <text class="price-amount">1 元</text>
          <text class="price-pokeball">= 1 个精灵球</text>
        </view>
        <view class="price-item">
          <text class="price-amount">5 元</text>
          <text class="price-pokeball">= 5 个精灵球（推荐）</text>
        </view>
        <view class="price-item">
          <text class="price-amount">10 元</text>
          <text class="price-pokeball">= 10 个精灵球</text>
        </view>
      </view>
    </view>

    <!-- 二维码 -->
    <view class="qrcode-section pokemon-card">
      <text class="qrcode-title">📱 微信扫码支付</text>
      <view class="qrcode-wrapper">
        <image
          class="qrcode-image"
          src="/static/qrcode.jpg"
          mode="aspectFit"
          @error="handleQrcodeError"
        />
      </view>
      <text class="qrcode-hint">请扫描二维码支付，然后点击"我已支付"按钮</text>
    </view>

    <!-- 充值金额选择 -->
    <view class="amount-section">
      <text class="section-title">选择充值金额</text>
      <view class="amount-grid">
        <view
          class="amount-item pokemon-card"
          v-for="option in amountOptions"
          :key="option.value"
          :class="{ selected: selectedAmount === option.value }"
          @tap="selectAmount(option.value)"
        >
          <text class="amount-value">{{ option.value }}元</text>
          <text class="amount-pokeball">{{ option.pokeball }}个</text>
        </view>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="action-buttons">
      <gameboy-button
        text="我已支付"
        sub-text="支付后将自动充值到账户"
        type="primary"
        size="large"
        :loading="isSubmitting"
        @tap="handleSubmitPayment"
      />
      <gameboy-button
        text="返回"
        type="secondary"
        size="medium"
        @tap="goBack"
      />
    </view>

    <!-- 提示信息 -->
    <view class="tips-section pokemon-card">
      <text class="tips-title">💡 温馨提示</text>
      <view class="tips-list">
        <text class="tip-item">• 请确保支付金额与选择金额一致</text>
        <text class="tip-item">• 支付后请及时点击"我已支付"按钮</text>
        <text class="tip-item">• 如有问题请联系客服</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useTheme } from '@/composables/useTheme';
import request from '@/utils/request';

const { isDark } = useTheme();
const selectedAmount = ref(5);
const isSubmitting = ref(false);

const amountOptions = [
  { value: 1, pokeball: 1 },
  { value: 5, pokeball: 5 },
  { value: 10, pokeball: 10 },
  { value: 20, pokeball: 20 },
  { value: 50, pokeball: 50 },
  { value: 100, pokeball: 100 }
];

function selectAmount(amount) {
  selectedAmount.value = amount;
}

async function handleSubmitPayment() {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    // 调用充值API
    await request({
      url: '/api/pokeball/recharge',
      method: 'POST',
      data: {
        amount: selectedAmount.value,
        pokeballCount: amountOptions.find(o => o.value === selectedAmount.value).pokeball
      }
    });

    uni.showModal({
      title: '充值成功',
      content: `已成功充值 ${amountOptions.find(o => o.value === selectedAmount.value).pokeball} 个精灵球！`,
      showCancel: false,
      success: () => {
        uni.navigateBack();
      }
    });

  } catch (error) {
    console.error('充值失败:', error);

    let errorMsg = '充值失败，请重试';
    if (error.data && error.data.error) {
      errorMsg = error.data.error.message || errorMsg;
    }

    uni.showModal({
      title: '充值失败',
      content: errorMsg,
      showCancel: false
    });

  } finally {
    isSubmitting.value = false;
  }
}

function handleQrcodeError() {
  uni.showToast({
    title: '二维码加载失败',
    icon: 'none'
  });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.buy-container {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  padding: 40rpx 30rpx;
  padding-bottom: 100rpx;
}

/* 标题区域 */
.header {
  padding: 40rpx;
  margin-bottom: 30rpx;
  text-align: center;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 12rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.page-subtitle {
  font-size: 28rpx;
  color: var(--color-info);
  font-weight: bold;
  margin-bottom: 20rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.divider {
  width: 100%;
  height: 4px;
  background: var(--color-border);
  border-radius: 2rpx;
}

/* 价格说明 */
.price-info {
  padding: 40rpx;
  margin-bottom: 30rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.info-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 20rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.price-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.price-amount {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-danger);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  min-width: 100rpx;
}

.price-pokeball {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 二维码区域 */
.qrcode-section {
  padding: 40rpx;
  margin-bottom: 30rpx;
  text-align: center;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.qrcode-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 30rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.qrcode-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30rpx;
}

.qrcode-image {
  width: 400rpx;
  height: 400rpx;
  border: 4px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 4px 4px 0px 0px var(--color-shadow-hard);
  background: var(--color-bg-input);
}

.qrcode-hint {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

/* 金额选择 */
.amount-section {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 20rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
  padding: 0 10rpx;
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.amount-item {
  padding: 30rpx 20rpx;
  text-align: center;
  background: var(--color-bg-card);
  border: 3px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 3px 3px 0px 0px var(--color-shadow-hard);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.amount-item:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px 0px var(--color-shadow-hard);
}

.amount-item.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 4px 4px 0px 0px var(--color-shadow-hard);
}

.amount-item.selected .amount-value,
.amount-item.selected .amount-pokeball {
  color: #ffffff;
}

.amount-value {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.amount-pokeball {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 30rpx;
  padding: 0 20rpx;
}

/* 提示信息 */
.tips-section {
  padding: 30rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 3px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 4px 4px 0px 0px var(--color-shadow-hard);
}

.tips-title {
  font-size: 28rpx;
  font-weight: bold;
  color: var(--color-warning);
  margin-bottom: 16rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.tip-item {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  line-height: 1.6;
}
</style>
