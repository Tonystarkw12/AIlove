/**
 * 宝可梦性格映射服务
 * 根据用户性格标签映射到对应的宝可梦
 */

// 性格关键词到宝可梦类型的映射
const personalityToType = {
	// 热情 → 火
	'热情': 'fire', '活泼': 'fire', '充满活力': 'fire', '激情': 'fire',
	'外向': 'fire', '开朗': 'fire', '阳光': 'fire',

	// 温柔 → 水
	'温柔': 'water', '善解人意': 'water', '包容': 'water', '体贴': 'water',
	'冷静': 'water', '沉稳': 'water', '平和': 'water',

	// 幽默 → 电
	'幽默': 'electric', '风趣': 'electric', '机智': 'electric',
	'聪明': 'electric', '灵气': 'electric', '活泼': 'electric',

	// 坚韧 → 草
	'坚韧': 'grass', '执着': 'grass', '勤奋': 'grass',
	'耐心': 'grass', '稳重': 'grass', '踏实': 'grass',

	// 浪漫 → 妖精
	'浪漫': 'fairy', '温柔': 'fairy', '可爱': 'fairy',
	'甜美': 'fairy', '梦幻': 'fairy', '纯真': 'fairy',

	// 理性 → 超能
	'理性': 'psychic', '理智': 'psychic', '聪明': 'psychic',
	'智慧': 'psychic', '深思熟虑': 'psychic', '理性思考': 'psychic',

	// 勇敢 → 格斗
	'勇敢': 'fighting', '果断': 'fighting', '坚强': 'fighting',
	'刚毅': 'fighting', '魄力': 'fighting', '大胆': 'fighting',

	// 神秘 → 幽灵
	'神秘': 'ghost', '深沉': 'ghost', '内敛': 'ghost',
	'独特': 'ghost', '个性': 'ghost', '另类': 'ghost',

	// 自由 → 飞行
	'自由': 'flying', '随性': 'flying', '洒脱': 'flying',
	'轻松': 'flying', '无拘无束': 'flying',

	// 稳重 → 岩石
	'稳重': 'rock', '可靠': 'rock', '值得信赖': 'rock',
	'踏实': 'rock', '稳重': 'rock',

	// 忠诚 → 一般
	'忠诚': 'normal', '诚实': 'normal', '真诚': 'normal',
	'直率': 'normal', '朴素': 'normal', '平凡': 'normal'
};

// 每种类型对应的宝可梦列表（包含头像ID）
const typeToPokemon = {
	fire: [
		{ id: 'charmander', name: '小火龙', avatarId: '004' },
		{ id: 'vulpix', name: '六尾', avatarId: '037' },
		{ id: 'growlithe', name: '卡蒂狗', avatarId: '058' },
		{ id: 'ponyta', name: '小火马', avatarId: '077' },
		{ id: 'flareon', name: '火伊布', avatarId: '136' }
	],
	water: [
		{ id: 'squirtle', name: '杰尼龟', avatarId: '007' },
		{ id: 'psyduck', name: '可达鸭', avatarId: '054' },
		{ id: 'shellder', name: '大舌贝', avatarId: '090' },
		{ id: 'staryu', name: '海星星', avatarId: '120' },
		{ id: 'vaporeon', name: '水伊布', avatarId: '134' }
	],
	electric: [
		{ id: 'pikachu', name: '皮卡丘', avatarId: '025' },
		{ id: 'magnemite', name: '小磁怪', avatarId: '081' },
		{ id: 'voltorb', name: '霹雳球', avatarId: '100' },
		{ id: 'electabuzz', name: '电击兽', avatarId: '125' },
		{ id: 'jolteon', name: '雷伊布', avatarId: '135' }
	],
	grass: [
		{ id: 'bulbasaur', name: '妙蛙种子', avatarId: '001' },
		{ id: 'oddish', name: '走路草', avatarId: '043' },
		{ id: 'bellsprout', name: '喇叭芽', avatarId: '069' },
		{ id: 'exeggcute', name: '蛋蛋', avatarId: '102' },
		{ id: 'leafeon', name: '叶伊布', avatarId: '470' }
	],
	fairy: [
		{ id: 'clefairy', name: '皮皮', avatarId: '035' },
		{ id: 'jigglypuff', name: '胖丁', avatarId: '039' },
		{ id: 'chansey', name: '吉利蛋', avatarId: '113' },
		{ id: 'snorlax', name: '卡比兽', avatarId: '143' },
		{ id: 'sylveon', name: '仙子伊布', avatarId: '700' }
	],
	psychic: [
		{ id: 'abra', name: '凯西', avatarId: '063' },
		{ id: 'slowpoke', name: '呆呆兽', avatarId: '079' },
		{ id: 'drowzee', name: '催眠貘', avatarId: '096' },
		{ id: 'mr_mime', name: '魔墙人偶', avatarId: '122' },
		{ id: 'mewtwo', name: '超梦', avatarId: '150' }
	],
	fighting: [
		{ id: 'machop', name: '腕力', avatarId: '066' },
		{ id: 'mankey', name: '猴怪', avatarId: '056' },
		{ id: 'primeape', name: '火爆猴', avatarId: '057' },
		{ id: 'hitmonlee', name: '飞腿郎', avatarId: '106' },
		{ id: 'hitmonchan', name: '快拳郎', avatarId: '107' }
	],
	ghost: [
		{ id: 'gastly', name: '鬼斯', avatarId: '092' },
		{ id: 'haunter', name: '鬼斯通', avatarId: '093' },
		{ id: 'gengar', name: '耿鬼', avatarId: '094' },
		{ id: 'misdreavus', name: '惊角鹿', avatarId: '200' },
		{ id: 'shuppet', name: '怨影娃娃', avatarId: '353' }
	],
	flying: [
		{ id: 'pidgey', name: '波波', avatarId: '016' },
		{ id: 'spearow', name: '烈雀', avatarId: '021' },
		{ id: 'farfetchd', name: '大葱鸭', avatarId: '083' },
		{ id: 'scyther', name: '飞天螳螂', avatarId: '123' },
		{ id: 'togetic', name: '波克基斯', avatarId: '176' }
	],
	rock: [
		{ id: 'geodude', name: '小拳石', avatarId: '074' },
		{ id: 'onix', name: '大岩蛇', avatarId: '095' },
		{ id: 'cubone', name: '卡拉卡拉', avatarId: '104' },
		{ id: 'rhyhorn', name: '独角犀牛', avatarId: '111' },
		{ id: 'larvitar', name: '幼基拉斯', avatarId: '246' }
	],
	normal: [
		{ id: 'eevee', name: '伊布', avatarId: '133' },
		{ id: 'snorlax', name: '卡比兽', avatarId: '143' },
		{ id: 'tauros', name: '肯泰罗', avatarId: '128' },
		{ id: 'chansey', name: '吉利蛋', avatarId: '113' },
		{ id: 'porygon', name: '多边兽', avatarId: '137' }
	]
};

/**
 * 根据用户性格标签映射到宝可梦
 * @param {Array<string>} personalityTags - 用户性格标签数组
 * @returns {Object} 包含宝可梦信息的对象
 */
function mapPersonalityToPokemon(personalityTags = []) {
	if (!Array.isArray(personalityTags) || personalityTags.length === 0) {
		// 默认返回伊布
		return {
			type: 'normal',
			pokemon: { id: 'eevee', name: '伊布', avatarId: '133' },
			matchedTag: null
		};
	}

	// 统计每种类型出现的次数
	const typeCounts = {};
	let matchedTag = null;

	// 遍历用户标签，找到匹配的类型
	for (const tag of personalityTags) {
		for (const [keyword, type] of Object.entries(personalityToType)) {
			if (tag.includes(keyword)) {
				typeCounts[type] = (typeCounts[type] || 0) + 1;
				if (!matchedTag) {
					matchedTag = tag;
				}
				break;
			}
		}
	}

	// 如果没有匹配到，使用默认类型
	if (Object.keys(typeCounts).length === 0) {
		return {
			type: 'normal',
			pokemon: { id: 'eevee', name: '伊布', avatarId: '133' },
			matchedTag: null
		};
	}

	// 选择出现次数最多的类型
	let selectedType = 'normal';
	let maxCount = 0;
	for (const [type, count] of Object.entries(typeCounts)) {
		if (count > maxCount) {
			maxCount = count;
			selectedType = type;
		}
	}

	// 从该类型的宝可梦中随机选择一只
	const pokemonList = typeToPokemon[selectedType];
	const randomPokemon = pokemonList[Math.floor(Math.random() * pokemonList.length)];

	return {
		type: selectedType,
		pokemon: randomPokemon,
		matchedTag
	};
}

/**
 * 根据宝可梦头像ID获取头像URL
 * @param {string} avatarId - 宝可梦头像ID
 * @returns {string} 头像URL
 */
function getPokemonAvatarUrl(avatarId) {
	// 使用官方宝可梦API的图片资源
	return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${avatarId}.png`;
}

/**
 * 为用户分配或更新宝可梦头像
 * @param {Array<string>} personalityTags - 用户性格标签
 * @returns {Object} 包含头像ID和URL的对象
 */
function assignPokemonAvatar(personalityTags = []) {
	const result = mapPersonalityToPokemon(personalityTags);
	return {
		avatarId: result.pokemon.avatarId,
		pokemonName: result.pokemon.name,
		pokemonType: result.type,
		avatarUrl: getPokemonAvatarUrl(result.pokemon.avatarId),
		matchedTag: result.matchedTag
	};
}

module.exports = {
	mapPersonalityToPokemon,
	getPokemonAvatarUrl,
	assignPokemonAvatar,
	personalityToType,
	typeToPokemon
};
