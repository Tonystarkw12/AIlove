<template>
  <view class="pokemon-container" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 页面标题 -->
    <view class="header pokemon-card">
      <text class="page-title">🎮 我的宝可梦</text>
      <text class="page-subtitle">与你配对过的训练师们</text>
      <view class="divider"></view>
    </view>

    <!-- 统计信息 -->
    <view class="stats-section">
      <view class="stat-card pokemon-card">
        <text class="stat-number">{{ matchedUsers.length }}</text>
        <text class="stat-label">配对总数</text>
      </view>
    </view>

    <!-- 配对记录列表 -->
    <view class="pokemon-list" v-if="matchedUsers.length > 0">
      <view
        class="pokemon-card-item pokemon-card"
        v-for="user in matchedUsers"
        :key="user.id"
        @tap="viewProfile(user)"
      >
        <view class="user-avatar-section">
          <image
            class="user-avatar"
            :src="user.avatar || '/static/logo.png'"
            mode="aspectFill"
          />
          <pokemon-type-badge
            v-if="user.pokemonType"
            :type="user.pokemonType"
            class="pokemon-type-badge"
          />
        </view>

        <view class="user-info">
          <text class="user-nickname">{{ user.nickname }}</text>
          <text class="pokemon-name">{{ user.pokemonName || '未知宝可梦' }}</text>
          <text class="match-date">配对时间：{{ formatDate(user.matchedAt) }}</text>
        </view>

        <view class="action-section">
          <text class="action-icon">→</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <text class="empty-icon">🎮</text>
      <text class="empty-text">还没有配对记录</text>
      <text class="empty-hint">快去首页寻找你的宝可梦伙伴吧！</text>
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
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';
import request from '@/utils/request';

const { isDark } = useTheme();
const matchedUsers = ref([]);

onMounted(() => {
  loadMatchedUsers();
});

async function loadMatchedUsers() {
  try {
    const data = await request({
      url: '/api/users/me/matches',
      method: 'GET'
    });

    matchedUsers.value = data.matches || [];
  } catch (error) {
    console.error('加载配对记录失败:', error);

    // 临时模拟数据（API开发完成后删除）
    matchedUsers.value = [
      {
        id: 1,
        nickname: '皮卡丘训练师',
        pokemonName: '皮卡丘',
        pokemonType: 'electric',
        avatar: '',
        matchedAt: new Date('2026-01-10').toISOString()
      },
      {
        id: 2,
        nickname: '小火龙爱好者',
        pokemonName: '小火龙',
        pokemonType: 'fire',
        avatar: '',
        matchedAt: new Date('2026-01-12').toISOString()
      }
    ];
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)} 天前`;
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

function viewProfile(user) {
  uni.navigateTo({
    url: `/pages/profile/view?userId=${user.id}`
  });
}

function goBack() {
  uni.navigateBack();
}
</script>

<style scoped>
.pokemon-container {
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
  font-size: 26rpx;
  color: var(--color-text-secondary);
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

/* 统计区域 */
.stats-section {
  margin-bottom: 30rpx;
}

.stat-card {
  padding: 40rpx;
  text-align: center;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.stat-number {
  font-size: 64rpx;
  font-weight: bold;
  color: var(--color-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  display: block;
  margin-bottom: 12rpx;
}

.stat-label {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 配对列表 */
.pokemon-list {
  margin-bottom: 40rpx;
}

.pokemon-card-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 0 4px 20px var(--color-shadow);
}

.pokemon-card-item:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px var(--color-shadow-hard);
}

.user-avatar-section {
  position: relative;
  margin-right: 24rpx;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  border: 3px solid var(--color-border);
  box-shadow: 3px 3px 0px 0px var(--color-shadow-hard);
  background: var(--color-bg-input);
}

.pokemon-type-badge {
  position: absolute;
  bottom: -8rpx;
  right: -8rpx;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-nickname {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 8rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.pokemon-name {
  font-size: 26rpx;
  color: var(--color-primary);
  margin-bottom: 6rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.match-date {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.action-section {
  margin-left: 12rpx;
}

.action-icon {
  font-size: 36rpx;
  color: var(--color-text-secondary);
  font-weight: bold;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
  text-align: center;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 32rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 16rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.empty-hint {
  font-size: 26rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 返回按钮 */
.back-section {
  margin-top: 40rpx;
  display: flex;
  justify-content: center;
}
</style>
