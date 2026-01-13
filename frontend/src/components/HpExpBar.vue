<template>
	<view class="hp-exp-container">
		<!-- HP状态条 - 每日匹配次数 -->
		<view class="stat-bar-row">
			<view class="stat-label">
				<text class="stat-name">HP</text>
				<text class="stat-value">{{ currentHp }}/{{ maxHp }}</text>
			</view>
			<view class="bar-container hp-bar">
				<view
					class="bar-fill hp-fill"
					:style="{ width: hpPercentage + '%' }"
				>
					<view class="bar-shine"></view>
				</view>
			</view>
		</view>

		<!-- EXP状态条 - 经验值 -->
		<view class="stat-bar-row">
			<view class="stat-label">
				<text class="stat-name">EXP</text>
				<text class="stat-value">{{ currentExp }}/{{ nextLevelExp }}</text>
			</view>
			<view class="bar-container exp-bar">
				<view
					class="bar-fill exp-fill"
					:style="{ width: expPercentage + '%' }"
				>
					<view class="bar-shine"></view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	// 当前HP（剩余匹配次数）
	currentHp: {
		type: Number,
		default: 5
	},
	// 最大HP（最大匹配次数）
	maxHp: {
		type: Number,
		default: 10
	},
	// 当前经验值
	currentExp: {
		type: Number,
		default: 0
	},
	// 升级所需经验
	nextLevelExp: {
		type: Number,
		default: 100
	}
});

// 计算HP百分比
const hpPercentage = computed(() => {
	return Math.min(100, Math.max(0, (props.currentHp / props.maxHp) * 100));
});

// 计算EXP百分比
const expPercentage = computed(() => {
	return Math.min(100, Math.max(0, (props.currentExp / props.nextLevelExp) * 100));
});
</script>

<style scoped>
.hp-exp-container {
	background: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(10px);
	border: 4px solid #000000;
	border-radius: 16px;
	padding: 24rpx;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-bar-row {
	margin-bottom: 20rpx;
}

.stat-bar-row:last-child {
	margin-bottom: 0;
}

.stat-label {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8rpx;
	font-family: 'Varela Round', 'Nunito', sans-serif;
}

.stat-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #000000;
}

.stat-value {
	font-size: 24rpx;
	color: #666666;
}

.bar-container {
	position: relative;
	width: 100%;
	height: 32rpx;
	background: #ffffff;
	border: 3px solid #000000;
	border-radius: 8rpx;
	overflow: hidden;
	box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.bar-fill {
	height: 100%;
	position: relative;
	transition: width 0.3s ease;
	border-radius: 4rpx;
}

/* HP条样式 */
.hp-fill {
	background: linear-gradient(180deg, #FF6B6B 0%, #FF5A5A 50%, #E84949 100%);
	border-right: 2px solid #000000;
}

/* EXP条样式 */
.exp-fill {
	background: linear-gradient(180deg, #5AA0FF 0%, #4A90E2 50%, #3A80D2 100%);
	border-right: 2px solid #000000;
}

/* 条形光泽效果 */
.bar-shine {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 50%;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 100);
	animation: shine 2s ease-in-out infinite;
}

@keyframes shine {
	0%, 100% {
		opacity: 0.3;
	}
	50% {
		opacity: 0.6;
	}
}
</style>
