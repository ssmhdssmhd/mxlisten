(function() {
    'use strict';

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
        lastSyncTime: 0,
        pendingSong: null
    };

    var Player = {
        playlist: [],
        currentIndex: -1,
        isPlaying: false,
        isShuffle: false,
        audio: null,
        currentSong: null
    };

    function $(id) {
        return document.getElementById(id);
    }

    function formatTime(sec) {
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
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
        var toast = $('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = 'toast show';
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
            toast.className = 'toast';
        }, 2000);
    }

    function httpGet(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    callback(JSON.parse(xhr.responseText));
                } catch (e) {
                    console.warn('Parse error:', e);
                    callback(null);
                }
            } else {
                callback(null);
            }
        };
        xhr.onerror = function() { callback(null); };
        xhr.send();
    }

    function httpPost(url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        var params = [];
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                params.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k] == null ? '' : data[k]));
            }
        }
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    callback(JSON.parse(xhr.responseText));
                } catch (e) { callback(null); }
            } else { callback(null); }
        };
        xhr.onerror = function() { callback(null); };
        xhr.send(params.join('&'));
    }

    // ============ 播放器 ============

    function initPlayer() {
        Player.audio = $('audio-player');
        if (!Player.audio) return;

        Player.audio.addEventListener('timeupdate', function() {
            if (Player.audio.duration > 0) {
                var pct = (Player.audio.currentTime / Player.audio.duration) * 100;
                var fill = $('progress-fill');
                if (fill) fill.style.width = pct + '%';
                var ct = $('current-time');
                if (ct) ct.textContent = formatTime(Player.audio.currentTime);
                var tt = $('total-time');
                if (tt) tt.textContent = formatTime(Player.audio.duration);
            }
        });

        Player.audio.addEventListener('ended', function() {
            playNext();
        });

        Player.audio.addEventListener('play', function() {
            Player.isPlaying = true;
            var btn = $('play-btn');
            if (btn) btn.textContent = '⏸';
        });

        Player.audio.addEventListener('pause', function() {
            Player.isPlaying = false;
            var btn = $('play-btn');
            if (btn) btn.textContent = '▶';
        });

        initProgressBar();
    }

    function initProgressBar() {
        var bar = $('progress-bar');
        if (!bar) return;
        var dragging = false;

        function getPct(e) {
            var rect = bar.getBoundingClientRect();
            var x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
            return Math.max(0, Math.min(1, x / rect.width));
        }

        bar.addEventListener('mousedown', function(e) {
            dragging = true;
            var p = getPct(e);
            if (Player.audio.duration) Player.audio.currentTime = p * Player.audio.duration;
        });

        document.addEventListener('mousemove', function(e) {
            if (dragging) {
                var p = getPct(e);
                var fill = $('progress-fill');
                if (fill) fill.style.width = (p * 100) + '%';
            }
        });

        document.addEventListener('mouseup', function(e) {
            if (dragging) {
                dragging = false;
                var p = getPct(e);
                if (Player.audio.duration) Player.audio.currentTime = p * Player.audio.duration;
            }
        });
    }

    function playSong(song, addToList) {
        if (addToList) {
            Player.playlist.push(song);
            Player.currentIndex = Player.playlist.length - 1;
        }
        Player.currentSong = song;

        var cover = document.querySelector('.player-cover');
        if (cover) {
            cover.className = 'player-cover cover-placeholder';
            cover.innerHTML = '<span class="cover-icon small">♪</span>';
        }
        var title = $('player-title');
        if (title) { title.textContent = song.title || '未知歌曲'; title.title = song.title || ''; }
        var artist = $('player-artist');
        if (artist) { artist.textContent = song.artist || '未知艺术家'; artist.title = song.artist || ''; }

        if (song.url) {
            Player.audio.src = song.url;
            Player.audio.play().catch(function(e) { console.warn(e); });
        }

        updatePlaylistMenu();
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

    function playPrev() {
        if (Player.playlist.length === 0) return;
        Player.currentIndex = (Player.currentIndex - 1 + Player.playlist.length) % Player.playlist.length;
        playSong(Player.playlist[Player.currentIndex]);
    }

    function playNext() {
        if (Player.playlist.length === 0) return;
        if (Player.isShuffle) {
            Player.currentIndex = Math.floor(Math.random() * Player.playlist.length);
        } else {
            Player.currentIndex = (Player.currentIndex + 1) % Player.playlist.length;
        }
        playSong(Player.playlist[Player.currentIndex]);
    }

    function toggleMode() {
        Player.isShuffle = !Player.isShuffle;
        var btn = $('mode-btn');
        if (btn) {
            btn.textContent = Player.isShuffle ? '🔀' : '🔁';
            btn.title = Player.isShuffle ? '随机播放' : '顺序播放';
        }
        showToast(Player.isShuffle ? '随机播放' : '顺序播放');
    }

    function addToPlayerList(song) {
        Player.playlist.push(song);
        updatePlaylistMenu();
        showToast('已添加到播放列表');
    }

    function clearPlayerList() {
        Player.playlist = [];
        Player.currentIndex = -1;
        Player.currentSong = null;
        Player.audio.pause();
        Player.audio.src = '';
        var cover = document.querySelector('.player-cover');
        if (cover) {
            cover.className = 'player-cover cover-placeholder';
            cover.innerHTML = '<span class="cover-icon small">♪</span>';
        }
        var title = $('player-title');
        if (title) title.textContent = '未播放';
        var artist = $('player-artist');
        if (artist) artist.textContent = '未知艺术家';
        var fill = $('progress-fill');
        if (fill) fill.style.width = '0%';
        var ct = $('current-time');
        if (ct) ct.textContent = '0:00';
        var tt = $('total-time');
        if (tt) tt.textContent = '0:00';
        updatePlaylistMenu();
        showToast('播放列表已清空');
    }

    function removeFromPlayerList(index) {
        if (index === Player.currentIndex) {
            Player.currentSong = null;
            Player.audio.pause();
            Player.audio.src = '';
            Player.currentIndex = -1;
            var cover = document.querySelector('.player-cover');
            if (cover) {
                cover.className = 'player-cover cover-placeholder';
                cover.innerHTML = '<span class="cover-icon small">♪</span>';
            }
            var title = $('player-title');
            if (title) title.textContent = '未播放';
            var artist = $('player-artist');
            if (artist) artist.textContent = '未知艺术家';
        } else if (index < Player.currentIndex) {
            Player.currentIndex--;
        }
        Player.playlist.splice(index, 1);
        updatePlaylistMenu();
    }

    function togglePlaylistMenu() {
        var menu = $('playlist-menu');
        if (menu) {
            if (menu.classList.contains('show')) {
                menu.classList.remove('show');
            } else {
                menu.classList.add('show');
                updatePlaylistMenu();
            }
        }
    }

    function updatePlaylistMenu() {
        var list = $('playlist-menu-list');
        if (!list) return;
        list.innerHTML = '';
        Player.playlist.forEach(function(song, i) {
            var li = document.createElement('li');
            if (i === Player.currentIndex) li.className = 'playing';
            li.innerHTML = '<span class="menu-song">' + escapeHtml(song.title || '未知歌曲') + '</span>' +
                '<span class="menu-artist">' + escapeHtml(song.artist || '') + '</span>' +
                '<button class="menu-remove">×</button>';
            li.addEventListener('click', function(e) {
                if (e.target.classList.contains('menu-remove')) {
                    removeFromPlayerList(i);
                } else {
                    Player.currentIndex = i;
                    playSong(Player.playlist[i]);
                }
            });
            list.appendChild(li);
        });
    }

    // ============ 标签切换 ============

    function switchTab(tabId) {
        App.currentTab = tabId;
        var navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(item, idx) {
            item.classList.toggle('active', idx === tabId - 1);
        });
        for (var i = 1; i <= 4; i++) {
            var page = $('tab-' + i);
            if (page) page.classList.toggle('active', i === tabId);
        }
        if (tabId === 1) loadRecommendPlaylists();
        if (tabId === 2) loadMyPlaylists();
    }

    // ============ 精选歌单 ============

    function loadRecommendPlaylists() {
        var container = $('recommend-playlists');
        if (container) container.innerHTML = '<div class="loading">加载中...</div>';

        httpGet('/?path=show_playlist&source=' + App.recommendTab, function(data) {
            if (!data || !data.result) {
                if (container) container.innerHTML = '<div class="empty-tip">加载失败</div>';
                return;
            }
            renderRecommendPlaylists(data.result);
        });
    }

    function renderRecommendPlaylists(playlists) {
        var container = $('recommend-playlists');
        if (!container) return;
        container.innerHTML = '';
        if (!playlists || playlists.length === 0) {
            container.innerHTML = '<div class="empty-tip">暂无数据</div>';
            return;
        }
        playlists.forEach(function(pl) {
            var card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = '<div class="playlist-cover">' +
                '<div class="cover-inner">♪</div>' +
                '<div class="playlist-cover-overlay"><div class="play-btn-circle">▶</div></div></div>' +
                '<div class="playlist-title" title="' + escapeHtml(pl.title || '') + '">' +
                escapeHtml(pl.title || '未命名') + '</div>';
            card.addEventListener('click', function() {
                showPlaylistDetail(pl.id);
            });
            container.appendChild(card);
        });
    }

    function switchSource(source, btn) {
        App.recommendTab = source;
        var btns = btn.parentElement.querySelectorAll('.source-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadRecommendPlaylists();
    }

    // ============ 我的歌单 ============

    function loadMyPlaylists() {
        var container = $('my-playlists');
        if (container) container.innerHTML = '<div class="loading">加载中...</div>';

        httpGet('/?path=show_myplaylist', function(data) {
            if (!data || !data.result) {
                if (container) container.innerHTML = '<div class="empty-tip">加载失败</div>';
                return;
            }
            renderMyPlaylists(data.result);
        });
    }

    function renderMyPlaylists(playlists) {
        var container = $('my-playlists');
        if (!container) return;
        container.innerHTML = '';
        if (!playlists || playlists.length === 0) {
            container.innerHTML = '<div class="empty-tip">暂无歌单，点击右上角创建</div>';
            return;
        }
        playlists.forEach(function(pl) {
            var card = document.createElement('div');
            card.className = 'playlist-card';
            card.innerHTML = '<div class="playlist-cover">' +
                '<div class="cover-inner">♪</div>' +
                '<div class="playlist-cover-overlay"><div class="play-btn-circle">▶</div></div></div>' +
                '<div class="playlist-title" title="' + escapeHtml(pl.title || '') + '">' +
                escapeHtml(pl.title || '未命名') + '</div>';
            card.addEventListener('click', function() {
                showPlaylistDetail(pl.id);
            });
            container.appendChild(card);
        });
    }

    // ============ 歌单详情 ============

    function showPlaylistDetail(listId) {
        httpGet('/?path=playlist&list_id=' + listId, function(data) {
            if (!data || data.status === 0) {
                showToast(data && data.reason ? data.reason : '歌单不存在');
                return;
            }
            App.currentPlaylist = data.tracks || [];
            App.currentListId = listId;
            App.isMine = !!data.is_mine;

            var title = $('detail-title');
            if (title) title.textContent = data.info && data.info.title || '';
            var count = $('detail-count');
            if (count) count.textContent = (data.tracks ? data.tracks.length : 0) + ' 首歌曲';
            var delBtn = $('delete-list-btn');
            if (delBtn) delBtn.style.display = data.is_mine ? '' : 'none';
            var cloneBtn = $('clone-list-btn');
            if (cloneBtn) cloneBtn.style.display = data.is_mine ? 'none' : '';

            renderDetailSongs(data.tracks || []);
            var modal = $('playlist-modal');
            if (modal) modal.classList.add('show');
        });
    }

    function renderDetailSongs(songs) {
        var list = $('detail-songs');
        if (!list) return;
        list.innerHTML = '';
        if (!songs || songs.length === 0) {
            list.innerHTML = '<div class="empty-tip">歌单为空</div>';
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
                '<button class="song-action-btn" data-action="play" title="播放">▶</button>' +
                '<button class="song-action-btn" data-action="add" title="添加">+</button>' +
                '<button class="song-action-btn" data-action="fav" title="收藏">♥</button>' +
                (App.isMine ? '<button class="song-action-btn" data-action="delete" title="删除">×</button>' : '') +
                '</div>';

            item.addEventListener('click', function(e) {
                var target = e.target;
                if (target.tagName === 'BUTTON') {
                    var action = target.getAttribute('data-action');
                    if (action === 'play') {
                        playSong(song, true);
                    } else if (action === 'add') {
                        addToPlayerList(song);
                    } else if (action === 'fav') {
                        addSongToMyPlaylist(song);
                    } else if (action === 'delete') {
                        removeSongFromList(song.id);
                    }
                } else {
                    playSong(song, true);
                }
            });
            list.appendChild(item);
        });
    }

    function closePlaylistDetail() {
        var modal = $('playlist-modal');
        if (modal) modal.classList.remove('show');
    }

    function playAll() {
        if (App.currentPlaylist && App.currentPlaylist.length > 0) {
            Player.playlist = App.currentPlaylist.slice();
            Player.currentIndex = 0;
            playSong(Player.playlist[0]);
            showToast('已开始播放');
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

    function removeSongFromList(trackId) {
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

    function switchSearchTab(source, btn) {
        App.searchTab = source;
        var btns = btn.parentElement.querySelectorAll('.search-tab');
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        doSearch();
    }

    function onSearchInput() {
        if (App.searchTimer) clearTimeout(App.searchTimer);
        App.searchTimer = setTimeout(doSearch, 300);
    }

    function doSearch() {
        var input = $('search-input');
        if (!input) return;
        var kw = input.value.trim();
        var list = $('search-results');
        if (!kw) {
            if (list) list.innerHTML = '<div class="empty-tip">输入关键词开始搜索</div>';
            return;
        }
        if (list) list.innerHTML = '<div class="loading">搜索中...</div>';

        httpGet('/?path=search&source=' + App.searchTab + '&keywords=' + encodeURIComponent(kw), function(data) {
            if (!data || !data.result) {
                if (list) list.innerHTML = '<div class="empty-tip">搜索失败</div>';
                return;
            }
            renderSearchResults(data.result);
        });
    }

    function renderSearchResults(songs) {
        var list = $('search-results');
        if (!list) return;
        list.innerHTML = '';
        if (!songs || songs.length === 0) {
            list.innerHTML = '<div class="empty-tip">未找到相关歌曲</div>';
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
                '<button class="song-action-btn" data-action="play" title="播放">▶</button>' +
                '<button class="song-action-btn" data-action="add" title="添加">+</button>' +
                '<button class="song-action-btn" data-action="fav" title="收藏">♥</button>' +
                '</div>';

            item.addEventListener('click', function(e) {
                var target = e.target;
                if (target.tagName === 'BUTTON') {
                    var action = target.getAttribute('data-action');
                    if (action === 'play') {
                        playSong(song, true);
                    } else if (action === 'add') {
                        addToPlayerList(song);
                    } else if (action === 'fav') {
                        addSongToMyPlaylist(song);
                    }
                } else {
                    playSong(song, true);
                }
            });
            list.appendChild(item);
        });
    }

    // ============ 新建歌单 ============

    function showCreateDialog() {
        App.pendingSong = null;
        var input = $('new-playlist-name');
        if (input) input.value = '';
        var modal = $('create-modal');
        if (modal) modal.classList.add('show');
    }

    function closeCreateDialog() {
        var modal = $('create-modal');
        if (modal) modal.classList.remove('show');
        App.pendingSong = null;
    }

    function createPlaylist() {
        var input = $('new-playlist-name');
        var name = input ? input.value.trim() : '';
        if (!name) {
            showToast('请输入歌单名称');
            return;
        }
        var data = { list_title: name };
        if (App.pendingSong) {
            var s = App.pendingSong;
            data.id = s.id || '';
            data.title = s.title || '';
            data.artist = s.artist || '';
            data.url = s.url || '';
            data.artist_id = s.artist_id || '';
            data.album = s.album || '';
            data.album_id = s.album_id || '';
            data.source = s.source || '';
            data.source_url = s.source_url || '';
        }
        httpPost('/?path=create_myplaylist', data, function(res) {
            showToast('创建成功');
            closeCreateDialog();
            loadMyPlaylists();
        });
    }

    function addSongToMyPlaylist(song) {
        App.pendingSong = song;
        var input = $('new-playlist-name');
        if (input) input.value = '';
        var modal = $('create-modal');
        if (modal) modal.classList.add('show');
    }

    function addCurrentToPlaylist() {
        if (!Player.currentSong) {
            showToast('请先播放一首歌');
            return;
        }
        addSongToMyPlaylist(Player.currentSong);
    }

    // ============ 同步 ============

    function startSyncPolling() {
        if (App.pollInterval) clearInterval(App.pollInterval);
        App.pollInterval = setInterval(checkUpdate, 5000);
    }

    function checkUpdate() {
        httpGet('/?path=sse&since=' + App.lastSyncTime, function(data) {
            var status = $('sync-status');
            if (status) { status.textContent = '已连接'; status.className = 'status-ok'; }
            if (data && data.has_update) {
                App.lastSyncTime = data.timestamp || Date.now();
                updateLastSync();
                if (App.currentTab === 1) loadRecommendPlaylists();
                if (App.currentTab === 2) loadMyPlaylists();
            }
        });
    }

    function manualSync() {
        httpGet('/?path=sync', function(data) {
            App.lastSyncTime = Date.now();
            updateLastSync();
            showToast('同步成功');
            if (App.currentTab === 2) loadMyPlaylists();
        });
    }

    function toggleAutoSync() {
        App.autoSync = !App.autoSync;
        var btn = $('auto-sync-btn');
        if (btn) btn.textContent = App.autoSync ? '关闭自动同步' : '开启自动同步';
        if (App.autoSync) {
            startSyncPolling();
            var status = $('sync-status');
            if (status) { status.textContent = '已连接'; status.className = 'status-ok'; }
        } else {
            if (App.pollInterval) { clearInterval(App.pollInterval); App.pollInterval = null; }
            var status2 = $('sync-status');
            if (status2) { status2.textContent = '未连接'; status2.className = 'status-error'; }
        }
    }

    function updateLastSync() {
        var el = $('last-sync');
        if (el) el.textContent = new Date().toLocaleString();
    }

    // ============ 事件绑定 ============

    function bindEvents() {
        var navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(function(item, idx) {
            item.addEventListener('click', function() {
                switchTab(idx + 1);
            });
        });

        var sourceBtns = document.querySelectorAll('.source-btn');
        sourceBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var src = parseInt(btn.getAttribute('data-source'));
                switchSource(src, btn);
            });
        });

        var searchTabs = document.querySelectorAll('.search-tab');
        searchTabs.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var src = parseInt(btn.getAttribute('data-source'));
                switchSearchTab(src, btn);
            });
        });

        var searchInput = $('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', onSearchInput);
        }

        var createBtn = $('create-btn');
        if (createBtn) createBtn.addEventListener('click', showCreateDialog);

        var playBtn = $('play-btn');
        if (playBtn) playBtn.addEventListener('click', togglePlay);

        var prevBtn = $('prev-btn');
        if (prevBtn) prevBtn.addEventListener('click', playPrev);

        var nextBtn = $('next-btn');
        if (nextBtn) nextBtn.addEventListener('click', playNext);

        var modeBtn = $('mode-btn');
        if (modeBtn) modeBtn.addEventListener('click', toggleMode);

        var listBtn = $('list-btn');
        if (listBtn) listBtn.addEventListener('click', togglePlaylistMenu);

        var favBtn = $('fav-btn');
        if (favBtn) favBtn.addEventListener('click', addCurrentToPlaylist);

        var clearListBtn = $('clear-list-btn');
        if (clearListBtn) clearListBtn.addEventListener('click', clearPlayerList);

        var menuClose = document.querySelector('#playlist-menu .menu-close');
        if (menuClose) menuClose.addEventListener('click', togglePlaylistMenu);

        var playAllBtn = $('play-all-btn');
        if (playAllBtn) playAllBtn.addEventListener('click', playAll);

        var deleteListBtn = $('delete-list-btn');
        if (deleteListBtn) deleteListBtn.addEventListener('click', deleteCurrentList);

        var cloneListBtn = $('clone-list-btn');
        if (cloneListBtn) cloneListBtn.addEventListener('click', cloneCurrentList);

        var playlistModal = $('playlist-modal');
        if (playlistModal) {
            playlistModal.addEventListener('click', function(e) {
                if (e.target === playlistModal || e.target.classList.contains('modal-close')) {
                    closePlaylistDetail();
                }
            });
        }

        var createModal = $('create-modal');
        if (createModal) {
            createModal.addEventListener('click', function(e) {
                if (e.target === createModal || e.target.classList.contains('modal-close')) {
                    closeCreateDialog();
                }
            });
        }

        var cancelCreateBtn = $('cancel-create-btn');
        if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeCreateDialog);

        var confirmCreateBtn = $('confirm-create-btn');
        if (confirmCreateBtn) confirmCreateBtn.addEventListener('click', createPlaylist);

        var manualSyncBtn = $('manual-sync-btn');
        if (manualSyncBtn) manualSyncBtn.addEventListener('click', manualSync);

        var autoSyncBtn = $('auto-sync-btn');
        if (autoSyncBtn) autoSyncBtn.addEventListener('click', toggleAutoSync);
    }

    // ============ 初始化 ============

    function init() {
        try {
            initPlayer();
            bindEvents();
            loadRecommendPlaylists();
            loadMyPlaylists();
            startSyncPolling();
            updateLastSync();
            console.log('Listen 1 初始化成功');
        } catch (e) {
            console.error('初始化失败:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
