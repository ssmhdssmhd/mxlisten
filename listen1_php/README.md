# Listen 1 PHP

基于 Listen 1 原始 Python 版本改造的 PHP 在线音乐播放器。

## 功能特性

- **多平台音乐聚合**：支持搜索和播放来自多个音乐平台的歌曲
- **在线播放**：直接通过浏览器播放音乐
- **实时更新**：使用 Server-Sent Events (SSE) 技术实现实时更新
- **内容同步**：歌单和数据自动同步，支持多设备访问
- **歌单管理**：创建、编辑、收藏和管理个人歌单
- **响应式设计**：支持桌面和移动设备

## 系统要求

- PHP 7.0 或更高版本
- Web 服务器 (Apache/Nginx)
- mod_rewrite 启用（Apache）

## 安装步骤

1. **克隆或下载项目到 Web 服务器目录**

```bash
git clone <repository-url> /var/www/html/listen1
```

2. **确保目录权限正确**

```bash
chmod -R 755 /var/www/html/listen1
chmod -R 777 /var/www/html/listen1/data
```

3. **配置 Web 服务器**

对于 Apache，确保 `.htaccess` 文件生效（`AllowOverride All`）。

对于 Nginx，添加以下配置：

```nginx
location / {
    try_files $uri $uri/ /index.php?path=$uri;
}

location ~ \.php$ {
    fastcgi_pass unix:/var/run/php/php7.0-fpm.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}
```

4. **访问项目**

打开浏览器访问 `http://your-domain/listen1/`

## 目录结构

```
listen1_php/
├── index.php              # 主入口文件
├── .htaccess              # Apache 路由配置
├── includes/              # 核心类文件
│   ├── config.php         # 配置文件
│   ├── database.php       # 数据存储类
│   └── functions.php      # 公共函数
├── api/                   # API 接口目录
├── templates/             # HTML 模板
│   └── index.html         # 主页面
├── static/                # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript 文件
│   └── images/            # 图片资源
└── data/                  # 数据存储目录
    └── playlists.json     # 歌单数据
```

## 使用说明

### 快速搜索
1. 点击顶部导航栏"快速搜索"
2. 输入歌曲名、歌手或专辑名
3. 从搜索结果中选择歌曲进行播放或添加到歌单

### 歌单管理
- **我的歌单**：查看和管理个人创建的歌单
- **精选歌单**：浏览推荐歌单
- **创建歌单**：点击"+"按钮创建新歌单
- **添加歌曲**：在歌曲列表中点击"添加到歌单"按钮

### 实时同步
- 系统自动启用实时同步功能
- 可在"设置"页面手动同步或开关自动同步

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/search` | GET | 搜索歌曲 |
| `/playlist` | GET | 获取歌单详情 |
| `/show_myplaylist` | GET | 获取我的歌单列表 |
| `/create_myplaylist` | POST | 创建新歌单 |
| `/add_myplaylist` | POST | 添加歌曲到歌单 |
| `/remove_track_from_myplaylist` | POST | 从歌单移除歌曲 |
| `/remove_myplaylist` | POST | 删除歌单 |
| `/clone_playlist` | POST | 收藏歌单 |
| `/sse` | GET | Server-Sent Events 实时更新 |
| `/sync` | GET | 同步数据 |

## 配置

编辑 `includes/config.php` 文件修改配置：

```php
define('APP_NAME', 'Listen 1 PHP');
define('APP_VERSION', '1.0.0');
define('DATA_DIR', __DIR__ . '/../data');
```

## 技术栈

- **后端**：PHP 7.0+
- **前端**：AngularJS 1.x, jQuery 1.12
- **实时通信**：Server-Sent Events (SSE)
- **数据存储**：JSON 文件
- **样式**：Bootstrap 3.x (简化版)

## 注意事项

1. 本项目仅供学习和研究使用
2. 音乐版权归各平台所有，请勿用于商业用途
3. 部分功能需要连接外网

## 许可证

MIT License

## 更新日志

See [CHANGELOG.md](CHANGELOG.md)

## Credits

- 原始项目：[Listen 1](https://github.com/listen1/listen1) - One for all free music in China
