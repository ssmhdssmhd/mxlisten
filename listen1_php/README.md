# Listen 1 PHP

基于 [Listen 1 Chrome Extension](https://github.com/listen1/listen1_chrome_extension) 重构的 PHP Web 版本在线音乐播放器。

## 功能特性

### 核心功能
- **多平台音乐聚合**：支持网易云音乐、QQ音乐、酷狗音乐等多个平台的歌曲搜索和播放
- **在线播放**：直接在浏览器中播放音乐，无需安装任何扩展
- **实时同步**：数据自动同步，支持多设备访问
- **歌词显示**：自动加载并显示歌曲歌词

### 播放器功能
- ✅ 播放/暂停控制
- ✅ 上一首/下一首切换
- ✅ 进度条拖动
- ✅ 音量控制
- ✅ 播放模式切换（列表循环/随机播放/单曲循环）
- ✅ 播放列表管理
- ✅ 歌词显示/隐藏

### 歌单管理
- ✅ 创建、编辑、删除歌单
- ✅ 添加/移除歌曲
- ✅ 收藏官方歌单到本地
- ✅ 我的歌单列表

### 搜索功能
- ✅ 按歌曲名搜索
- ✅ 按歌手搜索
- ✅ 按专辑搜索
- ✅ 快速添加到播放列表

## 系统要求

- PHP 7.0 或更高版本
- 支持 Apache/Nginx/PHP 内置服务器
- curl 扩展（用于API请求）

## 快速开始

### 1. 下载项目
```bash
git clone https://github.com/listen1/listen1_chrome_extension.git
cd listen1_chrome_extension
```

### 2. 启动服务

**使用 PHP 内置服务器（开发环境）：**
```bash
php -S localhost:8000
```
访问 http://localhost:8000

**使用 Apache/Nginx：**
将项目部署到 Web 服务器目录，确保 data 目录有写入权限：
```bash
chmod -R 755 .
chmod -R 777 data/
```

### 3. 开始使用

在浏览器中打开应用，享受音乐！

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| `空格` | 播放/暂停 |
| `←` | 快退10秒 |
| `→` | 快进10秒 |
| `↑` | 音量增加 |
| `↓` | 音量减少 |

## 目录结构

```
listen1_php/
├── index.php              # 主入口和API路由
├── includes/              # 核心类文件
│   ├── config.php         # 配置文件
│   ├── database.php       # 数据层（歌单、搜索、播放地址等）
│   └── functions.php      # 工具函数
├── templates/             # 前端模板
│   └── index.html         # 主页面
├── css/                   # 样式文件
│   └── player.css         # 播放器样式
├── images/                # 图片资源
├── js/                    # 保留的原始JS文件
├── fonts/                 # 字体文件
└── data/                  # 数据存储
    └── playlists.json     # 歌单数据
```

## API 接口

### 歌单相关
- `GET /?path=playlist` - 获取推荐歌单列表
- `GET /?path=playlist_detail&list_id=xxx&source=netease` - 获取歌单详情
- `GET /?path=my_playlist` - 获取我的歌单

### 搜索相关
- `GET /?path=search&keywords=关键词&source=netease` - 搜索歌曲

### 播放相关
- `GET /?path=song_url&song_id=xxx` - 获取歌曲播放地址
- `GET /?path=lyric&song_id=xxx` - 获取歌词

### 歌单管理
- `POST /?path=create_playlist` - 创建歌单 (参数: title)
- `POST /?path=delete_playlist` - 删除歌单 (参数: list_id)
- `POST /?path=add_track` - 添加歌曲 (参数: list_id, track)
- `POST /?path=remove_track` - 移除歌曲 (参数: list_id, track_id)
- `POST /?path=favorite` - 收藏歌单 (参数: list_id, title, tracks)

### 同步相关
- `GET /?path=sync` - 获取所有数据
- `GET /?path=check_update&since=xxx` - 检查更新

## 技术栈

- **后端**：PHP 7.0+
- **前端**：原生 JavaScript + CSS3
- **数据源**：Meting API + 网易云音乐 API
- **数据存储**：JSON 文件
- **实时更新**：轮询方式（5秒间隔）

## 注意事项

1. 本项目仅供学习和研究使用
2. 音乐版权归各平台所有，请勿用于商业用途
3. 部分功能需要连接外网
4. 请合理使用，避免对音乐平台造成过大压力

## 更新日志

See [CHANGELOG.md](CHANGELOG.md)

## Credits

- Original Project: [Listen 1 Chrome Extension](https://github.com/listen1/listen1_chrome_extension)
- API Provider: [Meting-API](https://github.com/injahow/meting-api)

## License

MIT License
