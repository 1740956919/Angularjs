(function ()
{
'use strict';

angular.module('ClassroomTeaching.Practice.Random', [
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

.controller('RandomCtrl', ['$scope', '$luiHref',  'practiceService', 'studentManageService', 'queryString', '$log', 'localStorageService', '$clientProxy', 'errorService','$filter',
    function ($scope, $luiHref, practiceService, studentManageService, queryString, $log, localStorage, $clientProxy, errorService, $filter) {
    // controller code here
    const { ipcRenderer } = require('electron');

    var platformImage =  $filter('platformImage');
    var lessonId = queryString.get('lessonid');
    var randomId = queryString.get('relationid');

    $scope.isLoading = false;
    //是否存在互评
    $scope.isExistMutualEvaluative = false;
    //随机状态
    $scope.isRandomCpmplete = false;
    $scope.student = {};


    /*********************************功能按钮********************************/
    //停止随机互动
    $scope.stopRandom = function(){
        if($scope.isEnd == true){
            return;
        }

        $scope.isEnd = true;
        practiceService.deleteRandomCandidate(
        { id: randomId ,receptor:lessonId },
        null,
        result => {
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'STOP_RANDOM_ROLL_CALL',
                content: randomId,
                needCapture: true
            })  
            .finally(() => {
                $luiHref.goto('index.html', { 
                    lessonid: lessonId                       
                });
            });
            if(!$scope.isRandomCpmplete){
                $clientProxy.hideWindow('ClassroomTeaching.Practice.Timer');        
            }     
        },
        err => {          
            $log.error('结束随机失败', err);
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
       if(data.State == 'COMPLETE'){
            $scope.isRandomCpmplete = true;
            localStorage.set(randomId, $scope.isRandomCpmplete);   
       }
    });

    /**********************************初始化************************************/
    function init() {
        $scope.isLoading = true;   
        practiceService.getRandomCandidate(
        { id: randomId },
        null,
        result => {          
            $scope.student = result.Student;  
            $scope.isExistMutualEvaluative = result.IsExistMutualEvaluative;
            $scope.scoredTarget = {
                ScoredId: result.Student.StudentId,
                TargetType: 'SINGLE_USER',
                Image: platformImage(result.Student.Photo, 'avatar.small'),
                Name: result.Student.Name
            };                
             
            let state = localStorage.get(randomId);
            $scope.isRandomCpmplete = JSON.parse(state);
            if(!$scope.isRandomCpmplete){
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Practice.Timer',
                    param:{
                        relationid: randomId,                       
                        studentId: $scope.student.StudentId,
                        type: 'RANDOM'
                    }
                });  
            }                              
        },
        err => {          
            errorService.showErrorMessage(err);    
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    }

    init();

}]);

}());