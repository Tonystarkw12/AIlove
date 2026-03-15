# AIlove Landing Page

AIlove 落地宣传页面，采用 Pokemon/GameBoy 主题风格设计。

## 技术栈

- **React 19** - 前端框架
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Cloudflare Pages** - 托管平台

## 功能特性

- 🧠 Agent 智能分析系统展示
- 🎯 智能推荐算法介绍
- 💬 AI 聊天助手功能
- 🔮 情感预测模型
- 🛡️ 真人验证系统
- 📍 LBS 地理位置匹配

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 部署

项目已配置自动部署到 Cloudflare Pages ailove 项目。

```bash
# 手动部署
npm run build
npx wrangler pages deploy dist --project-name=ailove
```

## 链接

- **生产环境**: https://loveai.201014.xyz (需配置自定义域名)
- **Cloudflare Pages**: https://frontend-react.ailove-2w4.pages.dev
