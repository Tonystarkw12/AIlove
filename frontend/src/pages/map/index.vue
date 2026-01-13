<template>
  <view class="map-container">
    <!-- 地图组件 -->
    <map
      id="ai-love-map"
      :longitude="longitude"
      :latitude="latitude"
      :scale="scale"
      :show-location="true"
      :markers="markers"
      :enable-traffic="false"
      @markertap="onMarkerTap"
      class="ai-map"
    />

    <!-- 顶部状态栏 -->
    <view class="status-bar">
      <view class="status-info">
        <text class="status-text">发现附近 {{ nearbyUsers.length }} 位用户</text>
      </view>
    </view>

    <!-- 刷新按钮 -->
    <view class="refresh-btn" @tap="refreshNearbyUsers">
      <uni-icons type="refresh" size="20" color="#6e8efb"></uni-icons>
      <text class="refresh-text">刷新</text>
    </view>

    <!-- 用户信息弹窗 -->
    <uni-popup ref="popup" type="bottom">
      <view class="user-popup">
        <view class="user-header">
          <image class="user-avatar" :src="selectedUser?.imageUrl || '/static/default-avatar.png'" mode="aspectFill"></image>
          <view class="user-info">
            <text class="user-name">{{ selectedUser?.nickname }}</text>
            <text class="user-age">{{ selectedUser?.age }}岁</text>
          </view>
        </view>

        <view class="user-details">
          <view class="detail-item" v-if="selectedUser?.distance">
            <text class="detail-label">距离</text>
            <text class="detail-value">{{ selectedUser.distance.text }}</text>
          </view>

          <view class="detail-item" v-if="selectedUser?.occupation">
            <text class="detail-label">职业</text>
            <text class="detail-value">{{ selectedUser.occupation }}</text>
          </view>

          <view class="detail-item" v-if="selectedUser?.level">
            <text class="detail-label">等级</text>
            <text class="detail-value">Lv.{{ selectedUser.level }}</text>
          </view>
        </view>

        <view class="user-bio" v-if="selectedUser?.bio">
          <text class="bio-text">{{ selectedUser.bio }}</text>
        </view>

        <!-- 兴趣标签 -->
        <view class="tags-container" v-if="selectedUser?.tags?.length">
          <view class="tag" v-for="(tag, index) in selectedUser.tags.slice(0, 6)" :key="index">
            <text class="tag-text">{{ tag }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-buttons">
          <button class="action-btn primary-btn" @tap="handleChat">发起聊天</button>
          <button class="action-btn secondary-btn" @tap="closePopup">关闭</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      longitude: 116.397428, // 默认北京经度
      latitude: 39.90923,    // 默认北京纬度
      scale: 14,             // 地图缩放级别
      nearbyUsers: [],       // 附近用户列表
      markers: [],           // 地图标记
      selectedUser: null,    // 当前选中的用户
      locationTimer: null,   // 定时更新位置的定时器
      nearbyTimer: null,     // 定时获取附近用户的定时器
      isUpdating: false      // 是否正在更新
    };
  },

  onLoad() {
    // 初始化地图
    this.initMap();
  },

  onUnload() {
    // 清除定时器
    this.clearTimers();
  },

  onShow() {
    // 页面显示时开始定时任务
    this.startLocationTasks();
  },

  onHide() {
    // 页面隐藏时停止定时任务
    this.clearTimers();
  },

  methods: {
    /**
     * 初始化地图
     */
    async initMap() {
      try {
        // 获取当前位置
        const location = await this.getCurrentLocation();

        if (location) {
          this.latitude = location.latitude;
          this.longitude = location.longitude;

          // 上传位置到服务器
          await this.updateLocation(location.latitude, location.longitude);

          // 获取附近用户
          await this.fetchNearbyUsers();
        }

        // 启动定时任务
        this.startLocationTasks();
      } catch (error) {
        console.error('初始化地图失败:', error);
        uni.showToast({
          title: '地图初始化失败',
          icon: 'none'
        });
      }
    },

    /**
     * 获取当前位置
     */
    getCurrentLocation() {
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
    },

    /**
     * 上传位置到服务器
     */
    async updateLocation(lat, lng) {
      try {
        const token = uni.getStorageSync('token');

        const response = await uni.request({
          url: this.$baseUrl + '/api/map/update-location',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            lat: lat,
            lng: lng
          }
        });

        if (response[0]?.statusCode === 200) {
          console.log('位置更新成功');
        } else {
          throw new Error('位置更新失败');
        }
      } catch (error) {
        console.error('更新位置失败:', error);
        // 静默失败，不显示错误提示
      }
    },

    /**
     * 获取附近用户
     */
    async fetchNearbyUsers() {
      if (this.isUpdating) return;

      this.isUpdating = true;

      try {
        const token = uni.getStorageSync('token');

        const response = await uni.request({
          url: this.$baseUrl + '/api/map/nearby',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            lat: this.latitude,
            lng: this.longitude,
            radius_km: 5
          }
        });

        const data = response[0]?.data;

        if (response[0]?.statusCode === 200 && data) {
          this.nearbyUsers = data.nearbyUsers || [];

          // 更新地图标记
          this.updateMarkers();
        } else {
          throw new Error('获取附近用户失败');
        }
      } catch (error) {
        console.error('获取附近用户失败:', error);
        uni.showToast({
          title: '获取附近用户失败',
          icon: 'none'
        });
      } finally {
        this.isUpdating = false;
      }
    },

    /**
     * 更新地图标记
     */
    updateMarkers() {
      this.markers = this.nearbyUsers.map((user, index) => ({
        id: index,
        latitude: user.location?.lat || 0,
        longitude: user.location?.lng || 0,
        iconPath: user.imageUrl || '/static/default-avatar.png',
        width: 40,
        height: 40,
        callout: {
          content: user.nickname,
          color: '#ffffff',
          fontSize: 12,
          borderRadius: 10,
          bgColor: '#6e8efb',
          padding: 5,
          display: 'ALWAYS'
        },
        userData: user // 存储用户数据
      }));
    },

    /**
     * 标记点击事件
     */
    onMarkerTap(e) {
      const markerId = e.detail.markerId;
      const marker = this.markers.find(m => m.id === markerId);

      if (marker && marker.userData) {
        this.selectedUser = marker.userData;
        this.$refs.popup.open();
      }
    },

    /**
     * 刷新附近用户
     */
    async refreshNearbyUsers() {
      uni.showLoading({
        title: '刷新中...'
      });

      await this.fetchNearbyUsers();

      uni.hideLoading();

      uni.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    },

    /**
     * 发起聊天
     */
    handleChat() {
      if (!this.selectedUser) return;

      uni.navigateTo({
        url: `/pages/chat/chat?userId=${this.selectedUser.userId}&name=${this.selectedUser.nickname}&avatar=${this.selectedUser.imageUrl || ''}`
      });

      this.closePopup();
    },

    /**
     * 关闭弹窗
     */
    closePopup() {
      this.$refs.popup.close();
      this.selectedUser = null;
    },

    /**
     * 启动定时任务
     */
    startLocationTasks() {
      // 清除旧的定时器
      this.clearTimers();

      // 每 30 秒更新一次位置
      this.locationTimer = setInterval(async () => {
        try {
          const location = await this.getCurrentLocation();

          if (location) {
            this.latitude = location.latitude;
            this.longitude = location.longitude;
            await this.updateLocation(location.latitude, location.longitude);
          }
        } catch (error) {
          console.error('定时更新位置失败:', error);
        }
      }, 30000);

      // 每 30 秒刷新一次附近用户
      this.nearbyTimer = setInterval(async () => {
        await this.fetchNearbyUsers();
      }, 30000);
    },

    /**
     * 清除定时器
     */
    clearTimers() {
      if (this.locationTimer) {
        clearInterval(this.locationTimer);
        this.locationTimer = null;
      }

      if (this.nearbyTimer) {
        clearInterval(this.nearbyTimer);
        this.nearbyTimer = null;
      }
    }
  }
};
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.ai-map {
  width: 100%;
  height: 100%;
}

.status-bar {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  right: 20rpx;
  z-index: 100;
}

.status-info {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.status-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.refresh-btn {
  position: absolute;
  top: 100rpx;
  right: 20rpx;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.refresh-text {
  font-size: 26rpx;
  color: #6e8efb;
}

.user-popup {
  background: #fff;
  border-radius: 30rpx 30rpx 0 0;
  padding: 40rpx;
  max-height: 80vh;
  overflow-y: auto;
}

.user-header {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 20rpx;
  border: 4rpx solid #6e8efb;
}

.user-info {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.user-age {
  font-size: 28rpx;
  color: #666;
}

.user-details {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30rpx;
  padding: 20rpx 0;
  background: #f5f5f5;
  border-radius: 20rpx;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.detail-value {
  font-size: 28rpx;
  color: #6e8efb;
  font-weight: 500;
}

.user-bio {
  margin-bottom: 30rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 20rpx;
}

.bio-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
  margin-bottom: 40rpx;
}

.tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 30rpx;
  padding: 10rpx 25rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #fff;
}

.action-buttons {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  height: 90rpx;
  border-radius: 45rpx;
  font-size: 32rpx;
  border: none;
}

.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.secondary-btn {
  background: #f5f5f5;
  color: #666;
}
</style>
