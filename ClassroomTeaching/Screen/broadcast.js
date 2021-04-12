(function ()
{
'use strict';

angular.module('ClassroomTeaching.Screen.Broadcast', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'Figure-Config-RouteTable',

    'LINDGE-ClassroomApp.MJpegPlayer',
    'ClassroomTeaching.Screen.Service' 
])

.controller('MainCtrl', ['$scope','screenService','queryString','path','routeTable',
function ($scope,screenService,queryString,path,routeTable) {
    // controller code here   
    //场景标识
    var lessonId = queryString.get('lessonid');
    var channelId = queryString.get('channelid');

    //用于接收广播的通道
    $scope.DataUrl = '';
    //$scope.AliveUrl = path.combine(routeTable['classroomteaching_screen'],`ChannelAlive/${channelId}`);    
  
    /********************************初始化*****************************/
    function init(){
        $scope.isLoading = true;
        let channelIds = [];
        channelIds.push(channelId);
        screenService.checkScreen(
        null,
        {
            ChannelIds : channelIds,
            LessonId : lessonId
        },
        result => {        
            if(result.length > 0){
                $scope.DataUrl = result[0].DataChannel;
            }                                 
        },
        err => {         
        })
        .$promise
        .finally(()=>{        
            $scope.isLoading = false;       
        });   
    }

    init();

}]);

}());