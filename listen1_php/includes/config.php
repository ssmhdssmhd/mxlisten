<?php
/**
 * 配置文件
 */

define('APP_NAME', 'Listen 1 PHP');
define('APP_VERSION', '1.0.0');
define('DATA_DIR', __DIR__ . '/../data');
define('PLAYLISTS_FILE', DATA_DIR . '/playlists.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');

// 确保数据目录存在
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
