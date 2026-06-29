/**
 * Listen 1 PHP - 前端核心逻辑
 * 纯原生 JavaScript 实现
 */

(function() {
    'use strict';

    // 全局状态
    var state = {
        currentTag: 1,
        searchTab: 0,
        recommendTab: 0,
        playlists: [],
        currentPlaylist: null,
        currentListId: null,
        isMine: false,
        searchTimer: null,
        dialogSong: null,
        autoSync: true,
        sseConnection: null,
        lastSync: null
    };

    // 播放器状态
    var player = {
        playlist: [],
        currentIndex: 0,
        isPlaying: false,
        isShuffle: false,
        audio: null,
        currentSong: null
    };

    window.currentSong = null;

    // 初始化
    document.addEventListener('DOMContentLoaded', function() {
        initAudio();
        loadMyPlaylists();
        loadRecommendPlaylists();
        initSSE();
        initProgressBar();
        updateLastSyncTime();
    });

    // ============ 音频播放器 ============

    function initAudio() {
        player.audio = document.getElementById('audio-player');

        player.audio.addEventListener('timeupdate', function() {
            if (player.audio.duration) {
                var progress = (player.audio.currentTime / player.audio.duration) * 100;
                document.getElementById('progress-cur').style.width = progress + '%';
                document.getElementById('current-pos').textContent = formatTime(player.audio.currentTime);
                document.getElementById('current-dur').textContent = formatTime(player.audio.duration);
            }
        });

        player.audio.addEventListener('ended', function() {
            nextTrack();
        });

        player.audio.addEventListener('play', function() {
            player.isPlaying = true;
            document.getElementById('play-btn').classList.add('pas');
        });

        player.audio.addEventListener('pause', function() {
            player.isPlaying = false;
            document.getElementById('play-btn').classList.remove('pas');
        });

        player.audio.addEventListener('error', function() {
            console.log('音频播放出错');
        });
    }

    function formatTime(seconds) {
        var min = Math.floor(seconds / 60);
        var sec = Math.floor(seconds % 60);
        return min + ':' + (sec < 10 ? '0' + sec : sec);
    }

    window.togglePlay = function() {
        if (!player.currentSong) {
            alert('请先选择一首歌曲');
            return;
        }
        if (player.isPlaying) {
            player.audio.pause();
        } else {
            player.audio.play().catch(function(e) {
                console.log('播放失败:', e);
            });
        }
    };

    window.prevTrack = function() {
        if (player.playlist.length === 0) return;
        player.currentIndex = (player.currentIndex - 1 + player.playlist.length) % player.playlist.length;
        playSongByIndex(player.currentIndex);
    };

    window.nextTrack = function() {
        if (player.playlist.length === 0) return;
        if (player.isShuffle) {
            player.currentIndex = Math.floor(Math.random() * player.playlist.length);
        } else {
            player.currentIndex = (player.currentIndex + 1) % player.playlist.length;
        }
        playSongByIndex(player.currentIndex);
    };

    function playSongByIndex(index) {
        if (index < 0 || index >= player.playlist.length) return;
        var song = player.playlist[index];
        player.currentIndex = index;
        player.currentSong = song;
        window.currentSong = song;

        document.getElementById('current-cover').src = song.img_url || '/static/images/placeholder.png';
        document.getElementById('current-title').textContent = song.title || '未知歌曲';
        document.getElementById('current-title').title = song.title || '';
        document.getElementById('current-artist').textContent = song.artist || '未知艺术家';
        document.getElementById('current-artist').title = song.artist || '';
        document.getElementById('current-source').href = song.source_url || '#';

        if (song.url) {
            player.audio.src = song.url;
            player.audio.play().catch(function(e) {
                console.log('播放失败:', e);
            });
        } else {
            // 没有播放地址，模拟播放进度
            player.audio.src = '';
        }

        updatePlaylistMenu();
    }

    window.addToPlay = function(song) {
        player.playlist.push(song);
        updatePlaylistMenu();
    };

    window.addAndPlay = function(song) {
        player.playlist.push(song);
        playSongByIndex(player.playlist.length - 1);
    };

    window.addWithoutPlay = function(song) {
        player.playlist.push(song);
        updatePlaylistMenu();
        showMessage('已添加到当前播放歌单');
    };

    window.clearPlaylist = function() {
        player.playlist = [];
        player.currentIndex = 0;
        player.currentSong = null;
        window.currentSong = null;
        player.audio.pause();
        player.audio.src = '';
        document.getElementById('current-cover').src = '/static/images/placeholder.png';
        document.getElementById('current-title').textContent = '未播放';
        document.getElementById('current-artist').textContent = '未知艺术家';
        document.getElementById('progress-cur').style.width = '0%';
        document.getElementById('current-pos').textContent = '0:00';
        document.getElementById('current-dur').textContent = '0:00';
        updatePlaylistMenu();
    };

    window.removeFromPlaylist = function(index) {
        if (index === player.currentIndex) {
            player.currentSong = null;
            window.currentSong = null;
            player.audio.pause();
            player.audio.src = '';
        } else if (index < player.currentIndex) {
            player.currentIndex--;
        }
        player.playlist.splice(index, 1);
        updatePlaylistMenu();
    };

    window.playFromPlaylist = function(index) {
        playSongByIndex(index);
    };

    window.togglePlayMode = function() {
        player.isShuffle = !player.isShuffle;
        var btn = document.getElementById('mode-btn');
        if (player.isShuffle) {
            btn.classList.remove('icn-loop');
            btn.classList.add('icn-shuffle');
            btn.title = '随机';
        } else {
            btn.classList.remove('icn-shuffle');
            btn.classList.add('icn-loop');
            btn.title = '循环';
        }
    };

    window.togglePlaylistMenu = function() {
        var menu = document.getElementById('playlist-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        updatePlaylistMenu();
    };

    function updatePlaylistMenu() {
        var list = document.getElementById('playlist-menu-list');
        list.innerHTML = '';
        player.playlist.forEach(function(song, index) {
            var li = document.createElement('li');
            if (index === player.currentIndex) {
                li.className = 'playing';
            }
            li.innerHTML = '<div class="title" onclick="playFromPlaylist(' + index + ')"><a>' +
                escapeHtml(song.title) + '</a></div>' +
                '<a class="icn-remove" onclick="removeFromPlaylist(' + index + ')">×</a>' +
                '<div class="singer" onclick="showArtist(\'' + (song.artist_id || '') + '\')">' +
                escapeHtml(song.artist) + '</div>';
            list.appendChild(li);
        });
    }

    // 进度条拖动
    function initProgressBar() {
        var bar = document.getElementById('progress-bar');
        var bg = document.getElementById('progressbar-bg');
        var isDragging = false;

        function getProgress(e) {
            var rect = bg.getBoundingClientRect();
            var x = (e.clientX || e.touches[0].clientX) - rect.left;
            var progress = x / rect.width;
            return Math.max(0, Math.min(1, progress));
        }

        bar.addEventListener('mousedown', function(e) {
            isDragging = true;
            var progress = getProgress(e);
            document.getElementById('progress-cur').style.width = (progress * 100) + '%';
            if (player.audio.duration) {
                player.audio.currentTime = progress * player.audio.duration;
            }
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                var progress = getProgress(e);
                document.getElementById('progress-cur').style.width = (progress * 100) + '%';
            }
        });

        document.addEventListener('mouseup', function(e) {
            if (isDragging) {
                isDragging = false;
                var progress = getProgress(e);
                if (player.audio.duration) {
                    player.audio.currentTime = progress * player.audio.duration;
                }
            }
        });
    }

    // ============ 导航 ============

    window.showTag = function(tagId) {
        state.currentTag = tagId;

        for (var i = 1; i <= 4; i++) {
            document.getElementById('nav-' + i).classList.toggle('active', i === tagId);
            document.getElementById('page-' + i).style.display = (i === tagId) ? 'block' : 'none';
        }

        document.getElementById('playlist-window').style.display = 'none';

        if (tagId === 1) {
            loadMyPlaylists();
        } else if (tagId === 2) {
            loadRecommendPlaylists();
        }
    };

    // ============ 歌单管理 ============

    function loadMyPlaylists() {
        httpGet('/?path=show_myplaylist', function(data) {
            state.playlists = data.result || [];
            renderMyPlaylists();
        });
    }

    function renderMyPlaylists() {
        var list = document.getElementById('my-playlists');
        list.innerHTML = '';
        state.playlists.forEach(function(pl) {
            var li = document.createElement('li');
            li.innerHTML = '<div class="u-cover">' +
                '<img src="' + (pl.cover_img_url || '/static/images/placeholder.png') + '">' +
                '<a title="" class="mask" onclick="showPlaylist(\'' + pl.id + '\')"></a>' +
                '<div class="bottom">' +
                '<span class="icon-headset"></span>' +
                '<a class="icon-play" title="播放" onclick="directPlaylist(\'' + pl.id + '\')"></a>' +
                '</div></div>' +
                '<p class="desc"><a title="' + escapeHtml(pl.title) + '" onclick="showPlaylist(\'' + pl.id + '\')">' +
                escapeHtml(pl.title) + '</a></p>';
            list.appendChild(li);
        });
    }

    function loadRecommendPlaylists() {
        httpGet('/?path=show_playlist&source=' + state.recommendTab, function(data) {
            var list = document.getElementById('recommend-playlists');
            list.innerHTML = '';
            (data.result || []).forEach(function(pl) {
                var li = document.createElement('li');
                li.innerHTML = '<div class="u-cover">' +
                    '<img src="' + (pl.cover_img_url || '/static/images/placeholder.png') + '">' +
                    '<a title="" class="mask" onclick="showPlaylist(\'' + pl.id + '\')"></a>' +
                    '<div class="bottom">' +
                    '<a class="icon-play" title="播放" onclick="directPlaylist(\'' + pl.id + '\')"></a>' +
                    '</div></div>' +
                    '<p class="desc"><a title="' + escapeHtml(pl.title) + '" onclick="showPlaylist(\'' + pl.id + '\')">' +
                    escapeHtml(pl.title) + '</a></p>';
                list.appendChild(li);
            });
        });
    }

    window.changeRecommendTab = function(tab, btn) {
        state.recommendTab = tab;
        var btns = btn.parentElement.querySelectorAll('.btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        loadRecommendPlaylists();
    };

    window.showPlaylist = function(listId) {
        httpGet('/?path=playlist&list_id=' + listId, function(data) {
            if (data.status === 0) {
                showMessage(data.reason || '歌单不存在');
                return;
            }
            state.currentPlaylist = data.tracks || [];
            state.currentListId = listId;
            state.isMine = data.is_mine;

            document.getElementById('detail-cover').src = data.info.cover_img_url || '/static/images/loading.gif';
            document.getElementById('detail-title').textContent = data.info.title || '';
            document.getElementById('detail-delete').style.display = data.is_mine ? 'inline-block' : 'none';
            document.getElementById('detail-clone').style.display = data.is_mine ? 'none' : 'inline-block';

            renderDetailSongs(data.tracks || []);
            document.getElementById('playlist-window').style.display = 'block';
        });
    };

    function renderDetailSongs(songs) {
        var list = document.getElementById('detail-songs');
        list.innerHTML = '';
        songs.forEach(function(song, index) {
            var li = document.createElement('li');
            li.className = index % 2 === 0 ? 'odd' : 'even';
            li.innerHTML = '<div class="col2"><a href="#" onclick="event.preventDefault(); addAndPlay(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')">' +
                escapeHtml(song.title) + '</a></div>' +
                '<div class="col1 detail-artist"><a href="#" onclick="event.preventDefault(); showArtist(\'' + (song.artist_id || '') + '\')">' +
                escapeHtml(song.artist) + '</a></div>' +
                '<div class="col2"><a href="#" onclick="event.preventDefault(); showAlbum(\'' + (song.album_id || '') + '\')">' +
                escapeHtml(song.album) + '</a></div>' +
                '<div class="detail-tools">' +
                '<a title="添加到当前播放" class="detail-add-button" onclick="addWithoutPlay(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')" style="display:none"></a>' +
                '<a title="添加到歌单" class="detail-fav-button" onclick="addToPlaylistDialog(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')"></a>' +
                (song.source_url ? '<a title="原始链接" class="source-button" href="' + song.source_url + '" target="_blank"></a>' : '') +
                (state.isMine ? '<a title="从歌单删除" class="detail-delete-button" onclick="removeSongFromPlaylist(\'' + song.id + '\')"></a>' : '') +
                '</div>';
            list.appendChild(li);
        });

        // 鼠标悬停显示工具
        list.querySelectorAll('li').forEach(function(li) {
            li.addEventListener('mouseenter', function() {
                li.querySelector('.detail-add-button').style.display = 'inline-block';
            });
            li.addEventListener('mouseleave', function() {
                li.querySelector('.detail-add-button').style.display = 'none';
            });
        });
    }

    window.closePlaylistWindow = function() {
        document.getElementById('playlist-window').style.display = 'none';
    };

    window.directPlaylist = function(listId) {
        httpGet('/?path=playlist&list_id=' + listId, function(data) {
            if (data.status === 0) return;
            player.playlist = data.tracks || [];
            state.currentListId = listId;
            if (player.playlist.length > 0) {
                playSongByIndex(0);
            }
        });
    };

    window.playCurrentList = function() {
        if (state.currentPlaylist && state.currentPlaylist.length > 0) {
            player.playlist = state.currentPlaylist.slice();
            playSongByIndex(0);
        }
    };

    window.deleteCurrentList = function() {
        if (!confirm('确定要删除这个歌单吗？')) return;
        httpPost('/?path=remove_myplaylist', { list_id: state.currentListId }, function(data) {
            showMessage('删除成功');
            closePlaylistWindow();
            loadMyPlaylists();
        });
    };

    window.cloneCurrentList = function() {
        httpPost('/?path=clone_playlist', { list_id: state.currentListId }, function(data) {
            showMessage('收藏成功');
            loadMyPlaylists();
        });
    };

    window.removeSongFromPlaylist = function(trackId) {
        httpPost('/?path=remove_track_from_myplaylist', {
            list_id: state.currentListId,
            track_id: trackId
        }, function(data) {
            showMessage('删除成功');
            state.currentPlaylist = state.currentPlaylist.filter(function(s) { return s.id !== trackId; });
            renderDetailSongs(state.currentPlaylist);
        });
    };

    // ============ 搜索 ============

    window.changeSearchTab = function(tab, li) {
        state.searchTab = tab;
        var lis = li.parentElement.querySelectorAll('li');
        lis.forEach(function(l) { l.classList.remove('active'); });
        li.classList.add('active');
        doSearch();
    };

    window.onSearchInput = function() {
        if (state.searchTimer) {
            clearTimeout(state.searchTimer);
        }
        state.searchTimer = setTimeout(doSearch, 300);
    };

    function doSearch() {
        var keywords = document.getElementById('search-input').value.trim();
        if (!keywords) {
            document.getElementById('search-results').innerHTML = '';
            return;
        }
        httpGet('/?path=search&source=' + state.searchTab + '&keywords=' + encodeURIComponent(keywords), function(data) {
            renderSearchResults(data.result || []);
        });
    }

    function renderSearchResults(songs) {
        var list = document.getElementById('search-results');
        list.innerHTML = '';
        songs.forEach(function(song, index) {
            var li = document.createElement('li');
            li.className = index % 2 === 0 ? 'odd' : 'even';
            li.innerHTML = '<div class="col2"><a href="#" onclick="event.preventDefault(); addAndPlay(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')">' +
                escapeHtml(song.title) + '</a></div>' +
                '<div class="col1 detail-artist"><a href="#" onclick="event.preventDefault(); showArtist(\'' + (song.artist_id || '') + '\')">' +
                escapeHtml(song.artist) + '</a></div>' +
                '<div class="col2"><a href="#" onclick="event.preventDefault(); showAlbum(\'' + (song.album_id || '') + '\')">' +
                escapeHtml(song.album) + '</a></div>' +
                '<div class="detail-tools">' +
                '<a title="添加到当前播放" class="detail-add-button" onclick="addWithoutPlay(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')" style="display:none"></a>' +
                '<a title="添加到歌单" class="detail-fav-button" onclick="addToPlaylistDialog(' + JSON.stringify(song).replace(/"/g, '&quot;') + ')"></a>' +
                (song.source_url ? '<a title="原始链接" class="source-button" href="' + song.source_url + '" target="_blank"></a>' : '') +
                '</div>';
            list.appendChild(li);
        });

        list.querySelectorAll('li').forEach(function(li) {
            li.addEventListener('mouseenter', function() {
                li.querySelector('.detail-add-button').style.display = 'inline-block';
            });
            li.addEventListener('mouseleave', function() {
                li.querySelector('.detail-add-button').style.display = 'none';
            });
        });
    }

    // ============ 对话框 ============

    window.addToPlaylistDialog = function(song) {
        state.dialogSong = song;
        document.getElementById('dialog-title').textContent = '添加到歌单';
        document.getElementById('dialog-playlist').style.display = 'block';
        document.getElementById('dialog-newplaylist').style.display = 'none';

        httpGet('/?path=show_myplaylist', function(data) {
            var list = document.querySelector('#dialog-playlist .dialog-playlist');
            var html = '<li class="detail-add" onclick="showNewPlaylistDialog()">' +
                '<img src="/static/images/mycover.jpg" /><h2>新建歌单</h2></li>';
            (data.result || []).forEach(function(pl) {
                html += '<li onclick="choosePlaylist(\'' + pl.id + '\')">' +
                    '<img src="' + (pl.cover_img_url || '/static/images/placeholder.png') + '" />' +
                    '<h2>' + escapeHtml(pl.title) + '</h2></li>';
            });
            list.innerHTML = html;
        });

        document.getElementById('dialog-shadow').style.display = 'block';
        document.getElementById('dialog').style.display = 'block';
    };

    window.showNewPlaylistDialog = function() {
        document.getElementById('dialog-playlist').style.display = 'none';
        document.getElementById('dialog-newplaylist').style.display = 'block';
    };

    window.cancelNewDialog = function() {
        document.getElementById('dialog-playlist').style.display = 'block';
        document.getElementById('dialog-newplaylist').style.display = 'none';
    };

    window.choosePlaylist = function(listId) {
        var song = state.dialogSong;
        httpPost('/?path=add_myplaylist', {
            list_id: listId,
            id: song.id,
            title: song.title,
            artist: song.artist,
            url: song.url || '',
            artist_id: song.artist_id || '',
            album: song.album || '',
            album_id: song.album_id || '',
            source: song.source || '',
            source_url: song.source_url || '',
            img_url: song.img_url || '/static/images/placeholder.png'
        }, function(data) {
            showMessage('添加到歌单成功');
            closeDialog();
            loadMyPlaylists();
        });
    };

    window.createAndAddPlaylist = function() {
        var title = document.getElementById('newplaylist-title').value.trim();
        if (!title) {
            showMessage('请输入歌单名称');
            return;
        }
        var song = state.dialogSong || {};
        httpPost('/?path=create_myplaylist', {
            list_title: title,
            id: song.id || '',
            title: song.title || '',
            artist: song.artist || '',
            url: song.url || '',
            artist_id: song.artist_id || '',
            album: song.album || '',
            album_id: song.album_id || '',
            source: song.source || '',
            source_url: song.source_url || ''
        }, function(data) {
            showMessage('创建成功');
            closeDialog();
            loadMyPlaylists();
        });
    };

    window.closeDialog = function() {
        document.getElementById('dialog-shadow').style.display = 'none';
        document.getElementById('dialog').style.display = 'none';
        document.getElementById('newplaylist-title').value = '';
    };

    // ============ 艺术家 / 专辑 ============

    window.showArtist = function(artistId) {
        if (!artistId) return;
        showMessage('艺术家详情功能开发中...');
    };

    window.showAlbum = function(albumId) {
        if (!albumId) return;
        showMessage('专辑详情功能开发中...');
    };

    // ============ 同步功能 ============

    var pollInterval = null;

    function initSSE() {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
        startPolling();
    }

    function startPolling() {
        pollInterval = setInterval(function() {
            httpGet('/?path=sse&since=' + (state.lastSync ? state.lastSync.getTime() : 0), function(data) {
                document.getElementById('sync-status').textContent = '已连接';
                document.getElementById('sync-status').className = 'text-success';
                if (data.has_update) {
                    updateLastSyncTime();
                    if (state.currentTag === 1) {
                        loadMyPlaylists();
                    }
                }
            });
        }, 5000);
    }

    window.manualSync = function() {
        httpGet('/?path=sync', function(data) {
            updateLastSyncTime();
            showMessage('同步成功');
            loadMyPlaylists();
        });
    };

    window.toggleAutoSync = function() {
        state.autoSync = !state.autoSync;
        var btn = document.getElementById('auto-sync-btn');
        btn.textContent = state.autoSync ? '关闭自动同步' : '开启自动同步';

        if (state.autoSync) {
            startPolling();
            document.getElementById('sync-status').textContent = '已连接';
            document.getElementById('sync-status').className = 'text-success';
        } else if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
            document.getElementById('sync-status').textContent = '未连接';
            document.getElementById('sync-status').className = 'text-danger';
        }
    };

    function updateLastSyncTime() {
        state.lastSync = new Date();
        var el = document.getElementById('last-sync');
        if (el) {
            el.textContent = state.lastSync.toLocaleString();
        }
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
                    callback(xhr.responseText);
                }
            }
        };
        xhr.onerror = function() {
            console.log('Request failed:', url);
        };
        xhr.send();
    }

    function httpPost(url, data, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        var params = [];
        for (var key in data) {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
        }
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    callback(JSON.parse(xhr.responseText));
                } catch (e) {
                    callback(xhr.responseText);
                }
            }
        };
        xhr.send(params.join('&'));
    }

    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    function showMessage(msg) {
        // 简单的消息提示
        var div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:10px 20px;border-radius:4px;z-index:9999;';
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(function() {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.3s';
            setTimeout(function() { div.remove(); }, 300);
        }, 2000);
    }

    window.showMessage = showMessage;

})();
