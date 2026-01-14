<template>
  <view class="history-container" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 页面标题 -->
    <view class="header pokemon-card">
      <text class="page-title">🔮 精灵球记录</text>
      <view class="divider"></view>
    </view>

    <!-- 当前精灵球数量 -->
    <view class="balance-section">
      <view class="balance-card pokemon-card">
        <text class="balance-label">当前精灵球</text>
        <view class="balance-row">
          <text class="pokeball-icon">🔮</text>
          <text class="balance-amount">{{ pokeballCount }}</text>
        </view>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="records-section">
      <view class="section-title">
        <text class="title-text">📋 充值与消耗记录</text>
      </view>

      <scroll-view class="records-list" scroll-y v-if="records.length > 0">
        <view
          class="record-item pokemon-card"
          v-for="record in records"
          :key="record.id"
        >
          <view class="record-icon">
            <text>{{ record.type === 'recharge' ? '💰' : '💫' }}</text>
          </view>

          <view class="record-info">
            <text class="record-title">{{ record.description }}</text>
            <text class="record-time">{{ formatDateTime(record.createdAt) }}</text>
          </view>

          <view class="record-amount" :class="record.type">
            <text>{{ record.type === 'recharge' ? '+' : '-' }}{{ record.amount }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="records.length === 0">
      <text class="empty-icon">🔮</text>
      <text class="empty-text">还没有记录</text>
    </view>

    <!-- 底部按钮 -->
    <view class="action-buttons">
      <gameboy-button
        text="购买精灵球"
        type="primary"
        size="medium"
        @tap="goToBuy"
      />
      <gameboy-button
        text="返回"
        type="secondary"
        size="medium"
        @tap="goBack"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';
import request from '@/utils/request';

const { isDark } = useTheme();
const pokeballCount = ref(2); // 初始2个精灵球
const records = ref([]);

onMounted(() => {
  loadPokeballData();
});

async function loadPokeballData() {
  try {
    // 加载精灵球数量
    const statusData = await request({
      url: '/api/users/me/status',
      method: 'GET'
    });
    pokeballCount.value = statusData.pokeballCount || 2;

    // 加载记录
    const recordsData = await request({
      url: '/api/pokeball/history',
      method: 'GET'
    });
    records.value = recordsData.records || [];
  } catch (error) {
    console.error('加载精灵球数据失败:', error);

    // 临时模拟数据（API开发完成后删除）
    pokeballCount.value = 2;
    records.value = [
      {
        id: 1,
        type: 'recharge',
        amount: 5,
        description: '微信充值',
        createdAt: new Date('2026-01-13 10:30:00').toISOString()
      },
      {
        id: 2,
        type: 'consume',
        amount: 1,
        description: '匹配消耗',
        createdAt: new Date('2026-01-13 11:00:00').toISOString()
      },
      {
        id: 3,
        type: 'recharge',
        amount: 2,
        description: '初始赠送',
        createdAt: new Date('2026-01-12 09:00:00').toISOString()
      }
    ];
  }
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function goToBuy() {
  uni.navigateTo({
    url: '/pages/pokeball/buy-pokeball'
  });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.history-container {
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

/* 余额区域 */
.balance-section {
  margin-bottom: 30rpx;
}

.balance-card {
  padding: 50rpx 40rpx;
  text-align: center;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.balance-label {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  margin-bottom: 20rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
}

.balance-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.pokeball-icon {
  font-size: 64rpx;
}

.balance-amount {
  font-size: 72rpx;
  font-weight: bold;
  color: var(--color-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 记录区域 */
.records-section {
  margin-bottom: 40rpx;
}

.section-title {
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.title-text {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.records-list {
  max-height: 800rpx;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 3px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 0 4px 20px var(--color-shadow);
}

.record-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
  width: 60rpx;
  text-align: center;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-title {
  font-size: 30rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.record-time {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.record-amount {
  font-size: 36rpx;
  font-weight: bold;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  min-width: 100rpx;
  text-align: center;
}

.record-amount.recharge {
  color: var(--color-success);
  background: rgba(155, 188, 15, 0.1);
}

.record-amount.consume {
  color: var(--color-danger);
  background: rgba(255, 107, 107, 0.1);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
  text-align: center;
  margin-bottom: 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 32rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 底部按钮 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 0 20rpx;
}
</style>
