<?php
/**
 * Listen 1 - PHP Version
 * 在线音乐播放器 - 实时更新与同步
 */

// 加载配置和函数
require_once 'includes/config.php';
require_once 'includes/functions.php';
require_once 'includes/database.php';

// 路由处理
$path = isset($_GET['path']) ? $_GET['path'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// CORS 头
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

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
    $results = [];

    // 模拟搜索结果 - 实际项目中应该调用真实音乐API
    // 这里使用示例数据
    $sample_songs = get_sample_songs($keywords);

    json_response(['result' => $sample_songs]);
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
    $song = isset($_POST['title']) ? $_POST : null;

    if (empty($title)) {
        json_response(['success' => false, 'message' => '歌单名称不能为空']);
        return;
    }

    $db = Database::getInstance();
    $list_id = $db->createPlaylist($title);

    if ($song) {
        $db->addToPlaylist($list_id, $song);
    }

    // 触发更新
    $db->updateTimestamp();

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
    $db->addToPlaylist($list_id, $song);
    $db->updateTimestamp();

    json_response(['success' => true]);
}

/**
 * 从歌单移除歌曲
 */
function api_remove_track() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';
    $track_id = isset($_POST['track_id']) ? $_POST['track_id'] : '';

    $db = Database::getInstance();
    $db->removeFromPlaylist($list_id, $track_id);
    $db->updateTimestamp();

    json_response(['success' => true]);
}

/**
 * 删除歌单
 */
function api_remove_playlist() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';

    $db = Database::getInstance();
    $db->removePlaylist($list_id);
    $db->updateTimestamp();

    json_response(['success' => true]);
}

/**
 * 收藏歌单
 */
function api_clone_playlist() {
    $list_id = isset($_POST['list_id']) ? $_POST['list_id'] : '';

    $db = Database::getInstance();
    $new_list_id = $db->clonePlaylist($list_id);
    $db->updateTimestamp();

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

    // 代理请求以解决跨域问题
    header('Content-Type: audio/mpeg');
    readfile($url);
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
 * Server-Sent Events - 实时更新
 */
function api_sse() {
    header('Content-Type: text/event-stream');
    header('Cache-Control: no-cache');
    header('Connection: keep-alive');

    $db = Database::getInstance();
    $last_update = 0;

    while (true) {
        $current_update = $db->getLastUpdate();

        if ($current_update > $last_update) {
            echo "data: " . json_encode(['type' => 'update', 'timestamp' => $current_update]) . "\n\n";
            ob_flush();
            flush();
            $last_update = $current_update;
        }

        sleep(1);

        // 防止连接超时
        if (connection_aborted()) {
            break;
        }
    }
}

/**
 * 同步接口
 */
function api_sync() {
    $db = Database::getInstance();
    $playlists = $db->getAllPlaylists();

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
