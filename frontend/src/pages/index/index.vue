<template>
  <view class="home-container">
    <!-- 全屏地图 -->
    <map
      id="home-map"
      :longitude="longitude"
      :latitude="latitude"
      :scale="scale"
      :show-location="true"
      :markers="markers"
      :enable-traffic="false"
      @markertap="onMarkerTap"
      class="full-map"
    />

    <!-- 顶部训练师状态栏 -->
    <view class="status-bar pokemon-card">
      <view class="status-header">
        <text class="status-title">训练师雷达</text>
        <text class="status-subtitle">发现附近 {{ nearbyCount }} 位训练师</text>
      </view>

      <!-- HP/EXP 状态条 -->
      <view v-if="userStatus" class="trainer-stats">
        <hp-exp-bar
          :current-hp="userStatus.dailyMatchCount"
          :max-hp="userStatus.maxDailyMatches"
          :current-exp="userStatus.points"
          :next-level-exp="100"
        />
      </view>
    </view>

    <!-- 底部匹配按钮（GameBoy 风格） -->
    <view class="match-button-container">
      <gameboy-button
        :text="isScanning ? '搜索中...' : (isLoading ? '加载中...' : '开始匹配')"
        :sub-text="!isScanning && !isLoading ? '消耗 50 积分' : ''"
        type="primary"
        size="large"
        :loading="isLoading"
        :disabled="isScanning"
        @tap="handleStartMatch"
      />

      <!-- 雷达扫描动画 -->
      <view v-if="isScanning" class="radar-waves">
        <view class="wave wave-1"></view>
        <view class="wave wave-2"></view>
        <view class="wave wave-3"></view>
      </view>
    </view>

    <!-- 匹配结果弹窗 -->
    <uni-popup ref="matchPopup" type="center" :mask-click="false">
      <view class="match-result-card pokemon-card">
        <!-- 成功动画 -->
        <view class="success-animation">
          <view class="checkmark">
            <view class="checkmark-stem"></view>
            <view class="checkmark-kick"></view>
          </view>
        </view>

        <text class="result-title">匹配成功！</text>
        <text class="result-subtitle">发现合适的训练师</text>

        <!-- 匹配用户信息 -->
        <view v-if="matchResult" class="match-user-info">
          <!-- 宝可梦头像 -->
          <view class="avatar-container">
            <image
              class="match-avatar"
              :src="matchResult.pokemonAvatar || matchResult.avatar || '/static/logo.png'"
              mode="aspectFill"
            />
            <pokemon-type-badge
              v-if="matchResult.pokemonType"
              :type="matchResult.pokemonType"
              class="pokemon-type"
            />
          </view>

          <text class="match-name">{{ matchResult.nickname }}</text>
          <view class="match-details">
            <text class="detail-item">{{ matchResult.age }}岁</text>
            <text class="detail-item">{{ matchResult.distance }}</text>
            <text class="detail-item match-score">匹配度 {{ matchResult.matchScore }}%</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="result-actions">
          <gameboy-button
            text="查看详情"
            type="primary"
            size="medium"
            @tap="viewMatchedUser"
          />
          <gameboy-button
            text="稍后再说"
            type="secondary"
            size="medium"
            @tap="closeMatchPopup"
          />
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import request from '@/utils/request';

// 地图相关数据
const longitude = ref(116.397428); // 默认北京经度
const latitude = ref(39.90923);    // 默认北京纬度
const scale = ref(14);
const markers = ref([]);
const nearbyCount = ref(0);

// 状态
const isLoading = ref(false);
const isScanning = ref(false);
const matchResult = ref(null);
const matchPopup = ref(null);
const userStatus = ref(null);

// 定位定时器
let locationTimer = null;

onMounted(() => {
  initMap();
  startLocationUpdate();
  loadUserStatus();
});

onUnmounted(() => {
  if (locationTimer) {
    clearInterval(locationTimer);
  }
});

/**
 * 加载用户状态
 */
async function loadUserStatus() {
  try {
    const token = uni.getStorageSync('token');
    if (!token) return;

    const status = await request({
      url: '/api/users/me/status',
      method: 'GET'
    });

    userStatus.value = status;
  } catch (error) {
    console.error('获取用户状态失败:', error);
  }
}

/**
 * 初始化地图
 */
async function initMap() {
  try {
    // 获取当前位置
    const location = await getCurrentLocation();
    latitude.value = location.latitude;
    longitude.value = location.longitude;

    // 上传位置到服务器
    await updateLocation(location.latitude, location.longitude);

    // 获取附近用户
    await fetchNearbyUsers();
  } catch (error) {
    console.error('初始化地图失败:', error);
    uni.showToast({
      title: '定位失败，请检查定位权限',
      icon: 'none'
    });
  }
}

/**
 * 获取当前位置
 */
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: (error) => {
        console.error('获取位置失败:', error);
        reject(error);
      }
    });
  });
}

/**
 * 上传位置到服务器
 */
async function updateLocation(lat, lng) {
  try {
    const token = uni.getStorageSync('token');
    if (!token) return;

    await request({
      url: '/api/map/update-location',
      method: 'POST',
      data: { lat, lng }
    });
  } catch (error) {
    console.error('更新位置失败:', error);
  }
}

/**
 * 获取附近用户
 */
async function fetchNearbyUsers() {
  try {
    const token = uni.getStorageSync('token');
    if (!token) return;

    const result = await request({
      url: '/api/map/nearby',
      method: 'GET',
      data: {
        lat: latitude.value,
        lng: longitude.value,
        radius_km: 5,
        min_score: 70
      }
    });

    if (result && result.nearbyUsers) {
      nearbyCount.value = result.nearbyUsers.length;
      updateMarkers(result.nearbyUsers);
    }
  } catch (error) {
    console.error('获取附近用户失败:', error);
  }
}

/**
 * 更新地图标记
 */
function updateMarkers(users) {
  markers.value = users.map((user, index) => ({
    id: index,
    latitude: user.latitude,
    longitude: user.longitude,
    iconPath: user.pokemonAvatarUrl || '/static/marker-icon.png',
    width: 40,
    height: 40,
    callout: {
      content: user.nickname,
      color: '#333',
      fontSize: 12,
      borderRadius: 5,
      bgColor: '#fff',
      padding: 5
    },
    customCallout: {
      userId: user.userId,
      matchScore: user.matchScore
    }
  }));
}

/**
 * 开始位置更新定时器
 */
function startLocationUpdate() {
  // 每30秒更新一次位置
  locationTimer = setInterval(async () => {
    try {
      const location = await getCurrentLocation();
      await updateLocation(location.latitude, location.longitude);
      await fetchNearbyUsers();
      await loadUserStatus(); // 刷新用户状态
    } catch (error) {
      console.error('位置更新失败:', error);
    }
  }, 30000);
}

/**
 * 点击标记
 */
function onMarkerTap(e) {
  const markerId = e.detail.markerId;
  const marker = markers.value[markerId];
  if (marker && marker.customCallout) {
    uni.navigateTo({
      url: `/pages/chat/chat?userId=${marker.customCallout.userId}`
    });
  }
}

/**
 * 开始匹配
 */
async function handleStartMatch() {
  if (isLoading.value || isScanning.value) return;

  isLoading.value = true;

  try {
    // 1. 获取用户状态
    const status = await getUserStatus();

    // 2. 检查资料完整度
    if (!status.isProfileComplete) {
      uni.showToast({
        title: '请先完善训练师档案',
        icon: 'none',
        duration: 2000
      });

      setTimeout(() => {
        uni.switchTab({
          url: '/pages/user/user'
        });
      }, 2000);

      return;
    }

    // 3. 检查积分
    if (!status.hasEnoughPoints) {
      uni.showModal({
        title: '积分不足',
        content: `每次匹配需要 ${status.pointsPerMatch} 积分，当前积分：${status.points}。完成每日任务可获得更多积分！`,
        showCancel: false
      });

      return;
    }

    // 4. 开始雷达扫描动画
    isLoading.value = false;
    isScanning.value = true;

    // 5. 调用匹配接口
    await performMatch();

  } catch (error) {
    console.error('匹配失败:', error);

    let errorMsg = '匹配失败，请重试';
    if (error.data && error.data.error) {
      errorMsg = error.data.error.message || errorMsg;
    }

    uni.showToast({
      title: errorMsg,
      icon: 'none'
    });

  } finally {
    isLoading.value = false;
  }
}

/**
 * 获取用户状态
 */
async function getUserStatus() {
  return await request({
    url: '/api/users/me/status',
    method: 'GET'
  });
}

/**
 * 执行匹配
 */
async function performMatch() {
  // 模拟雷达扫描3秒
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 调用匹配API
  const result = await request({
    url: '/api/users/me/match',
    method: 'POST'
  });

  // 生成模拟的匹配结果（实际应该从推荐接口获取）
  matchResult.value = {
    userId: 'matched-user-' + Date.now(),
    nickname: '匹配的训练师',
    age: 26,
    distance: '1.2km',
    matchScore: 85,
    avatar: '/static/logo.png',
    pokemonAvatar: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/025.png',
    pokemonType: 'electric'
  };

  // 停止扫描动画
  isScanning.value = false;

  // 显示匹配结果弹窗
  setTimeout(() => {
    matchPopup.value.open();
  }, 500);
}

/**
 * 查看匹配的用户
 */
function viewMatchedUser() {
  matchPopup.value.close();

  if (matchResult.value) {
    uni.navigateTo({
      url: `/pages/chat/chat?userId=${matchResult.value.userId}&nickname=${matchResult.value.nickname}`
    });
  }
}

/**
 * 关闭匹配弹窗
 */
function closeMatchPopup() {
  matchPopup.value.close();
  matchResult.value = null;
}
</script>

<style scoped>
.home-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.full-map {
  width: 100%;
  height: 100%;
}

/* 状态栏 */
.status-bar {
  position: absolute;
  top: 20rpx;
  left: 30rpx;
  right: 30rpx;
  padding: 30rpx;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.status-header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.status-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #000000;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.status-subtitle {
  font-size: 24rpx;
  color: #666666;
}

.trainer-stats {
  margin-top: 10rpx;
}

/* 匹配按钮容器 */
.match-button-container {
  position: absolute;
  bottom: 100rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  padding: 0 30rpx;
}

/* 雷达波纹动画 */
.radar-waves {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(0, 0, 0, 0.3);
  animation: ripple 2s infinite;
}

.wave-1 {
  animation-delay: 0s;
}

.wave-2 {
  animation-delay: 0.6s;
}

.wave-3 {
  animation-delay: 1.2s;
}

@keyframes ripple {
  0% {
    width: 150rpx;
    height: 150rpx;
    opacity: 1;
  }
  100% {
    width: 600rpx;
    height: 600rpx;
    opacity: 0;
  }
}

/* 匹配结果弹窗 */
.match-result-card {
  width: 600rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 4px solid #000000;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.success-animation {
  margin-bottom: 30rpx;
}

.checkmark {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #000000;
  position: relative;
  animation: scale 0.6s ease-in-out;
}

.checkmark-stem {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6rpx;
  height: 40rpx;
  background: #000000;
  transform: translate(-50%, -100%) rotate(45deg);
  transform-origin: bottom center;
}

.checkmark-kick {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 25rpx;
  height: 6rpx;
  background: #000000;
  transform: translate(0, -50%) rotate(45deg);
  transform-origin: left center;
}

@keyframes scale {
  0%, 100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
}

.result-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 10rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.result-subtitle {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 40rpx;
}

.match-user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 50rpx;
  width: 100%;
}

.avatar-container {
  position: relative;
  margin-bottom: 20rpx;
}

.match-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  border: 4px solid #000000;
  box-shadow: 4px 4px 0px 0px #000000;
  background: #f5f5f5;
}

.pokemon-type {
  position: absolute;
  bottom: -10rpx;
  right: -10rpx;
}

.match-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #000000;
  margin-bottom: 15rpx;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.match-details {
  display: flex;
  gap: 15rpx;
  flex-wrap: wrap;
  justify-content: center;
}

.detail-item {
  font-size: 24rpx;
  color: #333333;
  padding: 10rpx 20rpx;
  background: #f5f5f5;
  border: 2px solid #000000;
  border-radius: 20rpx;
  box-shadow: 2px 2px 0px 0px #000000;
  font-family: 'Varela Round', 'Nunito', sans-serif;
}

.match-score {
  background: #FFCB05;
  color: #000000;
  font-weight: bold;
}

.result-actions {
  width: 100%;
  display: flex;
  gap: 20rpx;
  justify-content: center;
}
</style>
