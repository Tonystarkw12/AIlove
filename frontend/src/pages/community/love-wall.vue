<template>
	<view class="love-wall-container">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">甜蜜照片墙</text>
			<text class="page-subtitle">分享你们的幸福时刻</text>
		</view>

		<!-- 上传按钮 -->
		<view class="upload-section">
			<gameboy-button
				text="上传情侣照"
				type="primary"
				size="large"
				@tap="handleUploadPhoto"
			/>
			<text class="upload-hint">成功上传获得 500 积分奖励</text>
		</view>

		<!-- 照片瀑布流 -->
		<scroll-view
			class="photo-masonry"
			scroll-y
			@scrolltolower="loadMorePhotos"
		>
			<view class="masonry-grid">
				<view
					v-for="(photo, index) in photoList"
					:key="photo.id"
					class="masonry-item"
					:class="'column-' + (index % columnCount)"
				>
					<view class="polaroid-card">
						<image
							class="polaroid-photo"
							:src="photo.url"
							mode="aspectFill"
							@tap="previewPhoto(photo)"
						/>
						<view class="polaroid-footer">
							<text class="handwriting-date">{{ photo.displayDate }}</text>
							<text class="couple-names">{{ photo.coupleNames }}</text>
							<view class="like-section">
								<text class="like-count">❤️ {{ photo.likeCount }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 加载状态 -->
			<view v-if="loading" class="loading-text">
				<text>加载中...</text>
			</view>
			<view v-if="!hasMore && photoList.length > 0" class="no-more-text">
				<text>没有更多了</text>
			</view>
		</scroll-view>

		<!-- 空状态 -->
		<view v-if="photoList.length === 0 && !loading" class="empty-state">
			<text class="empty-icon">📸</text>
			<text class="empty-text">还没有甜蜜照片</text>
			<text class="empty-hint">成为第一对分享的情侣吧</text>
		</view>

		<!-- 上传弹窗 -->
		<uni-popup ref="uploadPopup" type="bottom">
			<view class="upload-popup">
				<view class="popup-header">
					<text class="popup-title">上传情侣照</text>
					<text class="popup-close" @tap="closeUploadPopup">✕</text>
				</view>

				<view class="upload-form">
					<view class="form-item">
						<text class="form-label">选择照片</text>
						<view class="photo-selector" @tap="choosePhoto">
							<image
								v-if="uploadForm.photoUrl"
								class="selected-photo"
								:src="uploadForm.photoUrl"
								mode="aspectFill"
							/>
							<view v-else class="photo-placeholder">
								<text class="placeholder-icon">📷</text>
								<text class="placeholder-text">点击选择照片</text>
							</view>
						</view>
					</view>

					<view class="form-item">
						<text class="form-label">纪念日</text>
						<picker
							mode="date"
							:value="uploadForm.date"
							@change="onDateChange"
						>
							<view class="date-picker">
								<text>{{ uploadForm.date || '选择日期' }}</text>
							</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="form-label">情侣昵称</text>
						<input
							v-model="uploadForm.names"
							class="text-input"
							placeholder="例如: 小明 & 小红"
							maxlength="20"
						/>
					</view>

					<view class="form-item">
						<text class="form-label">甜蜜寄语</text>
						<textarea
							v-model="uploadForm.message"
							class="text-input textarea"
							placeholder="写下你们的故事..."
							maxlength="100"
						/>
					</view>

					<gameboy-button
						text="提交审核"
						type="primary"
						size="large"
						:loading="uploading"
						@tap="submitPhoto"
					/>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import request from '@/utils/request';

// 数据
const photoList = ref([]);
const loading = ref(false);
const hasMore = ref(true);
const currentPage = ref(1);
const pageSize = 10;
const columnCount = 2; // 两列瀑布流

// 上传表单
const uploadPopup = ref(null);
const uploading = ref(false);
const uploadForm = ref({
	photoUrl: '',
	date: '',
	names: '',
	message: ''
});

// 获取照片列表
async function loadPhotos(page = 1, refresh = false) {
	if (loading.value) return;

	loading.value = true;
	try {
		const response = await request({
			url: '/api/community/photos',
			method: 'GET',
			data: {
				page,
				pageSize
			}
		});

		if (refresh) {
			photoList.value = response.photos;
		} else {
			photoList.value = [...photoList.value, ...response.photos];
		}

		hasMore.value = response.photos.length === pageSize;
		currentPage.value = page;
	} catch (error) {
		console.error('Load photos error:', error);
		uni.showToast({
			title: '加载失败',
			icon: 'none'
		});
	} finally {
		loading.value = false;
	}
}

// 加载更多
function loadMorePhotos() {
	if (!hasMore.value || loading.value) return;
	loadPhotos(currentPage.value + 1);
}

// 打开上传弹窗
function handleUploadPhoto() {
	uploadPopup.value.open();
}

// 关闭上传弹窗
function closeUploadPopup() {
	uploadPopup.value.close();
	// 重置表单
	uploadForm.value = {
		photoUrl: '',
		date: '',
		names: '',
		message: ''
	};
}

// 选择照片
async function choosePhoto() {
	try {
		const res = await uni.chooseImage({
			count: 1,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera']
		});

		const tempFilePath = res.tempFilePaths[0];
		uploadForm.value.photoUrl = tempFilePath;
	} catch (error) {
		console.error('Choose photo error:', error);
	}
}

// 日期选择
function onDateChange(e) {
	uploadForm.value.date = e.detail.value;
}

// 提交照片
async function submitPhoto() {
	if (!uploadForm.value.photoUrl) {
		uni.showToast({
			title: '请选择照片',
			icon: 'none'
		});
		return;
	}

	if (!uploadForm.value.date) {
		uni.showToast({
			title: '请选择纪念日',
			icon: 'none'
		});
		return;
	}

	uploading.value = true;
	try {
		// 先上传图片
		const uploadRes = await uni.uploadFile({
			url: this.$baseUrl + '/api/community/upload-photo',
			filePath: uploadForm.value.photoUrl,
			name: 'photo',
			header: {
				'Authorization': `Bearer ${uni.getStorageSync('token')}`
			}
		});

		const uploadData = JSON.parse(uploadRes.data);

		// 提交照片信息
		await request({
			url: '/api/community/submit-couple-photo',
			method: 'POST',
			data: {
				photoUrl: uploadData.url,
				date: uploadForm.value.date,
				names: uploadForm.value.names,
				message: uploadForm.value.message
			}
		});

		uni.showToast({
			title: '提交成功！审核通过后获得 500 积分',
			icon: 'success',
			duration: 3000
		});

		closeUploadPopup();
		// 刷新列表
		loadPhotos(1, true);
	} catch (error) {
		console.error('Submit photo error:', error);
		uni.showToast({
			title: '提交失败',
			icon: 'none'
		});
	} finally {
		uploading.value = false;
	}
}

// 预览照片
function previewPhoto(photo) {
	uni.previewImage({
		current: photo.url,
		urls: [photo.url]
	});
}

onMounted(() => {
	loadPhotos(1, true);
});
</script>

<style scoped>
.love-wall-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #9BBC0F 0%, #8BAC0F 100%);
	padding-bottom: 40rpx;
}

/* 页面头部 */
.page-header {
	text-align: center;
	padding: 60rpx 40rpx 40rpx;
	background: rgba(255, 255, 255, 0.95);
	border-bottom: 4px solid #000000;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.page-title {
	display: block;
	font-size: 48rpx;
	font-weight: bold;
	color: #000000;
	margin-bottom: 16rpx;
	font-family: 'Varela Round', 'Nunito', sans-serif;
}

.page-subtitle {
	display: block;
	font-size: 28rpx;
	color: #666666;
}

/* 上传区域 */
.upload-section {
	padding: 40rpx;
	text-align: center;
}

.upload-hint {
	display: block;
	margin-top: 24rpx;
	font-size: 24rpx;
	color: #0F380F;
}

/* 照片瀑布流 */
.photo-masonry {
	height: calc(100vh - 400rpx);
	padding: 0 20rpx;
}

.masonry-grid {
	position: relative;
	display: flex;
}

.masonry-item {
	width: 50%;
	padding: 10rpx;
	box-sizing: border-box;
}

.polaroid-card {
	background: #ffffff;
	border-radius: 8rpx;
	box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
	transform: rotate(-2deg);
	transition: transform 0.3s;
	margin-bottom: 20rpx;
}

.polaroid-card:active {
	transform: rotate(0deg) scale(0.98);
}

.polaroid-photo {
	width: 100%;
	height: 300rpx;
	border-radius: 4rpx 4rpx 0 0;
	display: block;
}

.polaroid-footer {
	padding: 20rpx 16rpx 40rpx;
	background: #ffffff;
	border-radius: 0 0 8rpx 8rpx;
}

.handwriting-date {
	display: block;
	font-family: 'Caveat', 'Comic Sans MS', cursive;
	font-size: 32rpx;
	color: #0F380F;
	margin-bottom: 12rpx;
}

.couple-names {
	display: block;
	font-size: 24rpx;
	color: #333333;
	margin-bottom: 16rpx;
	font-weight: 600;
}

.like-section {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.like-count {
	font-size: 22rpx;
	color: #FF5A5A;
}

/* 加载状态 */
.loading-text,
.no-more-text {
	text-align: center;
	padding: 40rpx;
	font-size: 24rpx;
	color: #0F380F;
}

/* 空状态 */
.empty-state {
	text-align: center;
	padding: 120rpx 40rpx;
}

.empty-icon {
	display: block;
	font-size: 120rpx;
	margin-bottom: 24rpx;
}

.empty-text {
	display: block;
	font-size: 32rpx;
	color: #0F380F;
	margin-bottom: 16rpx;
	font-weight: 600;
}

.empty-hint {
	display: block;
	font-size: 24rpx;
	color: #306230;
}

/* 上传弹窗 */
.upload-popup {
	background: #ffffff;
	border-radius: 32rpx 32rpx 0 0;
	padding: 40rpx;
	max-height: 80vh;
	overflow-y: auto;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 40rpx;
}

.popup-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #000000;
}

.popup-close {
	font-size: 48rpx;
	color: #666666;
	padding: 0 20rpx;
}

.upload-form {
	padding: 0 20rpx;
}

.form-item {
	margin-bottom: 40rpx;
}

.form-label {
	display: block;
	font-size: 28rpx;
	color: #000000;
	margin-bottom: 16rpx;
	font-weight: 600;
}

.photo-selector {
	width: 100%;
	height: 400rpx;
	border: 4px dashed #000000;
	border-radius: 16rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	background: #f5f5f5;
}

.selected-photo {
	width: 100%;
	height: 100%;
	border-radius: 12rpx;
}

.photo-placeholder {
	text-align: center;
}

.placeholder-icon {
	display: block;
	font-size: 80rpx;
	margin-bottom: 16rpx;
}

.placeholder-text {
	display: block;
	font-size: 24rpx;
	color: #666666;
}

.date-picker {
	padding: 24rpx;
	border: 4px solid #000000;
	border-radius: 12rpx;
	background: #ffffff;
	font-size: 28rpx;
}

.text-input {
	width: 100%;
	padding: 24rpx;
	border: 4px solid #000000;
	border-radius: 12rpx;
	background: #ffffff;
	font-size: 28rpx;
	box-sizing: border-box;
}

.textarea {
	min-height: 150rpx;
	resize: none;
}
</style>
