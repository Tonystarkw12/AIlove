<template>
	<view
		:class="['gameboy-button', sizeClass, { 'is-disabled': disabled, 'is-loading': loading }]"
		@tap="handleTap"
	>
		<view v-if="loading" class="loading-spinner"></view>
		<text v-else class="button-text">
			<slot>{{ text }}</slot>
		</text>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	// 按钮文字
	text: {
		type: String,
		default: '按钮'
	},
	// 按钮大小：small, medium, large
	size: {
		type: String,
		default: 'medium'
	},
	// 按钮类型：primary, secondary, danger, success
	type: {
		type: String,
		default: 'primary'
	},
	// 是否禁用
	disabled: {
		type: Boolean,
		default: false
	},
	// 是否加载中
	loading: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(['tap']);

// 尺寸类名
const sizeClass = computed(() => {
	return `size-${props.size}`;
});

// 处理点击
function handleTap() {
	if (props.disabled || props.loading) return;
	emit('tap');
}
</script>

<style scoped>
.gameboy-button {
	position: relative;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 4px solid #000000;
	box-shadow: 4px 4px 0px 0px #000000;
	transition: all 0.1s;
	cursor: pointer;
	font-family: 'Varela Round', 'Nunito', sans-serif;
	font-weight: bold;
}

.gameboy-button:active:not(.is-disabled):not(.is-loading) {
	transform: translate(2px, 2px);
	box-shadow: 2px 2px 0px 0px #000000;
}

.is-disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.is-loading {
	cursor: wait;
}

/* 尺寸 */
.size-small {
	padding: 12rpx 32rpx;
	border-radius: 12rpx;
	font-size: 24rpx;
}

.size-medium {
	padding: 20rpx 48rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}

.size-large {
	padding: 28rpx 64rpx;
	border-radius: 20rpx;
	font-size: 32rpx;
}

/* 按钮类型 */
.size-small,
.size-medium,
.size-large {
	background: linear-gradient(180deg, #9BBC0F 0%, #8BAC0F 100%);
}

.size-small.type-primary,
.size-medium.type-primary,
.size-large.type-primary {
	background: linear-gradient(180deg, #FFCB05 0%, #E5B800 100%);
}

.size-small.type-secondary,
.size-medium.type-secondary,
.size-large.type-secondary {
	background: linear-gradient(180deg, #3B4CCA 0%, #2A3BBA 100%);
	color: #ffffff;
}

.size-small.type-danger,
.size-medium.type-danger,
.size-large.type-danger {
	background: linear-gradient(180deg, #FF5A5A 0%, #E84949 100%);
	color: #ffffff;
}

.size-small.type-success,
.size-medium.type-success,
.size-large.type-success {
	background: linear-gradient(180deg, #78C850 0%, #68B840 100%);
	color: #ffffff;
}

/* 文字 */
.button-text {
	color: #000000;
}

/* 加载动画 */
.loading-spinner {
	width: 32rpx;
	height: 32rpx;
	border: 4px solid #000000;
	border-top-color: transparent;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
