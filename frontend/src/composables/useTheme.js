import { ref, watch } from 'vue';

// 主题状态
const isDark = ref(false);
const THEME_KEY = 'ailove_theme';

// 从本地存储加载主题
function loadTheme() {
  try {
    const savedTheme = uni.getStorageSync(THEME_KEY);
    if (savedTheme !== '') {
      isDark.value = savedTheme === 'dark';
    }
  } catch (e) {
    console.error('加载主题失败:', e);
  }
}

// 初始化时加载主题
loadTheme();

// 监听主题变化并保存到本地存储
watch(isDark, (newValue) => {
  try {
    uni.setStorageSync(THEME_KEY, newValue ? 'dark' : 'light');
    // 通知所有页面更新主题
    uni.$emit('themeChanged', { isDark: newValue });
  } catch (e) {
    console.error('保存主题失败:', e);
  }
});

/**
 * 切换主题
 */
export function toggleTheme() {
  isDark.value = !isDark.value;
}

/**
 * 设置主题
 * @param {boolean} dark - 是否为暗色主题
 */
export function setTheme(dark) {
  isDark.value = dark;
}

/**
 * 获取当前主题
 * @returns {boolean} 是否为暗色主题
 */
export function getTheme() {
  return isDark.value;
}

/**
 * 使用主题 composable
 * @returns {Object} 主题相关的响应式数据和方法
 */
export function useTheme() {
  return {
    isDark,
    toggleTheme,
    setTheme,
    getTheme
  };
}
