import { createSSRApp } from "vue";
import App from "./App.vue";

// 导入API配置
import { API_BASE_URL } from './config';

// 导入TailwindCSS样式
import "./styles/tailwind.css";

export function createApp() {
	const app = createSSRApp(App);

	// 配置全局属性
	app.config.globalProperties.$baseUrl = API_BASE_URL;

	return {
		app,
	};
}
