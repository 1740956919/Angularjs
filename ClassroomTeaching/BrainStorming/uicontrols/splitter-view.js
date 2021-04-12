(function ()
{

'use strict';

angular.module('ClassroomTeaching.BrainStorming.Control.SplitterView', [])

.directive('splitterScrubber', [function () {
    function getSettingWidth(elm) {
        var width = elm.attr('panel-width');
        if (width) {
            return parseFloat(width);
        } else {
            return null;
        }
    }

    function clamp(value, min, max) {
        return value < min ? min : (value > max ? max : value);
    }

    var SCRUB_CLS = 'scrubbing';
    var MIN_WIDTH_PERCENT = 13.2;

    return {
        priority: 1,
        scope: {
            onMove: '=',
            onInit: '='
        },
        restrict: 'E',
        replace: false,
        link: function(scope, iElm, iAttrs) {
            var handleElm = angular.element('<div class="handle">');
            iElm.append(handleElm);

            var prevElm = angular.element(iElm[0].previousElementSibling);
            var nextElm = angular.element(iElm[0].nextElementSibling);

            var isDragging = false;

            // element initiating
            var prevWidth = getSettingWidth(prevElm);
            var nextWidth = getSettingWidth(nextElm);
            if (prevWidth) {
                nextWidth = 100 - prevWidth;
            } else {
                if (nextWidth) {
                    prevWidth = 100 - nextWidth;
                } else {
                    prevWidth = 50;
                    nextWidth = 50;
                }
            }

            function updateSplitterPanels(leftWidth, rightWidth) {
                prevElm.css('width', leftWidth + '%');
                nextElm.css('width', rightWidth + '%');
            }
            updateSplitterPanels(prevWidth, nextWidth);

            function getContainerWidth() {
                var elm = iElm[0].parentElement;
                var styleInfo = window.getComputedStyle(elm);

                var width = parseFloat(styleInfo.width);
                var paddingLeft = parseFloat(styleInfo.paddingLeft);
                var paddingRight = parseFloat(styleInfo.paddingRight);

                return width - paddingLeft - paddingRight;
            }

            function setupScrubber() {
                var body = document.body;

                var step = 0;
                var startX = 0;

                var newLeftWidth = prevWidth;
                var newRightWidth = nextWidth;

                function moveHandle(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();

                    var offsetX = evt.pageX - startX;
                    var offsetPoint = step * offsetX;

                    newLeftWidth = prevWidth + offsetPoint;
                    newLeftWidth = clamp(newLeftWidth, MIN_WIDTH_PERCENT, 100 - MIN_WIDTH_PERCENT);
                    newRightWidth = 100 - newLeftWidth;

                    updateSplitterPanels(newLeftWidth, newRightWidth);
                }

                function releaseHandle(evt) {
                    iElm[0].removeAttribute('trigger','true');
                    prevWidth = newLeftWidth;
                    nextWidth = newRightWidth;
                    
                    let containerWidth = getContainerWidth();
                    scope.onMove({leftWidth: prevWidth*containerWidth/100, rightWidth: nextWidth*containerWidth[0]/100});
                    iElm.removeClass(SCRUB_CLS);

                    body.removeEventListener('pointermove', moveHandle);
                    body.removeEventListener('pointerup', releaseHandle);

                    isDragging = false;
                }

                handleElm[0].addEventListener('pointerdown', evt => {
                    iElm[0].setAttribute('trigger','true');
                    if(iElm[0].getAttribute('isScrolling') == 'true') {
                        return;
                    }
                    var currentWidth = getContainerWidth();
                    step = Math.round((1 / currentWidth) * 1e6) / 1e4;      // 保留至少4位小数，否则像素绝对值到百分比的映射精度不够
                    startX = evt.pageX;

                    iElm.addClass(SCRUB_CLS);
                    isDragging = true;

                    body.addEventListener('pointermove', moveHandle);
                    body.addEventListener('pointerup', releaseHandle);
                });
            }

            iElm[0].addEventListener('touchstart', function (evt) {
                if (isDragging) {
                    evt.preventDefault();
                }

                evt.stopPropagation();
            }, { passive: false });

            let containerWidth = getContainerWidth();
            scope.onInit({leftWidth: prevWidth*containerWidth/100, rightWidth: nextWidth*containerWidth[0]/100});
            setupScrubber();
        }
    };
}]);

}());