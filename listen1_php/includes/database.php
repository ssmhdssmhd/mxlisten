<?php

class Database {
    private static $instance = null;
    private $dataFile;
    private $playlists = [];
    private $lastUpdate = 0;
    private $metingApiBase = 'https://api.injahow.cn/meting/';

    private $officialPlaylists = [
        0 => [
            ['id' => '3778678', 'title' => '热歌榜', 'cover' => ''],
            ['id' => '3779629', 'title' => '新歌榜', 'cover' => ''],
            ['id' => '2884035', 'title' => '原创榜', 'cover' => ''],
            ['id' => '19723756', 'title' => '飙升榜', 'cover' => ''],
            ['id' => '71385702', 'title' => '华语金曲榜', 'cover' => ''],
            ['id' => '10520166', 'title' => '听歌识曲榜', 'cover' => ''],
            ['id' => '3812895', 'title' => '云音乐电音榜', 'cover' => ''],
            ['id' => '745956260', 'title' => '网络热歌榜', 'cover' => ''],
            ['id' => '5059661515', 'title' => '中国新乡村音乐榜', 'cover' => ''],
            ['id' => '991319590', 'title' => '说唱榜', 'cover' => ''],
        ],
        1 => [
            ['id' => 'qq_hot', 'title' => 'QQ音乐热歌榜', 'cover' => ''],
            ['id' => 'qq_new', 'title' => 'QQ音乐新歌榜', 'cover' => ''],
            ['id' => 'qq_original', 'title' => 'QQ音乐原创榜', 'cover' => ''],
            ['id' => 'qq_soaring', 'title' => 'QQ音乐飙升榜', 'cover' => ''],
            ['id' => 'qq_classic', 'title' => 'QQ音乐经典榜', 'cover' => ''],
            ['id' => 'qq_radio', 'title' => 'QQ音乐影视金曲', 'cover' => ''],
        ],
        2 => [
            ['id' => 'kg_hot', 'title' => '酷狗热歌榜', 'cover' => ''],
            ['id' => 'kg_new', 'title' => '酷狗新歌榜', 'cover' => ''],
            ['id' => 'kg_soaring', 'title' => '酷狗飙升榜', 'cover' => ''],
            ['id' => 'kg_classic', 'title' => '酷狗经典老歌', 'cover' => ''],
            ['id' => 'kg_dj', 'title' => '酷狗DJ舞曲榜', 'cover' => ''],
            ['id' => 'kg_internet', 'title' => '酷狗网络红歌', 'cover' => ''],
        ],
    ];

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        $this->dataFile = __DIR__ . '/../data/playlists.json';
        $this->load();
    }

    private function load() {
        if (file_exists($this->dataFile)) {
            $json = file_get_contents($this->dataFile);
            $data = json_decode($json, true);
            $this->playlists = $data['playlists'] ?? [];
            $this->lastUpdate = $data['last_update'] ?? 0;
        } else {
            $this->playlists = [
                [
                    'id' => 'default_1',
                    'title' => '我的收藏',
                    'is_mine' => true,
                    'tracks' => [],
                    'created_at' => time()
                ],
                [
                    'id' => 'default_2',
                    'title' => '默认歌单',
                    'is_mine' => true,
                    'tracks' => [],
                    'created_at' => time()
                ]
            ];
            $this->lastUpdate = time() * 1000;
            $this->save();
        }
    }

    private function save() {
        $data = [
            'playlists' => $this->playlists,
            'last_update' => $this->lastUpdate
        ];
        file_put_contents($this->dataFile, json_encode($data, JSON_UNESCAPED_UNICODE));
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
        $result = curl_exec($ch);
        curl_close($ch);
        return $result;
    }

    public function getRecommendPlaylists($source = 0) {
        $playlists = $this->officialPlaylists[$source] ?? $this->officialPlaylists[0];
        $result = [];
        foreach ($playlists as $pl) {
            $result[] = [
                'id' => $pl['id'],
                'title' => $pl['title'],
                'play_count' => '',
                'source' => $source,
                'cover_img_url' => ''
            ];
        }
        return $result;
    }

    public function search($keywords, $source = 0) {
        if ($source == 0) {
            return $this->searchNetease($keywords);
        }
        return $this->searchMock($keywords, $source);
    }

    private function searchNetease($keywords) {
        $url = 'https://music.163.com/api/search/get/web?csrf_token=&type=1&s=' . urlencode($keywords) . '&limit=20&offset=0';
        $result = $this->curlGet($url);
        $data = json_decode($result, true);
        $songs = [];
        if ($data && isset($data['code']) && $data['code'] == 200 && isset($data['result']['songs'])) {
            foreach ($data['result']['songs'] as $song) {
                $artistName = '';
                if (isset($song['artists'][0]['name'])) {
                    $artistName = $song['artists'][0]['name'];
                }
                $albumName = isset($song['album']['name']) ? $song['album']['name'] : '';
                $albumId = isset($song['album']['id']) ? $song['album']['id'] : '';
                $artistId = isset($song['artists'][0]['id']) ? $song['artists'][0]['id'] : '';
                $albumPic = isset($song['album']['picUrl']) ? $song['album']['picUrl'] : '';
                if (!$albumPic && isset($song['album']['picId'])) {
                    $albumPic = $this->metingApiBase . '?server=netease&type=pic&id=' . $song['album']['picId'];
                }
                $songs[] = [
                    'id' => 'netease_' . $song['id'],
                    'title' => $song['name'],
                    'artist' => $artistName,
                    'artist_id' => $artistId,
                    'album' => $albumName,
                    'album_id' => $albumId,
                    'source' => 0,
                    'source_url' => 'https://music.163.com/#/song?id=' . $song['id'],
                    'img_url' => $albumPic,
                    'url' => ''
                ];
            }
        }
        return $songs;
    }

    private function searchMock($keywords, $source) {
        $songs = [];
        $sourceNames = ['网易云', '虾米', 'QQ音乐', '豆瓣'];
        $sourceName = $sourceNames[$source] ?? '未知';
        for ($i = 1; $i <= 10; $i++) {
            $songs[] = [
                'id' => 'mock_' . $source . '_' . $i,
                'title' => $keywords . ' - 搜索结果 ' . $i,
                'artist' => $sourceName . '歌手',
                'artist_id' => '',
                'album' => '示例专辑',
                'album_id' => '',
                'source' => $source,
                'source_url' => '',
                'img_url' => '',
                'url' => ''
            ];
        }
        return $songs;
    }

    public function getPlaylist($list_id) {
        foreach ($this->playlists as $playlist) {
            if ($playlist['id'] === $list_id) {
                return [
                    'info' => [
                        'id' => $playlist['id'],
                        'title' => $playlist['title'],
                        'cover_img_url' => ''
                    ],
                    'tracks' => $playlist['tracks'] ?? [],
                    'is_mine' => $playlist['is_mine'] ?? false
                ];
            }
        }

        if (is_numeric($list_id)) {
            return $this->getNeteasePlaylist($list_id);
        }

        if (strpos($list_id, 'qq_') === 0) {
            return $this->getMockPlaylist($list_id, 1);
        }
        if (strpos($list_id, 'kg_') === 0) {
            return $this->getMockPlaylist($list_id, 2);
        }

        return null;
    }

    private function getNeteasePlaylist($id) {
        $url = $this->metingApiBase . '?server=netease&type=playlist&id=' . $id;
        $result = $this->curlGet($url);
        $data = json_decode($result, true);
        if (!$data || !is_array($data) || count($data) === 0) {
            return null;
        }
        $tracks = [];
        $coverImg = '';
        foreach ($data as $index => $track) {
            if ($index === 0 && isset($track['pic'])) {
                $coverImg = $track['pic'];
            }
            $songId = isset($track['url_id']) ? $track['url_id'] : (isset($track['id']) ? $track['id'] : '');
            if (!$songId && isset($track['url'])) {
                preg_match('/id=(\d+)/', $track['url'], $matches);
                if ($matches && isset($matches[1])) {
                    $songId = $matches[1];
                }
            }
            $tracks[] = [
                'id' => 'netease_' . $songId,
                'title' => $track['name'] ?? $track['title'] ?? '未知歌曲',
                'artist' => $track['artist'] ?? $track['author'] ?? '未知艺术家',
                'artist_id' => '',
                'album' => $track['album'] ?? '',
                'album_id' => '',
                'source' => 0,
                'source_url' => 'https://music.163.com/#/song?id=' . $songId,
                'img_url' => $track['pic'] ?? '',
                'url' => $track['url'] ?? ''
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
        $title = $titleMap[$id] ?? '网易云歌单';
        return [
            'info' => [
                'id' => $id,
                'title' => $title,
                'cover_img_url' => $coverImg
            ],
            'tracks' => $tracks,
            'is_mine' => false
        ];
    }

    private function getMockPlaylist($id, $source) {
        $sourceNames = ['网易云', '虾米', 'QQ音乐', '豆瓣'];
        $sourceName = $sourceNames[$source] ?? '未知';
        $titleMap = [
            'qq_hot' => 'QQ音乐热歌榜',
            'qq_new' => 'QQ音乐新歌榜',
            'qq_original' => 'QQ音乐原创榜',
            'qq_soaring' => 'QQ音乐飙升榜',
            'qq_classic' => 'QQ音乐经典榜',
            'qq_radio' => 'QQ音乐影视金曲',
            'kg_hot' => '酷狗热歌榜',
            'kg_new' => '酷狗新歌榜',
            'kg_soaring' => '酷狗飙升榜',
            'kg_classic' => '酷狗经典老歌',
            'kg_dj' => '酷狗DJ舞曲榜',
            'kg_internet' => '酷狗网络红歌',
        ];
        $title = $titleMap[$id] ?? $sourceName . '歌单';
        $tracks = [];
        for ($i = 1; $i <= 30; $i++) {
            $tracks[] = [
                'id' => $id . '_track_' . $i,
                'title' => $sourceName . '歌曲 ' . $i,
                'artist' => $sourceName . '歌手',
                'artist_id' => '',
                'album' => '示例专辑',
                'album_id' => '',
                'source' => $source,
                'source_url' => '',
                'img_url' => '',
                'url' => ''
            ];
        }
        return [
            'info' => [
                'id' => $id,
                'title' => $title,
                'cover_img_url' => ''
            ],
            'tracks' => $tracks,
            'is_mine' => false
        ];
    }

    public function getSongUrl($songId) {
        if (strpos($songId, 'netease_') === 0) {
            $realId = str_replace('netease_', '', $songId);
            $url = $this->metingApiBase . '?server=netease&type=url&id=' . $realId;
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_NOBODY, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_exec($ch);
            $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode == 200 || $httpCode == 302 || strpos($finalUrl, '.mp3') !== false) {
                if (strpos($finalUrl, 'meting') !== false) {
                    return $url;
                }
                return $finalUrl;
            }
            return $url;
        }
        return '';
    }

    public function getMyPlaylists() {
        return array_values($this->playlists);
    }

    public function createPlaylist($title, $track = null) {
        $id = 'mine_' . time() . '_' . rand(100, 999);
        $playlist = [
            'id' => $id,
            'title' => $title,
            'is_mine' => true,
            'tracks' => [],
            'created_at' => time()
        ];
        if ($track) {
            $playlist['tracks'][] = $track;
        }
        $this->playlists[] = $playlist;
        $this->lastUpdate = time() * 1000;
        $this->save();
        return $id;
    }

    public function deletePlaylist($list_id) {
        foreach ($this->playlists as $key => $playlist) {
            if ($playlist['id'] === $list_id) {
                unset($this->playlists[$key]);
                $this->playlists = array_values($this->playlists);
                $this->lastUpdate = time() * 1000;
                $this->save();
                return true;
            }
        }
        return false;
    }

    public function addTrackToPlaylist($list_id, $track) {
        foreach ($this->playlists as $key => $playlist) {
            if ($playlist['id'] === $list_id) {
                foreach ($playlist['tracks'] as $t) {
                    if ($t['id'] === $track['id']) {
                        return false;
                    }
                }
                $this->playlists[$key]['tracks'][] = $track;
                $this->lastUpdate = time() * 1000;
                $this->save();
                return true;
            }
        }
        return false;
    }

    public function removeTrackFromPlaylist($list_id, $track_id) {
        foreach ($this->playlists as $key => $playlist) {
            if ($playlist['id'] === $list_id) {
                $tracks = [];
                foreach ($playlist['tracks'] as $t) {
                    if ($t['id'] !== $track_id) {
                        $tracks[] = $t;
                    }
                }
                $this->playlists[$key]['tracks'] = $tracks;
                $this->lastUpdate = time() * 1000;
                $this->save();
                return true;
            }
        }
        return false;
    }

    public function clonePlaylist($list_id) {
        $playlist = $this->getPlaylist($list_id);
        if (!$playlist) {
            return false;
        }
        $newId = 'mine_' . time() . '_' . rand(100, 999);
        $newPlaylist = [
            'id' => $newId,
            'title' => $playlist['info']['title'] . '（收藏）',
            'is_mine' => true,
            'tracks' => $playlist['tracks'],
            'created_at' => time()
        ];
        $this->playlists[] = $newPlaylist;
        $this->lastUpdate = time() * 1000;
        $this->save();
        return $newId;
    }

    public function getLastUpdate() {
        return $this->lastUpdate;
    }

    public function hasUpdate($since) {
        return $this->lastUpdate > $since;
    }

    public function sync() {
        $this->lastUpdate = time() * 1000;
        $this->save();
        return true;
    }
}
