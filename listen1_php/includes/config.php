<?php
/**
 * Listen 1 PHP - 配置文件
 */

define('APP_NAME', 'Listen 1 PHP');
define('APP_VERSION', '2.33.0');
define('DATA_DIR', __DIR__ . '/../data');
define('DATA_FILE', DATA_DIR . '/playlists.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');

// 时区设置
date_default_timezone_set('Asia/Shanghai');

// 错误报告（生产环境建议关闭）
error_reporting(E_ALL);
ini_set('display_errors', 0);

// 允许跨域
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// 处理 OPTIONS 请求
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}
