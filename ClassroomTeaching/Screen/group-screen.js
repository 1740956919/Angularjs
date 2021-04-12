(function ()
{
'use strict';

angular.module('ClassroomTeaching.Screen.GroupScreen', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'LINDGE-ClassroomApp.MJpegPlayer',
    'ClassroomTeaching.Screen.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'LINDGE-ClassroomApp.LivestreamPlayer'
])

.constant('SHOW_MODEL',[
    {
        Style:'styleFull',
        Name:'',
        Count:1
    },
    {
        Style:'styleOne',
        Name:'2X2',
        Count:4
    },
    {
        Style:'styleTwo',
        Name:'3X2',
        Count:6
    },
    {
        Style:'styleThree',
        Name:'4X3',
        Count:12
    } 
])

.config(
    [
        '$sceProvider',
        function ($sceProvider) {
            $sceProvider.enabled(false);
        }
    ]
)

.controller('GroupScreenCtrl', ['$scope','screenService','queryString','SHOW_MODEL','$clientProxy','path','routeTable','$interval',
function ($scope,screenService,queryString,SHOW_MODEL,$clientProxy,path,routeTable,$interval) {
    // controller code here

    //课时标识
    var lessonId = queryString.get('lessonid');   
    //显示画面
    $scope.channels = [];

    $scope.receiveId = ''; 
    $scope.isProjection = false;
    $scope.isFullScreen = false;

    //页码
    $scope.currentIndex = 1;
    $scope.currentPage = 1;
    $scope.pageCount = 1;

    //显示模式
    $scope.showTypes = SHOW_MODEL;
    $scope.showType = $scope.showTypes[1];
    $scope.showModelData = {};
    $scope.selectedChannel = {};

    //定时器
    var checkChannel  = null;
   
    /**************************页面按钮****************************** */

    //不获取
    $scope.endReceive = function(){
        if(!$scope.isProjection){
            return;
        }
        screenService.deleteProjection({
            id: $scope.receiveId,           
        },
        null,
        result => {          
            $scope.isProjection = false;
            $scope.receiveId = '';
            $scope.channels.forEach(channel => {
                channel.HasReceiveData = false;                                         
            }); 
            clearTimeout(checkChannel);                  
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Screen.GroupScreen.Controlbar',
                param:{
                    lessonid:lessonId,               
                }
            }); 
        });             
    };

    //获取手机投屏
    $scope.receivePhoneScreens = function(){
        if($scope.isProjection){
            return;
        }
        screenService.startProjection(
        { id: lessonId },
        null,
        result => {    
            $scope.receiveId = result.ProjectionId;                  
            screenService.getProjection(
            { id: lessonId },
            null,
            result => {       
                $scope.isProjection = result.IsProjection;                            
                $scope.channels = result.ChannelInfos;  
                receiveScreen();                                     
            });         
        });        
    };

    //改变显示模式
    $scope.changShowModel = function(showModel){
        $scope.showType = showModel;
        $scope.currentIndex = 1; 
        $scope.currentPage = 1;    

        showScreens();
    };

    //切换页码
    $scope.changePage = function(derection){
        if(derection == 'previous'){
            $scope.currentIndex -= $scope.showType.Count;
            $scope.currentPage -= 1;
        }
        else if(derection == 'next'){
            $scope.currentIndex += $scope.showType.Count;
            $scope.currentPage += 1;
        }
        showScreens();
    };

    //全屏显示
    $scope.zoomScreen = function(selectedChannel){
        if(!$scope.isFullScreen){
            $scope.isFullScreen = true;
            //保存之前的显示模式
            $scope.showModelData.currentPage = $scope.currentPage;
            $scope.showModelData.showType = $scope.showType;
            $scope.showModelData.currentIndex = $scope.currentIndex;
            $scope.showType = $scope.showTypes[0];
            $scope.currentIndex = selectedChannel.Index; 
            $scope.currentPage = selectedChannel.Index;           
            showScreens();
        }
        else{          
            $scope.isFullScreen = false;
            //恢复之前的显示模式
            $scope.showType = $scope.showModelData.showType;
            $scope.currentIndex = $scope.showModelData.currentIndex;
            $scope.currentPage = $scope.showModelData.currentPage;           
            showScreens();
        }
    };

    /*************************公共方法******************************* */
  

    //接收画面
    function receiveScreen(){             
        $scope.pageCount = $scope.channels.length;       
        $scope.channels.forEach(channel => {       
            channel.Player = null;
            channel.isPlaying = false;
            channel.OnInit = function (p) {
                channel.Player = p;
            };
            channel.IsShow = false;                    
            channel.Index = $scope.channels.indexOf(channel)+1;                                    
        });  
        $clientProxy.showWindow({
            id:'ClassroomTeaching.Screen.GroupScreen.FullScreen',
            param:{
                lessonid:lessonId,               
            }
        });      
        showScreens();
        checkChannels();         
    }

    //显示画面
    function showScreens(){
        $scope.channels.forEach(channel => {
            channel.ShowType = $scope.showType;
            if(($scope.currentPage-1)*$scope.showType.Count < channel.Index && channel.Index <= $scope.currentPage*$scope.showType.Count){
                channel.IsShow = true;
            }
            else{
                channel.IsShow = false;
            }
        });
        $scope.selectedChannel = $scope.channels.find(item => item.IsShow == true);
    }

    //查询画面是否包含数据
    function checkChannels(){
        let channelIds = [];
        $scope.channels.forEach(channel => {
            if(channel.IsShow){
                channelIds.push(channel.Id);
            }
        });
   
        if(channelIds.length > 0){
            screenService.checkScreen(
            null,
            {
                ChannelIds:channelIds,
                LessonId : lessonId
            },
            result => {
                result.forEach(channelInfo => {
                    let channel = $scope.channels.find(item => item.Id == channelInfo.Id);                      
                    channel.HasReceiveData = channelInfo.HasReceiveData;
                    if(!channel.isPlaying && channel.HasReceiveData && channel.Player) {
                        channel.Player.play(channel.DataChannel);
                        channel.isPlaying = true;
                    }
                    if(channel.isPlaying && !channel.HasReceiveData  && channel.Player){
                        channel.Player.stop();
                        channel.isPlaying = false;
                    }
                    channel.DeviceName = channelInfo.DeviceName;                        
                });                                   
            })
            .$promise
            .finally(() => {
                checkChannel = setTimeout(checkChannels, 1000); 
            });            
        }
    }

    /********************************初始化*****************************/
    function init(){
        $scope.isLoading = true;
        screenService.getProjection(
        { id: lessonId },
        null,
        result => {       
            $scope.isProjection = result.IsProjection;         
            if(result.IsProjection){                        
                $scope.receiveId = result.ProjectionId;
                $scope.channels = result.ChannelInfos;  
                receiveScreen();             
            }          
        })
        .$promise
        .finally(()=>{
            $scope.isLoading = false;
        });        
    }
    init();

}]);

}());