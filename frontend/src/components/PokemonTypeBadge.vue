<template>
	<view :class="['pokemon-type-badge', `type-${type}`]">
		<text class="type-text">{{ typeLabel }}</text>
	</view>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
	// 宝可梦类型
	type: {
		type: String,
		default: 'normal',
		validator: (value) => [
			'normal', 'fire', 'water', 'electric', 'grass', 'ice',
			'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
			'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
		].includes(value)
	},
	// 自定义标签文字
	customLabel: {
		type: String,
		default: ''
	}
});

// 类型标签映射
const typeLabels = {
	normal: '一般',
	fire: '火',
	water: '水',
	electric: '电',
	grass: '草',
	ice: '冰',
	fighting: '格斗',
	poison: '毒',
	ground: '地面',
	flying: '飞行',
	psychic: '超能',
	bug: '虫',
	rock: '岩石',
	ghost: '幽灵',
	dragon: '龙',
	dark: '恶',
	steel: '钢',
	fairy: '妖精'
};

const typeLabel = computed(() => {
	return props.customLabel || typeLabels[props.type] || props.type;
});
</script>

<style scoped>
.pokemon-type-badge {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	padding: 6rpx 24rpx;
	border-radius: 24rpx;
	font-size: 22rpx;
	font-weight: bold;
	color: #ffffff;
	border: 3px solid #000000;
	box-shadow: 3px 3px 0px 0px #000000;
	font-family: 'Varela Round', 'Nunito', sans-serif;
}

.type-text {
	letter-spacing: 1rpx;
}

/* 类型颜色 */
.type-normal { background: #A8A878; }
.type-fire { background: #F08030; }
.type-water { background: #6890F0; }
.type-electric { background: #F8D030; }
.type-grass { background: #78C850; }
.type-ice { background: #98D8D8; }
.type-fighting { background: #C03028; }
.type-poison { background: #A040A0; }
.type-ground { background: #E0C068; }
.type-flying { background: #A890F0; }
.type-psychic { background: #F85888; }
.type-bug { background: #A8B820; }
.type-rock { background: #B8A038; }
.type-ghost { background: #705898; }
.type-dragon { background: #7038F8; }
.type-dark { background: #705848; }
.type-steel { background: #B8B8D0; }
.type-fairy { background: #EE99AC; }
</style>
