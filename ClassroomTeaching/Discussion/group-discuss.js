(function ()
{
'use strict';

angular.module('ClassroomTeaching.Discussion.Discussion', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',

    'ClassroomTeaching.Discussion.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation'
])

.controller('DiscussCtrl', ['$scope', '$clientProxy', '$interval', 'discussionService', 'queryString', 
function ($scope, $clientProxy, $interval, discussionService, queryString) {
    // controller code here
    let lessonId = queryString.get('lessonid');
    let discussionId = queryString.get('relationid');
    $scope.discussionType = queryString.get('relationtype');
    $scope.duringSeconds = 0;
 
    var timer = null;

     //停止分组讨论
     $scope.stopDiscuss = function(){
        if($scope.isStop){
            return;
        }
        $scope.isStop = true;
        discussionService.stopDiscussion(
        { id: discussionId },
        null,
        result => {   
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: $scope.discussionType == 'BRAINSTORMING' ? 'STOP_BRAINSTORMING' : 'STOP_COOPERATION',
                content: discussionId,
                needCapture: true
            }).finally(() => {
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Discussion.Review.FullScreen',
                    param:{
                        lessonid:lessonId,     
                        relationid:discussionId,
                        relationtype: 'groupDiscuss'          
                    }
                }); 
            });
        })
        .$promise
        .finally(() => {
            $scope.isStop = false;
            $interval.cancel(timer);
        });
    };
    
    //设置计时器
    function showTimer() {
        let seconds = $scope.duringSeconds % 60;
        let minutes = Math.floor($scope.duringSeconds / 60) % 60;
        let hours = Math.floor($scope.duringSeconds / 3600);     
        if (minutes < 10) {
            minutes = '0' + minutes;
        }
        if (seconds < 10) {
            seconds = '0' + seconds;
        }

        if(0 < hours && hours < 10 ){
            $scope.timeData = '0' + hours + ':' + minutes + ':' + seconds;
        }
        else if(hours >= 10){
            $scope.timeData = hours + ':' + minutes + ':' + seconds;
        }
        else{
            $scope.timeData = minutes + ':' + seconds;
        }
        $scope.duringSeconds += 1;
    }

    /**********************************初始化************************************/
    const DEFAULT_SYNC_INTERVAL = 1000;  
   
    function init(){
        $scope.isLoading = true;
        discussionService.getMonitorGroups(
        { id: discussionId },
        null,
        result => {                
           $scope.duringSeconds = result.DuringSeconds; 
           showTimer(); 
           timer = $interval(showTimer, DEFAULT_SYNC_INTERVAL);       
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
        });     
    }

    init();

}]);
}());