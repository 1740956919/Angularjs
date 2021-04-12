(function ()
{
'use strict';

angular.module('ClassroomTeaching.Practice.GrabAnswer', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    
    'ClassroomTeaching.Practice.Service',
    'Figure-Config-RouteTable',  
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'LINDGE-ClassroomApp.MutualScoreView',
    'LINDGE-Toast',
    'ClassroomTeaching.ErrorService'
 
])

.controller('GrabAnswerCtrl', ['$scope', '$luiHref', 'practiceService', 'studentManageService', 'queryString', '$log', '$clientProxy', 'errorService', '$filter',
function ($scope, $luiHref, practiceService, studentManageService, queryString, $log, $clientProxy, errorService, $filter) {
    // controller code here
    const { ipcRenderer } = require('electron');

    var platformImage =  $filter('platformImage');
    var lessonId = queryString.get('lessonid');
    var grabAnswerId = queryString.get('relationid');
    
    $scope.isLoading = false;
    $scope.isGrabbing = false;
    //是否存在互评
    $scope.isExistMutualEvaluative = false;
    //抢答成功的学生
    $scope.student = {};

    /*********************************功能按钮********************************/
    //停止抢答
    $scope.stopGarbAnswer = function(){
        if($scope.isEnd == true){
            return;
        }
        $scope.isEnd = true;
        practiceService.deleteGrabAnswer(
        { id: grabAnswerId, receptor: lessonId},
        null,
        result => {
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'STOP_GRAB_ANSWER',
                content: grabAnswerId,
                needCapture: true
            })   
            .finally(() => {
                $luiHref.goto('index.html', { lessonid: lessonId });
            }); 
            if($scope.isGrabbing){
                $clientProxy.hideWindow('ClassroomTeaching.Practice.Timer');        
            }
        },
        err => {         
            $log.error('结束抢答失败', err); 
        })
        .$promise
        .finally(() => {  
            $scope.isEnd = false;        
        });       
    };
    
    //评价
    $scope.appraiseStudent = function(){
        studentManageService.startScore(
            { id: lessonId },
            { 
                TargetIds: [$scope.student.StudentId],
                TargetType: 'SINGLE_USER'
            },
            result => {
                $clientProxy.showWindow({
                    id: 'ClassroomTeaching.Students.Score', 
                    param: {
                        lessonid: lessonId,
                        behaviorid: result.BehaviorId,
                        studentname: $scope.student.Name,
                    }
                });
            }
        );     
    };

    //互评
    $scope.startMutualScore = function($state){
        $scope.isExistMutualEvaluative = true;
        if ($state.isNewSession) {
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'START_MUTUAL_EVALUATE',
                content: $state.sessionId,
                needCapture: true
            });   
        }
    };

    //结束互评
    $scope.stopMutualScore = function($state){
        $scope.isExistMutualEvaluative = false;
        $clientProxy.addRecord({
            lessonId: lessonId,
            action: 'STOP_MUTUAL_EVALUATE',
            content: $state.sessionId,
            needCapture: true
        });
    };

    //互评错误信息
    $scope.showErrorMessage = function($error){
        errorService.showErrorMessage($error.detail);
    };
     
    //订阅事件
    ipcRenderer.on('NotifyTimerOver', (evt, data) => {
        $scope.isGrabbing = false;
        $scope.student.StudentId = data.StudentId;
        $scope.student.Name = data.Name;
        $scope.student.Photo = data.Photo;

        $scope.scoredTarget = {
            ScoredId: data.StudentId,
            TargetType: 'SINGLE_USER',
            Image: platformImage( $scope.student.Photo, 'avatar.small'),
            Name: data.Name
        };           
    });

    /*****************************初始化******************************** */
    const DEFAULT_SYNC_INTERVAL = 1000;  
    function init(){
        $scope.isLoading = true;
        practiceService.getGrabAnswer(
        { id: grabAnswerId },
        null,
        result => {                
            $scope.isGrabbing = result.IsGrabbing;            
            if($scope.isGrabbing){              
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Practice.Timer',
                    param:{
                        relationid: grabAnswerId,                       
                        type:'GRAB_ANSWER'
                    }
                });          
            }
            else{
                $scope.isExistMutualEvaluative = result.IsExistMutualEvaluative; 
                $scope.student = result.Student; 
                $scope.scoredTarget = {
                    ScoredId: $scope.student.StudentId,
                    TargetType: 'SINGLE_USER',
                    Image: platformImage( $scope.student.Photo, 'avatar.small'),
                    Name: $scope.student.Name
                };                                                            
            }
        },
        err => {
            $log.error('查询抢答信息失败', err); 
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
        });     
    }

    init();

}]);
}());