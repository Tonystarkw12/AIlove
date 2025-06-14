<template>
  <view class="container">
    <view class="header-bar">
      <text class="title">AI月老为您推荐</text>
      <view class="edit-profile-button" @click="goToEditProfile">
        <image src="/static/edit-icon.png" class="edit-icon" mode="aspectFit"></image>
        <text>编辑资料</text>
      </view>
    </view>
    <scroll-view scroll-y class="recommendation-list">
      <view v-if="sortedRecommendations.length === 0" class="empty-state">
        <image src="/static/logo.png" class="empty-icon" mode="aspectFit"></image>
        <text>暂无推荐，完善个人资料以获得更精准推荐！</text>
      </view>
      <view v-else class="recommendation-grid">
        <view
          v-for="person in sortedRecommendations"
          :key="person.id"
          class="recommendation-card"
          @click="viewProfile(person.id)"
        >
          <view class="card-image-container">
            <image :src="person.imageUrl || '/static/logo.png'" class="card-image" mode="aspectFill"></image>
            <view class="recommendation-badge">
              <text>推荐值: {{ person.recommendationScore }}%</text>
            </view>
          </view>
          <view class="card-info">
            <text class="person-name">{{ person.name }}</text>
            <view class="info-tags">
              <text class="tag">{{ person.age }}岁</text>
              <text class="tag">{{ person.location }}</text>
              <text v-if="person.occupation" class="tag">{{ person.occupation }}</text>
            </view>
            <text class="person-bio">{{ person.bio }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

// 示例推荐数据
const recommendations = ref([
  {
    id: 1,
    name: '晓彤',
    age: 26,
    location: '北京',
    occupation: '设计师',
    bio: '热爱生活，喜欢旅行和摄影，希望找到志同道合的你。',
    imageUrl: 'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=200',
    recommendationScore: 95,
  },
  {
    id: 2,
    name: '子轩',
    age: 28,
    location: '上海',
    occupation: '工程师',
    bio: '工作认真，闲暇时喜欢看电影和运动。期待真诚的交往。',
    imageUrl: 'https://images.pexels.com/photos/3778680/pexels-photo-3778680.jpeg?auto=compress&cs=tinysrgb&w=200',
    recommendationScore: 92,
  },
  {
    id: 3,
    name: '嘉怡',
    age: 24,
    location: '广州',
    occupation: '教师',
    bio: '喜欢阅读和美食，性格开朗，希望遇见有趣的灵魂。',
    imageUrl: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
    recommendationScore: 98,
  },
]);

// 根据推荐值排序
const sortedRecommendations = computed(() => {
  return [...recommendations.value].sort((a, b) => b.recommendationScore - a.recommendationScore);
});

const viewProfile = (personId) => {
  // 从 recommendations 数组中找到对应的 person 对象
  const person = recommendations.value.find(p => p.id === personId);
  if (person) {
    uni.navigateTo({
      url: `/pages/chat/chat?userId=${person.id}&name=${encodeURIComponent(person.name)}&avatar=${encodeURIComponent(person.imageUrl || '')}`
    });
  } else {
    uni.showToast({
      title: '无法找到用户信息',
      icon: 'none'
    });
  }
};

const goToEditProfile = () => {
  uni.navigateTo({
    url: '/pages/profile/edit' // 跳转到个人信息编辑页
  });
};

onMounted(() => {
  // 可以在这里获取真实的用户推荐数据
  // 如果本地没有用户资料，可以提示用户去编辑资料
  const userProfile = uni.getStorageSync('userProfile');
  if (!userProfile || Object.keys(userProfile).length === 0) {
    // uni.showModal({
    //   title: '提示',
    //   content: '完善个人资料可以获得更精准的推荐哦！',
    //   confirmText: '去完善',
    //   cancelText: '稍后',
    //   success: (res) => {
    //     if (res.confirm) {
    //       goToEditProfile();
    //     }
    //   }
    // });
  }
});

</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
}

.header-bar {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  padding: 20rpx 30rpx;
  padding-top: calc(var(--status-bar-height) + 20rpx); /* 适配状态栏 */
  display: flex;
  justify-content: space-between; /* 两端对齐 */
  align-items: center;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  height: 90rpx; /* 固定头部高度 */
  box-sizing: content-box;

  .title {
    font-size: 36rpx;
    font-weight: 600;
    line-height: 90rpx; /* 垂直居中 */
  }

  .edit-profile-button {
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.2);
    padding: 10rpx 20rpx;
    border-radius: 30rpx;
    font-size: 26rpx;
    cursor: pointer;
    transition: background-color 0.2s;

    &:active {
      background-color: rgba(255, 255, 255, 0.3);
    }

    .edit-icon {
      width: 32rpx;
      height: 32rpx;
      margin-right: 8rpx;
    }
  }
}

.recommendation-list {
  flex: 1;
  overflow-y: auto;
}

.recommendation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  padding: 20rpx;
}

.recommendation-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease-in-out;

  &:active {
    transform: scale(0.98);
  }
}

.card-image-container {
  width: 100%;
  height: 300rpx;
  position: relative;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
}

.recommendation-badge {
  position: absolute;
  top: 15rpx;
  left: 15rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: bold;
}

.card-info {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.person-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag {
  background-color: #eef2f7;
  color: #555;
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
  font-size: 22rpx;
}

.person-bio {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 150rpx; /* 调整间距 */
  color: #999;
  font-size: 28rpx;
  text-align: center;
  .empty-icon {
    width: 180rpx; /* 调整大小 */
    height: 180rpx;
    margin-bottom: 30rpx;
    opacity: 0.7;
  }
}
</style>
```
我假设您在 `/static/` 目录下有一个名为 `edit-icon.png` 的图标。如果没有，请替换为合适的图标路径或使用文本按钮。
