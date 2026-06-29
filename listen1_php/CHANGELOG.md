# 更新日志 (Changelog)

## [2.33.1] - 2026-06-29

### 新增
- **PHP Web版本重构**：将Chrome扩展重构为PHP Web应用，无需安装扩展即可使用
- **实时更新功能**：使用轮询方式实现数据实时同步，支持多设备访问
- **现代化播放器界面**：全新设计的用户界面，支持深色/浅色主题切换
- **歌词显示功能**：支持显示歌曲歌词，自动高亮当前行
- **播放控制优化**：
  - 播放/暂停
  - 上一首/下一首
  - 进度条拖动
  - 音量控制
  - 播放模式切换（列表循环/随机播放/单曲循环）
- **搜索功能**：支持搜索歌曲、歌手、专辑
- **歌单管理**：
  - 创建、删除歌单
  - 添加/移除歌曲
  - 收藏歌单
- **键盘快捷键**：
  - 空格键：播放/暂停
  - 左右方向键：快退/快进10秒
  - 上下方向键：音量调节

### 技术特性
- **后端**：PHP 7.0+，无框架依赖
- **前端**：原生JavaScript，现代化CSS3
- **数据源**：Meting API + 网易云音乐API
- **实时同步**：轮询方式（5秒间隔）
- **数据存储**：JSON文件

### 文件结构
```
listen1_php/
├── index.php              # 主入口和API路由
├── includes/               # 核心类文件
│   ├── config.php         # 配置文件
│   ├── database.php       # 数据层
│   └── functions.php      # 工具函数
├── templates/              # 前端模板
│   └── index.html         # 主页面
├── css/                   # 样式文件
├── js/                    # JavaScript（保留原始文件）
├── images/                # 图片资源
└── data/                  # 数据存储
    └── playlists.json     # 歌单数据
```

### API接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/?path=playlist` | GET | 获取推荐歌单列表 |
| `/?path=playlist_detail` | GET | 获取歌单详情 |
| `/?path=search` | GET | 搜索歌曲 |
| `/?path=song_url` | GET | 获取歌曲播放地址 |
| `/?path=lyric` | GET | 获取歌词 |
| `/?path=my_playlist` | GET | 获取我的歌单 |
| `/?path=create_playlist` | POST | 创建歌单 |
| `/?path=delete_playlist` | POST | 删除歌单 |
| `/?path=add_track` | POST | 添加歌曲到歌单 |
| `/?path=remove_track` | POST | 从歌单移除歌曲 |
| `/?path=favorite` | POST | 收藏歌单 |
| `/?path=sync` | GET | 同步数据 |
| `/?path=check_update` | GET | 检查更新 |

### 安装使用
1. 将项目部署到Web服务器（Apache/Nginx/PHP内置服务器）
2. 确保data目录有写入权限
3. 访问 index.php 即可使用

### 原项目信息
- 原项目：[Listen 1 Chrome Extension](https://github.com/listen1/listen1_chrome_extension)
- License: MIT
