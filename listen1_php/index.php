<?php
/**
 * Listen 1 - PHP Version
 * 在线音乐播放器 - 实时更新与同步
 */

// 加载配置和函数
require_once 'includes/config.php';
require_once 'includes/functions.php';
require_once 'includes/database.php';

// 获取请求路径
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request_uri = ltrim($request_uri, '/');

// 处理静态文件
if (preg_match('/^static\//', $request_uri)) {
    $file = __DIR__ . '/' . $request_uri;
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
            'ttf' => 'font/ttf'
        ];
        $mime = isset($mime_types[$ext]) ? $mime_types[$ext] : 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Cache-Control: max-age=86400');
        readfile($file);
        exit;
    }
    http_response_code(404);
    exit('Not Found');
}

// 路由处理
$path = isset($_GET['path']) ? $_GET['path'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// CORS 头
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 如果是API请求，返回JSON
$api_routes = ['search', 'playlist', 'show_playlist', 'show_myplaylist', 
    'create_myplaylist', 'add_myplaylist', 'remove_track_from_myplaylist',
    'remove_myplaylist', 'clone_playlist', 'track_file', 'artist', 'album',
    'sse', 'sync', 'status'];

if (!empty($path) && in_array($path, $api_routes)) {
    header('Content-Type: application/json; charset=utf-8');
}

if ($method === 'OPTIONS') {
    exit(0);
}

// 路由
switch ($path) {
    case 'search':
        api_search();
        break;
    case 'playlist':
        api_playlist();
        break;
    case 'show_playlist':
        api_show_playlist();
        break;
    case 'show_myplaylist':
        api_show_myplaylist();
        break;
    case 'create_myplaylist':
        api_create_myplaylist();
        break;
    case 'add_myplaylist':
        api_add_myplaylist();
        break;
    case 'remove_track_from_myplaylist':
        api_remove_track();
        break;
    case 'remove_myplaylist':
        api_remove_playlist();
        break;
    case 'clone_playlist':
        api_clone_playlist();
        break;
    case 'track_file':
        api_track_file();
        break;
    case 'song_url':
        api_song_url();
        break;
    case 'artist':
        api_artist();
        break;
    case 'album':
        api_album();
        break;
    case 'sse':
        api_sse();
        break;
    case 'sync':
        api_sync();
        break;
    case 'status':
        api_status();
        break;
    default:
        // 返回前端页面
        include 'templates/index.html';
        break;
}

/**
 * 搜索API
 */
function api_search() {
    $source = isset($_GET['source']) ? intval($_GET['source']) : 0;
    $keywords = isset($_GET['keywords']) ? trim($_GET['keywords']) : '';

    if (empty($keywords)) {
        json_response(['result' => []]);
        return;
    }

    $db = Database::getInstance();
    $results = $db->search($keywords, $source);

    json_response(['result' => $results]);
}

/**
 * 获取歌单详情
 */
function api_playlist() {
    $list_id = isset($_GET['list_id']) ? $_GET['list_id'] : '';

    $db = Database::getInstance();
    $playlist = $db->getPlaylist($list_id);

    if ($playlist) {
        json_response([
            'status' => 1,
            'info' => $playlist['info'],
            'tracks' => $playlist['tracks'],
            'is_mine' => $playlist['is_mine']
        ]);
    } else {
        json_response(['status' => 0, 'reason' => '歌单不存在']);
    }
}

/**
 * 获取推荐歌单列表
 */
function api_show_playlist() {
    $source = isset($_GET['source']) ? intval($_GET['source']) : 0;

    $db = Database::getInstance();
    $playlists = $db->getRecommendPlaylists($source);

    json_response(['result' => $playlists]);
}

/**
 * 获取我的歌单列表
 */
function api_show_myplaylist() {
    $db = Database::getInstance();
    $playlists = $db->getMyPlaylists();

    json_response(['result' => $playlists]);
}

/**
 * 创建新歌单
 */
function api_create_myplaylist() {
    $title = isset($_POST['list_title']) ? trim($_POST['list_title']) : '';
    $song = isset($_POST['id']) ? $_POST : null;

    if (empty($title)) {
        json_response(['success' => false, 'message' => '歌单名称不能为空']);
        return;
    }

    $db = Database::getInstance();
    $track = null;
    if ($song) {
        $track = [
            'id' => $song['id'] ?? '',
            'title' => $song['title'] ?? '',
            'artist' => $song['artist'] ?? '',
            'artist_id' => $song['artist_id'] ?? '',
            'album' => $song['album'] ?? '',
            'album_id' => $song['album_id'] ?? '',
            'source' => $song['source'] ?? '',
            'source_url' => $song['source_url'] ?? '',
            'img_url' => $song['img_url'] ?? '',
            'url' => $song['url'] ?? ''
        ];
    }
    $list_id = $db->createPlaylist($title, $track);
    $db->sync();

    json_response(['success' => true, 'list_id' => $list_id]);
}

/**
 * 添加歌曲到歌单
 */
function api_add_myplaylist() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
    $song = $_POST;

    if (empty($list_id) || empty($song['id'])) {
        json_response(['success' => false, 'message' => '参数错误']);
        return;
    }

    $db = Database::getInstance();
    $track = [
        'id' => $song['id'] ?? '',
        'title' => $song['title'] ?? '',
        'artist' => $song['artist'] ?? '',
        'artist_id' => $song['artist_id'] ?? '',
        'album' => $song['album'] ?? '',
        'album_id' => $song['album_id'] ?? '',
        'source' => $song['source'] ?? '',
        'source_url' => $song['source_url'] ?? '',
        'img_url' => $song['img_url'] ?? '',
        'url' => $song['url'] ?? ''
    ];
    $db->addTrackToPlaylist($list_id, $track);
    $db->sync();

    json_response(['success' => true]);
}

/**
 * 从歌单移除歌曲
 */
function api_remove_track() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
    $track_id = isset($_POST['track_id']) ? $_POST['track_id'] : '';

    $db = Database::getInstance();
    $db->removeTrackFromPlaylist($list_id, $track_id);
    $db->sync();

    json_response(['success' => true]);
}

/**
 * 删除歌单
 */
function api_remove_playlist() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';

    $db = Database::getInstance();
    $db->deletePlaylist($list_id);
    $db->sync();

    json_response(['success' => true]);
}

/**
 * 收藏歌单
 */
function api_clone_playlist() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';

    $db = Database::getInstance();
    $new_list_id = $db->clonePlaylist($list_id);
    $db->sync();

    json_response(['success' => true, 'list_id' => $new_list_id]);
}

/**
 * 获取歌曲文件(代理)
 */
function api_track_file() {
    $url = isset($_GET['url']) ? $_GET['url'] : '';

    if (empty($url)) {
        header('HTTP/1.1 404 Not Found');
        exit;
    }

    header('Content-Type: audio/mpeg');
    readfile($url);
}

function api_song_url() {
    $db = Database::getInstance();
    $song_id = isset($_GET['song_id']) ? $_GET['song_id'] : '';
    $url = $db->getSongUrl($song_id);
    json_response([
        'status' => $url ? 1 : 0,
        'url' => $url
    ]);
}

/**
 * 获取艺术家信息
 */
function api_artist() {
    $artist_id = isset($_GET['artist_id']) ? $_GET['artist_id'] : '';

    // 返回模拟数据
    json_response([
        'status' => 1,
        'info' => ['title' => '艺术家', 'cover_img_url' => '/static/images/placeholder.png'],
        'tracks' => []
    ]);
}

/**
 * 获取专辑信息
 */
function api_album() {
    $album_id = isset($_GET['album_id']) ? $_GET['album_id'] : '';

    // 返回模拟数据
    json_response([
        'status' => 1,
        'info' => ['title' => '专辑', 'cover_img_url' => '/static/images/placeholder.png'],
        'tracks' => []
    ]);
}

/**
 * 检查更新 - 轮询方式实现实时更新
 */
function api_sse() {
    $db = Database::getInstance();
    $since = isset($_GET['since']) ? intval($_GET['since']) : 0;

    $current_update = $db->getLastUpdate();
    $has_update = $current_update > $since;

    json_response([
        'has_update' => $has_update,
        'timestamp' => $current_update,
        'type' => 'update'
    ]);
}

/**
 * 同步接口
 */
function api_sync() {
    $db = Database::getInstance();
    $playlists = $db->getMyPlaylists();

    json_response([
        'playlists' => $playlists,
        'timestamp' => $db->getLastUpdate()
    ]);
}

/**
 * 状态接口
 */
function api_status() {
    json_response([
        'status' => 'ok',
        'version' => '1.0.0',
        'timestamp' => time()
    ]);
}
