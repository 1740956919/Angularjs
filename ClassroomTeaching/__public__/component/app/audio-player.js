(function ()
{

'use strict';

angular.module('LINDGE-ClassroomApp.AudioPlayer', ['LINDGE-UI-Core', 'LINDGE-WebMedia'])

.factory('$luiAudioService', ['$injector', '$SDK', '$log', '$ngUtil', '$luiTimer', 'AudioCore',
function ($injector, $SDK, $log, $ngUtil, Timer, AudioCore) {
    var DEFAULT_TIMER_INTERVAL = 200;

    var clamp = $SDK.Math.clamp;

    /**
     * Audio Service
     */
    function AudioService() {
        this._uiHandles = [];

        this._refineStateUpdating = false;
        this._refreshTimer = new Timer(DEFAULT_TIMER_INTERVAL);

        this._currentFile = '';
        this._start = -1;           // s
        this._end = -1;             // s
        this._handles = null;
        this._autoStart = false;

        this._canplay = false;

        this.audio = new AudioCore(0);
        this._setupAudio();

        this.currentTime = 0;
        this.duration = 0.0;
        this.progress = 0.0;    // [0, 100]
        this.isActive = false;
        this.isPlaying = false;
    }

    AudioService.prototype._setupAudio = function() {
        this.audio.addEventListener('loadedmetadata', () => {
            if (this._useCustomRange()) {
                this.duration = this._end - this._start;
            } else {
                this.duration = this.audio.getDuration();
            }
        });

        this.audio.addEventListener('canplay', () => {
            this._canplay = true;

            if (this._autoStart) {
                this.play();
            } else {
                this._updateTime();
                this._notifyUI();
            }
        });

        this.audio.addEventListener('playing', () => {
            this.isPlaying = true;
        });

        this.audio.addEventListener('error', err => {
            if (this.isActive) {
                this.terminatePlayback();
            }
        });

        this.audio.addEventListener('ended', () => {
            if (this.isActive) {
                this.pause();

                this._updateTime();
                this._notifyUI();

                if (this._handles.onPlayEnd) {
                    try {
                        this._handles.onPlayEnd();
                    } catch (err) {
                        $log.error('error occurred when calling play end handle', err);
                    }
                }
            }
        });
    };

    AudioService.prototype._initAudio = function() {
        if (!this._currentFile) {
            return;
        }

        this.audio.setSrc(this._currentFile);

        if (this._useCustomRange()) {
            this.audio.setTime(this._start);
        }
    };

    AudioService.prototype._notifyUI = function() {
        this._uiHandles.forEach(function (handle) {
            try {
                handle.notify();
            } catch (err) {
                $log.error('error occurred when calling ui notify callback', err);
            }
        });
    };

    AudioService.prototype.addUIHandle = function(handle) {
        this._uiHandles.push(handle);
    };

    AudioService.prototype._reset = function() {
        this._currentFile = '';
        this._start = -1;           // s
        this._end = -1;             // s
        this._handles = null;
        this._canplay = false;
        this._autoStart = false;

        this.currentTime = 0;
        this.duration = 0.0;
        this.progress = 0.0;    // [0, 100]
        this.isActive = false;
        this.isPlaying = false;

        this._stopStateUpdate();
    };

    AudioService.prototype.initPlayback = function(config) {
        // {
        //     file,
        //     autoStart,
        //     onPlayStart,
        //     onPlayEnd,
        //     onTerminate,
        //     onError,
        //     start?,
        //     end?
        // }

        if (config.file) {
            this._currentFile = config.file;
        } else {
            this._currentFile = '';
        }

        if (typeof config.start == 'number' && config.start >= 0) {
            this._start = config.start / 1000;      // convert to s
        }

        if (typeof config.end == 'number' && config.end >= 0) {
            this._end = config.end / 1000;
        }

        this._autoStart = !!config.autoStart;
        this._handles = config;

        this._initAudio(config);
        this.isActive = true;
        this._notifyUI();
    };

    AudioService.prototype.terminatePlayback = function() {
        if (this.isActive) {
            this.audio.stop();
            this.audio.setSrc('');

            var handles = this._handles;

            this._reset();
            this._notifyUI();

            if (handles.onTerminate) {
                handles.onTerminate();
            }
        }
    };

    /* =============== state management =============== */
    AudioService.prototype.useRefineStateUpdating = function() {
        this._refineStateUpdating = true;
    };

    AudioService.prototype._setupStateUpdate = function() {
        var audio = this.audio;

        this._refreshTimer.start({
            tick: () => {
                if (this._canplay) {
                    this._updateTime();

                    if (this.currentTime >= this.duration) {
                        if (this.isPlaying) {
                            audio.pause();
                            this.isPlaying = false;

                            if (this._handles.onPlayEnd) {
                                try {
                                    this._handles.onPlayEnd();
                                } catch (err) {
                                    $log.error('error occurred when calling play end handle', err);
                                }
                            }
                        }

                        this._notifyUI();
                        return false;
                    } else {
                        this._notifyUI();
                        return true;
                    }
                } else {
                    return false;
                }
            },
            interval: () => {
                return this.duration >= 3600 ? DEFAULT_TIMER_INTERVAL : 80;
            }
        });
    };

    AudioService.prototype._stopStateUpdate = function() {
        if (this._refreshTimer.isRunning) {
            this._refreshTimer.stop();
        }
    };

    /* =============== -- =============== */

    /* =============== time management =============== */
    AudioService.prototype._useCustomRange = function() {
        return this._start >= 0 && this._end > this._start;
    };

    AudioService.prototype._updateTime = function() {
        var audio = this.audio;
        var currentTime = audio.getTime();

        if (this._useCustomRange()) {
            this.currentTime = Math.max(currentTime - this._start, 0.0);
            this.progress = clamp(0.0, 1.0, this.currentTime / this.duration) * 100;
        } else {
            this.currentTime = currentTime;
            this.progress = audio.getPosition() * 100;
        }

        if (this.currentTime > this.duration) {
            this.currentTime = this.duration;
        }
    };

    AudioService.prototype._isPassedTime = function(time) {
        if (this._useCustomRange()) {
            return time >= this._end;
        } else {
            return time >= this.audio.getDuration();
        }
    };

    AudioService.prototype._getEndTime = function() {
        return this._useCustomRange() ? this._end : this.duration;
    };

    AudioService.prototype._getStartTime = function() {
        return this._useCustomRange() ? this._start : 0;
    };

    /* =============== -- =============== */

    /* =============== control methods =============== */
    AudioService.prototype._playFromTime = function(time) {
        this._canplay = false;
        this.audio.setTime(time);
    };

    AudioService.prototype.seekBy = function(offset) {
        if (offset === 0 || !this._canplay) {
            return;
        }

        var startTime = this._getStartTime();
        var endTime = this._getEndTime();

        var oldTime = clamp(startTime, endTime, this.audio.getTime());
        var newTime = oldTime + offset;
        newTime = clamp(startTime, endTime, newTime);

        if (newTime != oldTime) {
            this._playFromTime(newTime);
        }
    };

    AudioService.prototype.seekTo = function(newTime) {
        if (!this._canplay) {
            return;
        }

        var startTime = this._getStartTime();
        var endTime = this._getEndTime();

        var oldTime = clamp(startTime, endTime, this.audio.getTime());
        newTime = clamp(startTime, endTime, newTime);

        if (newTime != oldTime) {
            this._playFromTime(newTime);
        }
    };

    AudioService.prototype.seekToPosition = function(position) {
        if (!this._canplay) {
            return;
        }

        var startTime = this._getStartTime();
        var endTime = this._getEndTime();

        var newTime = position * endTime + (1 - position) * startTime;

        if (isNaN(newTime)) {
            throw new TypeError('invalid position');
        } else {
            newTime = clamp(startTime, endTime, newTime);
        }

        var oldTime = clamp(startTime, endTime, this.audio.getTime());
        if (newTime != oldTime) {
            this._playFromTime(newTime);
        }
    };

    AudioService.prototype.play = function() {
        if (this._canplay && !this.isPlaying) {
            var currentTime = this.audio.getTime();
            if (this._isPassedTime(currentTime)) {
                this._autoStart = true;
                var startTime = this._getStartTime();
                this.audio.setTime(startTime);
            } else {
                this.audio.play();
                if (this._refineStateUpdating) {
                    this._setupStateUpdate();
                }
                this.isPlaying = true;

                if (this._handles.onPlayStart) {
                    try {
                        this._handles.onPlayStart();
                    } catch (err) {
                        $log.error('error occurred when calling play start handle', err);
                    }
                }
            }
        }
    };

    AudioService.prototype.pause = function() {
        this.audio.pause();
        this._stopStateUpdate();
        this.isPlaying = false;
    };
    /* =============== -- =============== */

    return {
        createAudioService: function () {
            return new AudioService();
        },
        AudioService: AudioService
    };
}])

.directive('luiAudioPlayer', ['$luiAudioService', '$document', function ($luiAudioService, $document) {
    function formatPlayerTime (seconds, formatHour) {
        seconds = Math.ceil(seconds);
        if (isNaN(seconds)) {
            return '0:0';
        } else {
            var minutes = Math.floor(seconds / 60);
            seconds -= minutes * 60;

            var parts = [seconds > 9 ? seconds : '0' + seconds];

            if (formatHour && minutes >= 60) {
                var hours = Math.floor(minutes / 60);
                minutes -= hours * 60;

                parts.unshift(minutes > 9 ? minutes : '0' + minutes);
                parts.unshift(hours);
            } else {
                parts.unshift(minutes);
            }

            return parts.join(':');
        }
    }

    var template = `
    <div class="lui-audio-player layout-row">
        <div class="audio-player-control layout-row layout-align-start-center">
            <button class="control-btn-seek-left" ng-click="service.seekBy(-10);service.play()">
                <span>10</span>
                <span class="arrow"></span>
            </button>
            <button class="control-btn btn-pause" ng-click="service.pause($event)" ng-show="service.isPlaying">
                <i class="lic lic-player-pause-round"></i>
            </button>
            <button class="control-btn btn-play" ng-click="service.play($event)" ng-show="!service.isPlaying">
                <i class="lic lic-player-start"></i>
            </button>
            <button class="control-btn-seek-right" ng-click="service.seekBy(10);service.play()">
                <span>10</span>
                <span class="arrow"></span>
            </button>
        </div>
        <div class="audio-progress">
            <div class="progress-groove">
                <div class="progress-sub"></div>
            </div>
            <div class="progress-slide">
                <span class="time-current">0:00</span>/<span class="time-duration">0:00</span>
            </div>
        </div>
    </div>`;

    return {
        priority: 1,
        scope: {
            audioService: '=',
            onInit: '='
        },
        restrict: 'E',
        template: template,
        replace: false,
        transclude: false,
        link: function(scope, iElm, iAttrs) {
            var progressElm = iElm[0].querySelector('.audio-progress');
            var progressSub = progressElm.querySelector('.progress-sub');
            var slide = progressElm.querySelector('.progress-slide');

            var progressWrapper = angular.element(progressSub);
            var slideWrapper = angular.element(slide);
            var currentTimeWrapper = angular.element(slide.querySelector('.time-current'));
            var durationWrapper = angular.element(slide.querySelector('.time-duration'));

            var progressWidth = parseFloat(window.getComputedStyle(progressElm)['width']);
            var slideWidth = parseFloat(window.getComputedStyle(slide)['width']);
            var slideTrackWidth = progressWidth - slideWidth;

            var progressUpdating = true;
            var lastPercent = 0;

            /* progress handling */
            function updateProgress(percent) {
                function normalizePrecision(value) {
                    return Math.round(value * 100) / 100;
                }

                if (lastPercent > percent) {
                    progressWrapper.addClass('no-anim');
                    slideWrapper.addClass('no-anim');
                }

                progressWrapper.css('right', (100 - percent) + '%');
                slideWrapper.css('left', normalizePrecision(slideTrackWidth * percent / 100.0) + 'px');

                if (lastPercent > percent) {
                    setTimeout(function () {
                        progressWrapper.removeClass('no-anim');
                        slideWrapper.removeClass('no-anim');
                    }, 20);                    
                }

                lastPercent = percent;
            }

            function setupSlideAction() {
                var trackStart = -1;
                var startLeft = 0;
                var position = 0.0;

                function updateDragState(evt) {
                    var offset = evt.clientX - trackStart;
                    var newLeft = startLeft + offset;
                    if (newLeft < 0) {
                        newLeft = 0;
                    } else if (newLeft > slideTrackWidth) {
                        newLeft = slideTrackWidth;
                    }

                    slideWrapper.css('left', newLeft + 'px');

                    position = newLeft / slideTrackWidth;
                    progressWrapper.css('right', ((1 - position) * 100) + '%');

                    currentTimeWrapper.text(formatPlayerTime(position * service.duration));
                }

                function onMouseMove(evt) {
                    evt.preventDefault();
                    updateDragState(evt);
                }

                function onMouseRelease(evt) {
                    $document.unbind('mousemove', onMouseMove);
                    $document.unbind('mouseup', onMouseRelease);

                    updateDragState(evt);

                    if (service.isPlaying) {
                        service.audio.play();
                    } else {
                        service.play();
                    }

                    service.seekToPosition(position);

                    progressWrapper.removeClass('no-anim');
                    slideWrapper.removeClass('no-anim');

                    trackStart = -1;
                    startLeft = 0;
                    position = 0.0;
                    progressUpdating = true;
                }

                slideWrapper.bind('mousedown', function (evt) {
                    if (evt.button !== 0) {
                        return;
                    }

                    evt.preventDefault();

                    trackStart = evt.clientX;
                    startLeft = parseFloat(window.getComputedStyle(slide)['left']);
                    progressUpdating = false;

                    // mimic suspending
                    if (service.isPlaying) {
                        service.audio.pause();
                    }

                    progressWrapper.addClass('no-anim');
                    slideWrapper.addClass('no-anim');

                    $document.bind('mousemove', onMouseMove);
                    $document.bind('mouseup', onMouseRelease);
                });
            }

            setupSlideAction();

            /* scope variables */
            scope.currentTime = 0;

            /* service initiation */
            var service;
            if (scope.audioService && scope.audioService instanceof $luiAudioService.AudioService) {
                service = scope.audioService;
            } else {
                service = $luiAudioService.createAudioService();
            }

            service.useRefineStateUpdating();

            service.addUIHandle({
                notify: function () {
                    if (progressUpdating) {
                        currentTimeWrapper.text(formatPlayerTime(service.currentTime));
                        durationWrapper.text(formatPlayerTime(service.duration));
                        updateProgress(service.progress);
                    }
                    scope.$evalAsync(angular.noop);
                }
            });

            scope.service = service;

            // other init code
            if (angular.isFunction(scope.onInit)) {
                scope.onInit(service);
            }

            scope.$on('$destroy', function () {
                service.terminatePlayback();
            });
        }
    };
}]);

}());