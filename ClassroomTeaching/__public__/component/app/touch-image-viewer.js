(function ()
{

'use strict';

angular.module('LINDGE-ClassroomApp.TouchImageViewer', [
    'LINDGE-Service'
])

.directive('touchImageViewer', ['$log', '$SDK', function ($log, $SDK) {
    var SCALE_RANGE = [0.2, 2.0];
    var DRAG_SCALE_MULT = 0.01;
    var DRAG_SCALE_THRESHOLD = 0.01;
    var WHEEL_SCALE_AMOUNT = 0.4;

    /* ------------------ support types ------------------ */

    /**
     * image location object
     *
     * @class      ImageLocationInfo
     */
    class ImageLocationInfo {
        /**
         * constructor
         *
         * @param  {Number}  x
         * @param  {Number}  y
         * @param  {Number}  width
         * @param  {Number}  height
         * @param  {Number}  scale
         */
        constructor (x, y, width, height, scale) {
            this.update(...arguments);
            this.rotateQuarter = 0;
        }

        /**
         * udpate all properties
         *
         * @param  {Number}  x
         * @param  {Number}  y
         * @param  {Number}  width
         * @param  {Number}  height
         * @param  {Number}  scale
         */
        update (x, y, width, height, scale) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.scale = scale;
        }

        /**
         * copy properties from given location
         *
         * @param  {ImageLocationInfo}  other   The other
         */
        copyFrom (other) {
            this.x = other.x;
            this.y = other.y;
            this.width = other.width;
            this.height = other.height;
            this.scale = other.scale;
            this.rotateQuarter = other.rotateQuarter;
        }

        /**
         * creates a new instance of the object with same properties than original
         *
         * @return  {ImageLocationInfo}
         */
        clone () {
            var newLocation = new ImageLocationInfo();
            newLocation.copyFrom(this);
            return newLocation;
        }

        /**
         * determines whether the specified other is equal with this one
         *
         * @param   {ImageLocationInfo}   other
         * @return  {Boolean}
         */
        isEqual (other) {
            if (other === null || other === undefined) {
                return false;
            } else if (other === this) {
                return true;
            } else {
                return Object.keys(this).every(attr => other[attr] === this[attr]);
            }
        }

        /**
         * determines if image orientation is vertical
         *
         * @return  {Boolean}
         */
        isOrientPerpendicular () {
            return this.rotateQuarter % 2 !== 0;
        }
    }

    /**
     * tracker of touch event touch points
     *
     * @class      TouchTracker
     */
    class TouchTracker {
        /**
         * constructor
         *
         * @param  {Function}  touchConverter
         */
        constructor (touchConverter) {
            this.touches = {};
            this.touchCount = 0;

            this._converter = touchConverter;
        }

        addTouches (touches) {
            for (let touch of touches) {
                this.touches[touch.identifier] = this._converter.call(null, touch);
            }

            this.touchCount += touches.length;
        }

        removeTouches (touches) {
            for (let touch of touches) {
                delete this.touches[touch.identifier];
            }

            this.touchCount -= touches.length;
            if (this.touchCount < 0) {
                this.touchCount = 0;
            }
        }

        get (id) {
            return this.touches[id] || null;
        }

        getTouches () {
            return Object.keys(this.touches).map(id => this.touches[id]);
        }
    }

    class Vector2d {
        constructor (x, y) {
            if (arguments.length == 1) {
                this.x = x;
                this.y = x;
            } else if (arguments.length >= 2) {
                this.x = x;
                this.y = y;
            } else {
                this.x = this.y = 0;
            }
        }

        add (x, y) {
            return new Vector2d(this.x + x, this.y + y);
        }

        subtract (x, y) {
            return this.add(-x, -y);
        }

        _validVec (vec) {
            if (vec === null) {
                throw new Error("vec is null");
            }

            if (!(vec instanceof Vector2d)) {
                throw new TypeError("invalid vec type");
            }
        }

        addVec (vec) {
            this._validVec(vec);
            return this.add(vec.x, vec.y);
        }

        subtractVec (vec) {
            this._validVec(vec);
            return this.subtract(vec.x, vec.y);
        }

        distanceTo (other) {
            this._validVec(other);

            var dx = this.x - other.x;
            var dy = this.y - other.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    class Size {
        constructor (width, height) {
            this.width = width;
            this.height = height;
        }
    }

    /* ------------------ utility functions ------------------ */

    function getTransitionDuration(elm) {
        var css = window.getComputedStyle(elm).transitionDuration;
        if (css) {
            var duration = 0;
            for (let value of css.split(', ')) {
                let time = parseFloat(value);
                if (!isNaN(time)) {
                    duration = Math.max(duration, time * 1000);
                }
            }

            return duration;
        } else {
            return 0;
        }
    }

    function degToRad(degree) {
        return degree * (Math.PI / 180);
    }

    function rotateAround(center, point, degree) {
        // move back to frame center
        var p1 = point.subtractVec(center);

        // rotation
        var rad = degToRad(degree);
        var cos = Math.cos(rad), sin = Math.sin(rad);
        p1 = new Vector2d(p1.x * cos + p1.y * sin, p1.x * -sin + p1.y * cos);

        // move back
        p1.x += center.x;
        p1.y += center.y;

        return p1;
    }

    function scaleFrom(center, point, amount) {
        return new Vector2d(
            center.x + (point.x - center.x) * amount,
            center.y + (point.y - center.y) * amount
        );
    }

    /* ------------------ directive implementation ------------------ */

    var LOADING_CLS = 'image-loading';
    var NO_TRANSITION_CLS = 'no-transition';
    var template = '<div class="image-container"></div>';

    function link (scope, iElm, iAttrs) {
        var imageElm = angular.element(new Image());
        imageElm.addClass('image');
        var containerElm = angular.element(iElm[0].querySelector('.image-container'));

        var imageTransitionDuration = -1;

        var isLoading = false;
        var isUpdatingImageLocation = false;

        var imageInfo = {
            init: new ImageLocationInfo(0.0, 0.0, 0.0, 1.0),
            current: new ImageLocationInfo(0.0, 0.0, 0.0, 1.0)
        };
        
        function updateImageLocation(locationInfo) {
            var cssProp = {
                width: locationInfo.width ? locationInfo.width + 'px' : '',
                height: locationInfo.height ? locationInfo.height + 'px' : '',
                left: locationInfo.x + 'px',
                top: locationInfo.y + 'px',
                transform: ''
            };

            var angle = NaN;
            if (locationInfo.rotateQuarter !== 0) {
                angle = locationInfo.rotateQuarter * 90;
            } else if (imageElm.css('transform')) {
                var match = /\((-?\d+)deg\)/.exec(imageElm.css('transform'));
                if (match) {
                    var currentRot = Number(match[1]);
                    if (Math.abs(currentRot) <= 180) {
                        angle = 0;
                    } else {
                        angle = currentRot < 0 ? -360 : 360;
                    }
                } else {
                    angle = 360;
                }

                isUpdatingImageLocation = true;
                setTimeout(() => {
                    imageElm.addClass(NO_TRANSITION_CLS);
                    imageElm.css('transform', '');
                    setTimeout(() => {
                        imageElm.removeClass(NO_TRANSITION_CLS);
                        isUpdatingImageLocation = false;
                    }, 20);
                    // window.requestAnimationFrame(() => {
                    //     imageElm.removeClass(NO_TRANSITION_CLS);
                    //     isUpdatingImageLocation = false;
                    // });
                }, imageTransitionDuration);
            }

            if (!isNaN(angle)) {
                cssProp['transform'] = `rotate(${angle}deg)`;
            }

            imageElm.css(cssProp);
        }

        function resetImageLocation(orientVertical) {
            var containerWidth = containerElm[0].clientWidth;
            var containerHeight = containerElm[0].clientHeight;

            var imageWidth = orientVertical ? imageElm[0].naturalHeight : imageElm[0].naturalWidth;
            var imageHeight = orientVertical ? imageElm[0].naturalWidth : imageElm[0].naturalHeight;

            var scale = 1.0;
            var width, height;
            var x, y;
            if ((imageWidth / containerWidth) > (imageHeight / containerHeight)) {
                scale = containerWidth / imageWidth;
                width = containerWidth;
                height = scale * imageHeight;
                x = 0;
                y = (containerHeight - scale * imageHeight) / 2;
            } else {
                scale = containerHeight / imageHeight;
                height = containerHeight;
                width = scale * imageWidth;
                x = (containerWidth - scale * imageWidth) / 2;
                y = 0;
            }

            if (orientVertical) {
                x += (width - scale * imageElm[0].naturalWidth) / 2;
                y += (height - scale * imageElm[0].naturalHeight) / 2;
                [width, height] = [height, width];
            }

            imageInfo.init.update(x, y, width, height, scale);
            imageInfo.current.copyFrom(imageInfo.init);

            updateImageLocation(imageInfo.init);
        }

        /**
         * get image bound rectangle info
         *
         * @return {Object}
         */
        function getImageRect() {
            var rect = imageElm[0].getBoundingClientRect();
            return {
                orig: new Vector2d(rect.x, rect.y),
                width: rect.width,
                height: rect.height
            };
        }

        /**
         * @return  {Size}
         */
        function getElmCurrentSize(elm) {
            var bound = elm[0].getBoundingClientRect();
            return new Size(bound.width, bound.height);
        }

        /**
         * input: pageX, pageY
         */
        function isInImageBound(x, y) {
            var imageBound = imageElm[0].getBoundingClientRect();
            var xFit = (x >= imageBound.x) && (x <= imageBound.x + imageBound.width);
            var yFit = (y >= imageBound.y) && (y <= imageBound.y + imageBound.height);

            return xFit && yFit;
        }

        /**
         * input: point, component is pageX and pageY
         */
        function mapToContainer(point) {
            var bound = containerElm[0].getBoundingClientRect();
            return new Vector2d(point.x - bound.x, point.y - bound.y);
        }

        /**
         * get bound of drag area
         */
        function getImageDragBound() {
            var imgSize = getElmCurrentSize(imageElm);
            var containerSize = getElmCurrentSize(containerElm);

            var bound = {
                hr: {
                    low: 0,
                    high: 0
                },
                vt: {
                    low: 0,
                    high: 0
                }
            };

            if (imgSize.width < containerSize.width) {
                bound.hr.low = 0;
                bound.hr.high = containerSize.width - imgSize.width;
            } else {
                bound.hr.low = containerSize.width - imgSize.width;
                bound.hr.high = 0;
            }

            if (imgSize.height < containerSize.height) {
                bound.vt.low = 0;
                bound.vt.high = containerSize.height - imgSize.height;
            } else {
                bound.vt.low = containerSize.height - imgSize.height;
                bound.vt.high = 0;
            }

            if (imageInfo.current.isOrientPerpendicular()) {
                var rawImgSize = [imageElm[0].naturalWidth, imageElm[0].naturalHeight];
                var offsetX = (imgSize.width - rawImgSize[0] * imageInfo.current.scale) / 2;
                var offsetY = (imgSize.height - rawImgSize[1] * imageInfo.current.scale) / 2;

                bound.hr.low += offsetX;
                bound.hr.high += offsetX;
                bound.vt.low += offsetY;
                bound.vt.high += offsetY;
            }

            return bound;
        }

        /* ------------------ transform utility functions ------------------ */
        function scaleImageAt(point, amount) {
            function getCurrentRotation() {
                var rot = imageInfo.current.rotateQuarter;
                if (rot < 0) {
                    rot = 4 + rot;
                }

                return rot * 90;
            }

            var initScale = imageInfo.init.scale;
            var currentScale = imageInfo.current.scale;
            var scale = currentScale + amount;
            scale = $SDK.Math.clamp(initScale * SCALE_RANGE[0], initScale * SCALE_RANGE[1], scale);

            if (scale != currentScale) {
                var scaleRoc = scale / currentScale;

                var imgRect = getImageRect();
                var imgCenter = mapToContainer(imgRect.orig.add(imgRect.width / 2, imgRect.height / 2));
                var imgOrig = mapToContainer(imgRect.orig);
                if (imageInfo.current.isOrientPerpendicular()) {
                    imgOrig = imgCenter.subtract(imgRect.height / 2, imgRect.width / 2);
                }
                var scalePoint = mapToContainer(point);

                // compute new width and height
                var width = imgRect.width * scaleRoc;
                var height = imgRect.height * scaleRoc;

                if (imageInfo.current.isOrientPerpendicular()) {
                    [width, height] = [height, width];
                }

                // compute new offset
                var rotation = getCurrentRotation();
                var sp = rotateAround(imgCenter, scalePoint, -rotation);
                sp = scaleFrom(imgOrig, sp, scaleRoc);

                var newCenter = scaleFrom(imgOrig, imgCenter, scaleRoc);
                sp = rotateAround(newCenter, sp, rotation);

                var ix = imageInfo.current.x;
                var iy = imageInfo.current.y;

                ix += (scalePoint.x - sp.x);
                iy += (scalePoint.y - sp.y);

                imageInfo.current.update(ix, iy, width, height, scale);
                updateImageLocation(imageInfo.current);
            }
        }

        function scaleImageAtCenter(amount) {
            var imgRect = getImageRect();
            scaleImageAt(imgRect.orig.add(imgRect.width / 2, imgRect.height / 2), amount);
        }

        function dragImage(touchPoint, srcTouchPoint) {
            var dx = touchPoint.pageX - srcTouchPoint.lastPoint.x;
            var dy = touchPoint.pageY - srcTouchPoint.lastPoint.y;

            dx = Math.abs(dx) < 0.1 ? 0 : dx;
            dy = Math.abs(dy) < 0.1 ? 0 : dy;

            srcTouchPoint.lastPoint.x += dx;
            srcTouchPoint.lastPoint.y += dy;

            var newX = imageInfo.current.x + dx;
            var newY = imageInfo.current.y + dy;

            var bound = getImageDragBound();

            if ((newX >= bound.hr.low && newX <= bound.hr.high) ||
                (newX < bound.hr.low && newX >= imageInfo.current.x) ||
                (newX > bound.hr.high && newX <= imageInfo.current.x)) {
                imageInfo.current.x = newX;
            }

            if ((newY >= bound.vt.low && newY <= bound.vt.high) ||
                (newY < bound.vt.low && newY >= imageInfo.current.y) ||
                (newY > bound.vt.high && newY <= imageInfo.current.y)) {
                imageInfo.current.y = newY;
            }

            updateImageLocation(imageInfo.current);
        }

        function rotateByQuarter(orient) {
            if (orient !== 0) {
                imageInfo.init.rotateQuarter += orient;
                imageInfo.init.rotateQuarter %= 4;

                resetImageLocation(imageInfo.init.isOrientPerpendicular());
            }
        }

        function resetAllTransform() {
            if (imageInfo.init.rotateQuarter !== 0) {
                imageInfo.init.rotateQuarter = 0;
                imageInfo.current.copyFrom(imageInfo.init);
                resetImageLocation();
            } else {
                imageInfo.current.copyFrom(imageInfo.init);
                updateImageLocation(imageInfo.current);
            }
        }

        /* ------------------ touch management ------------------ */

        var actionStates = {
            scaling: false,
            dragging: false,
            wheeling: false
        };

        var dragScaleState = {
            dragTouches: null,
            prevState: null,

            prepare: function () {
                this.dragTouches = new Set();
            },

            reset: function () {
                this.dragTouches = null;
                this.prevState = null;
            },

            isInitiated: function () {
                return this.dragTouches !== null;
            },

            computeState: function () {
                var center = this._computeCenter();
                this.prevState = {
                    touchCenter: center,
                    touchDist: this._computeDist(center)
                };

                return this.prevState;
            },

            _computeDist: function (center) {
                if (this.dragTouches.size > 0) {
                    var dist = 0;

                    for (let touch of this.dragTouches) {
                        dist += touch.lastPoint.distanceTo(center);
                    }

                    return dist;
                } else {
                    return null;
                }
            },

            _computeCenter: function () {
                if (this.dragTouches.size > 0) {
                    var x = 0, y = 0;

                    for (let touch of this.dragTouches) {
                        x += touch.lastPoint.x;
                        y += touch.lastPoint.y;
                    }

                    return new Vector2d(x / this.dragTouches.size, y / this.dragTouches.size);
                } else {
                    return null;
                }
            }
        };

        var touchTracker = new TouchTracker(touch => ({
            srcPoint: new Vector2d(touch.pageX, touch.pageY),
            lastPoint: new Vector2d(touch.pageX, touch.pageY),
            inImageBound: isInImageBound(touch.pageX, touch.pageY)
        }));

        function getActionCssClass(actionName) {
            return `image-${actionName}`;
        }

        function requireAction(name, singleOwnship) {
            if (actionStates.hasOwnProperty(name)) {
                for (let action of Object.keys(actionStates)) {
                    if (action != name && actionStates[action]) {
                        return false;
                    }
                }

                if (!actionStates[name]) {
                    actionStates[name] = true;
                    iElm.addClass(getActionCssClass(name));
                    return true;
                } else {
                    return !singleOwnship;
                }
            } else {
                return false;
            }
        }

        containerElm.bind('touchstart', evt => {
            touchTracker.addTouches(evt.changedTouches);
        });

        containerElm.bind('touchmove', evt => {
            event.preventDefault();

            if (actionStates.dragging || (touchTracker.touchCount == 1 && requireAction('dragging'))) {
                let touch = evt.changedTouches[0];
                let srcTouch = touchTracker.get(touch.identifier);
                if (srcTouch && srcTouch.inImageBound) {
                    dragImage(touch, srcTouch);
                }
            } else if (actionStates.scaling || (touchTracker.touchCount > 1 && requireAction('scaling'))) {
                if (!dragScaleState.isInitiated()) {
                    dragScaleState.prepare();

                    for (let touch of touchTracker.getTouches()) {
                        // if (touch.inImageBound) {
                        //     dragScaleState.dragTouches.add(touch);
                        // }
                        dragScaleState.dragTouches.add(touch);
                    }

                    dragScaleState.computeState();
                }

                let dragTouchCount = dragScaleState.dragTouches.size;
                if (dragTouchCount > 0) {
                    for (let touch of evt.changedTouches) {
                        let srcTouch = touchTracker.get(touch.identifier);
                        srcTouch.lastPoint.x = touch.pageX;
                        srcTouch.lastPoint.y = touch.pageY;
                    }

                    let prevState = dragScaleState.prevState;
                    let state = dragScaleState.computeState();
                    let scaleDist = (state.touchDist - prevState.touchDist) / dragTouchCount * DRAG_SCALE_MULT;
                    if (Math.abs(scaleDist) >= DRAG_SCALE_THRESHOLD) {
                        scaleImageAt(new Vector2d(state.touchCenter.x, state.touchCenter.y), scaleDist);
                    }
                }
            }
        });

        containerElm.bind('touchend', evt => {
            touchTracker.removeTouches(evt.changedTouches);

            if (touchTracker.touchCount === 0) {
                Object.keys(actionStates).forEach(action => {
                    if (actionStates[action]) {
                        actionStates[action] = false;
                        iElm.removeClass(getActionCssClass(action));
                    }
                });

                dragScaleState.reset();
            }
        });

        containerElm.bind('wheel', evt => {
            evt.preventDefault();
            evt.stopPropagation();

            if (isInImageBound(evt.pageX, evt.pageY) && requireAction('wheeling', true)) {
                scaleImageAt(new Vector2d(evt.pageX, evt.pageY), evt.deltaY < 0 ? WHEEL_SCALE_AMOUNT : -WHEEL_SCALE_AMOUNT);

                // ignore wheel event during image transition animation
                // to prevent ongoing animation from confusing image position computing
                setTimeout(() => {
                    actionStates.wheeling = false;
                    iElm.removeClass(getActionCssClass('wheeling'));
                }, imageTransitionDuration);
            }
        });

        containerElm.bind('dblclick', evt => {
            evt.preventDefault();
            resetAllTransform();
        });

        /* ------------------ image loading ------------------ */
        function updateContainerLoadingState(active) {
            if (active) {
                isLoading = true;
                iElm.addClass(LOADING_CLS);
            } else {
                isLoading = false;
                iElm.removeClass(LOADING_CLS);
            }
        }

        function onImageLoadSuccess(evt) {
            updateContainerLoadingState(false);
            resetImageLocation();
            containerElm.append(imageElm);

            if (imageTransitionDuration < 0) {
                imageTransitionDuration = getTransitionDuration(imageElm[0]);
            }
        }

        function onImageLoadError(evt) {
            updateContainerLoadingState(false);
            $log.error("load image failed", evt);
        }

        imageElm[0].onload = onImageLoadSuccess;
        imageElm[0].onerror = onImageLoadError;

        function loadImage(src) {
            imageElm.remove();
            updateContainerLoadingState(true);
            imageElm[0].src = src;
        }

        scope.$watch('imageSrc', newValue => {
            loadImage(newValue);
        });

        /* ------------------ initiation ------------------ */

        if (angular.isFunction(scope.onInit)) {
            scope.onInit({
                rotateLeft: function () {
                    if (!isUpdatingImageLocation) {
                        rotateByQuarter(-1);
                    }
                },
                rotateRight: function () {
                    if (!isUpdatingImageLocation) {
                        rotateByQuarter(1);
                    }
                },
                zoomIn: function (amount) {
                    if (!isUpdatingImageLocation) {
                        scaleImageAtCenter(amount);
                    }
                },
                zoomOut: function (amount) {
                    if (!isUpdatingImageLocation) {
                        scaleImageAtCenter(-amount);
                    }
                },
                reset: function () {
                    resetAllTransform();
                }
            });
        }
    }

    return {
        priority: 1,
        scope: {
            imageSrc: '@',
            onInit: '='
        },
        restrict: 'E',
        template: template,
        replace: false,
        transclude: false,
        link: link
    };
}]);

}());