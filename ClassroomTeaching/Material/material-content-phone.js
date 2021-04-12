(function () {
    'use strict';

angular.module('ClassroomTeaching.MaterialContent', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'LINDGE-UI-Standard',
    'LINDGE-Platform',
    'LINDGE-WebMedia',
    'LINDGE.CW',
    'ClassroomTeaching.Material.Service',

    'Figure-Config-RouteTable',
])

.config(['$runtimeContextProvider', function ($runtimeContextProvider) {
    $runtimeContextProvider.setDefaultServices();
}])

.controller('MaterialContentCtrl', ['$scope', 'queryString','$runtimeContext', 'materialManageService',
    function ($scope, queryString, $runtimeContext, materialManageService) {
        $scope.requestFail = false;
        var token = queryString.get('token');
        var resourceId = queryString.get('resourceid');
        //音频播放组件
        var audioPlayerHandle = null;
        $scope.showAudioPlayer = false;
    
        $scope.onAudioPlayerInit = function (player) {
            audioPlayerHandle = player;
    
            $runtimeContext.getService('audioService')
                .useExternalService(audioPlayerHandle);
    
            audioPlayerHandle.audio.addEventListener('playing', evt => {
                $scope.showAudioPlayer = true;
                $scope.$evalAsync(angular.noop);
            });
        };

        window.addEventListener('beforeunload', function () {
            audioPlayerHandle.terminatePlayback();
        });

        function init() {
            materialManageService.setCookie(
                { id: token },
                result => {
                    materialManageService.previewMaterial({
                        id: resourceId
                       }, result => {
                        $scope.isLoadingMaterial = false;
                        $scope.viewBehaviorId  = result.BehaviorId;
                       });
                }, err => {
                    $scope.requestFail = true;
                });
        }
        
        init();
    }
]);
}());