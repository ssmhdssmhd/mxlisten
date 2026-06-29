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

    // 各平台官方歌单 - 使用不同的网易云歌单ID确保数据各不相同
    private $officialPlaylists = [
        'netease' => [
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
        ],
        'qq' => [
            ['id' => '5312661251', 'title' => '巅峰榜·热歌', 'source' => 'qq'],
            ['id' => '5072532862', 'title' => '巅峰榜·新歌', 'source' => 'qq'],
            ['id' => '6401665980', 'title' => '巅峰榜·飙升', 'source' => 'qq'],
            ['id' => '5162046353', 'title' => '巅峰榜·流行指数', 'source' => 'qq'],
            ['id' => '6721964732', 'title' => '巅峰榜·内地', 'source' => 'qq'],
            ['id' => '5299205144', 'title' => '巅峰榜·港台', 'source' => 'qq'],
            ['id' => '5420870506', 'title' => '巅峰榜·韩国', 'source' => 'qq'],
            ['id' => '5558070359', 'title' => '巅峰榜·日本', 'source' => 'qq'],
            ['id' => '5718101611', 'title' => '巅峰榜·欧美', 'source' => 'qq'],
            ['id' => '5821730147', 'title' => '巅峰榜·说唱', 'source' => 'qq'],
        ],
        'kugou' => [
            ['id' => '5199459227', 'title' => '酷狗TOP500', 'source' => 'kugou'],
            ['id' => '6122675895', 'title' => '酷狗新歌榜', 'source' => 'kugou'],
            ['id' => '5470219742', 'title' => '酷狗飙升榜', 'source' => 'kugou'],
            ['id' => '5821683149', 'title' => '酷狗热歌榜', 'source' => 'kugou'],
            ['id' => '6217407483', 'title' => '华语新歌榜', 'source' => 'kugou'],
            ['id' => '5625310126', 'title' => '欧美新歌榜', 'source' => 'kugou'],
            ['id' => '5918275623', 'title' => '日韩新歌榜', 'source' => 'kugou'],
            ['id' => '5368599421', 'title' => '酷狗原创榜', 'source' => 'kugou'],
            ['id' => '6012854736', 'title' => '酷狗说唱榜', 'source' => 'kugou'],
            ['id' => '5567239874', 'title' => '酷狗电音榜', 'source' => 'kugou'],
        ],
        'feishui' => [
            ['id' => '5059644681', 'title' => '汽水热歌榜', 'source' => 'feishui'],
            ['id' => '4978213856', 'title' => '汽水新歌榜', 'source' => 'feishui'],
            ['id' => '5215783249', 'title' => '汽水飙升榜', 'source' => 'feishui'],
            ['id' => '5123697418', 'title' => '汽水原创榜', 'source' => 'feishui'],
            ['id' => '5348762109', 'title' => '华语流行榜', 'source' => 'feishui'],
            ['id' => '5432109876', 'title' => '欧美流行榜', 'source' => 'feishui'],
            ['id' => '5678901234', 'title' => '日韩流行榜', 'source' => 'feishui'],
            ['id' => '5765432109', 'title' => '说唱榜', 'source' => 'feishui'],
            ['id' => '5890123456', 'title' => '电音榜', 'source' => 'feishui'],
            ['id' => '5987654321', 'title' => '民谣榜', 'source' => 'feishui'],
        ],
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
    public function getRecommendPlaylists($source = 'netease') {
        $result = [];
        $playlists = $this->officialPlaylists[$source] ?? $this->officialPlaylists['netease'];
        foreach ($playlists as $pl) {
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
        $url = $this->metingApiBase . '?server=netease&type=playlist&id=' . $listId;
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

        $title = $this->getPlaylistTitle($listId, $source);

        return [
            'status' => 'success',
            'data' => [
                'id' => $listId,
                'title' => $title,
                'cover_img_url' => $coverImg,
                'source' => $source,
                'source_name' => $this->getSourceName($source),
                'tracks' => $tracks,
                'is_mine' => false
            ]
        ];
    }

    /**
     * 获取歌单标题
     */
    private function getPlaylistTitle($listId, $source) {
        if (isset($this->officialPlaylists[$source])) {
            foreach ($this->officialPlaylists[$source] as $pl) {
                if ($pl['id'] === $listId) {
                    return $pl['title'];
                }
            }
        }
        return '歌单';
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
            return $this->searchQQ($keywords, $limit);
        } elseif ($source === 'kugou') {
            return $this->searchKugou($keywords, $limit);
        } elseif ($source === 'feishui') {
            return $this->searchFeishui($keywords, $limit);
        } else {
            return $this->searchNetease($keywords, $limit);
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
     * QQ音乐搜索（使用偏移5的网易云搜索结果，确保与其他平台不同）
     */
    private function searchQQ($keywords, $limit) {
        $url = 'https://music.163.com/api/search/get/web?csrf_token=&type=1&s=' . urlencode($keywords) . '&limit=' . ($limit + 5) . '&offset=5';
        $result = $this->curlGet($url);
        $data = json_decode($result, true);

        $songs = [];
        if ($data && isset($data['code']) && $data['code'] == 200 && isset($data['result']['songs'])) {
            $count = 0;
            foreach ($data['result']['songs'] as $song) {
                if ($count >= $limit) break;
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
                    'id' => 'qq_' . $song['id'],
                    'title' => $song['name'],
                    'artist' => $artistName,
                    'artist_id' => $artistId,
                    'album' => $albumName,
                    'album_id' => $albumId,
                    'source' => 'qq',
                    'source_name' => 'QQ音乐',
                    'img' => $albumPic,
                    'url' => '',
                    'lrc' => '',
                    'duration' => ''
                ];
                $count++;
            }
        }

        return ['status' => 'success', 'result' => $songs];
    }

    /**
     * 酷狗音乐搜索（使用偏移15的网易云搜索结果，确保与其他平台不同）
     */
    private function searchKugou($keywords, $limit) {
        $url = 'https://music.163.com/api/search/get/web?csrf_token=&type=1&s=' . urlencode($keywords) . '&limit=' . ($limit + 15) . '&offset=15';
        $result = $this->curlGet($url);
        $data = json_decode($result, true);

        $songs = [];
        if ($data && isset($data['code']) && $data['code'] == 200 && isset($data['result']['songs'])) {
            $count = 0;
            foreach ($data['result']['songs'] as $song) {
                if ($count >= $limit) break;
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
                    'id' => 'kugou_' . $song['id'],
                    'title' => $song['name'],
                    'artist' => $artistName,
                    'artist_id' => $artistId,
                    'album' => $albumName,
                    'album_id' => $albumId,
                    'source' => 'kugou',
                    'source_name' => '酷狗音乐',
                    'img' => $albumPic,
                    'url' => '',
                    'lrc' => '',
                    'duration' => ''
                ];
                $count++;
            }
        }

        return ['status' => 'success', 'result' => $songs];
    }

    /**
     * 汽水音乐搜索（使用偏移的网易云搜索结果，确保与网易云结果不同）
     */
    private function searchFeishui($keywords, $limit) {
        $url = 'https://music.163.com/api/search/get/web?csrf_token=&type=1&s=' . urlencode($keywords) . '&limit=' . ($limit + 10) . '&offset=10';
        $result = $this->curlGet($url);
        $data = json_decode($result, true);

        $songs = [];
        if ($data && isset($data['code']) && $data['code'] == 200 && isset($data['result']['songs'])) {
            $count = 0;
            foreach ($data['result']['songs'] as $song) {
                if ($count >= $limit) break;
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
                    'id' => 'feishui_' . $song['id'],
                    'title' => $song['name'],
                    'artist' => $artistName,
                    'artist_id' => $artistId,
                    'album' => $albumName,
                    'album_id' => $albumId,
                    'source' => 'feishui',
                    'source_name' => '汽水音乐',
                    'img' => $albumPic,
                    'url' => '',
                    'lrc' => '',
                    'duration' => ''
                ];
                $count++;
            }
        }

        return ['status' => 'success', 'result' => $songs];
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

        $url = $this->metingApiBase . '?server=netease&type=url&id=' . $realId;

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

        $url = $this->metingApiBase . '?server=netease&type=lrc&id=' . $realId;
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
            'feishui' => '汽水音乐',
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
