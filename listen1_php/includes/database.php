<?php
/**
 * 数据库操作类 (使用JSON文件存储)
 */

class Database {
    private static $instance = null;
    private $playlists = [];
    private $last_update = 0;

    private function __construct() {
        $this->loadData();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function loadData() {
        $data = read_json_file(PLAYLISTS_FILE);
        if ($data) {
            $this->playlists = $data['playlists'] ?? [];
            $this->last_update = $data['last_update'] ?? 0;
        } else {
            $this->playlists = $this->getDefaultPlaylists();
            $this->saveData();
        }
    }

    private function saveData() {
        $data = [
            'playlists' => $this->playlists,
            'last_update' => $this->last_update
        ];
        write_json_file(PLAYLISTS_FILE, $data);
    }

    public function updateTimestamp() {
        $this->last_update = get_microtime();
        $this->saveData();
    }

    public function getLastUpdate() {
        return $this->last_update;
    }

    private function getDefaultPlaylists() {
        return [
            [
                'id' => 'default_1',
                'title' => '默认歌单',
                'cover_img_url' => '/static/images/mycover.jpg',
                'is_mine' => true,
                'tracks' => []
            ]
        ];
    }

    public function getAllPlaylists() {
        return $this->playlists;
    }

    public function getPlaylist($list_id) {
        foreach ($this->playlists as $playlist) {
            if ($playlist['id'] === $list_id) {
                return [
                    'info' => [
                        'id' => $playlist['id'],
                        'title' => $playlist['title'],
                        'cover_img_url' => $playlist['cover_img_url']
                    ],
                    'tracks' => $playlist['tracks'] ?? [],
                    'is_mine' => $playlist['is_mine'] ?? false
                ];
            }
        }
        return null;
    }

    public function getMyPlaylists() {
        return array_filter($this->playlists, function($p) {
            return isset($p['is_mine']) && $p['is_mine'];
        });
    }

    public function getRecommendPlaylists($source = 0) {
        // 返回推荐歌单
        $sources = ['网易', '虾米', 'QQ音乐', '豆瓣'];
        return [
            [
                'id' => 'rec_' . $source . '_1',
                'title' => $sources[$source] . '推荐歌单 ' . date('Y-m-d'),
                'cover_img_url' => '/static/images/placeholder.png',
                'track_count' => 20,
                'is_mine' => false
            ],
            [
                'id' => 'rec_' . $source . '_2',
                'title' => $sources[$source] . '热门歌曲',
                'cover_img_url' => '/static/images/placeholder.png',
                'track_count' => 50,
                'is_mine' => false
            ]
        ];
    }

    public function createPlaylist($title, $cover_img_url = '/static/images/mycover.jpg') {
        $id = 'mine_' . generate_id();
        $playlist = [
            'id' => $id,
            'title' => $title,
            'cover_img_url' => $cover_img_url,
            'is_mine' => true,
            'tracks' => [],
            'created_at' => time()
        ];
        $this->playlists[] = $playlist;
        $this->saveData();
        return $id;
    }

    public function addToPlaylist($list_id, $song) {
        foreach ($this->playlists as &$playlist) {
            if ($playlist['id'] === $list_id) {
                // 检查是否已存在
                foreach ($playlist['tracks'] as $track) {
                    if ($track['id'] === $song['id']) {
                        return;
                    }
                }
                $playlist['tracks'][] = [
                    'id' => $song['id'],
                    'title' => $song['title'] ?? '',
                    'artist' => $song['artist'] ?? '',
                    'album' => $song['album'] ?? '',
                    'artist_id' => $song['artist_id'] ?? '',
                    'album_id' => $song['album_id'] ?? '',
                    'source' => $song['source'] ?? '',
                    'url' => $song['url'] ?? '',
                    'source_url' => $song['source_url'] ?? '',
                    'img_url' => $song['img_url'] ?? '/static/images/placeholder.png',
                    'duration' => $song['duration'] ?? 0
                ];
                $this->saveData();
                return;
            }
        }
    }

    public function removeFromPlaylist($list_id, $track_id) {
        foreach ($this->playlists as &$playlist) {
            if ($playlist['id'] === $list_id) {
                $playlist['tracks'] = array_filter($playlist['tracks'], function($track) use ($track_id) {
                    return $track['id'] !== $track_id;
                });
                $this->saveData();
                return;
            }
        }
    }

    public function removePlaylist($list_id) {
        $this->playlists = array_filter($this->playlists, function($playlist) use ($list_id) {
            return $playlist['id'] !== $list_id;
        });
        $this->saveData();
    }

    public function clonePlaylist($list_id) {
        $source = $this->getPlaylist($list_id);
        if ($source) {
            return $this->createPlaylist(
                $source['info']['title'] . ' (副本)',
                $source['info']['cover_img_url']
            );
        }
        return null;
    }
}
