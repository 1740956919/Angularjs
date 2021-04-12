(function (){
    'use strict';
    
    angular.module('ClassroomTeaching.Students.Score', [
        'ngResource',
        'LINDGE-Service',
        'LINDGE-UI-Core',
        
        'ClassroomTeaching.Students.Service',
        'Figure-Config-RouteTable',
        'Client.Services.ClientProxy',
        'Client.Services.Initiation',
        'Figure-Config-ConfigSection',
        'LINDGE-Toast'
    ])
    
.controller('MailCtrl', ['$scope','studentManageService', 'queryString', '$clientProxy', 'ScoreTypes', '$lindgeToast',
function ($scope, studentManageService, queryString, $clientProxy, ScoreTypes, $lindgeToast) {
    var lessonId = queryString.get('lessonid');
    var behaviorId = queryString.get('behaviorId');
    var studentName = queryString.get('studentname', true);
    $scope.scoreTypes = ScoreTypes;    

    $scope.performanceScore = function(code, evaluation){
        if(!$scope.isPerformanceScore){
            $scope.isPerformanceScore = true;
            studentManageService.completeScore({
                id: behaviorId
            },{
                Code: code,
                Evaluation: evaluation
            }, result => {
                let typeName = $scope.scoreTypes.find(s => s.Code == code).Name;
                CompletePerformanceScore(`${studentName}获得${typeName}点${evaluation == 'PRAISE' ? '赞' : '踩'}`, evaluation);
                $clientProxy.addRecord({
                    lessonId: lessonId,
                    action: 'SET_PERFORMANCE',
                    content: behaviorId,
                    needCapture: true
                });
            }, err => {
                CompletePerformanceScore('评价失败', 'ERROR');
            })
            .$promise
            .finally(() => {
                $scope.isPerformanceScore = false;
            });
        }
    };

    $scope.close = function(){
        $clientProxy.hideWindow('ClassroomTeaching.Students.Score');
    };
    
    function CompletePerformanceScore(message, type){
        $clientProxy.hideWindow('ClassroomTeaching.Students.Score');
        let tosatType = '';
        let icon = '';
        switch (type.toUpperCase()) {
            case 'PRAISE':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.SUCCESS;
                icon = 'lic-thumb-up-alt'; break;
            case 'TRAMPLE':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.ERROR;
                icon = 'lic-thumb-up-alt mirror-y'; break;
            case 'ERROR':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.ERROR;
                icon = 'lic-remove-circle-fill'; break;
        }
        $lindgeToast.notify(tosatType,{
            header: '评价',
            body: message,
            icon: icon,
            timeout: 4000
        });
    }
}]);

}());