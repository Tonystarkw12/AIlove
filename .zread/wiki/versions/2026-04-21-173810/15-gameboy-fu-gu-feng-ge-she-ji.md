本文档介绍 AIlove 项目前端所采用的 **GameBoy 复古设计系统**。该系统以经典 Game Boy 掌机的像素美学为灵感，结合宝可梦（Pokémon）标志性配色，构建了一套完整的 UI 视觉语言。理解这套设计系统，你将能够在所有页面中保持一致的复古风格，并快速扩展新的 UI 组件。

Sources: [index.css](frontend-react/src/index.css#L1-L107)

## 设计哲学：像素时代的视觉回归

GameBoy 复古风格的核心在于 **用现代 CSS 重现 8-bit 时代的视觉特征**。设计系统通过三大手段实现这一目标：

| 设计维度 | 实现手段 | 视觉效果 |
|---------|---------|---------|
| **色彩体系** | CSS 自定义属性定义调色板 | 还原经典 Game Boy 四色灰阶 + 宝可梦品牌色 |
| **边框与阴影** | `4px solid` 实线边框 + 硬偏移阴影 | 模拟像素边缘的锯齿感 |
| **交互反馈** | 按压时位移 2px + 阴影缩小 | 还原物理按键的下沉手感 |

整个应用的全局背景采用从 `#9BBC0F`（Game Boy 原始屏幕最亮色）到 `#8BAC0F`（次亮色）的线性渐变，这是 Game Boy 屏幕的标志性绿色调，让用户在打开应用的瞬间即被带入复古情境。

Sources: [index.css](frontend-react/src/index.css#L4-L15), [App.tsx](frontend-react/src/App.tsx#L30-L36)

## 色彩调色板

设计系统在 `:root` 中定义了三组 CSS 自定义属性，覆盖了所有核心场景的配色需求。

### GameBoy 原始四色

| CSS 变量 | 色值 | 用途 |
|---------|------|------|
| `--gameboy-bg` | `#9BBC0F` | 页面主背景色（最亮绿） |
| `--gameboy-dark` | `#0F380F` | 底部导航栏背景、深绿色元素 |
| `--gameboy-accent` | `#306230` | 导航激活状态、中绿色强调 |

### 宝可梦品牌色

| CSS 变量 | 色值 | 用途 |
|---------|------|------|
| `--pokemon-yellow` | `#FFCB05` | 按钮主色（皮卡丘黄） |
| `--pokemon-blue` | `#3B4CCA` | 输入框聚焦边框、链接色 |
| `--pokemon-red` | `#FF5A5A` | 危险操作按钮、HP 条 |

### 游戏化状态色

| CSS 变量 | 色值 | 用途 |
|---------|------|------|
| `--hp-red` | `#FF5A5A` | 生命值/积分进度条 |
| `--exp-blue` | `#4A90E2` | 经验值进度条 |

### 宝可梦属性色

系统完整内置了全部 18 种宝可梦属性对应的背景色，可通过 `.type-{属性名}` 类名直接使用。例如 `.type-fire` 对应 `#F08030`，`.type-water` 对应 `#6890F0`。

Sources: [index.css](frontend-react/src/index.css#L4-L15), [index.css](frontend-react/src/index.css#L74-L91)

## 核心样式类

### pokemon-card（卡片容器）

卡片是页面内容的主要承载容器。采用 4px 实线边框 + 8px 硬偏移阴影（双层 4px），配合 `rgba(255, 255, 255, 0.98)` 半透明白色背景和 16px 圆角，营造出"浮在屏幕上"的像素卡片效果。

```css
.pokemon-card {
  background: rgba(255, 255, 255, 0.98);
  border: 4px solid #000000;
  border-radius: 16px;
  box-shadow: 8px 8px 0px 0px #000000;
}
```

在所有页面中，卡片都作为信息区块的包裹元素使用，如登录表单、用户资料展示、地图信息面板等。

Sources: [index.css](frontend-react/src/index.css#L54-L59), [LoginPage.tsx](frontend-react/src/pages/LoginPage.tsx#L62-L139)

### gameboy-btn（按钮基类）

按钮基类定义了 GameBoy 风格的交互规范：

```css
.gameboy-btn {
  border: 4px solid #000000;
  box-shadow: 4px 4px 0px 0px #000000;
  transition: all 0.1s;
}
```

**按压反馈机制**：当用户点击按钮时，`:active` 状态将按钮向右下移动 2px（`transform: translate(2px, 2px)`），同时将阴影缩小为 `2px 2px`。这种位移 + 阴影缩小的组合，精确还原了 Game Boy 实体按键被按下时的物理反馈感。

Sources: [index.css](frontend-react/src/index.css#L37-L46)

### gameboy-input（输入框）

输入框采用 3px 黑色边框 + 3px 硬偏移阴影，默认背景为白色。聚焦时边框和阴影变为宝可梦蓝色（`#3B4CCA`），提供清晰的视觉反馈。

```css
.gameboy-input {
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px 0px #000000;
  background: white;
}
.gameboy-input:focus {
  border-color: #3B4CCA;
  box-shadow: 3px 3px 0px 0px #3B4CCA;
}
```

Sources: [index.css](frontend-react/src/index.css#L62-L71)

### gameboy-border（通用边框工具类）

对于需要统一边框风格的自定义元素，可使用 `.gameboy-border` 工具类，它提供 4px 黑边框 + 4px 硬偏移阴影的基础样式。

Sources: [index.css](frontend-react/src/index.css#L32-L35)

## GameboyButton 组件

`GameboyButton` 是设计系统中最重要的 **可复用 React 组件**，封装了上述 `gameboy-btn` 基类并提供了丰富的属性配置。

```
┌─────────────────────────────────────────┐
│  GameboyButton Component Architecture   │
├─────────────────────────────────────────┤
│                                         │
│  Props:                                 │
│  ┌──────────┬─────────────────────────┐ │
│  │ text     │ 主文本（必填）          │ │
│  │ subText  │ 辅助文本（可选）        │ │
│  │ variant  │ primary/secondary/danger│ │
│  │ size     │ small/medium/large      │ │
│  │ loading  │ 加载状态动画            │ │
│  │ children │ 自定义插槽内容          │ │
│  └──────────┴─────────────────────────┘ │
│                                         │
│  Variants:                              │
│  ┌─────────────────────────────────────┐│
│  │ primary:   皮卡丘黄 (#FFCB05)       ││
│  │ secondary: 宝可梦蓝 (#3B4CCA)       ││
│  │ danger:    精灵球红 (#FF5A5A)       ││
│  └─────────────────────────────────────┘│
│                                         │
│  Sizes:                                 │
│  ┌─────────────────────────────────────┐│
│  │ small:  px-4 py-2 text-sm          ││
│  │ medium: px-6 py-3 text-base        ││
│  │ large:  px-8 py-4 text-lg w-full   ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 组件使用示例

**基础用法：**
```tsx
<GameboyButton text="开始匹配" subText="消耗50积分" size="large" />
```

**加载状态：**
```tsx
<GameboyButton text="登录" subText="继续你的冒险" size="large" loading={isLoading} />
```

**危险操作：**
```tsx
<GameboyButton text="退出登录" variant="danger" onClick={logout} />
```

### 变体对比

| 变体 | 背景色 | 悬停色 | 文字色 | 典型场景 |
|------|--------|--------|--------|---------|
| `primary` | `#FFCB05` | `#E6B800` | 黑色 | 主要操作按钮（匹配、提交） |
| `secondary` | `#3B4CCA` | `#2A3BA8` | 白色 | 次要操作按钮 |
| `danger` | `#FF5A5A` | `#E64444` | 白色 | 删除、退出等破坏性操作 |

Sources: [GameboyButton.tsx](frontend-react/src/components/GameboyButton.tsx#L1-L57)

## 游戏化组件：HpExpBar

`HpExpBar` 组件将游戏化积分系统可视化为宝可梦风格的 HP/EXP 进度条，使用 TailwindCSS 渐变和 CSS 宽度动画实现动态效果。

```
┌─────────────────────────────┐
│ ❤️ HP            45/100     │
│ ┌─────────────────────────┐ │
│ │████████░░░░░░░░░░░░░░░░│ │  ← 红色渐变 (red-400 → red-600)
│ └─────────────────────────┘ │
│                             │
│ ⭐ EXP          200/1000    │
│ ┌─────────────────────────┐ │
│ │████░░░░░░░░░░░░░░░░░░░░│ │  ← 蓝色渐变 (blue-400 → blue-600)
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

进度条通过计算 `(当前值 / 最大值) * 100` 得到百分比，并应用 `transition-all duration-300` 实现数值变化时的平滑过渡动画。

Sources: [HpExpBar.tsx](frontend-react/src/components/HpExpBar.tsx#L1-L48), [HomePage.tsx](frontend-react/src/pages/HomePage.tsx#L12-L16)

## 导航系统：TabBar

底部导航栏采用 `#0F380F`（Game Boy 最深色）作为背景色，激活标签页背景变为 `#306230`（中绿色），未激活标签文字色为 `#9BBC0F`（最亮绿）。这种深浅绿色搭配精确还原了 Game Boy 屏幕的层次感。

导航栏通过 `border-t-4 border-black` 在顶部添加 4px 黑边框，与整体设计系统的像素边框语言保持一致。

Sources: [TabBar.tsx](frontend-react/src/components/TabBar.tsx#L1-L40)

## 全局布局与动画

### 页面布局结构

所有受保护页面共享统一的布局模板：

```
┌─────────────────────────────────┐
│     AppLayout                   │
│  ┌───────────────────────────┐  │
│  │   MusicPlayer (可选播放)   │  │
│  ├───────────────────────────┤  │
│  │                           │  │
│  │   {children}              │  │
│  │   (页面内容)               │  │
│  │                           │  │
│  ├───────────────────────────┤  │
│  │       TabBar              │  │
│  │  [🏠][📍][💬][💕][👤]    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

每个页面的根容器使用 `bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]` 确保背景与全局设计语言一致。

### 内置动画

设计系统包含一个 `bounce` 关键帧动画，使元素在垂直方向上以 10px 振幅无限弹跳，2 秒完成一个周期。常用于登录页面的 Logo 等吸引注意力的元素。

Sources: [index.css](frontend-react/src/index.css#L93-L101), [App.tsx](frontend-react/src/App.tsx#L27-L36), [LoginPage.tsx](frontend-react/src/pages/LoginPage.tsx#L67)

## 设计系统应用全景

以下是各页面使用设计系统元素的统计：

| 页面 | pokemon-card | GameboyButton | gameboy-input |
|------|:-----------:|:-------------:|:-------------:|
| LoginPage | 1 | 1 | 2 |
| RegisterPage | 1 | 1 | 3 |
| HomePage | 2 | 2 | 0 |
| ProfilePage | 3 | 2 | 0 |
| MapPage | 6 | 3 | 0 |
| ChatPage | 1 | 0 | 0 |
| CommunityPage | 3 | 1 | 0 |
| PokeballPage | 6 | 2 | 0 |

## 扩展指南

### 添加新颜色变量

在 `:root` 中添加新的 CSS 自定义属性：
```css
:root {
  --new-color: #AABBCC;
}
```

### 创建新样式类

参照现有类的结构模式：
```css
.new-component {
  border: 4px solid #000000;
  box-shadow: 4px 4px 0px 0px #000000;
}
```

### 扩展 GameboyButton

在 `GameboyButton.tsx` 的 `variants` 或 `sizes` 对象中添加新的变体配置。

## 延伸阅读

- [宝可梦主题组件](16-bao-ke-meng-zhu-ti-zu-jian) — 深入了解宝可梦主题的具体组件实现
- [TailwindCSS 样式定制](17-tailwindcss-yang-shi-ding-zhi) — 学习如何在设计系统中扩展 TailwindCSS 工具类
- [React 项目结构](12-react-xiang-mu-jie-gou) — 理解前端组件的组织架构