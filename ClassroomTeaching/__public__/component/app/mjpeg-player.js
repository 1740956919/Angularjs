(function ()
{

'use strict';

angular.module('LINDGE-ClassroomApp.MJpegPlayer', [])

.factory('MjpegLoader', ['$q', function ($q) {
    const SOI = [0xFF, 0xD8];
    const H_CONTENT_LENGTH = 'CONTENT-LENGTH';
    const TYPE_JPEG = 'image/jpeg';

    function getContentLength(headers) {
        for (let line of headers.split('\n')) {
            let pair = line.split(':');
            if (pair[0].toUpperCase() === H_CONTENT_LENGTH) {
                return parseInt(pair[1]);
            }
        }

        return 0;
    }

    /**
     * buffer scanner
     */
    function BufferScanner(size) {
        this.buffer = new Uint8Array(new ArrayBuffer(size));
        this.pos = 0;
        this.left = size;
    }

    BufferScanner.prototype.read = function(buffer, start) {
        var length = Math.min(buffer.length - start, this.left);
        var sub = buffer.subarray(start, start + length);
        this.buffer.set(sub, this.pos);
        this.pos += length;
        this.left -= length;
    };

    BufferScanner.prototype.isFilled = function() {
        return this.left === 0;
    };

    /**
     * mjpeg loader
     */
    function MjpegLoader(img) {
        if (!(img instanceof Image)) {
            throw new Error("invalid image");
        }

        this.img = img;
        this.frame = 0;

        this._currentCache = null;
        this._canceled = false;
    }

    MjpegLoader.prototype._disposeCache = function() {
        if (this._currentCache) {
            URL.revokeObjectURL(this._currentCache);
            this._currentCache = null;
        }
    };

    MjpegLoader.prototype._createCache = function(buffer) {
        this._currentCache = URL.createObjectURL(new Blob([buffer], { type: TYPE_JPEG }));
        return this._currentCache;
    };

    MjpegLoader.prototype._readStream = function(reader, defer, events) {
        var self = this;

        var metaLoaded = false;

        var isReadingHeader = true;
        var headers = [];
        var imageBuf = null;

        function read() {
            reader.read().then(state => {
                if (self._canceled) {
                    reader.cancel();
                    return;
                }

                if (state.done) {
                    defer.resolve();
                } else {
                    var value = state.value;
                    for (var i = 0; i < value.length && isReadingHeader; i++) {
                        if (value[i] == SOI[0] && value[i + 1] == SOI[1]) {
                            var bufferSize = getContentLength(headers.join(''));
                            imageBuf = new BufferScanner(bufferSize);
                            isReadingHeader = false;
                            i--;

                            if (!metaLoaded) {
                                try {
                                    events.onMetadataLoaded();
                                } catch (err) {
                                    // nothing to do
                                }
                            }
                        } else {
                            headers.push(String.fromCharCode(value[i]));
                        }
                    }


                    if (!isReadingHeader) {
                        imageBuf.read(value, i);

                        if (imageBuf.isFilled()) {
                            self._disposeCache();
                            self.img.src = self._createCache(imageBuf.buffer);
                            self.frame++;

                            isReadingHeader = true;
                            headers.length = 0;
                            imageBuf = null;
                        }
                    }

                    read();
                }
            }, err => {
                if (!self._canceled) {
                    defer.reject(err);
                }
            });
        }

        read();
    };

    MjpegLoader.prototype.beginLoad = function(src, events) {
        this.frame = 0;
        this._disposeCache();
        this._canceled = false;

        events = angular.extend({
            onMetadataLoaded: angular.noop
        }, events);

        var defer = $q.defer();

        fetch(src)
            .then(rsp => {
                if (!this._canceled) {
                    if (!rsp.ok) {
                        defer.reject(rsp.status);
                        return;
                    }

                    var reader = rsp.body.getReader();
                    this._readStream(reader, defer, events);
                }
            }, err => {
                if (!this._canceled) {
                    defer.reject(err);
                }
            });

        return defer.promise;
    };

    MjpegLoader.prototype.cancel = function() {
        this._canceled = true;
    };

    MjpegLoader.prototype.isCanceled = function() {
        return this._canceled;
    };

    return MjpegLoader;
}])

.directive('mjpegPlayer', ['$log', '$http', 'MjpegLoader', function ($log, $http, MjpegLoader) {
    var MAX_TRY_TIME = 5;

    function releaseImage(img) {
        if (img.src) {
            URL.revokeObjectURL(img.src);
            img.src = '';
        }
    }

    function createImage() {
        return {
            img: new Image(),
            loader: null
        };
    }

    return {
        priority: 1,
        scope: {
            streamSrc: '@',
            keepAlive: '@'
        },
        restrict: 'E',
        // template: '',
        replace: false,
        transclude: false,
        link: function(scope, iElm, iAttrs) {
            var displayImg = createImage();
            var backlogImg = createImage();

            var doKeepAlive = !!iAttrs['keepAlive'];
            var keepAliveUrl = scope.keepAlive;

            var isPlaying = false;
            scope.isLoading = false;
            scope.isError = false;

            var reloadingHandle = -1;

            function swapImage() {
                displayImg.img.remove();
                iElm.append(backlogImg.img);

                releaseImage(displayImg.img);

                var temp = displayImg;
                displayImg = backlogImg;
                backlogImg = temp;
            }

            function initLoader(image) {
                var loader = new MjpegLoader(image.img);
                image.loader = loader;

                return loader;
            }

            function releaseLoader(image) {
                image.loader.cancel();
                image.loader = null;
            }

            function stopCurrentLoading() {
                if (displayImg.loader) {
                    releaseLoader(displayImg);
                }

                if (backlogImg.loader) {
                    releaseLoader(backlogImg);
                    releaseImage(backlogImg.img);
                }

                if (reloadingHandle > 0) {
                    clearTimeout(reloadingHandle);
                    reloadingHandle = -1;
                }

                if (scope.isLoading) {
                    scope.isLoading = false;
                }
            }

            function showImage(loadImg) {
                if (loadImg === backlogImg) {
                    swapImage();
                } else if (!loadImg.img.parentElement) {
                    iElm.append(loadImg.img);
                }
            }

            function loadImageStream(src, loadImg, tryTimes) {
                scope.isLoading = true;
                scope.isError = false;

                var loader = initLoader(loadImg);

                loader.beginLoad(src, {
                    onMetadataLoaded: function () {
                        scope.isLoading = false;
                        tryTimes = 0;
                        showImage(loadImg);
                    }
                })
                .finally(() => {
                    loadImg.loader = null;
                    if (!loader.isCanceled()) {
                        reloadingHandle = setTimeout(() => {
                            if (tryTimes === undefined || tryTimes < 0) {
                                tryTimes = 0;
                            }

                            tryTimes++;

                            if (tryTimes <= MAX_TRY_TIME) {
                                $log.info(`mjpeg beign reload resource: ${src}`);
                                loadImageStream(src, loadImg, tryTimes);
                            }
                        }, 1000);
                    }
                });
            }

            function loadImageStreamAlive(src, loadImg) {
                function nextCheck() {
                    reloadingHandle = setTimeout(checkAlive, 1000);
                }

                function checkAlive() {
                    if (keepAliveUrl) {
                        $http.get(keepAliveUrl)
                            .then(result => {
                                if (result.data && result.data.IsAlive) {
                                    reloadingHandle = -1;
                                    $log.info(`mjpeg check alive success: ${src}`);
                                    loadStream();
                                } else {
                                    nextCheck();
                                }
                            }, () => {
                                nextCheck();
                            });
                    } else {
                        nextCheck();
                    }
                }

                function loadStream() {
                    var loader = initLoader(loadImg);

                    loader.beginLoad(src, {
                        onMetadataLoaded: function () {
                            scope.isLoading = false;
                            showImage(loadImg);
                        }
                    })
                    .finally(() => {
                        loadImg.loader = null;
                        if (!loader.isCanceled()) {
                            $log.info(`mjpeg beign reload resource: ${src}`);
                            checkAlive();
                        }
                    });
                }


                scope.isLoading = true;
                scope.isError = false;

                checkAlive();
            }

            scope.$watch('streamSrc', newSrc => {
                if (newSrc) {
                    stopCurrentLoading();

                    if (doKeepAlive) {
                        loadImageStreamAlive(newSrc, backlogImg);
                    } else {
                        loadImageStream(newSrc, backlogImg);
                    }
                } else {
                    stopCurrentLoading();
                }
            });

            scope.$watch('keepAlive', newValue => {
                keepAliveUrl = newValue;
            });

            scope.$on('$destroy', () => {
                stopCurrentLoading();
            });
        }
    };
}]);

}());