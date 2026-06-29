/**
 * Listen 1 PHP - 前端核心逻辑
 */

// 全局状态
var App = {
    currentTab: 1,
    searchTab: 0,
    recommendTab: 0,
    currentPlaylist: [],
    currentListId: null,
    isMine: false,
    searchTimer: null,
    autoSync: true,
    pollInterval: null,
    lastSyncTime: 0
};

// 播放器状态
var Player = {
    playlist: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    audio: null,
    currentSong: null
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    Player.audio = document.getElementById('audio-player');
    initAudioEvents();
    initProgressBar();
    loadMyPlaylists();
    loadRecommendPlaylists();
    startSyncPolling();
    console.log('App initialized');
});

// ============ 音频播放器 ============

function initAudioEvents() {
    Player.audio.addEventListener('timeupdate', function() {
        if (Player.audio.duration && Player.audio.duration > 0) {
            var pct = (Player.audio.currentTime / Player.audio.duration) * 100;
            var fill = document.getElementById('progress-fill');
            if (fill) fill.style.width = pct + '%';
            var ct = document.getElementById('current-time');
            if (ct) ct.textContent = formatTime(Player.audio.currentTime);
            var tt = document.getElementById('total-time');
            if (tt) tt.textContent = formatTime(Player.audio.duration);
        }
    });

    Player.audio.addEventListener('ended', function() {
        nextTrack();
    });

    Player.audio.addEventListener('play', function() {
        Player.isPlaying = true;
        var btn = document.getElementById('play-btn');
        if (btn) btn.textContent = '⏸';
    });

    Player.audio.addEventListener('pause', function() {
        Player.isPlaying = false;
        var btn = document.getElementById('play-btn');
        if (btn) btn.textContent = '▶';
    });

    Player.audio.addEventListener('error', function() {
        console.warn('Audio playback error');
    });
}

function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function togglePlay() {
    if (!Player.currentSong) {
        showToast('请先选择一首歌曲');
        return;
    }
    if (Player.isPlaying) {
        Player.audio.pause();
    } else {
        Player.audio.play().catch(function(e) { console.warn(e); });
    }
}

function prevTrack() {
    if (Player.playlist.length === 0) return;
    Player.currentIndex = (Player.currentIndex - 1 + Player.playlist.length) % Player.playlist.length;
    playSong(Player.playlist[Player.currentIndex]);
}

function nextTrack() {
    if (Player.playlist.length === 0) return;
    if (Player.isShuffle) {
        Player.currentIndex = Math.floor(Math.random() * Player.playlist.length);
    } else {
        Player.currentIndex = (Player.currentIndex + 1) % Player.playlist.length;
    }
    playSong(Player.playlist[Player.currentIndex]);
}

function playSong(song, addToList) {
    if (addToList) {
        Player.playlist.push(song);
        Player.currentIndex = Player.playlist.length - 1;
    }
    Player.currentSong = song;
    updatePlayerUI(song);
    if (song.url) {
        Player.audio.src = song.url;
        Player.audio.play().catch(function(e) { console.warn(e); });
    }
    updatePlaylistMenu();
}

function updatePlayerUI(song) {
    var cover = document.getElementById('player-cover');
    if (cover) cover.src = song.img_url || '/static/images/placeholder.png';
    var title = document.getElementById('player-title');
    if (title) { title.textContent = song.title || '未知歌曲'; title.title = song.title || ''; }
    var artist = document.getElementById('player-artist');
    if (artist) { artist.textContent = song.artist || '未知艺术家'; artist.title = song.artist || ''; }
}

function addToPlaylist(song) {
    Player.playlist.push(song);
    updatePlaylistMenu();
    showToast('已添加到播放列表');
}

function clearPlaylist() {
    Player.playlist = [];
    Player.currentIndex = -1;
    Player.currentSong = null;
    Player.audio.pause();
    Player.audio.src = '';
    updatePlayerUI({title:'未播放', artist:'未知艺术家', img_url:'/static/images/placeholder.png'});
    var fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = '0%';
    var ct = document.getElementById('current-time');
    if (ct) ct.textContent = '0:00';
    var tt = document.getElementById('total-time');
    if (tt) tt.textContent = '0:00';
    updatePlaylistMenu();
    showToast('播放列表已清空');
}

function removeFromPlaylist(index) {
    if (index === Player.currentIndex) {
        Player.currentSong = null;
        Player.audio.pause();
        Player.audio.src = '';
        Player.currentIndex = -1;
        updatePlayerUI({title:'未播放', artist:'未知艺术家', img_url:'/static/images/placeholder.png'});
    } else if (index < Player.currentIndex) {
        Player.currentIndex--;
    }
    Player.playlist.splice(index, 1);
    updatePlaylistMenu();
}

function playFromPlaylist(index) {
    if (index >= 0 && index < Player.playlist.length) {
        Player.currentIndex = index;
        playSong(Player.playlist[index]);
    }
}

function togglePlayMode() {
    Player.isShuffle = !Player.isShuffle;
    var btn = document.getElementById('mode-btn');
    if (btn) {
        btn.textContent = Player.isShuffle ? '🔀' : '🔁';
        btn.title = Player.isShuffle ? '随机播放' : '顺序播放';
    }
    showToast(Player.isShuffle ? '随机播放' : '顺序播放');
}

function togglePlaylistMenu() {
    var menu = document.getElementById('playlist-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        updatePlaylistMenu();
    }
}

function updatePlaylistMenu() {
    var list = document.getElementById('playlist-menu-list');
    if (!list) return;
    list.innerHTML = '';
    Player.playlist.forEach(function(song, i) {
        var li = document.createElement('li');
        if (i === Player.currentIndex) li.className = 'playing';
        li.innerHTML = '<span class="menu-song">' + escapeHtml(song.title || '未知歌曲') + '</span>' +
            '<span class="menu-artist">' + escapeHtml(song.artist || '') + '</span>' +
            '<span class="menu-remove" onclick="event.stopPropagation(); removeFromPlaylist(' + i + ')">×</span>';
        li.addEventListener('click', function() { playFromPlaylist(i); });
        list.appendChild(li);
    });
}

// 进度条拖动
function initProgressBar() {
    var bar = document.getElementById('progress-bar');
    if (!bar) return;
    var dragging = false;

    function getProgress(e) {
        var rect = bar.getBoundingClientRect();
        var x = e.clientX - rect.left;
        return Math.max(0, Math.min(1, x / rect.width));
    }

    bar.addEventListener('mousedown', function(e) {
        dragging = true;
        var p = getProgress(e);
        if (Player.audio.duration) Player.audio.currentTime = p * Player.audio.duration;
    });

    document.addEventListener('mousemove', function(e) {
        if (dragging) {
            var p = getProgress(e);
            var fill = document.getElementById('progress-fill');
            if (fill) fill.style.width = (p * 100) + '%';
        }
    });

    document.addEventListener('mouseup', function(e) {
        if (dragging) {
            dragging = false;
            var p = getProgress(e);
            if (Player.audio.duration) Player.audio.currentTime = p * Player.audio.duration;
        }
    });
}

// ============ 导航切换 ============

function switchTab(tabId) {
    App.currentTab = tabId;
    for (var i = 1; i <= 4; i++) {
        var nav = document.querySelector('.nav-item[data-tab="' + i + '"]');
        var page = document.getElementById('tab-' + i);
        if (nav) {
            nav.className = 'nav-item' + (i === tabId ? ' active' : '');
        }
        if (page) {
            page.className = 'tab-content' + (i === tabId ? ' active' : '');
        }
    }
    if (tabId === 1) loadMyPlaylists();
    if (tabId === 2) loadRecommendPlaylists();
}

// ============ 我的歌单 ============

function loadMyPlaylists() {
    httpGet('/?path=show_myplaylist', function(data) {
        if (!data || !data.result) {
            console.warn('No playlists data error:', data);
            return;
        }
        renderMyPlaylists(data.result);
    });
}

function renderMyPlaylists(playlists) {
    var container = document.getElementById('my-playlists');
    if (!container) return;
    container.innerHTML = '';
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<p style="color:#999;padding:40px;text-align:center;grid-column:1/-1;">暂无歌单，点击右上角创建</p>';
        return;
    }
    playlists.forEach(function(pl) {
        var card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = '<div class="playlist-cover">' +
            '<img src="' + (pl.cover_img_url || '/static/images/placeholder.png') + '" alt="">' +
            '<div class="playlist-cover-overlay">' +
            '<div class="play-btn-circle">▶</div>' +
            '</div></div>' +
            '<div class="playlist-title" title="' + escapeHtml(pl.title || '') + '">' +
            escapeHtml(pl.title || '未命名') + '</div>';
        card.addEventListener('click', function() { showPlaylistDetail(pl.id); });
        container.appendChild(card);
    });
}

// ============ 精选歌单 ============

function loadRecommendPlaylists() {
    httpGet('/?path=show_playlist&source=' + App.recommendTab, function(data) {
        if (!data || !data.result) return;
        renderRecommendPlaylists(data.result);
    });
}

function renderRecommendPlaylists(playlists) {
    var container = document.getElementById('recommend-playlists');
    if (!container) return;
    container.innerHTML = '';
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<p style="color:#999;padding:40px;text-align:center;grid-column:1/-1;">暂无数据</p>';
        return;
    }
    playlists.forEach(function(pl) {
        var card = document.createElement('div');
        card.className = 'playlist-card';
        card.innerHTML = '<div class="playlist-cover">' +
            '<img src="' + (pl.cover_img_url || '/static/images/placeholder.png') + '" alt="">' +
            '<div class="playlist-cover-overlay">' +
            '<div class="play-btn-circle">▶</div>' +
            '</div></div>' +
            '<div class="playlist-title" title="' + escapeHtml(pl.title || '') + '">' +
            escapeHtml(pl.title || '未命名') + '</div>';
        card.addEventListener('click', function() { showPlaylistDetail(pl.id); });
        container.appendChild(card);
    });
}

function switchSource(tab, btn) {
    App.recommendTab = tab;
    var btns = btn.parentElement.querySelectorAll('.source-btn');
    btns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    loadRecommendPlaylists();
}

// ============ 歌单详情 ============

function showPlaylistDetail(listId) {
    httpGet('/?path=playlist&list_id=' + listId, function(data) {
        if (!data || data.status === 0) {
            showToast(data.reason || '歌单不存在');
            return;
        }
        App.currentPlaylist = data.tracks || [];
        App.currentListId = listId;
        App.isMine = !!data.is_mine;

        var cover = document.getElementById('detail-cover');
        var title = document.getElementById('detail-title');
        var delBtn = document.getElementById('detail-delete-btn');
        var cloneBtn = document.getElementById('detail-clone-btn');
        if (cover) cover.src = data.info && data.info.cover_img_url || '/static/images/placeholder.png';
        if (title) title.textContent = data.info && data.info.title || '';
        if (delBtn) delBtn.style.display = data.is_mine ? '' : 'none';
        if (cloneBtn) cloneBtn.style.display = data.is_mine ? 'none' : '';

        renderDetailSongs(data.tracks || []);
        var modal = document.getElementById('playlist-modal');
        if (modal) modal.style.display = 'flex';
    });
}

function renderDetailSongs(songs) {
    var list = document.getElementById('detail-songs');
    if (!list) return;
    list.innerHTML = '';
    if (!songs || songs.length === 0) {
        list.innerHTML = '<p style="color:#999;padding:40px;text-align:center;">歌单为空</p>';
        return;
    }
    songs.forEach(function(song, i) {
        var item = document.createElement('div');
        item.className = 'song-item';
        item.innerHTML = '<div class="song-index">' + (i + 1) + '</div>' +
            '<div class="song-name" title="' + escapeHtml(song.title || '') + '">' + escapeHtml(song.title || '未知歌曲') + '</div>' +
            '<div class="song-artist" title="' + escapeHtml(song.artist || '') + '">' + escapeHtml(song.artist || '') + '</div>' +
            '<div class="song-album" title="' + escapeHtml(song.album || '') + '">' + escapeHtml(song.album || '') + '</div>' +
            '<div class="song-actions">' +
            '<button class="song-action-btn" title="播放" onclick="event.stopPropagation(); playSong(' + safeJson(song) + ', true)">▶</button>' +
            '<button class="song-action-btn" title="添加" onclick="event.stopPropagation(); addToPlaylist(' + safeJson(song) + ')">+</button>' +
            '<button class="song-action-btn" title="收藏到歌单" onclick="event.stopPropagation(); addToMyPlaylist(' + safeJson(song) + ')">♥</button>' +
            (App.isMine ? '<button class="song-action-btn" title="删除" onclick="event.stopPropagation(); removeFromList(\'' + song.id + '\')">×</button>' : '') +
            '</div>';
        item.addEventListener('click', function() { playSong(song, true); });
        list.appendChild(item);
    });
}

function safeJson(obj) {
    return JSON.stringify(obj).replace(/'/g, "\\'");
}

function closePlaylistDetail() {
    var modal = document.getElementById('playlist-modal');
    if (modal) modal.style.display = 'none';
}

function playCurrentList() {
    if (App.currentPlaylist && App.currentPlaylist.length > 0) {
        Player.playlist = App.currentPlaylist.slice();
        Player.currentIndex = 0;
        playSong(Player.playlist[0]);
    } else {
        showToast('歌单为空');
    }
}

function deleteCurrentList() {
    if (!confirm('确定要删除这个歌单吗？')) return;
    httpPost('/?path=remove_myplaylist', { list_id: App.currentListId }, function(data) {
        showToast('删除成功');
        closePlaylistDetail();
        loadMyPlaylists();
    });
}

function cloneCurrentList() {
    httpPost('/?path=clone_playlist', { list_id: App.currentListId }, function(data) {
        showToast('收藏成功');
        loadMyPlaylists();
    });
}

function removeFromList(trackId) {
    httpPost('/?path=remove_track_from_myplaylist', {
        list_id: App.currentListId,
        track_id: trackId
    }, function(data) {
        showToast('已删除');
        App.currentPlaylist = App.currentPlaylist.filter(function(s) { return s.id !== trackId; });
        renderDetailSongs(App.currentPlaylist);
    });
}

// ============ 搜索 ============

function switchSearchTab(tab, btn) {
    App.searchTab = tab;
    var btns = btn.parentElement.querySelectorAll('.search-tab');
    btns.forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    doSearch();
}

function onSearchInput() {
    if (App.searchTimer && clearTimeout(App.searchTimer));
    App.searchTimer = setTimeout(doSearch, 300);
}

function doSearch() {
    var input = document.getElementById('search-input');
    if (!input) return;
    var kw = input.value.trim();
    var list = document.getElementById('search-results');
    if (!kw) {
        if (list) list.innerHTML = '';
        return;
    }
    httpGet('/?path=search&source=' + App.searchTab + '&keywords=' + encodeURIComponent(kw), function(data) {
        if (!data || !data.result) return;
        renderSearchResults(data.result || []);
    });
}

function renderSearchResults(songs) {
    var list = document.getElementById('search-results');
    if (!list) return;
    list.innerHTML = '';
    if (!songs || songs.length === 0) {
        list.innerHTML = '<p style="color:#999;padding:40px;text-align:center;">未找到相关歌曲</p>';
        return;
    }
    songs.forEach(function(song, i) {
        var item = document.createElement('div');
        item.className = 'song-item';
        item.innerHTML = '<div class="song-index">' + (i + 1) + '</div>' +
            '<div class="song-name" title="' + escapeHtml(song.title || '') + '">' + escapeHtml(song.title || '未知歌曲') + '</div>' +
            '<div class="song-artist" title="' + escapeHtml(song.artist || '') + '">' + escapeHtml(song.artist || '') + '</div>' +
            '<div class="song-album" title="' + escapeHtml(song.album || '') + '">' + escapeHtml(song.album || '') + '</div>' +
            '<div class="song-actions">' +
            '<button class="song-action-btn" title="播放" onclick="event.stopPropagation(); playSong(' + safeJson(song) + ', true)">▶</button>' +
            '<button class="song-action-btn" title="添加" onclick="event.stopPropagation(); addToPlaylist(' + safeJson(song) + ')">+</button>' +
            '<button class="song-action-btn" title="收藏到歌单" onclick="event.stopPropagation(); addToMyPlaylist(' + safeJson(song) + ')">♥</button>' +
            '</div>';
        item.addEventListener('click', function() { playSong(song, true); });
        list.appendChild(item);
    });
}

// ============ 新建歌单弹窗 ============

var pendingSong = null;

function showCreateDialog() {
    pendingSong = null;
    document.getElementById('new-playlist-name').value = '';
    document.getElementById('create-modal').style.display = 'flex';
}

function closeCreateDialog() {
    document.getElementById('create-modal').style.display = 'none';
    pendingSong = null;
}

function createPlaylist() {
    var input = document.getElementById('new-playlist-name');
    var name = input.value.trim();
    if (!name) {
        showToast('请输入歌单名称');
        return;
    }
    var data = { list_title: name };
    if (pendingSong) {
        data.id = pendingSong.id || '';
        data.title = pendingSong.title || '';
        data.artist = pendingSong.artist || '';
        data.url = pendingSong.url || '';
        data.artist_id = pendingSong.artist_id || '';
        data.album = pendingSong.album || '';
        data.album_id = pendingSong.album_id || '';
        data.source = pendingSong.source || '';
        data.source_url = pendingSong.source_url || '';
    }
    httpPost('/?path=create_myplaylist', data, function(res) {
        showToast('创建成功');
        closeCreateDialog();
        loadMyPlaylists();
    });
}

function addToMyPlaylist(song) {
    pendingSong = song;
    document.getElementById('new-playlist-name').value = '';
    document.getElementById('create-modal').style.display = 'flex';
}

function addCurrentToPlaylist() {
    if (!Player.currentSong) {
        showToast('请先播放一首歌');
        return;
    }
    addToMyPlaylist(Player.currentSong);
}

// ============ 同步功能 ============

function startSyncPolling() {
    if (App.pollInterval) clearInterval(App.pollInterval);
    App.pollInterval = setInterval(checkUpdate, 5000);
}

function checkUpdate() {
    httpGet('/?path=sse&since=' + App.lastSyncTime, function(data) {
        var status = document.getElementById('sync-status');
        if (status) { status.textContent = '已连接'; status.className = 'status-ok'; }
        if (data && data.has_update) {
            App.lastSyncTime = data.timestamp || Date.now();
            updateLastSync();
            if (App.currentTab === 1) loadMyPlaylists();
        }
    });
}

function manualSync() {
    httpGet('/?path=sync', function(data) {
        App.lastSyncTime = Date.now();
        updateLastSync();
        showToast('同步成功');
        loadMyPlaylists();
    });
}

function toggleAutoSync() {
    App.autoSync = !App.autoSync;
    var btn = document.getElementById('auto-sync-btn');
    if (btn) btn.textContent = App.autoSync ? '关闭自动同步' : '开启自动同步';
    if (App.autoSync) {
        startSyncPolling();
        var status = document.getElementById('sync-status');
        if (status) { status.textContent = '已连接'; status.className = 'status-ok'; }
    } else {
        if (App.pollInterval) { clearInterval(App.pollInterval); App.pollInterval = null; }
        var status2 = document.getElementById('sync-status');
        if (status2) { status2.textContent = '未连接'; status2.className = 'status-error'; }
    }
}

function updateLastSync() {
    var el = document.getElementById('last-sync');
    if (el) el.textContent = new Date().toLocaleString();
}

// ============ 工具函数 ============

function httpGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                callback(JSON.parse(xhr.responseText));
            } catch (e) {
                console.warn('Parse error:', e, xhr.responseText);
                callback(null);
            }
        } else {
            console.warn('HTTP error:', xhr.status);
            callback(null);
        }
    };
    xhr.onerror = function() {
        console.warn('Request failed:', url);
        callback(null);
    };
    xhr.send();
}

function httpPost(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    var params = [];
    for (var k in data ) {
        if (data.hasOwnProperty(k)) {
            params.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k] == null ? '' : data[k]));
        }
    }
    xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
            try {
                callback(JSON.parse(xhr.responseText));
            } catch (e) {
                callback(null);
            }
        } else {
            callback(null);
        }
    };
    xhr.onerror = function() { callback(null); };
    xhr.send(params.join('&'));
}

function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

var toastTimer = null;
function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
        toast.style.display = 'none';
    }, 2000);
}
