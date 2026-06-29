<?php
/**
 * Listen 1 PHP - 主入口文件
 * 在线音乐播放器 - 实时更新与同步
 */

// 加载配置和类
require_once 'includes/config.php';
require_once 'includes/functions.php';
require_once 'includes/database.php';

// 获取请求路径和参数
$path = isset($_GET['path']) ? trim($_GET['path']) : '';
$method = $_SERVER['REQUEST_METHOD'];

// 获取数据库实例
$db = Database::getInstance();

// API路由处理
switch ($path) {
    // 获取推荐歌单列表
    case 'show_playlist':
    case 'playlist':
        $db = Database::getInstance();
        $playlists = $db->getRecommendPlaylists();
        json_response(['status:success', 'result' => $playlists]);
        break;

    // 获取歌单详情
    case 'playlist_detail':
        $list_id = isset($_GET['list_id']) ? $_GET['list_id'] : '';
        $source = isset($_GET['source']) ? $_GET['source'] : 'netease';
        $db = Database::getInstance();
        $result = $db->getPlaylist($list_id, $source);
        json_response($result);
        break;

    // 搜索歌曲
    case 'search':
        $keywords = isset($_GET['keywords']) ? trim($_GET['keywords']) : '';
        $source = isset($_GET['source']) ? $_GET['source'] : 'netease';
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
        $db = Database::getInstance();
        $result = $db->search($keywords, $source, $limit);
        json_response($result);
        break;

    // 获取歌曲URL
    case 'song_url':
        $song_id = isset($_GET['song_id']) ? $_GET['song_id'] : '';
        $db = Database::getInstance();
        $result = $db->getSongUrl($song_id);
        json_response($result);
        break;

    // 获取歌词
    case 'lyric':
        $song_id = isset($_GET['song_id']) ? $_GET['song_id'] : '';
        $db = Database::getInstance();
        $result = $db->getLyric($song_id);
        json_response($result);
        break;

    // 获取专辑封面
    case 'pic':
        $pic_id = isset($_GET['pic_id']) ? $_GET['pic_id'] : '';
        $db = Database::getInstance();
        $result = $db->getPic($pic_id);
        json_response($result);
        break;

    // 获取我的歌单
    case 'my_playlist':
    case 'myplaylist':
        $db = Database::getInstance();
        $result = $db->getMyPlaylists();
        json_response($result);
        break;

    // 创建歌单
    case 'create_playlist':
    case 'create_myplaylist':
        $title = isset($_POST['title']) ? trim($_POST['title']) : '';
        if (empty($title)) {
            json_response(['status' => 'error', 'message' => '歌单名称不能为空']);
        }
        $db = Database::getInstance();
        $result = $db->createPlaylist($title);
        json_response($result);
        break;

    // 删除歌单
    case 'delete_playlist':
    case 'remove_myplaylist':
        $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
        $db = Database::getInstance();
        $result = $db->deletePlaylist($list_id);
        json_response($result);
        break;

    // 添加歌曲到歌单
    case 'add_track':
    case 'add_myplaylist':
        $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
        $track_json = isset($_POST['track']) ? $_POST['track'] : '{}';
        $track = json_decode($track_json, true);
        if (!$track) {
            json_response(['status' => 'error', 'message' => '无效的歌曲数据']);
        }
        $db = Database::getInstance();
        $result = $db->addTrackToPlaylist($list_id, $track);
        json_response($result);
        break;

    // 从歌单移除歌曲
    case 'remove_track':
    case 'remove_track_from_myplaylist':
        $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
        $track_id = isset($_POST['track_id']) ? $_POST['track_id'] : '';
        $db = Database::getInstance();
        $result = $db->removeTrackFromPlaylist($list_id, $track_id);
        json_response($result);
        break;

    // 收藏歌单
    case 'favorite':
    case 'clone_playlist':
        $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
        $source = isset($_POST['source']) ? $_POST['source'] : 'netease';
        $title = isset($_POST['title']) ? $_POST['title'] : '收藏的歌单';
        $tracks_json = isset($_POST['tracks']) ? $_POST['tracks'] : '[]';
        $tracks = json_decode($tracks_json, true) ?? [];
        $db = Database::getInstance();
        $result = $db->favoritePlaylist($list_id, $source, $title, $tracks);
        json_response($result);
        break;

    // 获取播放状态
    case 'status':
        $db = Database::getInstance();
        $result = $db->getPlayStatus();
        json_response($result);
        break;

    // 保存设置
    case 'settings':
        if ($method === 'POST') {
            $settings = isset($_POST['settings']) ? json_decode($_POST['settings'], true) : $_POST;
            $db = Database::getInstance();
            $result = $db->saveSettings($settings);
            json_response($result);
        } else {
            $db = Database::getInstance();
            $result = $db->getPlayStatus();
            json_response($result);
        }
        break;

    // 检查更新（轮询）
    case 'sse':
    case 'check_update':
        $since = isset($_GET['since']) ? intval($_GET['since']) : 0;
        $db = Database::getInstance();
        $result = $db->checkUpdate($since);
        json_response($result);
        break;

    // 同步数据
    case 'sync':
        $db = Database::getInstance();
        $result = $db->sync();
        json_response($result);
        break;

    // 健康检查
    case 'health':
        json_response(['status' => 'success', 'version' => '2.33.0', 'timestamp' => time()]);
        break;

    // 默认：返回前端页面
    default:
        // 处理静态文件
        if (preg_match('/^css\//', $path) || preg_match('/^js\//', $path) || preg_match('/^images\//', $path)) {
            $file = __DIR__ . '/' . $path;
            if (file_exists($file)) {
                $ext = pathinfo($file, PATHINFO_EXTENSION);
                $mime_types = [
                    'css' => 'text/css',
                    'js' => 'application/javascript',
                    'png' => 'image/png',
                    'jpg' => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'gif' => 'image/gif',
                    'ico' => 'image/x-icon',
                    'svg' => 'image/svg+xml',
                    'woff' => 'font/woff',
                    'woff2' => 'font/woff2',
                    'ttf' => 'font/ttf',
                    'eot' => 'application/vnd.ms-fontobject'
                ];
                $mime = $mime_types[$ext] ?? 'application/octet-stream';
                header('Content-Type: ' . $mime);
                header('Cache-Control: max-age=86400');
                readfile($file);
                exit;
            }
        }

        // 返回前端页面
        include 'templates/index.html';
        break;
}
