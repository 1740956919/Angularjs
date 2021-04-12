(function () {
    'use strict';
    
    angular.module('ClassroomTeaching.Practice.Timer', [
        'ngMaterial',
        'ngResource',
        'LINDGE-Service',
        'LINDGE-Platform',

        'ClassroomTeaching.Practice.Service',
        'Figure-Config-RouteTable',
        'Client.Services.ClientProxy',
        'Client.Services.Initiation'
    ])
    
    .controller('TimerCtrl', ['$scope', 'practiceService', 'queryString', '$interval', '$clientProxy', 
    function ($scope, practiceService, queryString, $interval, $clientProxy) {
        // controller code here
        const { ipcRenderer } = require('electron');

        var interactionId = queryString.get('relationid');  
        var lessonId = queryString.get('lessonid');      
        var studentId = queryString.get('studentId');
        $scope.type = queryString.get('type');
        
        $scope.isLoading = false;
        $scope.state = 'READY';

        var leftSeconds = 3;
        var duringSeconds = 5;

        //定时器
        var timerSecond = null;
        var timerState = null;
 
        //关闭页面
        function closeTimer(){
            $clientProxy.hideWindow('ClassroomTeaching.Practice.Timer');        
        };

        function showTimer(seconds){
            let minute = Math.floor(seconds / 60) % 60;
            let second = seconds % 60;
            if(minute < 10)            {
                minute = '0' + minute;
            }
            if(second < 10) {
                second = '0' + second;
            }
            $scope.showTime = minute + ':' + second;     
        }

        //计算时间
        function clockSecond(){                    
            if($scope.state == 'READY'){
                if($scope.timer > 0){
                    $scope.timer -= 1; 
                    if($scope.type == 'RANDOM' && $scope.timer == 0){
                        $scope.state = 'PROGRESSING'; 
                    }
                }
                else{
                    $scope.state = 'PROGRESSING';                    
                } 
            }
            else{
                $scope.timer += 1;                                        
            }
            showTimer($scope.timer);         
        }
    
        //抢答状态
        function getGrabAnswerState(){                              
            practiceService.getGrabAnswer(
            { id: interactionId },
            null,
            result => {
                if(!result.IsGrabbing){
                    $scope.state = 'COMPLETE';
                    $scope.student = result.Student;
                    ipcRenderer.send('NotifyTimerOver', {
                        StudentId: $scope.student.StudentId,
                        Name: $scope.student.Name,
                        Photo: $scope.student.Photo,
                    });
                    $interval.cancel(timerSecond);
                    clearTimeout(timerState);
                    setTimeout(closeTimer, 3000);
                }     
            })
            .$promise
            .finally(() => {
                timerState = setTimeout(getGrabAnswerState, DEFAULT_SYNC_INTERVAL);
            });
        }

        //滚动头像
        function rollPortrait(){
            if($scope.timer <= duringSeconds){
                let randomId = Math.floor((Math.random() * $scope.students.length));
                $scope.student = $scope.students[randomId];
            }
            else if($scope.timer > duringSeconds){
                $scope.state = 'COMPLETE';
                $scope.student = $scope.students.find(item => item.StudentId == studentId);
                //通知随机页
                ipcRenderer.send('NotifyTimerOver', {
                    State: $scope.state
                });
                $interval.cancel(timerSecond);
                $interval.cancel(timerState);
                setTimeout(closeTimer, 3000);
            }
        }

        /**********************************初始化************************************/ 
        const  DEFAULT_SYNC_INTERVAL = 1000;
        function init() {
            if($scope.type == 'GRAB_ANSWER'){
                practiceService.getGrabAnswer(
                    { id: interactionId },
                    null,
                    result => {
                        if(result.IsGrabbing){
                            if(result.DuringSeconds > 0){
                                $scope.state = 'PROGRESSING';
                                $scope.timer = Math.floor(result.DuringSeconds/1000); 
                            }
                            else{
                                $scope.timer = Math.floor(result.LeftSeconds/1000);
                            }             
                            timerSecond = $interval(clockSecond, DEFAULT_SYNC_INTERVAL); 
                            getGrabAnswerState();                                         
                        }                      
                    }
                );
            }      
            else{
                practiceService.getAllStudents(
                { id: lessonId },
                null,
                result => {  
                    if(result.length > 0){
                        $scope.students = result;
                        $scope.timer = leftSeconds;
                        timerSecond = $interval(clockSecond, DEFAULT_SYNC_INTERVAL);
                        timerState = $interval(rollPortrait, DEFAULT_SYNC_INTERVAL / 10);    
                    }        
                });
            }           
        }
    
        init();
    }]);
    
    }());