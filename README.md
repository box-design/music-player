# 网易云音乐播放器

一个基于 React + Express 的全栈网易云音乐播放器，采用增强版网易云音乐 API 作为后端服务，前端使用 React 19 + TypeScript + TailwindCSS 构建，提供精美的音乐播放体验。

## 技术栈

### 前端 (`music-app/`)
- **React 19** + **TypeScript** + **Vite 6**
- **TailwindCSS** 样式框架
- **Zustand** 状态管理
- **React Router v7** 路由
- **Lucide React** 图标库
- **Web Audio API** 音频可视化

### 后端 (`api-enhanced-main/`)
- **Express 5** + **Node.js**
- NeteaseCloudMusicApiEnhanced（网易云音乐 API 增强版）
- 支持通用解锁、代理转发等功能

## 功能特性

- 首页推荐、歌单、排行榜、歌手浏览
- 歌曲搜索（支持多关键词匹配）
- 完整音乐播放器：播放/暂停、上一曲/下一曲、音量控制、进度条
- 音频可视化（波形频谱）
- 歌词展示（逐行同步滚动）
- 全屏播放模式
- 私人 FM、每日推荐
- 用户登录（扫码登录 / 手机号登录）
- 我喜欢、听歌记录、云盘管理
- 暗色/亮色模式切换
- 毛玻璃特效（Glassmorphism）
- 动态星空大气背景

## 项目结构

```
├── music-app/                 # 前端项目
│   ├── src/
│   │   ├── api/               # 接口请求
│   │   ├── components/        # 公共组件
│   │   │   ├── Background/    # 背景系统（星空、天体）
│   │   │   ├── Layout/        # 布局组件（侧边栏、底部播放器）
│   │   │   ├── Player/        # 播放器组件（可视化、歌词、全屏）
│   │   │   ├── common/        # 通用组件（卡片、加载、空状态）
│   │   │   └── home/          # 首页组件
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── lib/               # 工具库
│   │   ├── pages/             # 页面
│   │   ├── router/            # 路由配置
│   │   ├── stores/            # 状态管理
│   │   ├── styles/            # 全局样式
│   │   ├── types/             # 类型定义
│   │   └── utils/             # 工具函数
│   ├── vite.config.ts
│   └── package.json
│
├── api-enhanced-main/         # 后端 API 服务
│   ├── module/                # API 模块（300+ 接口）
│   ├── util/                  # 工具函数（加密、请求、缓存）
│   ├── plugins/               # 插件
│   ├── public/                # 静态资源 & 演示页面
│   ├── app.js                 # 入口文件
│   ├── server.js              # Express 服务主文件
│   └── package.json
│
└── README.md
```

## 环境要求

- **Node.js** >= 12（推荐 18+）
- **npm** >= 8

## 快速开始

### 1. 安装后端依赖

```bash
cd api-enhanced-main
npm install
```

### 2. 启动后端服务

```bash
npm start
```

后端将在 `http://localhost:3000` 启动。

### 3. 安装前端依赖

```bash
cd music-app
npm install
```

### 4. 启动前端开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动，API 请求自动代理到后端 `3000` 端口。

### 5. 打开浏览器

访问 `http://localhost:5173` 即可使用。

## 后端配置

可以在 `api-enhanced-main/` 目录下创建 `.env` 文件来自定义配置：

```env
PORT=3000                    # 服务端口
HOST=0.0.0.0                # 监听地址（0.0.0.0 允许局域网访问）
CORS_ALLOW_ORIGIN=*         # CORS 允许的来源
ENABLE_GENERAL_UNBLOCK=true # 启用通用解锁
PROXY_URL=                  # 代理地址
ENABLE_PROXY=               # 是否启用代理
```

## 前端构建

```bash
cd music-app
npm run build
```

构建产物输出到 `music-app/dist/` 目录。

## 开源协议

后端 API 基于 [NeteaseCloudMusicApiEnhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)，采用 MIT 协议。