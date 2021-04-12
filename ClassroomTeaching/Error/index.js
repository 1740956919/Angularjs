(function ()
{
'use strict';

const { ipcRenderer } = require('electron');

angular.module('ClassroomTeaching.Error', [
])

.controller('MainCtrl', ['$scope', function ($scope) {
    // controller code here
    $scope.retry = function () {
        ipcRenderer.send('Authorize');
    };
}]);

}());