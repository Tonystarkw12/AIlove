<template>
  <view class="profile-edit-container">
    <view class="page-header">
      <text class="page-title">编辑我的资料</text>
    </view>
    <scroll-view scroll-y class="form-scroll-view">
      <view class="form-section">
        <text class="section-title">基本信息</text>
        <view class="form-item">
          <text class="item-label">昵称</text>
          <input type="text" v-model="profile.nickname" placeholder="请输入昵称" class="item-input" />
        </view>
        <view class="form-item">
          <text class="item-label">性别</text>
          <picker @change="bindPickerChange($event, 'gender')" :value="genderIndex" :range="genderOptions" range-key="label">
            <view class="picker-display">
              {{ genderOptions[genderIndex]?.label || '请选择性别' }}
              <image src="/static/arrow-down.png" class="picker-arrow" mode="aspectFit"></image>
            </view>
          </picker>
        </view>
         <view class="form-item">
          <text class="item-label">出生日期</text>
          <picker mode="date" :value="profile.birth_date" @change="bindDateChange">
            <view class="picker-display">
              {{ profile.birth_date || '请选择出生日期' }}
               <image src="/static/arrow-down.png" class="picker-arrow" mode="aspectFit"></image>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">身高 (cm)</text>
          <input type="number" v-model.number="profile.height_cm" placeholder="例如: 175" class="item-input" />
        </view>
        <view class="form-item">
          <text class="item-label">体重 (kg)</text>
          <input type="number" v-model.number="profile.weight_kg" placeholder="例如: 65" class="item-input" />
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">工作与收入</text>
        <view class="form-item">
          <text class="item-label">职业</text>
          <input type="text" v-model="profile.occupation" placeholder="请输入您的职业" class="item-input" />
        </view>
        <view class="form-item">
          <text class="item-label">月薪范围</text>
           <picker @change="bindPickerChange($event, 'salary_range')" :value="salaryIndex" :range="salaryOptions" range-key="label">
            <view class="picker-display">
              {{ salaryOptions[salaryIndex]?.label || '请选择月薪范围' }}
              <image src="/static/arrow-down.png" class="picker-arrow" mode="aspectFit"></image>
            </view>
          </picker>
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">关于我</text>
         <view class="form-item">
          <text class="item-label">性取向</text>
          <picker @change="bindPickerChange($event, 'orientation')" :value="orientationIndex" :range="orientationOptions" range-key="label">
            <view class="picker-display">
              {{ orientationOptions[orientationIndex]?.label || '请选择性取向' }}
              <image src="/static/arrow-down.png" class="picker-arrow" mode="aspectFit"></image>
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="item-label">个人简介</text>
          <textarea v-model="profile.bio" placeholder="简单介绍一下自己，如兴趣爱好、性格等..." class="item-textarea" maxlength="200"></textarea>
        </view>
      </view>

      <view class="form-section">
        <text class="section-title">我的照片</text>
        <view class="image-uploader">
          <view class="image-grid">
            <view v-for="(photo, index) in profile.photos" :key="photo.photo_id || index" class="image-preview-item">
              <image :src="photo.url.startsWith('http') || photo.url.startsWith('/') ? photo.url : API_BASE_URL + photo.url" mode="aspectFill" class="preview-image" @click="previewImage(index)" :class="{ 'is-avatar': photo.is_avatar }"></image>
              <view v-if="photo.is_avatar" class="avatar-tag">头像</view>
              <view class="delete-icon" @click="deleteImage(photo, index)">×</view>
              <!-- Add a button to set avatar if not already avatar -->
              <button v-if="!photo.is_avatar && photo.photo_id" @click="setAsAvatar(photo)" class="set-avatar-btn">设为头像</button>
            </view>
            <view v-if="profile.photos.length < maxPhotos" class="upload-btn" @click="chooseImage">
              <text class="plus-icon">+</text>
              <text class="upload-text">添加照片</text>
            </view>
          </view>
          <text class="upload-tip">最多上传 {{ maxPhotos }} 张照片。可点选照片设为头像。</text>
        </view>
      </view>
    </scroll-view>

    <view class="save-button-container">
      <button class="save-button" @click="saveProfile">保存资料</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';

const API_BASE_URL = 'https://zkbdeainnjcy.sealoshzh.site';
let authToken = '';

const profile = reactive({
  user_id: '',
  nickname: '',
  email: '',
  gender: '',
  birth_date: '',
  height_cm: null,
  weight_kg: null,
  occupation: '',
  salary_range: '',
  orientation: '',
  bio: '',
  avatar_url: '',
  photos: [], // Array of { photo_id, url, is_avatar, localPath (optional) }
  // Fields not in current form but in API:
  // location_geohash: '',
  // location_latitude: null,
  // location_longitude: null,
  // preferred_age_min: null,
  // preferred_age_max: null,
  // preferred_gender: '',
  // tags: [],
  // values_description: '',
  // q_and_a: {},
});

const genderOptions = ref([
  { value: '男', label: '男' },
  { value: '女', label: '女' },
  { value: '其他', label: '其他' },
]);
const genderIndex = computed(() => genderOptions.value.findIndex(opt => opt.value === profile.gender));

const salaryOptions = ref([
  { value: '5千以下', label: '5千以下' }, // Assuming API uses these exact strings
  { value: '5k-10k', label: '5千-1万' },
  { value: '10k-20k', label: '1万-2万' },
  { value: '20k-30k', label: '2万-3万' },
  { value: '30k-50k', label: '3万-5万' },
  { value: '50k+', label: '5万以上' },
]);
const salaryIndex = computed(() => salaryOptions.value.findIndex(opt => opt.value === profile.salary_range));

const orientationOptions = ref([
  { value: '异性恋', label: '异性恋' },
  { value: '同性恋', label: '同性恋' },
  { value: '双性恋', label: '双性恋' },
  { value: '无性恋', label: '无性恋' },
  { value: '泛性恋', label: '泛性恋' },
  { value: '其他', label: '其他/不确定' },
]);
const orientationIndex = computed(() => orientationOptions.value.findIndex(opt => opt.value === profile.orientation));

const maxPhotos = 6;

// Helper for API calls
const makeApiRequest = async (url, method, data, headers = {}) => {
  if (!authToken) {
    uni.showToast({ title: '用户未登录', icon: 'none' });
    return Promise.reject('No auth token');
  }
  return uni.request({
    url: `${API_BASE_URL}${url}`,
    method,
    data,
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
      ...headers,
    },
  });
};

const makeApiUploadRequest = async (url, filePath, fileName, formData = {}) => {
  if (!authToken) {
    uni.showToast({ title: '用户未登录', icon: 'none' });
    return Promise.reject('No auth token');
  }
  return uni.uploadFile({
    url: `${API_BASE_URL}${url}`,
    filePath,
    name: fileName,
    formData,
    header: {
      'Authorization': `Bearer ${authToken}`,
    },
  });
};


onMounted(async () => {
  authToken = uni.getStorageSync('token');
  if (!authToken) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }

  uni.showLoading({ title: '加载中...' });
  try {
    const response = await makeApiRequest('/users/me/profile', 'GET');
    if (response.statusCode === 200) {
      const apiProfile = response.data;
      Object.keys(profile).forEach(key => {
        if (apiProfile[key] !== undefined) {
          profile[key] = apiProfile[key];
        }
      });
      // Ensure photos array is correctly populated with is_avatar
      if (apiProfile.photos && Array.isArray(apiProfile.photos)) {
        profile.photos = apiProfile.photos.map(p => ({
          ...p,
          is_avatar: p.url === apiProfile.avatar_url || p.is_avatar // Prioritize is_avatar if present
        }));
      } else {
        profile.photos = [];
      }
      profile.avatar_url = apiProfile.avatar_url || '';

    } else {
      uni.showToast({ title: `加载资料失败: ${response.data?.error?.message || response.statusCode}`, icon: 'none' });
    }
  } catch (error) {
    console.error("Fetch profile error:", error);
    uni.showToast({ title: '网络错误，加载资料失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
});

const bindPickerChange = (e, type) => {
  const index = parseInt(e.detail.value);
  if (type === 'gender') {
    profile.gender = genderOptions.value[index]?.value || '';
  } else if (type === 'salary_range') {
    profile.salary_range = salaryOptions.value[index]?.value || '';
  } else if (type === 'orientation') {
    profile.orientation = orientationOptions.value[index]?.value || '';
  }
};

const bindDateChange = (e) => {
  profile.birth_date = e.detail.value;
};

const chooseImage = () => {
  uni.chooseImage({
    count: maxPhotos - profile.photos.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uni.showLoading({ title: '上传中...' });
      for (const tempFilePath of res.tempFilePaths) {
        try {
          const uploadResponse = await makeApiUploadRequest('/users/me/photos', tempFilePath, 'photos');
          if (uploadResponse.statusCode === 201) {
            const responseData = JSON.parse(uploadResponse.data); // uni.uploadFile returns data as string
            if (responseData.uploadedPhotos && responseData.uploadedPhotos.length > 0) {
              // Assuming API returns one photo object per upload in uploadedPhotos array
              const newPhoto = responseData.uploadedPhotos[0];
              profile.photos.push({ ...newPhoto, is_avatar: false }); // New photos are not avatar by default
            }
          } else {
             const errorData = JSON.parse(uploadResponse.data);
            uni.showToast({ title: `上传失败: ${errorData?.error?.message || uploadResponse.statusCode}`, icon: 'none' });
          }
        } catch (error) {
          console.error("Upload error:", error);
          uni.showToast({ title: '上传图片失败', icon: 'none' });
        }
      }
      uni.hideLoading();
    },
  });
};

const previewImage = (index) => {
  const urls = profile.photos.map(p => p.url.startsWith('http') || p.url.startsWith('/') ? p.url : API_BASE_URL + p.url);
  uni.previewImage({
    urls: urls,
    current: index,
  });
};

const deleteImage = async (photoToDelete, index) => {
  if (!photoToDelete.photo_id) { // Should not happen if photos are from API
    profile.photos.splice(index, 1);
    return;
  }
  uni.showModal({
    title: '确认',
    content: '确定要删除这张照片吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' });
        try {
          const response = await makeApiRequest(`/users/me/photos/${photoToDelete.photo_id}`, 'DELETE');
          if (response.statusCode === 200) {
            profile.photos.splice(index, 1);
            // If deleted photo was avatar, clear avatar_url and update is_avatar flags
            if (photoToDelete.is_avatar) {
              profile.avatar_url = '';
              // Optionally, set the new first photo as avatar or prompt user
            }
            uni.showToast({ title: '照片已删除', icon: 'success' });
          } else {
            uni.showToast({ title: `删除失败: ${response.data?.error?.message || response.statusCode}`, icon: 'none' });
          }
        } catch (error) {
          console.error("Delete photo error:", error);
          uni.showToast({ title: '删除照片失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

const setAsAvatar = async (photoToSet) => {
  if (!photoToSet.photo_id) {
    uni.showToast({ title: '照片尚未上传', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '设置中...' });
  try {
    const response = await makeApiRequest('/users/me/avatar', 'PUT', { photoId: photoToSet.photo_id });
    if (response.statusCode === 200) {
      profile.avatar_url = response.data.avatarUrl;
      profile.photos.forEach(p => {
        p.is_avatar = (p.photo_id === photoToSet.photo_id);
      });
      uni.showToast({ title: '头像设置成功', icon: 'success' });
    } else {
      uni.showToast({ title: `设置头像失败: ${response.data?.error?.message || response.statusCode}`, icon: 'none' });
    }
  } catch (error) {
    console.error("Set avatar error:", error);
    uni.showToast({ title: '设置头像失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

const saveProfile = async () => {
  if (!profile.nickname) {
    uni.showToast({ title: '请输入昵称', icon: 'none' });
    return;
  }
   if (profile.photos.length === 0) {
    uni.showToast({ title: '请至少上传一张照片', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '保存中...' });

  // 1. Prepare data for PUT /users/me/profile
  const profileDataToUpdate = {
    nickname: profile.nickname,
    gender: profile.gender,
    birth_date: profile.birth_date,
    height_cm: profile.height_cm ? Number(profile.height_cm) : null,
    weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
    occupation: profile.occupation,
    salary_range: profile.salary_range,
    orientation: profile.orientation,
    bio: profile.bio,
    // Add other fields from API doc if they are in the form and updatable
    // e.g. tags: profile.tags, q_and_a: profile.q_and_a
  };
  // Remove null/undefined fields as API expects only fields to update
  Object.keys(profileDataToUpdate).forEach(key => {
    if (profileDataToUpdate[key] === null || profileDataToUpdate[key] === undefined || profileDataToUpdate[key] === '') {
      // Keep empty strings for text fields if API allows clearing them, otherwise delete
      // For now, let's assume empty strings are fine for text, null for numbers/dates if not set
      if (profileDataToUpdate[key] === '') {
         // delete profileDataToUpdate[key]; // Or keep if API allows setting empty string
      }
    }
  });


  try {
    // 2. Update textual profile data
    const updateResponse = await makeApiRequest('/users/me/profile', 'PUT', profileDataToUpdate);

    if (updateResponse.statusCode === 200) {
      uni.showToast({
        title: '资料保存成功',
        icon: 'success',
        duration: 1500,
      });
      // Update local profile with response if needed, API returns updatedProfile
      if (updateResponse.data.updatedProfile) {
          Object.assign(profile, updateResponse.data.updatedProfile);
           if (updateResponse.data.updatedProfile.photos && Array.isArray(updateResponse.data.updatedProfile.photos)) {
                profile.photos = updateResponse.data.updatedProfile.photos.map(p => ({
                    ...p,
                    is_avatar: p.url === updateResponse.data.updatedProfile.avatar_url || p.is_avatar
                }));
            } else {
                profile.photos = [];
            }
            profile.avatar_url = updateResponse.data.updatedProfile.avatar_url || '';
      }

      // Navigate back or to index
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);

    } else {
      uni.showToast({ title: `保存失败: ${updateResponse.data?.error?.message || updateResponse.statusCode}`, icon: 'none' });
    }
  } catch (error) {
    console.error("Save profile error:", error);
    uni.showToast({ title: '保存资料失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

</script>

<style scoped lang="scss">
.profile-edit-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
}

.page-header {
  background: #ffffff;
  padding: 20rpx 30rpx;
  padding-top: calc(var(--status-bar-height) + 20rpx);
  text-align: center;
  box-shadow: 0 1rpx 5rpx rgba(0, 0, 0, 0.05);
  border-bottom: 1rpx solid #eee;
  .page-title {
    font-size: 34rpx;
    font-weight: 500;
    color: #333;
  }
}

.form-scroll-view {
  flex: 1;
  padding-bottom: 140rpx; /* 为底部保存按钮留出空间 */
}

.form-section {
  background-color: #ffffff;
  margin-top: 20rpx;
  &:first-child {
    margin-top: 0;
  }
  .section-title {
    display: block;
    font-size: 30rpx;
    color: #333;
    font-weight: 500;
    padding: 25rpx 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
  }
}

.form-item {
  display: flex;
  align-items: center;
  padding: 25rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 30rpx;
  min-height: 50rpx; 

  &:last-child {
    border-bottom: none;
  }

  .item-label {
    width: 180rpx; 
    color: #333;
    flex-shrink: 0;
  }

  .item-input {
    flex: 1;
    text-align: right;
    color: #555;
    font-size: 30rpx;
  }
  
  .item-input::placeholder, uni-input::placeholder {
    color: #bbb;
    font-size: 28rpx;
  }

  .picker-display {
    flex: 1;
    text-align: right;
    color: #555;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    .picker-arrow {
      width: 24rpx;
      height: 24rpx;
      margin-left: 10rpx;
      opacity: 0.6;
    }
  }
  
  .item-textarea {
    flex: 1;
    height: 180rpx;
    font-size: 28rpx;
    color: #555;
    padding: 15rpx;
    background-color: #f9f9f9;
    border-radius: 10rpx;
    width: calc(100% - 180rpx); 
  }
  .item-textarea::placeholder {
    color: #bbb;
  }
}

.image-uploader {
  padding: 30rpx;
  .image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
  }
  .image-preview-item {
    width: 150rpx;
    height: 150rpx;
    border-radius: 10rpx;
    position: relative;
    overflow: hidden;
    .preview-image {
      width: 100%;
      height: 100%;
    }
    .preview-image.is-avatar {
      border: 2px solid #6e8efb; /* Highlight avatar */
    }
    .avatar-tag {
      position: absolute;
      top: 5rpx;
      left: 5rpx;
      background-color: rgba(110, 142, 251, 0.8);
      color: white;
      font-size: 18rpx;
      padding: 3rpx 8rpx;
      border-radius: 5rpx;
    }
    .delete-icon {
      position: absolute;
      top: 0rpx;
      right: 0rpx;
      width: 36rpx;
      height: 36rpx;
      background-color: rgba(0, 0, 0, 0.6);
      color: white;
      border-radius: 0 0 0 10rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      line-height: 1;
      cursor: pointer;
    }
    .set-avatar-btn {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      font-size: 20rpx;
      background-color: rgba(0,0,0,0.5);
      color: white;
      border: none;
      padding: 5rpx 0;
      text-align: center;
      line-height: 1.2;
      border-radius: 0 0 10rpx 10rpx;
    }
  }
  .upload-btn {
    width: 150rpx;
    height: 150rpx;
    background-color: #f0f2f5;
    border: 1rpx dashed #ccc;
    border-radius: 10rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #888;
    .plus-icon {
      font-size: 50rpx;
      line-height: 1;
    }
    .upload-text {
      font-size: 22rpx;
      margin-top: 10rpx;
    }
  }
  .upload-tip {
    display: block;
    font-size: 24rpx;
    color: #999;
    margin-top: 20rpx;
  }
}

.save-button-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.save-button {
  background: linear-gradient(135deg, #6e8efb, #a777e3);
  color: white;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: 50rpx;
  height: 88rpx;
  line-height: 88rpx;
  &:active {
    opacity: 0.9;
  }
}
</style>
