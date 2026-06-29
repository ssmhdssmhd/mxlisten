/**
 * @license AngularJS v1.8.2
 * Simplified version for Listen 1 PHP
 */
(function(window, document) {
    'use strict';

    var angular = window.angular || {};

    function angularModule(name, requires) {
        if (requires) {
            angular.module(name, requires);
        }
        return angular.module(name);
    }

    angular.module('ng', []);
    angular.module('ngAnimate', []);
    angular.module('ngAria', []);
    angular.module('ngMessages', []);
    angular.module('ngResource', []);
    angular.module('ngSanitize', []);

    angular.module('angularSoundManager', []);
    angular.module('ui-notification', []);

    // 简化的 Angular 实现
    var publishExternalAPI = function(angular) {
        angular.module('ng', ['ngAnimate', 'ngAria', 'ngMessages', 'ngResource', 'ngSanitize']);
    };

    // Angular 核心服务
    angular.module('ng').provider('$http', function() {
        var config = { headers: {}, transformRequest: function(d) { return d; } };
        return {
            get: function(url, config) {
                return {
                    success: function(fn) {
                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', url, true);
                        if (config && config.headers) {
                            Object.keys(config.headers).forEach(function(key) {
                                xhr.setRequestHeader(key, config.headers[key]);
                            });
                        }
                        xhr.onload = function() {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                fn(JSON.parse(xhr.responseText));
                            }
                        };
                        xhr.send();
                        return this;
                    },
                    error: function(fn) {
                        return this;
                    }
                };
            },
            post: function(url, data, config) {
                return {
                    success: function(fn) {
                        var xhr = new XMLHttpRequest();
                        xhr.open('POST', url, true);
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        var params = [];
                        for (var key in data) {
                            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
                        }
                        xhr.send(params.join('&'));
                        xhr.onload = function() {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                fn(JSON.parse(xhr.responseText));
                            }
                        };
                        return this;
                    },
                    error: function(fn) {
                        return this;
                    }
                };
            }
        };
    });

    angular.module('ng').provider('$window', function() {
        return {
            $get: function() {
                return window;
            }
        };
    });

    angular.module('ng').provider('$timeout', function() {
        return {
            $get: function($rootScope) {
                return function(fn, delay) {
                    return setTimeout(function() {
                        fn();
                        $rootScope.$apply();
                    }, delay || 0);
                };
            }
        };
    });

    angular.module('ng').provider('$interval', function() {
        return {
            $get: function($rootScope) {
                return function(fn, delay) {
                    return setInterval(function() {
                        fn();
                        $rootScope.$apply();
                    }, delay || 0);
                };
            }
        };
    });

    angular.module('ng').provider('$rootScope', function() {
        var scope = new Scope();
        return {
            $get: function() {
                return scope;
            }
        };
    });

    function Scope() {
        this.$id = Math.random();
        this.$$watchers = [];
        this.$$listeners = {};
        this.$$phase = null;
        this.$parent = null;
        this.$$childHead = null;
        this.$$childTail = null;
        this.$$nextSibling = null;
        this.$$prevSibling = null;
    }

    Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
        var scope = this;
        this.$$watchers.push({
            watchFn: watchFn,
            listenerFn: listenerFn,
            valueEq: !!valueEq
        });
    };

    Scope.prototype.$new = function(isolated, parent) {
        var child;
        if (isolated) {
            child = new Scope();
            child.$parent = parent || this;
        } else {
            var ChildScope = function() {};
            ChildScope.prototype = this;
            child = new ChildScope();
            child.$id = Math.random();
        }
        return child;
    };

    Scope.prototype.$apply = function(expr) {
        try {
            this.$$phase = '$apply';
            return this.$eval(expr);
        } finally {
            this.$$phase = null;
        }
    };

    Scope.prototype.$eval = function(expr) {
        if (typeof expr === 'function') {
            return expr(this);
        }
    };

    Scope.prototype.$broadcast = function(name, args) {
        var scope = this;
        while (scope) {
            var listeners = scope.$$listeners[name] || [];
            for (var i = 0; i < listeners.length; i++) {
                try {
                    listeners[i].apply(null, [args] || []);
                } catch (e) {}
            }
            scope = scope.$$childHead;
        }
        return this;
    };

    Scope.prototype.$on = function(name, listener) {
        if (!this.$$listeners[name]) {
            this.$$listeners[name] = [];
        }
        this.$$listeners[name].push(listener);
        var self = this;
        return function() {
            var index = self.$$listeners[name].indexOf(listener);
            if (index >= 0) {
                self.$$listeners[name].splice(index, 1);
            }
        };
    };

    Scope.prototype.$digest = function() {
        var scope = this;
        do {
            scope.$$watchers.forEach(function(watcher) {
                try {
                    var newValue = watcher.watchFn(scope);
                    var oldValue = watcher.last;
                    if (newValue !== oldValue) {
                        watcher.last = newValue;
                        watcher.listenerFn(newValue, oldValue, scope);
                    }
                } catch (e) {}
            });
            scope = scope.$$childHead;
        } while (scope);
    };

    // ngModule
    var angularModule = window.angularModule = function(name, requires) {
        var modules = {};
        var moduleInstance = {
            name: name,
            requires: requires,
            provider: function(name, provider) {
                modules[name + 'Provider'] = provider;
                return this;
            },
            factory: function(name, factory) {
                return this.provider(name, { $get: factory });
            },
            service: function(name, service) {
                return this.provider(name, { $get: function() { return service; } });
            },
            controller: function(name, fn) {
                modules[name] = fn;
                return this;
            },
            directive: function(name, directive) {
                modules[name + 'Directive'] = directive;
                return this;
            },
            config: function(fn) {
                modules[name + 'Config'] = fn;
                return this;
            },
            run: function(fn) {
                modules[name + 'Run'] = fn;
                return this;
            },
            filter: function(name, filter) {
                modules[name + 'Filter'] = filter;
                return this;
            },
            _invoke: function(name, method, locals) {
                var provider = modules[name + 'Provider'];
                if (provider) {
                    var instance = {};
                    if (provider.$get) {
                        Object.keys(provider.$get()).forEach(function(key) {
                            instance[key] = provider.$get()[key];
                        });
                    }
                    return method.apply(null, Object.values(instance));
                }
                return null;
            }
        };
        modules[name] = moduleInstance;
        return moduleInstance;
    };

    angular.module = angularModule;

    publishExternalAPI(angular);

    window.angular = angular;
    return angular;

})(window, document);

// Angular 模块实现
(function(angular) {
    'use strict';

    // angular.soundManager 简化实现
    angular.module('angularSoundManager').service('angularPlayer', ['$rootScope', function($rootScope) {
        var currentTrack = null;
        var playlist = [];
        var isPlaying = false;

        return {
            addTrack: function(track) {
                playlist.push(track);
                $rootScope.$broadcast('player:playlist', playlist);
            },
            addTrackArray: function(tracks) {
                playlist = tracks.slice();
                $rootScope.$broadcast('player:playlist', playlist);
            },
            clearPlaylist: function(callback) {
                playlist = [];
                $rootScope.$broadcast('player:playlist', playlist);
                if (callback) callback();
            },
            playTrack: function(id) {
                $rootScope.$broadcast('track:id', id);
            },
            play: function() { isPlaying = true; },
            pause: function() { isPlaying = false; },
            toggleShuffle: function() {},
            getShuffle: function() { return false; },
            getCurrentTrack: function() { return currentTrack; },
            getPlaylist: function() { return playlist; }
        };
    }]);

    // ui-notification 实现
    angular.module('ui-notification').provider('Notification', function() {
        return {
            $get: function() {
                return {
                    success: function(msg) { console.log('Success: ' + msg); },
                    info: function(msg) { console.log('Info: ' + msg); },
                    error: function(msg) { console.log('Error: ' + msg); }
                };
            }
        };
    });

})(angular);
