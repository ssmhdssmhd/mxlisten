<?php
/**
 * Database 类 - 数据存储和音乐API集成
 */

class Database {
    private static $instance = null;
    private $dataFile;
    private $settingsFile;
    private $playlists = [];
    private $settings = [];
    private $lastUpdate = 0;
    private $metingApiBase = 'https://api.injahow.cn/meting/';

    // 网易云官方歌单
    private $officialPlaylists = [
        ['id' => '3778678', 'title' => '热歌榜', 'source' => 'netease'],
        ['id' => '3779629', 'title' => '新歌榜', 'source' => 'netease'],
        ['id' => '2884035', 'title' => '原创榜', 'source' => 'netease'],
        ['id' => '19723756', 'title' => '飙升榜', 'source' => 'netease'],
        ['id' => '71385702', 'title' => '华语金曲榜', 'source' => 'netease'],
        ['id' => '10520166', 'title' => '听歌识曲榜', 'source' => 'netease'],
        ['id' => '3812895', 'title' => '云音乐电音榜', 'source' => 'netease'],
        ['id' => '745956260', 'title' => '网络热歌榜', 'source' => 'netease'],
        ['id' => '5059661515', 'title' => '中国新乡村音乐榜', 'source' => 'netease'],
        ['id' => '991319590', 'title' => '说唱榜', 'source' => 'netease'],
    ];

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->dataFile = defined('DATA_FILE') ? DATA_FILE : __DIR__ . '/../data/playlists.json';
        $this->settingsFile = defined('SETTINGS_FILE') ? SETTINGS_FILE : __DIR__ . '/../data/settings.json';
        $this->load();
        $this->loadSettings();
    }

    private function load() {
        if (file_exists($this->dataFile)) {
            $json = file_get_contents($this->dataFile);
            $data = json_decode($json, true);
            $this->playlists = $data['myplaylists'] ?? [];
            $this->lastUpdate = $data['last_update'] ?? time() * 1000;
        } else {
            $this->initDefaultData();
        }
    }

    private function loadSettings() {
        if (file_exists($this->settingsFile)) {
            $json = file_get_contents($this->settingsFile);
            $this->settings = json_decode($json, true) ?? [];
        } else {
            $this->initDefaultSettings();
        }
    }

    private function initDefaultData() {
        $this->playlists = [
            [
                'id' => 'default_1',
                'title' => '我喜欢的音乐',
                'is_mine' => true,
                'tracks' => [],
                'created_at' => time() * 1000,
                'updated_at' => time() * 1000
            ]
        ];
        $this->lastUpdate = time() * 1000;
        $this->save();
    }

    private function initDefaultSettings() {
        $this->settings = [
            'theme' => 'black',
            'volume' => 0.8,
            'playbackOrder' => 'list',
            'lang' => 'zh-CN'
        ];
        $this->saveSettingsToFile();
    }

    public function save() {
        $data = [
            'myplaylists' => $this->playlists,
            'last_update' => $this->lastUpdate
        ];
        $dir = dirname($this->dataFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($this->dataFile, json_encode($data, JSON_UNESCAPED_UNICODE));
    }

    private function saveSettingsToFile() {
        $dir = dirname($this->settingsFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        file_put_contents($this->settingsFile, json_encode($this->settings, JSON_UNESCAPED_UNICODE));
    }

    // ==================== 歌单API ====================

    /**
     * 获取官方推荐歌单
     */
    public function getRecommendPlaylists() {
        $result = [];
        foreach ($this->officialPlaylists as $pl) {
            $result[] = [
                'id' => $pl['id'],
                'title' => $pl['title'],
                'source' => $pl['source'],
                'source_name' => $this->getSourceName($pl['source']),
                'is_sub' => false,
                'type' => 'playlist'
            ];
        }
        return $result;
    }

    /**
     * 获取歌单详情
     */
    public function getPlaylist($listId, $source = 'netease') {
        // 先检查是否是本地歌单
        foreach ($this->playlists as $pl) {
            if ($pl['id'] === $listId) {
                return [
                    'status' => 'success',
                    'data' => [
                        'id' => $pl['id'],
                        'title' => $pl['title'],
                        'source' => 'local',
                        'source_name' => '本地歌单',
                        'tracks' => $pl['tracks'] ?? [],
                        'is_mine' => true
                    ]
                ];
            }
        }

        // 从API获取歌单
        return $this->fetchPlaylistFromApi($listId, $source);
    }

    /**
     * 从API获取歌单
     */
    private function fetchPlaylistFromApi($listId, $source) {
        $url = $this->metingApiBase . '?server=' . $source . '&type=playlist&id=' . $listId;
        $result = $this->curlGet($url);
        $data = json_decode($result, true);

        if (!$data || !is_array($data) || count($data) === 0) {
            return ['status' => 'error', 'message' => '无法获取歌单数据'];
        }

        $tracks = [];
        $coverImg = '';
        foreach ($data as $index => $track) {
            if ($index === 0) {
                $coverImg = $track['pic'] ?? '';
            }
            $songId = $this->extractSongId($track);
            $tracks[] = [
                'id' => $source . '_' . $songId,
                'title' => $track['name'] ?? $track['title'] ?? '未知歌曲',
                'artist' => $track['artist'] ?? $track['author'] ?? '未知艺术家',
                'artist_id' => '',
                'album' => $track['album'] ?? '',
                'album_id' => '',
                'source' => $source,
                'source_name' => $this->getSourceName($source),
                'img' => $track['pic'] ?? '',
                'url' => $track['url'] ?? '',
                'lrc' => '',
                'duration' => ''
            ];
        }

        $titleMap = [
            '3778678' => '热歌榜',
            '3779629' => '新歌榜',
            '2884035' => '原创榜',
            '19723756' => '飙升榜',
            '71385702' => '华语金曲榜',
            '10520166' => '听歌识曲榜',
            '3812895' => '云音乐电音榜',
            '745956260' => '网络热歌榜',
            '5059661515' => '中国新乡村音乐榜',
            '991319590' => '说唱榜',
        ];

        return [
            'status' => 'success',
            'data' => [
                'id' => $listId,
                'title' => $titleMap[$listId] ?? '歌单',
                'cover_img_url' => $coverImg,
                'source' => $source,
                'source_name' => $this->getSourceName($source),
                'tracks' => $tracks,
                'is_mine' => false
            ]
        ];
    }

    /**
     * 从歌曲URL中提取歌曲ID
     */
    private function extractSongId($track) {
        if (isset($track['url_id'])) {
            return $track['url_id'];
        }
        if (isset($track['id'])) {
            return $track['id'];
        }
        if (isset($track['url'])) {
            preg_match('/id=(\d+)/', $track['url'], $matches);
            if ($matches && isset($matches[1])) {
                return $matches[1];
            }
        }
        return '';
    }

    // ==================== 搜索API ====================

    /**
     * 搜索歌曲
     */
    public function search($keywords, $source = 'netease', $limit = 20) {
        if ($source === 'netease') {
            return $this->searchNetease($keywords, $limit);
        } elseif ($source === 'qq') {
            return $this->searchMeting($keywords, $source, $limit);
        } else {
            return $this->searchMeting($keywords, $source, $limit);
        }
    }

    /**
     * 网易云搜索
     */
    private function searchNetease($keywords, $limit) {
        $url = 'https://music.163.com/api/search/get/web?csrf_token=&type=1&s=' . urlencode($keywords) . '&limit=' . $limit . '&offset=0';
        $result = $this->curlGet($url);
        $data = json_decode($result, true);

        $songs = [];
        if ($data && isset($data['code']) && $data['code'] == 200 && isset($data['result']['songs'])) {
            foreach ($data['result']['songs'] as $song) {
                $artistName = $song['artists'][0]['name'] ?? '';
                $albumName = $song['album']['name'] ?? '';
                $albumId = $song['album']['id'] ?? '';
                $artistId = $song['artists'][0]['id'] ?? '';
                $picId = $song['album']['picId'] ?? 0;
                $albumPic = $song['album']['picUrl'] ?? '';
                if (!$albumPic && $picId) {
                    $albumPic = $this->metingApiBase . '?server=netease&type=pic&id=' . $picId;
                }

                $songs[] = [
                    'id' => 'netease_' . $song['id'],
                    'title' => $song['name'],
                    'artist' => $artistName,
                    'artist_id' => $artistId,
                    'album' => $albumName,
                    'album_id' => $albumId,
                    'source' => 'netease',
                    'source_name' => '网易云音乐',
                    'img' => $albumPic,
                    'url' => '',
                    'lrc' => '',
                    'duration' => ''
                ];
            }
        }

        return ['status' => 'success', 'result' => $songs];
    }

    /**
     * Meting API搜索
     */
    private function searchMeting($keywords, $source, $limit) {
        // Meting API 不支持直接搜索，这里返回空结果
        // 实际搜索使用网易云API
        return $this->searchNetease($keywords, $limit);
    }

    // ==================== 歌曲URL和歌词 ====================

    /**
     * 获取歌曲URL
     */
    public function getSongUrl($songId) {
        if (strpos($songId, '_') === false) {
            return ['status' => 'error', 'message' => '无效的歌曲ID'];
        }

        $parts = explode('_', $songId, 2);
        $source = $parts[0];
        $realId = $parts[1];

        $url = $this->metingApiBase . '?server=' . $source . '&type=url&id=' . $realId;

        return ['status' => 'success', 'url' => $url, 'source' => $source];
    }

    /**
     * 获取歌词
     */
    public function getLyric($songId) {
        if (strpos($songId, '_') === false) {
            return ['status' => 'error', 'message' => '无效的歌曲ID'];
        }

        $parts = explode('_', $songId, 2);
        $source = $parts[0];
        $realId = $parts[1];

        $url = $this->metingApiBase . '?server=' . $source . '&type=lrc&id=' . $realId;
        $result = $this->curlGet($url);

        return ['status' => 'success', 'lrc' => $result, 'source' => $source];
    }

    /**
     * 获取专辑封面
     */
    public function getPic($picId) {
        $url = $this->metingApiBase . '?server=netease&type=pic&id=' . $picId;
        return ['status' => 'success', 'url' => $url];
    }

    // ==================== 我的歌单 ====================

    /**
     * 获取我的歌单列表
     */
    public function getMyPlaylists() {
        return ['status' => 'success', 'result' => $this->playlists];
    }

    /**
     * 创建歌单
     */
    public function createPlaylist($title) {
        $id = 'mine_' . time() . '_' . rand(100, 999);
        $playlist = [
            'id' => $id,
            'title' => $title,
            'is_mine' => true,
            'tracks' => [],
            'created_at' => time() * 1000,
            'updated_at' => time() * 1000
        ];
        $this->playlists[] = $playlist;
        $this->lastUpdate = time() * 1000;
        $this->save();

        return ['status' => 'success', 'id' => $id];
    }

    /**
     * 删除歌单
     */
    public function deletePlaylist($listId) {
        foreach ($this->playlists as $key => $pl) {
            if ($pl['id'] === $listId && $pl['is_mine']) {
                unset($this->playlists[$key]);
                $this->playlists = array_values($this->playlists);
                $this->lastUpdate = time() * 1000;
                $this->save();
                return ['status' => 'success'];
            }
        }
        return ['status' => 'error', 'message' => '无法删除歌单'];
    }

    /**
     * 添加歌曲到歌单
     */
    public function addTrackToPlaylist($listId, $track) {
        foreach ($this->playlists as $key => $pl) {
            if ($pl['id'] === $listId) {
                // 检查是否已存在
                foreach ($pl['tracks'] as $t) {
                    if ($t['id'] === $track['id']) {
                        return ['status' => 'error', 'message' => '歌曲已在歌单中'];
                    }
                }
                $this->playlists[$key]['tracks'][] = $track;
                $this->playlists[$key]['updated_at'] = time() * 1000;
                $this->lastUpdate = time() * 1000;
                $this->save();
                return ['status' => 'success'];
            }
        }
        return ['status' => 'error', 'message' => '歌单不存在'];
    }

    /**
     * 从歌单移除歌曲
     */
    public function removeTrackFromPlaylist($listId, $trackId) {
        foreach ($this->playlists as $key => $pl) {
            if ($pl['id'] === $listId) {
                $tracks = [];
                foreach ($pl['tracks'] as $t) {
                    if ($t['id'] !== $trackId) {
                        $tracks[] = $t;
                    }
                }
                $this->playlists[$key]['tracks'] = $tracks;
                $this->playlists[$key]['updated_at'] = time() * 1000;
                $this->lastUpdate = time() * 1000;
                $this->save();
                return ['status' => 'success'];
            }
        }
        return ['status' => 'error', 'message' => '歌单不存在'];
    }

    /**
     * 收藏歌单
     */
    public function favoritePlaylist($listId, $source, $title, $tracks) {
        $id = 'mine_' . time() . '_' . rand(100, 999);
        $playlist = [
            'id' => $id,
            'title' => $title . '（收藏）',
            'is_mine' => true,
            'tracks' => $tracks,
            'created_at' => time() * 1000,
            'updated_at' => time() * 1000
        ];
        $this->playlists[] = $playlist;
        $this->lastUpdate = time() * 1000;
        $this->save();

        return ['status' => 'success', 'id' => $id];
    }

    // ==================== 播放状态和设置 ====================

    /**
     * 获取播放状态
     */
    public function getPlayStatus() {
        return [
            'status' => 'success',
            'data' => [
                'lastUpdate' => $this->lastUpdate,
                'settings' => $this->settings
            ]
        ];
    }

    /**
     * 保存设置
     */
    public function saveSettings($settings) {
        $this->settings = array_merge($this->settings, $settings);
        $this->saveSettingsToFile();
        return ['status' => 'success'];
    }

    /**
     * 获取更新状态（用于轮询）
     */
    public function checkUpdate($since) {
        return [
            'has_update' => $this->lastUpdate > $since,
            'timestamp' => $this->lastUpdate
        ];
    }

    /**
     * 同步数据
     */
    public function sync() {
        return [
            'status' => 'success',
            'myplaylists' => $this->playlists,
            'lastUpdate' => $this->lastUpdate,
            'settings' => $this->settings
        ];
    }

    // ==================== 辅助方法 ====================

    private function getSourceName($source) {
        $names = [
            'netease' => '网易云音乐',
            'qq' => 'QQ音乐',
            'kugou' => '酷狗音乐',
            'kuwo' => '酷我音乐',
            'bilibili' => '哔哩哔哩',
            'migu' => '咪咕音乐',
            'taihe' => '千千音乐',
            'local' => '本地歌单'
        ];
        return $names[$source] ?? '未知来源';
    }

    private function curlGet($url, $timeout = 15) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_ENCODING, '');
        $result = curl_exec($ch);
        curl_close($ch);
        return $result;
    }
}
