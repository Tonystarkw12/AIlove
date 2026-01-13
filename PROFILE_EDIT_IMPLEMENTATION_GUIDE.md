# 个人资料编辑页面 - 实施指南

**文件**: `/mnt/f/AIlove/frontend/src/pages/profile/edit.vue`

## 完整代码模板

```vue
<template>
  <view class="profile-edit-container">
    <!-- 顶部导航 -->
    <view class="header">
      <view class="header-left" @tap="goBack">
        <uni-icons type="left" size="20" color="#333"></uni-icons>
      </view>
      <text class="header-title">编辑资料</text>
      <view class="header-right"></view>
    </view>

    <!-- 资料完整度进度 -->
    <view class="completeness-card">
      <view class="completeness-header">
        <text class="completeness-title">资料完整度</text>
        <text class="completeness-score">{{ completeness }}%</text>
      </view>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: completeness + '%' }"></view>
      </view>
      <text class="completeness-tip">
        {{ completeness >= 60 ? '资料完整，可以开始匹配' : '完善资料解锁更多功能' }}
      </text>
    </view>

    <scroll-view scroll-y class="form-container">
      <!-- 基础信息卡片 -->
      <view class="card">
        <view class="card-title">
          <uni-icons type="person" size="18" color="#667eea"></uni-icons>
          <text>基础信息</text>
        </view>

        <view class="form-group">
          <view class="form-label">星座</view>
          <picker
            mode="selector"
            :range="constellations"
            :value="constellationIndex"
            @change="onConstellationChange"
          >
            <view class="picker-value">
              {{ formData.constellation || '请选择星座' }}
              <uni-icons type="right" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <view class="form-label">身高</view>
          <input
            class="form-input"
            type="number"
            v-model="formData.height"
            placeholder="请输入身高"
          />
          <text class="form-unit">cm</text>
        </view>

        <view class="form-group">
          <view class="form-label">体重</view>
          <input
            class="form-input"
            type="number"
            v-model="formData.weight"
            placeholder="请输入体重"
          />
          <text class="form-unit">kg</text>
        </view>

        <view class="form-group">
          <view class="form-label">月收入</view>
          <picker
            mode="selector"
            :range="incomeRanges"
            :value="incomeIndex"
            @change="onIncomeChange"
          >
            <view class="picker-value">
              {{ formData.monthly_income_text || '请选择收入范围' }}
              <uni-icons type="right" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <view class="form-group">
          <view class="form-label">职业</view>
          <input
            class="form-input"
            v-model="formData.occupation"
            placeholder="请输入职业"
          />
        </view>

        <view class="form-group">
          <view class="form-label">家庭情况</view>
          <picker
            mode="selector"
            :range="familyStatuses"
            :value="familyStatusIndex"
            @change="onFamilyStatusChange"
          >
            <view class="picker-value">
              {{ formData.family_status || '请选择家庭情况' }}
              <uni-icons type="right" size="14" color="#999"></uni-icons>
            </view>
          </picker>
        </view>
      </view>

      <!-- 性别与取向卡片 -->
      <view class="card">
        <view class="card-title">
          <uni-icons type="heart" size="18" color="#667eea"></uni-icons>
          <text>性别与取向</text>
        </view>

        <radio-group class="gender-group" @change="onGenderChange">
          <label
            class="gender-option"
            v-for="option in genderOptions"
            :key="option.value"
            :class="{ 'gender-selected': formData.gender === option.value }"
          >
            <radio
              :value="option.value"
              :checked="formData.gender === option.value"
              color="#667eea"
            />
            <text class="gender-label">{{ option.label }}</text>
          </label>
        </radio-group>
      </view>

      <!-- 照片上传卡片 -->
      <view class="card">
        <view class="card-title">
          <uni-icons type="image" size="18" color="#667eea"></uni-icons>
          <text>生活照（最多9张）</text>
        </view>

        <view class="photos-grid">
          <!-- 已上传的照片 -->
          <view
            class="photo-item"
            v-for="(photo, index) in formData.photos"
            :key="index"
          >
            <image class="photo-image" :src="photo" mode="aspectFill"></image>
            <view class="photo-delete" @tap="deletePhoto(index)">
              <uni-icons type="clear" size="16" color="#fff"></uni-icons>
            </view>
          </view>

          <!-- 上传按钮 -->
          <view class="photo-upload" @tap="choosePhoto" v-if="formData.photos.length < 9">
            <uni-icons type="plus" size="30" color="#999"></uni-icons>
            <text class="upload-text">上传照片</text>
          </view>
        </view>
      </view>

      <!-- VIP信息卡片 -->
      <view class="card vip-card">
        <view class="vip-header">
          <uni-icons type="star-filled" size="20" color="#FFD700"></uni-icons>
          <text class="vip-title">VIP会员</text>
        </view>

        <view class="vip-info">
          <view class="vip-level">
            <text class="level-label">当前等级：</text>
            <text class="level-value">{{ vipInfo.level }}</text>
          </view>

          <view class="vip-expire" v-if="vipInfo.expiresAt">
            <text class="expire-label">到期时间：</text>
            <text class="expire-value">{{ formatDate(vipInfo.expiresAt) }}</text>
          </view>

          <view class="vip-expire" v-else>
            <text class="expire-value">暂未开通VIP</text>
          </view>
        </view>

        <button class="upgrade-btn" @tap="goToVip">
          {{ vipInfo.isVip ? '续费VIP' : '升级VIP' }}
        </button>
      </view>
    </scroll-view>

    <!-- 底部保存按钮 -->
    <view class="footer">
      <button
        class="save-btn"
        :class="{ 'btn-loading': isSaving }"
        :disabled="isSaving"
        @tap="handleSave"
      >
        {{ isSaving ? '保存中...' : '保存资料' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import request from '@/utils/request';

// 表单数据
const formData = ref({
  constellation: '',
  height: '',
  weight: '',
  monthly_income: '',
  monthly_income_text: '',
  occupation: '',
  family_status: '',
  gender: 'Male',
  photos: []
});

// VIP信息
const vipInfo = ref({
  level: '普通训练师',
  isVip: false,
  expiresAt: null
});

// 资料完整度
const completeness = ref(0);

// 保存状态
const isSaving = ref(false);

// 选项数据
const constellations = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
];

const incomeRanges = [
  '5000以下', '5000-10000', '10000-20000',
  '20000-50000', '50000以上'
];

const familyStatuses = [
  '未婚', '已婚未育', '已婚已育', '离异', '丧偶'
];

const genderOptions = [
  { value: 'Male', label: '男' },
  { value: 'Female', label: '女' },
  { value: 'Gay', label: '男同' },
  { value: 'Lesbian', label: '女同' }
];

// 选择器索引
const constellationIndex = ref(0);
const incomeIndex = ref(0);
const familyStatusIndex = ref(0);

onMounted(() => {
  loadUserProfile();
});

/**
 * 加载用户资料
 */
async function loadUserProfile() {
  try {
    const userData = await request({
      url: '/api/users/me/profile',
      method: 'GET'
    });

    // 填充表单数据
    if (userData) {
      formData.value = {
        constellation: userData.constellation || '',
        height: userData.height || '',
        weight: userData.weight || '',
        monthly_income: userData.monthly_income || '',
        occupation: userData.occupation || '',
        family_status: userData.family_status || '',
        gender: userData.gender || 'Male',
        photos: userData.photos || []
      };

      // 设置选择器索引
      if (formData.value.constellation) {
        constellationIndex.value = constellations.indexOf(formData.value.constellation);
      }

      if (userData.monthly_income) {
        // 根据收入值设置索引
        const income = parseInt(userData.monthly_income);
        if (income < 5000) incomeIndex.value = 0;
        else if (income < 10000) incomeIndex.value = 1;
        else if (income < 20000) incomeIndex.value = 2;
        else if (income < 50000) incomeIndex.value = 3;
        else incomeIndex.value = 4;
      }

      if (formData.value.family_status) {
        familyStatusIndex.value = familyStatuses.indexOf(formData.value.family_status);
      }
    }

    // 加载完整度
    const status = await request({
      url: '/api/users/me/status',
      method: 'GET'
    });

    if (status) {
      completeness.value = status.profileCompleteness || 0;
      vipInfo.value = {
        level: status.vipLevel || '普通训练师',
        isVip: status.isVip || false,
        expiresAt: status.vipExpiresAt || null
      };
    }

  } catch (error) {
    console.error('加载用户资料失败:', error);
  }
}

/**
 * 选择星座
 */
function onConstellationChange(e) {
  constellationIndex.value = e.detail.value;
  formData.value.constellation = constellations[e.detail.value];
}

/**
 * 选择收入
 */
function onIncomeChange(e) {
  incomeIndex.value = e.detail.value;
  const range = incomeRanges[e.detail.value];
  formData.value.monthly_income_text = range;

  // 转换为具体数值（取中间值）
  const incomeMap = {
    '5000以下': 3000,
    '5000-10000': 7500,
    '10000-20000': 15000,
    '20000-50000': 35000,
    '50000以上': 70000
  };
  formData.value.monthly_income = incomeMap[range];
}

/**
 * 选择家庭情况
 */
function onFamilyStatusChange(e) {
  familyStatusIndex.value = e.detail.value;
  formData.value.family_status = familyStatuses[e.detail.value];
}

/**
 * 选择性别
 */
function onGenderChange(e) {
  formData.value.gender = e.detail.value;
}

/**
 * 选择照片
 */
function choosePhoto() {
  uni.chooseImage({
    count: 9 - formData.value.photos.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      uploadPhotos(res.tempFilePaths);
    }
  });
}

/**
 * 上传照片
 */
async function uploadPhotos(tempFilePaths) {
  try {
    uni.showLoading({ title: '上传中...' });

    for (let filePath of tempFilePaths) {
      const result = await request({
        url: '/api/users/me/photos',
        method: 'POST',
        data: {
          photos: [filePath] // uniapp会自动处理文件上传
        }
      });

      if (result && result.photos) {
        formData.value.photos = result.photos;
      }
    }

    uni.hideLoading();
    uni.showToast({
      title: '上传成功',
      icon: 'success'
    });

  } catch (error) {
    uni.hideLoading();
    uni.showToast({
      title: '上传失败',
      icon: 'none'
    });
  }
}

/**
 * 删除照片
 */
function deletePhoto(index) {
  uni.showModal({
    title: '提示',
    content: '确定删除这张照片吗？',
    success: (res) => {
      if (res.confirm) {
        formData.value.photos.splice(index, 1);
      }
    }
  });
}

/**
 * 保存资料
 */
async function handleSave() {
  if (isSaving.value) return;

  isSaving.value = true;

  try {
    await request({
      url: '/api/users/me/profile',
      method: 'PUT',
      data: {
        constellation: formData.value.constellation,
        height: formData.value.height ? parseInt(formData.value.height) : null,
        weight: formData.value.weight ? parseInt(formData.value.weight) : null,
        monthly_income: formData.value.monthly_income ? parseInt(formData.value.monthly_income) : null,
        occupation: formData.value.occupation,
        family_status: formData.value.family_status,
        gender: formData.value.gender,
        photos: formData.value.photos
      }
    });

    uni.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000
    });

    setTimeout(() => {
      uni.navigateBack();
    }, 2000);

  } catch (error) {
    console.error('保存失败:', error);

    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none'
    });

  } finally {
    isSaving.value = false;
  }
}

/**
 * 返回
 */
function goBack() {
  uni.navigateBack();
}

/**
 * 跳转VIP页面
 */
function goToVip() {
  uni.navigateTo({
    url: '/pages/vip/index'
  });
}

/**
 * 格式化日期
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
</script>

<style lang="scss" scoped>
.profile-edit-container {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 120rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 30rpx;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;

  .header-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

.completeness-card {
  margin: 20rpx 30rpx;
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;

  .completeness-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
  }

  .completeness-title {
    font-size: 28rpx;
    color: #ffffff;
  }

  .completeness-score {
    font-size: 48rpx;
    font-weight: bold;
    color: #ffffff;
  }

  .progress-bar {
    height: 16rpx;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 8rpx;
    overflow: hidden;
    margin-bottom: 15rpx;
  }

  .progress-fill {
    height: 100%;
    background: #ffffff;
    border-radius: 8rpx;
    transition: width 0.3s;
  }

  .completeness-tip {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.8);
  }
}

.form-container {
  padding: 0 30rpx;
}

.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;

  .card-title {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 30rpx;
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
  }
}

.form-group {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f7fa;

  &:last-child {
    border-bottom: none;
  }
}

.form-label {
  width: 150rpx;
  font-size: 28rpx;
  color: #666;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.form-unit {
  margin-left: 10rpx;
  font-size: 24rpx;
  color: #999;
}

.picker-value {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #333;
}

.gender-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.gender-option {
  flex: 0 0 calc(50% - 10rpx);
  display: flex;
  align-items: center;
  padding: 20rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 10rpx;
  transition: all 0.3s;

  &.gender-selected {
    border-color: #667eea;
    background: #f5f7fa;
  }

  .gender-label {
    margin-left: 10rpx;
    font-size: 28rpx;
    color: #333;
  }
}

.photos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15rpx;
}

.photo-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
}

.photo-image {
  width: 100%;
  height: 100%;
  border-radius: 10rpx;
}

.photo-delete {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 40rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-upload {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed #ddd;
  border-radius: 10rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;

  .upload-text {
    font-size: 24rpx;
    color: #999;
  }
}

.vip-card {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);

  .vip-header {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 20rpx;
  }

  .vip-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #ffffff;
  }

  .vip-info {
    margin-bottom: 30rpx;
  }

  .vip-level,
  .vip-expire {
    display: flex;
    margin-bottom: 10rpx;

    text {
      font-size: 26rpx;
      color: #ffffff;
    }
  }

  .level-value {
    font-weight: bold;
  }

  .upgrade-btn {
    width: 100%;
    height: 80rpx;
    background: #ffffff;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: bold;
    color: #FFA500;
    border: none;
  }
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #ffffff;
  border-top: 1rpx solid #f0f0f0;
  z-index: 100;
}

.save-btn {
  width: 100%;
  height: 90rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 45rpx;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: bold;
  border: none;

  &.btn-loading {
    opacity: 0.6;
  }
}
</style>
```

## 实施步骤

### 1. 备份现有文件
```bash
cp /mnt/f/AIlove/frontend/src/pages/profile/edit.vue /mnt/f/AIlove/frontend/src/pages/profile/edit.vue.backup
```

### 2. 使用上述代码替换edit.vue
```bash
# 直接复制上面的完整代码到edit.vue文件
```

### 3. 测试功能
1. 打开"我的"页面
2. 点击"编辑资料"
3. 填写各个字段
4. 点击"保存资料"
5. 查看完整度是否更新

### 4. 验证数据库更新
```bash
# 查看用户完整度
TOKEN="your_token"
curl -X GET "http://localhost:3000/api/users/me/status" \
  -H "Authorization: Bearer $TOKEN" | jq '.profileCompleteness'
```

## API接口要求

确保后端支持以下字段更新：

```javascript
PUT /api/users/me/profile
{
  "constellation": "天蝎座",
  "height": 170,
  "weight": 60,
  "monthly_income": 15000,
  "occupation": "设计师",
  "family_status": "未婚",
  "gender": "Female",
  "photos": ["url1", "url2"]
}
```

## 注意事项

1. **照片上传**: 需要后端支持multer文件上传
2. **数据类型**: 身高体重转为整数
3. **性别枚举**: 必须是 Male/Female/Gay/Lesbian 之一
4. **完整度计算**: 触发器会自动计算，无需手动更新

## 预计工作量

- 编码时间: 1-2小时
- 测试时间: 30分钟
- 总计: 1.5-2.5小时

---

**完成标准**:
- [ ] 所有字段都能正常显示
- [ ] 所有选择器都能正常工作
- [ ] 照片上传功能正常
- [ ] 保存后数据库正确更新
- [ ] 完整度正确计算和显示
- [ ] VIP信息正确显示
