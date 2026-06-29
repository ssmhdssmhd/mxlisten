(function() {
    'use strict';

    // Storage 扩展
    Storage.prototype.setObject = function(key, value) {
        this.setItem(key, JSON.stringify(value));
    };

    Storage.prototype.getObject = function(key) {
        var value = this.getItem(key);
        return value && JSON.parse(value);
    };

    // Angular 模块
    var app = angular.module('listenone', []);

    // 主控制器
    app.controller('NavigationController', ['$scope', '$http', '$timeout', '$window',
        function($scope, $http, $timeout, $window) {
            $scope.window_url_stack = [];
            $scope.current_tag = 1;
            $scope.is_window_hidden = 1;
            $scope.is_dialog_hidden = 1;

            $scope.songs = [];
            $scope.current_list_id = -1;

            $scope.dialog_song = '';
            $scope.dialog_type = 0;
            $scope.dialog_title = '';

            // 同步状态
            $scope.syncStatus = { connected: false, lastSync: null };
            $scope.autoSync = true;
            $scope.sseConnection = null;

            // 标签切换
            $scope.showTag = function(tag_id) {
                $scope.current_tag = tag_id;
                $scope.is_window_hidden = 1;
                $scope.window_url_stack = [];
                $scope.closeWindow();
            };

            // 播放列表窗口
            $scope.resetWindow = function() {
                $scope.cover_img_url = '/static/images/loading.gif';
                $scope.playlist_title = '';
                $scope.songs = [];
            };

            $scope.showWindow = function(url) {
                $scope.is_window_hidden = 0;
                $scope.resetWindow();

                $scope.window_url_stack.push(url);
                $http.get('/?path=' + url).success(function(data) {
                    if (data.status == 0) {
                        $scope.popWindow();
                        return;
                    }
                    $scope.songs = data.tracks || [];
                    $scope.cover_img_url = data.info.cover_img_url;
                    $scope.playlist_title = data.info.title;
                    $scope.list_id = data.info.id;
                    $scope.is_mine = data.is_mine;
                });
            };

            $scope.closeWindow = function() {
                $scope.is_window_hidden = 1;
                $scope.resetWindow();
                $scope.window_url_stack = [];
            };

            $scope.popWindow = function() {
                $scope.window_url_stack.pop();
                if ($scope.window_url_stack.length === 0) {
                    $scope.closeWindow();
                } else {
                    $scope.resetWindow();
                    var url = $scope.window_url_stack[$scope.window_url_stack.length - 1];
                    $scope.showWindow(url.replace('/?path=', ''));
                }
            };

            $scope.showPlaylist = function(list_id) {
                var url = 'playlist&list_id=' + list_id;
                $scope.showWindow(url);
            };

            $scope.directplaylist = function(list_id) {
                var url = '?path=playlist&list_id=' + list_id;

                $http.get(url).success(function(data) {
                    $scope.songs = data.tracks || [];
                    $scope.current_list_id = list_id;

                    $timeout(function() {
                        Player.clearPlaylist();
                        Player.addTrackArray($scope.songs);
                        var index = 0;
                        if (Player.getShuffle()) {
                            index = Math.floor(Math.random() * $scope.songs.length);
                        }
                        if ($scope.songs[index]) {
                            Player.playTrack($scope.songs[index]);
                        }
                    }, 0);
                });
            };

            // 对话框
            $scope.showDialog = function(dialog_type, data) {
                $scope.is_dialog_hidden = 0;
                var dialogWidth = 480;
                var left = ($window.innerWidth / 2) - (dialogWidth / 2);
                $scope.myStyle = { 'left': left + 'px' };

                if (dialog_type == 0) {
                    $scope.dialog_title = '添加到歌单';
                    $http.get('/?path=show_myplaylist').success(function(data) {
                        $scope.myplaylist = data.result || [];
                    });
                    $scope.dialog_song = data;
                }
            };

            $scope.chooseDialogOption = function(option_id) {
                var song = $scope.dialog_song;
                $http({
                    url: '/?path=add_myplaylist',
                    method: 'POST',
                    data: $.param({
                        list_id: option_id,
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
                    }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(function() {
                    alert('添加到歌单成功');
                    $scope.closeDialog();
                    if (option_id == $scope.current_list_id) {
                        Player.addTrack(song);
                    }
                });
            };

            $scope.newDialogOption = function() {
                $scope.dialog_type = 1;
            };

            $scope.cancelNewDialog = function() {
                $scope.dialog_type = 0;
            };

            $scope.createAndAddPlaylist = function() {
                var song = $scope.dialog_song;
                $http({
                    url: '/?path=create_myplaylist',
                    method: 'POST',
                    data: $.param({
                        list_title: $scope.newlist_title,
                        id: song ? song.id : '',
                        title: song ? song.title : '',
                        artist: song ? song.artist : '',
                        url: song ? (song.url || '') : '',
                        artist_id: song ? (song.artist_id || '') : '',
                        album: song ? (song.album || '') : '',
                        album_id: song ? (song.album_id || '') : '',
                        source: song ? (song.source || '') : '',
                        source_url: song ? (song.source_url || '') : ''
                    }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(function() {
                    alert('创建成功');
                    $scope.closeDialog();
                    $scope.$broadcast('myplaylist:update');
                });
            };

            $scope.closeDialog = function() {
                $scope.is_dialog_hidden = 1;
                $scope.dialog_type = 0;
            };

            // 同步功能
            $scope.initSSE = function() {
                if ($scope.sseConnection) {
                    $scope.sseConnection.close();
                }

                $scope.sseConnection = new EventSource('/?path=sse');

                $scope.sseConnection.onopen = function() {
                    $scope.$apply(function() {
                        $scope.syncStatus.connected = true;
                        $scope.syncStatus.lastSync = new Date();
                    });
                };

                $scope.sseConnection.onmessage = function(event) {
                    var data = JSON.parse(event.data);
                    if (data.type === 'update') {
                        $scope.$apply(function() {
                            $scope.syncStatus.lastSync = new Date();
                            $scope.$broadcast('sync:update');
                        });
                    }
                };

                $scope.sseConnection.onerror = function() {
                    $scope.$apply(function() {
                        $scope.syncStatus.connected = false;
                    });
                    // 尝试重连
                    $timeout(function() {
                        if ($scope.autoSync) {
                            $scope.initSSE();
                        }
                    }, 5000);
                };
            };

            $scope.manualSync = function() {
                $http.get('/?path=sync').success(function(data) {
                    $scope.syncStatus.lastSync = new Date();
                    alert('同步成功');
                });
            };

            $scope.toggleAutoSync = function() {
                $scope.autoSync = !$scope.autoSync;
                if ($scope.autoSync) {
                    $scope.initSSE();
                } else {
                    if ($scope.sseConnection) {
                        $scope.sseConnection.close();
                        $scope.sseConnection = null;
                    }
                }
            };

            // 初始化SSE连接
            $timeout(function() {
                $scope.initSSE();
            }, 1000);
        }
    ]);

    // 播放控制器
    app.controller('PlayController', ['$scope', '$timeout', '$interval',
        function($scope, $timeout, $interval) {
            $scope.menuHidden = true;
            $scope.settings = { playmode: 0 };
            $scope.myProgress = 0;
            $scope.currentPostion = '0:00';
            $scope.currentDuration = '';
            $scope.isPlaying = false;
            $scope.currentPlaying = {};
            $scope.playlist = [];
            $scope.currentUrl = '';

            var audio = document.getElementById('audio-player');
            var currentIndex = 0;

            $scope.initPlayer = function() {
                if (!audio) {
                    audio = document.getElementById('audio-player');
                }
                if (audio) {
                    audio.addEventListener('timeupdate', function() {
                        if (audio.duration) {
                            var progress = (audio.currentTime / audio.duration) * 100;
                            $scope.$apply(function() {
                                $scope.myProgress = progress;
                                $scope.currentPostion = formatTime(audio.currentTime);
                                $scope.currentDuration = formatTime(audio.duration);
                            });
                        }
                    });

                    audio.addEventListener('ended', function() {
                        $scope.$apply(function() {
                            $scope.nextTrack();
                        });
                    });

                    audio.addEventListener('play', function() {
                        $scope.$apply(function() {
                            $scope.isPlaying = true;
                        });
                    });

                    audio.addEventListener('pause', function() {
                        $scope.$apply(function() {
                            $scope.isPlaying = false;
                        });
                    });
                }
            };

            function formatTime(seconds) {
                var min = Math.floor(seconds / 60);
                var sec = Math.floor(seconds % 60);
                return min + ':' + (sec < 10 ? '0' + sec : sec);
            }

            $scope.togglePlay = function() {
                if (!audio) return;
                if ($scope.isPlaying) {
                    audio.pause();
                } else {
                    audio.play();
                }
            };

            $scope.prevTrack = function() {
                if ($scope.playlist.length === 0) return;
                currentIndex = (currentIndex - 1 + $scope.playlist.length) % $scope.playlist.length;
                $scope.playTrackByIndex(currentIndex);
            };

            $scope.nextTrack = function() {
                if ($scope.playlist.length === 0) return;
                currentIndex = (currentIndex + 1) % $scope.playlist.length;
                $scope.playTrackByIndex(currentIndex);
            };

            $scope.playTrackByIndex = function(index) {
                if (index < 0 || index >= $scope.playlist.length) return;
                var song = $scope.playlist[index];
                currentIndex = index;
                $scope.currentPlaying = song;
                $scope.currentUrl = song.url || '';

                if (audio) {
                    if (song.url) {
                        audio.src = song.url;
                        audio.play();
                    } else {
                        alert('该歌曲暂无播放地址');
                    }
                }
            };

            $scope.playFromPlaylist = function(song) {
                var index = $scope.playlist.indexOf(song);
                if (index !== -1) {
                    $scope.playTrackByIndex(index);
                }
            };

            $scope.removeFromPlaylist = function(song) {
                var index = $scope.playlist.indexOf(song);
                if (index !== -1) {
                    $scope.playlist.splice(index, 1);
                    if (currentIndex >= index && currentIndex > 0) {
                        currentIndex--;
                    }
                }
            };

            $scope.clearPlaylist = function() {
                $scope.playlist = [];
                currentIndex = 0;
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
                $scope.currentPlaying = {};
            };

            $scope.changePlaymode = function() {
                $scope.settings.playmode = ($scope.settings.playmode + 1) % 2;
            };

            $scope.togglePlaylist = function() {
                $scope.menuHidden = !$scope.menuHidden;
            };

            $scope.playmylist = function(list_id) {
                $timeout(function() {
                    Player.clearPlaylist();
                    Player.addTrackArray($scope.songs);
                    if ($scope.songs.length > 0) {
                        var index = 0;
                        if ($scope.settings.playmode == 1) {
                            index = Math.floor(Math.random() * $scope.songs.length);
                        }
                        $scope.playTrackByIndex(index);
                    }
                }, 0);
                $scope.current_list_id = list_id;
            };

            $scope.removemylist = function(list_id) {
                if (!confirm('确定要删除这个歌单吗？')) return;
                $http({
                    url: '/?path=remove_myplaylist',
                    method: 'POST',
                    data: $.param({ list_id: list_id }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(function() {
                    $scope.closeWindow();
                    $scope.$broadcast('myplaylist:update');
                    alert('删除成功');
                });
            };

            $scope.clonelist = function(list_id) {
                $http({
                    url: '/?path=clone_playlist',
                    method: 'POST',
                    data: $.param({ list_id: list_id }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(function() {
                    $scope.closeWindow();
                    $scope.$broadcast('myplaylist:update');
                    alert('收藏成功');
                });
            };

            $scope.removeSongFromPlaylist = function(song, list_id) {
                $http({
                    url: '/?path=remove_track_from_myplaylist',
                    method: 'POST',
                    data: $.param({ list_id: list_id, track_id: song.id }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }).success(function() {
                    var index = $scope.songs.indexOf(song);
                    if (index > -1) {
                        $scope.songs.splice(index, 1);
                    }
                    alert('删除成功');
                });
            };

            // 监听同步更新
            $scope.$on('sync:update', function() {
                // 可以在这里处理同步更新
                console.log('Data sync update received');
            });
        }
    ]);

    // 搜索控制器
    app.controller('InstantSearchController', ['$scope', '$http', '$timeout',
        function($scope, $http, $timeout) {
            $scope.tab = 0;
            $scope.keywords = '';
            $scope.result = [];

            $scope.changeTab = function(newTab) {
                $scope.tab = newTab;
                $scope.result = [];
                if ($scope.keywords) {
                    search();
                }
            };

            $scope.isActiveTab = function(tab) {
                return $scope.tab === tab;
            };

            function search() {
                $http.get('/?path=search&source=' + $scope.tab + '&keywords=' + encodeURIComponent($scope.keywords))
                    .success(function(data) {
                        $scope.result = data.result || [];
                    });
            }

            $scope.$watch('keywords', function(newVal) {
                if (newVal && newVal.length > 0) {
                    $timeout(function() {
                        search();
                    }, 300);
                } else {
                    $scope.result = [];
                }
            });
        }
    ]);

    // 我的歌单控制器
    app.controller('MyPlayListController', ['$scope', '$http',
        function($scope, $http) {
            $scope.myplaylists = [];

            $scope.loadMyPlaylist = function() {
                $http.get('/?path=show_myplaylist').success(function(data) {
                    $scope.myplaylists = data.result || [];
                });
            };

            $scope.$watch('current_tag', function(newValue) {
                if (newValue == 1) {
                    $scope.myplaylists = [];
                    $scope.loadMyPlaylist();
                }
            });

            $scope.$on('myplaylist:update', function() {
                $scope.loadMyPlaylist();
            });
        }
    ]);

    // 歌单控制器
    app.controller('PlayListController', ['$scope', '$http',
        function($scope, $http) {
            $scope.result = [];
            $scope.tab = 0;

            $scope.changeTab = function(newTab) {
                $scope.tab = newTab;
                $scope.result = [];
                loadPlaylist();
            };

            $scope.isActiveTab = function(tab) {
                return $scope.tab === tab;
            };

            function loadPlaylist() {
                $http.get('/?path=show_playlist&source=' + $scope.tab).success(function(data) {
                    $scope.result = data.result || [];
                });
            }

            $scope.loadPlaylist = loadPlaylist;
        }
    ]);

    // 指令
    app.directive('errSrc', function() {
        return {
            link: function(scope, element, attrs) {
                element.bind('error', function() {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });
            }
        };
    });

    app.directive('resize', ['$window', function($window) {
        return function(scope, element) {
            var w = angular.element($window);
            var changeHeight = function() {
                var headerHeight = 90;
                var footerHeight = 90;
                element.css('height', (w.height() - headerHeight - footerHeight) + 'px');
            };
            w.bind('resize', changeHeight);
            changeHeight();
        };
    }]);

    app.directive('addAndPlay', ['$http', function($http) {
        return {
            restrict: 'EA',
            scope: { song: '=addAndPlay' },
            link: function(scope, element) {
                element.bind('click', function() {
                    Player.addTrack(scope.song);
                    Player.playTrack(scope.song);
                });
            }
        };
    }]);

    app.directive('addWithoutPlay', ['$http', function($http) {
        return {
            restrict: 'EA',
            scope: { song: '=addWithoutPlay' },
            link: function(scope, element) {
                element.bind('click', function() {
                    Player.addTrack(scope.song);
                    alert('已添加到当前播放歌单');
                });
            }
        };
    }]);

    app.directive('openSongSource', ['$window', function($window) {
        return {
            restrict: 'EA',
            scope: { song: '=openSongSource' },
            link: function(scope, element) {
                element.bind('click', function() {
                    if (scope.song.source_url) {
                        $window.open(scope.song.source_url, '_blank');
                    }
                });
            }
        };
    }]);

    app.directive('draggable', ['$document', function($document) {
        return function(scope, element) {
            var x, container;

            element.on('mousedown', function(event) {
                container = document.getElementById('progressbar');
                if (!container) return;

                var rect = container.getBoundingClientRect();
                x = event.clientX - rect.left;

                $document.on('mousemove', mousemove);
                $document.on('mouseup', mouseup);
            });

            function mousemove(event) {
                var rect = container.getBoundingClientRect();
                x = event.clientX - rect.left;
                var progress = x / (rect.width);
                progress = Math.max(0, Math.min(1, progress));
                scope.$apply(function() {
                    scope.myProgress = progress * 100;
                });
            }

            function mouseup() {
                var audio = document.getElementById('audio-player');
                if (audio && audio.duration) {
                    audio.currentTime = (scope.myProgress / 100) * audio.duration;
                }
                $document.off('mousemove', mousemove);
                $document.off('mouseup', mouseup);
            }
        };
    }]);

    // 播放器全局对象
    window.Player = {
        playlist: [],
        currentIndex: 0,
        shuffle: false,

        addTrack: function(song) {
            this.playlist.push(song);
            var scope = angular.element(document.querySelector('[ng-controller="PlayController"]')).scope();
            if (scope) {
                scope.$apply(function() {
                    scope.playlist = Player.playlist;
                });
            }
        },

        addTrackArray: function(songs) {
            this.playlist = songs.slice();
            var scope = angular.element(document.querySelector('[ng-controller="PlayController"]')).scope();
            if (scope) {
                scope.$apply(function() {
                    scope.playlist = Player.playlist;
                });
            }
        },

        clearPlaylist: function() {
            this.playlist = [];
            this.currentIndex = 0;
        },

        playTrack: function(song) {
            var index = this.playlist.indexOf(song);
            if (index !== -1) {
                this.currentIndex = index;
                var scope = angular.element(document.querySelector('[ng-controller="PlayController"]')).scope();
                if (scope) {
                    scope.$apply(function() {
                        scope.playTrackByIndex(index);
                    });
                }
            }
        },

        getShuffle: function() {
            return this.shuffle;
        },

        toggleShuffle: function() {
            this.shuffle = !this.shuffle;
        }
    };

})();
