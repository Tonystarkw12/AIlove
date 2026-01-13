# TabBar 图标文件说明

## 当前状态

已创建 SVG 占位图标文件：
- `/static/tabbar/love.svg` - 普通状态（灰色心形图标）
- `/static/tabbar/love_active.svg` - 激活状态（粉红色心形图标）

## 后续步骤

### 方案 1：使用 SVG（推荐）

更新 `pages.json` 中的图标路径：

```json
{
  "pagePath": "pages/community/love-wall",
  "iconPath": "static/tabbar/love.svg",
  "selectedIconPath": "static/tabbar/love_active.svg",
  "text": "甜蜜墙"
}
```

### 方案 2：转换为 PNG

如果需要 PNG 格式（推荐用于生产环境）：

1. **在线转换工具：**
   - 访问 https://cloudconvert.com/svg-to-png
   - 上传 SVG 文件
   - 下载 PNG 文件

2. **使用 ImageMagick 转换：**
   ```bash
   cd /mnt/f/AIlove/frontend/src/static/tabbar
   convert love.svg love.png
   convert love_active.svg love_active.png
   ```

3. **使用 Figma/Sketch：**
   - 打开 SVG 文件
   - 导出为 PNG (48x48 @2x = 96x96)
   - 保持透明背景

### 图标设计规范

**尺寸：**
- 标准尺寸：48x48px
- 高清屏：96x96px (@2x)

**颜色：**
- 普通状态：#7A7E83（灰色）
- 激活状态：#FF5A5A（粉红色）或主题色

**设计风格：**
- GameBoy 像素风格
- 简洁图标
- 黑色边框（可选）

## 替换图标

将转换后的 PNG 文件保存为：
- `/static/tabbar/love.png`
- `/static/tabbar/love_active.png`

然后更新 `pages.json` 路径为 PNG 文件。
