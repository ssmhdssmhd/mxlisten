<?php
/**
 * 公共函数库
 */

/**
 * 返回JSON响应
 */
function json_response($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * 生成唯一ID
 */
function generate_id() {
    return bin2hex(random_bytes(16));
}

/**
 * 获取示例歌曲数据
 */
function get_sample_songs($keywords) {
    // 模拟搜索结果
    // 实际项目中应该调用真实音乐平台的API
    $sources = [
        ['name' => '网易云音乐', 'id' => 'netease'],
        ['name' => 'QQ音乐', 'id' => 'qq'],
        ['name' => '虾米音乐', 'id' => 'xiami'],
        ['name' => '酷狗音乐', 'id' => 'kugou']
    ];

    $songs = [];
    for ($i = 0; $i < 5; $i++) {
        $source = $sources[array_rand($sources)];
        $songs[] = [
            'id' => generate_id(),
            'title' => $keywords . ' - 示例歌曲 ' . ($i + 1),
            'artist' => '艺术家 ' . chr(65 + $i),
            'album' => $keywords . ' 专辑',
            'artist_id' => 'artist_' . $i,
            'album_id' => 'album_' . $i,
            'source' => $source['id'],
            'source_name' => $source['name'],
            'url' => '',
            'source_url' => 'https://music.163.com/#/search/m/?s=' . urlencode($keywords),
            'img_url' => '/static/images/placeholder.png',
            'duration' => rand(180, 300)
        ];
    }

    return $songs;
}

/**
 * 获取当前时间戳(毫秒)
 */
function get_microtime() {
    return round(microtime(true) * 1000);
}

/**
 * 读取JSON文件
 */
function read_json_file($file) {
    if (!file_exists($file)) {
        return null;
    }
    $content = file_get_contents($file);
    return json_decode($content, true);
}

/**
 * 写入JSON文件
 */
function write_json_file($file, $data) {
    $dir = dirname($file);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
