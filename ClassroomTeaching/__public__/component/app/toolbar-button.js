(function ()
{

'use strict';

angular.module('ClassroomTeaching.Control.ToolbarButton', [])

.directive('toolbarButton', [function () {
    return {
        priority: 1,
        scope: false,
        restrict: 'C',
        replace: false,
        link: function(scope, iElm, iAttrs) {
            if (iElm.hasClass('square') && angular.isDefined(iAttrs.buttonText)) {
                var unWatch = scope.$watch(iAttrs.buttonText, newValue => {
                    var text;
                    if (newValue !== null && newValue !== undefined) {
                        var text = String(newValue);
                        if (text.length > 6) {
                            text = text.substr(0, 6);
                        } else if (text.length == 4) {
                            text = `${text.substr(0, 2)}\n${text.substr(2, 2)}`;
                        }
                    } else {
                        text = '';
                    }

                    iElm[0].innerText = text;
                });

                iElm.on('$destroy', () => {
                    unWatch();
                });
            }
        }
    };
}]);

}());