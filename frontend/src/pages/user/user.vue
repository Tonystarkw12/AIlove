<template>
  <view class="user-container" :data-theme="isDark ? 'dark' : 'light'">
    <!-- 用户信息卡片 -->
    <view class="user-header pokemon-card">
      <view class="avatar-section">
        <image
          class="user-avatar"
          :src="userData.avatar || '/static/logo.png'"
          mode="aspectFill"
        />
        <pokemon-type-badge
          v-if="userData.pokemonType"
          :type="userData.pokemonType"
          class="pokemon-type"
        />
      </view>

      <text class="user-name">{{ userData.nickname || '训练师' }}</text>
      <text class="user-level">{{ userData.vipLevel || '普通训练师' }}</text>
    </view>

    <!-- HP/EXP 状态条 -->
    <view class="stats-section">
      <view class="stats-card pokemon-card">
        <hp-exp-bar
          :current-hp="userData.dailyMatchCount || 0"
          :max-hp="userData.maxDailyMatches || 10"
          :current-exp="userData.points || 0"
          :next-level-exp="100"
        />
      </view>
    </view>

    <!-- 功能列表 -->
    <view class="menu-list">
      <view class="menu-item pokemon-card" @tap="editProfile">
        <view class="menu-icon">📝</view>
        <text class="menu-text">编辑资料</text>
        <text class="menu-arrow">→</text>
      </view>

      <view class="menu-item pokemon-card" @tap="viewPokemon">
        <view class="menu-icon">🎮</view>
        <text class="menu-text">我的宝可梦</text>
        <text class="menu-badge" v-if="matchedCount > 0">{{ matchedCount }}</text>
        <text class="menu-arrow">→</text>
      </view>

      <view class="menu-item pokemon-card" @tap="viewPokeball">
        <view class="menu-icon">🔮</view>
        <text class="menu-text">精灵球记录</text>
        <view class="pokeball-count">
          <text class="pokeball-icon">🔮</text>
          <text class="pokeball-number">{{ pokeballCount }}</text>
        </view>
        <text class="menu-arrow">→</text>
      </view>

      <view class="menu-item pokemon-card" @tap="buyPokeball">
        <view class="menu-icon">💰</view>
        <text class="menu-text">购买精灵球</text>
        <text class="menu-badge-new">NEW</text>
        <text class="menu-arrow">→</text>
      </view>

      <view class="menu-item pokemon-card" @tap="viewSettings">
        <view class="menu-icon">⚙️</view>
        <text class="menu-text">设置</text>
        <text class="menu-arrow">→</text>
      </view>
    </view>

    <!-- 登出按钮 -->
    <view class="logout-section">
      <gameboy-button
        text="退出登录"
        type="danger"
        size="large"
        @tap="handleLogout"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useTheme } from '@/composables/useTheme';
import request from '@/utils/request';

const { isDark } = useTheme();

const userData = ref({
  nickname: '',
  vipLevel: '普通训练师',
  points: 0,
  dailyMatchCount: 0,
  maxDailyMatches: 10,
  avatar: '',
  pokemonType: null
});

const pokeballCount = ref(2); // 初始2个精灵球
const matchedCount = ref(0);

onMounted(() => {
  loadUserData();
});

async function loadUserData() {
  try {
    const token = uni.getStorageSync('token');
    if (!token) {
      uni.reLaunch({
        url: '/pages/login/register'
      });
      return;
    }

    const data = await request({
      url: '/api/users/me/status',
      method: 'GET'
    });

    userData.value = {
      nickname: data.nickname || '训练师',
      vipLevel: data.vipLevel || '普通训练师',
      points: data.points || 0,
      dailyMatchCount: data.dailyMatchCount || 0,
      maxDailyMatches: data.maxDailyMatches || 10,
      avatar: data.avatar || '',
      pokemonType: data.pokemonType || null
    };

    // 加载精灵球数量
    pokeballCount.value = data.pokeballCount || 2;

    // 加载配对数量
    matchedCount.value = data.matchedCount || 0;
  } catch (error) {
    console.error('加载用户数据失败:', error);

    // 临时模拟数据（API开发完成后删除）
    userData.value = {
      nickname: '训练师',
      vipLevel: '普通训练师',
      points: 0,
      dailyMatchCount: 0,
      maxDailyMatches: 10,
      avatar: '',
      pokemonType: null
    };
    pokeballCount.value = 2;
    matchedCount.value = 0;
  }
}

function editProfile() {
  uni.navigateTo({
    url: '/pages/profile/edit'
  });
}

function viewPokemon() {
  uni.navigateTo({
    url: '/pages/pokemon/my-pokemon'
  });
}

function viewPokeball() {
  uni.navigateTo({
    url: '/pages/pokeball/pokeball-history'
  });
}

function buyPokeball() {
  uni.navigateTo({
    url: '/pages/pokeball/buy-pokeball'
  });
}

function viewSettings() {
  uni.navigateTo({
    url: '/pages/settings/settings'
  });
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        // 清除本地存储
        uni.clearStorageSync();

        // 跳转到登录页
        uni.reLaunch({
          url: '/pages/login/login'
        });
      }
    }
  });
}
</script>

<style scoped>
.user-container {
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
  padding: 40rpx 30rpx;
  padding-bottom: 100rpx;
  transition: background 0.3s ease;
}

/* 用户信息卡片 */
.user-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  margin-bottom: 30rpx;
  text-align: center;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

.avatar-section {
  position: relative;
  margin-bottom: 24rpx;
}

.user-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  border: 4px solid var(--color-border);
  box-shadow: 4px 4px 0px 0px var(--color-shadow-hard);
  background: var(--color-bg-input);
}

.pokemon-type {
  position: absolute;
  bottom: -10rpx;
  right: -10rpx;
}

.user-name {
  font-size: 40rpx;
  font-weight: bold;
  color: var(--color-text-primary);
  margin-bottom: 12rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.user-level {
  font-size: 28rpx;
  color: var(--color-text-secondary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 状态条区域 */
.stats-section {
  margin-bottom: 30rpx;
}

.stats-card {
  padding: 30rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 20rpx;
  box-shadow: 8px 8px 0px 0px var(--color-shadow-hard);
}

/* 菜单列表 */
.menu-list {
  margin-bottom: 40rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: var(--color-bg-card);
  backdrop-filter: blur(10px);
  border: 4px solid var(--color-border);
  border-radius: 16rpx;
  box-shadow: 0 4px 20px var(--color-shadow);
  position: relative;
}

.menu-item:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px var(--color-shadow-hard);
}

.menu-icon {
  font-size: 48rpx;
  margin-right: 24rpx;
  width: 60rpx;
  text-align: center;
}

.menu-text {
  flex: 1;
  font-size: 32rpx;
  color: var(--color-text-primary);
  font-family: 'Varela Round', 'Nunito', sans-serif;
  font-weight: 600;
}

.menu-arrow {
  font-size: 36rpx;
  color: var(--color-text-secondary);
}

/* 菜单徽章 */
.menu-badge {
  position: absolute;
  right: 80rpx;
  background: var(--color-danger);
  color: #ffffff;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  font-weight: bold;
  min-width: 36rpx;
  text-align: center;
}

.menu-badge-new {
  position: absolute;
  right: 80rpx;
  background: var(--color-danger);
  color: #ffffff;
  font-size: 18rpx;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 精灵球数量显示 */
.pokeball-count {
  position: absolute;
  right: 80rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: var(--color-primary);
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  border: 2px solid var(--color-border);
}

.pokeball-icon {
  font-size: 24rpx;
}

.pokeball-number {
  font-size: 26rpx;
  font-weight: bold;
  color: #ffffff;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

/* 登出区域 */
.logout-section {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}
</style>
