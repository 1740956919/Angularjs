(function ()
{

'use strict';

angular.module('LINDGE-ClassroomApp.LivestreamPlayer', ['LINDGE-Service'])

.config(['$moduleManagerProvider', function ($moduleManagerProvider) {
    $moduleManagerProvider.defineModule({
        id: 'flvjs',
        components: [{
            id: 'flv.js',
            path: '/CDN/flvjs/flv.min.js',
            type: $moduleManagerProvider.COMPONENT_TYPE.SCRIPT
        }]
    });
}])

.directive('livestreamPlayer', ['$q', '$log', '$moduleManager', function ($q, $log, $moduleManager) {
    var flvjs = null;
    var loadHandle = $moduleManager.loadModule('flvjs');

    loadHandle.then(function () {
        flvjs = window.flvjs;
    });

    var MAX_RETRY_TIMES = 5;
    var RETRY_TIMEOUT = 1000;
    var FORCE_SEEK_THRESHOLD = 1.5;
    var TRACE_TIMEOUT = 500;
    var VIDEO_FPS = 50;

    return {
        priority: 1,
        scope: {
            onInit: '='
        },
        restrict: 'E',
        template: '<div class="video-wrapper" ng-class="{streaming: isStreaming, loading: isLoading}"><video></video></div>',
        replace: false,
        transclude: false,
        link: function(scope, iElm, iAttrs) {
            var videoElm = iElm[0].querySelector('video');

            var streamSrc = '';

            var loadingHandle = -1;
            var flvPlayer = null;
            var stopProgressTracing = null;

            scope.isStreaming = false;
            scope.isLoading = false;

            var videoState = {
                isSeeking: false
            };

            function initPlayer(src) {
                var player = flvjs.createPlayer({
                    type: 'flv',
                    isLive: true,
                    hasAudio: false,
                    url: src
                }, {
                    enableWorker: true,
                    enableStashBuffer: false,
                    stashInitialSize: 128,
                    autoCleanupSourceBuffer: true,
                    autoCleanupMaxBackwardDuration: 30,
                    autoCleanupMinBackwardDuration: 15
                });

                player.attachMediaElement(videoElm);

                return player;
            }

            function seekVideo(time) {
                videoElm.currentTime = time;
                videoState.isSeeking = true;
            }

            function beginTracingPlayerTime() {
                var traceHandle = -1;

                function trace() {
                    if (scope.isStreaming && !videoState.isSeeking) {
                        var bufferCount = videoElm.buffered.length;
                        if (bufferCount > 0) {
                            var bs = videoElm.buffered.start(bufferCount - 1);
                            var bt = videoElm.buffered.end(bufferCount - 1);
                            var ct = videoElm.currentTime;
                            var delta = bt - ct;

                            if (delta > FORCE_SEEK_THRESHOLD) {
                                seekVideo(Math.max(videoElm.currentTime, bs, videoElm.currentTime + delta * 0.98));
                                console.log(`seek ${videoElm.currentTime}`);
                            }
                        }
                    }

                    traceHandle = setTimeout(trace, TRACE_TIMEOUT);
                }

                function onSeek() {
                    videoState.isSeeking = false;
                }

                videoElm.addEventListener('seeked', onSeek);
                traceHandle = setTimeout(trace, TRACE_TIMEOUT);

                return function () {
                    videoElm.removeEventListener('seeked', onSeek);
                    clearTimeout(traceHandle);
                };
            }

            function configPlayer(player, startOption) {
                player.on(flvjs.Events.METADATA_ARRIVED, () => {
                    if (startOption.lastFrame > 2) {
                        seekVideo(1.0 / VIDEO_FPS * startOption.lastFrame * 0.9);
                    }

                    player.play();
                    stopProgressTracing = beginTracingPlayerTime();
                });

                player.on(flvjs.Events.ERROR, (errType, errDetail) => {
                    if (player === flvPlayer && scope.isStreaming) {
                        if (errType != flvjs.ErrorTypes.NETWORK_ERROR) {
                            flvPlayer.unload();
                            flvPlayer = null;
                            scope.isStreaming = false;
                        }
                    }
                });
            }

            function createStartOption() {
                return {
                    lastFrame: 0
                };
            }

            function tryLoadStream(src, startOption) {
                var defer = $q.defer();
                var loadTimes = 0;

                function onError(errType, errDetail) {
                    loadTimes++;
                    if (errType == flvjs.ErrorTypes.NETWORK_ERROR && loadTimes < MAX_RETRY_TIMES) {
                        loadingHandle = setTimeout(() => {
                            flvPlayer.unload();
                            flvPlayer.load();
                        }, Math.pow(2, loadTimes - 1) * RETRY_TIMEOUT);
                    } else {
                        $log.error(`load stream failed: ${errType}, ${errDetail}`);
                        flvPlayer.unload();
                        flvPlayer = null;
                        defer.reject();
                    }
                }

                function onLoad() {
                    flvPlayer.off(flvjs.Events.ERROR, onError);
                    flvPlayer.off(flvjs.Events.METADATA_ARRIVED, onLoad);
                    defer.resolve();
                }

                flvPlayer = initPlayer(src);
                configPlayer(flvPlayer, startOption);

                flvPlayer.on(flvjs.Events.ERROR, onError);
                flvPlayer.on(flvjs.Events.METADATA_ARRIVED, onLoad);
                flvPlayer.load();

                return defer.promise;
            }

            function startStream(src, option) {
                if (scope.isStreaming || scope.isLoading) {
                    stopStream();
                }

                option = angular.extend(createStartOption(), option);

                scope.isLoading = true;
                tryLoadStream(src, option).then(() => {
                    scope.isStreaming = true;
                })
                .finally(() => {
                    scope.isLoading = false;
                });
            }

            function stopStream() {
                if (flvPlayer) {
                    flvPlayer.unload();
                    flvPlayer = null;
                }

                if (videoElm.currentTime > 0) {
                    videoElm.currentTime = 0;
                }

                if (loadingHandle > 0) {
                    clearTimeout(loadingHandle);
                    loadingHandle = -1;
                }

                if (stopProgressTracing) {
                    stopProgressTracing();
                    stopProgressTracing = null;
                }

                scope.isLoading = false;
                scope.isStreaming = false;

                videoState.isSeeking = false;
            }

            loadHandle.then(() => {
                var ctrl = {
                    play: startStream,
                    stop: stopStream
                };

                if (angular.isFunction(scope.onInit)) {
                    scope.onInit(ctrl);
                }
            });

            scope.$on('$destroy', () => {
                if (scope.isStreaming || scope.isLoading) {
                    stopStream();
                }
            });
        }
    };
}]);

}());