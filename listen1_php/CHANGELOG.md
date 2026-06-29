# 更新日志 (Changelog)

## [1.1.0] - 2026-06-29

### 修复
- 修复歌单获取不到的关键 Bug：彻底移除 AngularJS 依赖，改用纯原生 JavaScript 实现
- 修复页面加载失败问题，简化 DOM 结构和初始化逻辑
- 修复 SSE 在 PHP 内置服务器下阻塞的问题，改用轮询方式实现实时更新

### 优化
- 全新优化的页面布局设计，现代化 UI 风格
- 响应式网格布局，歌单卡片自适应排列
- 底部播放栏重新设计，操作更直观
- 歌单详情弹窗优化
- 新建歌单弹窗优化
- 搜索结果列表优化
- 播放列表侧边栏优化
- 按钮、图标、交互反馈全面优化
- 移动端适配优化

### 新增
- 新增 `style.css` 统一样式文件
- Toast 消息提示组件
- 进度条拖动播放功能
- 播放模式切换（顺序/随机）

### 变更
- 前端技术栈：AngularJS → 原生 JavaScript
- 实时更新：SSE → 轮询（更兼容 PHP 环境）
- 移除 Bootstrap、jQuery 等外部依赖
- 所有样式重新编写，无外部依赖

---

## [1.0.0] - 2026-06-29

### 新增
- 初始 PHP 版本发布
- 从原始 Python (Tornado) 版本改造为 PHP 版本
- 多平台音乐搜索功能
- 歌单管理功能（创建、编辑、删除、收藏）
- 在线音乐播放
- 实时更新功能（使用 Server-Sent Events）
- 内容同步功能
- 响应式设计，支持桌面和移动设备

### 主要功能
- **搜索 API** (`/search`)：支持按关键词搜索音乐
- **歌单 API**：
  - 获取我的歌单 (`/show_myplaylist`)
  - 创建歌单 (`/create_myplaylist`)
  - 添加歌曲到歌单 (`/add_myplaylist`)
  - 从歌单移除歌曲 (`/remove_track_from_myplaylist`)
  - 删除歌单 (`/remove_myplaylist`)
  - 收藏歌单 (`/clone_playlist`)
- **实时更新** (`/sse`)：使用 SSE 技术实现实时推送
- **数据同步** (`/sync`)：获取完整同步数据

### 技术特性
- 纯 PHP 实现，无需额外框架依赖
- JSON 文件存储，简化部署
- AngularJS 前端框架
- Bootstrap 响应式 CSS
- Server-Sent Events 实时通信
- 支持 Apache/Nginx 等主流 Web 服务器

### 文件结构
```
listen1_php/
├── index.php              # 主入口 & 路由
├── includes/
│   ├── config.php         # 配置
│   ├── database.php       # 数据库类
│   └── functions.php      # 工具函数
├── templates/
│   └── index.html         # 前端页面
├── static/
│   ├── css/               # 样式表
│   ├── js/                # JavaScript
│   └── images/            # 图片资源
└── data/
    └── playlists.json      # 歌单数据
```

---

## 从 Python 版本改造说明

本次更新将 Listen 1 从 Python Tornado 框架改造为 PHP 版本，主要变更：

| 原 Python (Tornado) | 新 PHP |
|---------------------|--------|
| `app.py` | `index.php` |
| `handlers/*.py` | `index.php` 路由函数 |
| `models/playlist.py` | `includes/database.php` |
| Tornado 模板 | AngularJS + HTML 静态模板 |
| JSON 文件存储 | JSON 文件存储 |
| - | 新增 SSE 实时更新 |

### 保留的功能
- 音乐搜索和多平台支持
- 歌单管理（创建/删除/收藏）
- 添加/移除歌曲
- 用户界面和交互

### 改进点
- 无需 Python 环境，降低部署难度
- 更广泛的主机兼容性
- 更简单的配置和维护
