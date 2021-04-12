(function ()
{
'use strict';

angular.module('ClassroomTeaching.Screen.TeacherScreen', [
    'ngMaterial',
    'ngResource',   
    'LINDGE-Service',
    'LINDGE-Platform',
    'LINDGE-ClassroomApp.MJpegPlayer',
    'ClassroomTeaching.Screen.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'ClassroomTeaching.Control.ToolbarButton',
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

.controller('MainCtrl', ['$scope', 'screenService', 'queryString', 'SHOW_MODEL', '$clientProxy', '$interval', 'path', 'routeTable',
function ($scope, screenService, queryString, SHOW_MODEL, $clientProxy, $interval, path, routeTable) {
    // controller code here

   
    //课时标识
    var lessonId = queryString.get('lessonid');
    //小组屏
    $scope.groupScreens = [];
    //显示画面
    $scope.channels = [];
   
    $scope.receiveId = '';
    $scope.isBroadcast = false;
    $scope.broadcastId = '';
    $scope.isLoading = false;
    $scope.isMonitor = false;
    $scope.isProjection = false;
    $scope.isFullScreen = false;
    $scope.currentIndex = 1;
    $scope.currentPage = 1;
    $scope.pageCount = 1;

    //显示模式
    $scope.showTypes = SHOW_MODEL;
    $scope.showType = $scope.showTypes[1];
    $scope.screenType = '';
    $scope.showModelData = {};
    $scope.selectedChannel = {};

    //定时器
    var checkChannel  = null;
    $scope.channelIds = [];
   
    /**************************页面按钮****************************** */

    //不投屏
    $scope.endBrodcast = function(){
        if(!$scope.isBroadcast){
            return;
        }

        screenService.deleteBroadcast({
            id:$scope.broadcastId 
        },
        null,
        result => {
            $scope.isBroadcast = false;
            $scope.broadcastId = '';
            $scope.groupScreens.forEach(item => {
                item.IsRecevice = false;
            });
        },
        err => {
            //结束广播失败       
        })
        .$promise
        .finally(() => {
        });      
    };

    //向所有小组广播
    $scope.broadcastAll = function(){
        let isBroadcastAll =  $scope.isBroadcastAll();
        if(isBroadcastAll)
        {
            return;
        }
        let deviceIds = [];
        $scope.groupScreens.forEach(groupScreen => {                     
            deviceIds.push(groupScreen.DeviceId);                    
        });

        screenService.updateBroadcast({
            id: lessonId
        },
        {
            IsBroadcastALL: true,
            DeviceIds: deviceIds
        },
        result => {
            $scope.isBroadcast = true;
            $scope.broadcastId = result.BroadcastId;
            $scope.groupScreens.forEach(item => {
                item.IsRecevice = true;
            });

            //广播时锁定监控设备
            if($scope.screenType == 'GROUP_SCREEN'){
                lockDevice(); 
            }
        },
        err => {         
        })
        .$promise
        .finally(() => {
        });        
    };

    //向单个小组广播
    $scope.broadcast = function(groupScreen){
        $scope.isOpreate = false;
        if($scope.isOpreate){
            return;
        }

        if(groupScreen.IsRecevice){
            groupScreen.IsRecevice = false;
        }
        else{
            groupScreen.IsRecevice = true;
        }
        
        let deviceIds = [];
        $scope.groupScreens.forEach(groupScreen => {          
            if(groupScreen.IsRecevice){
                 deviceIds.push(groupScreen.DeviceId);
            }             
        });

        $scope.isOpreate = true;
        if(deviceIds.length> 0)
        {            
            screenService.updateBroadcast({
                id: lessonId
            },
            {
                IsBroadcastALL: false,
                DeviceIds: deviceIds
            },
            result => {
                $scope.isBroadcast = true;
                $scope.broadcastId = result.BroadcastId;
                if($scope.screenType == 'GROUP_SCREEN'){
                    lockDevice(); 
                }
            },
            err => {
                groupScreen.IsRecevice = !groupScreen.IsRecevice;
            })
            .$promise
            .finally(() => {
                $scope.isOpreate = false;
            });   
        }  
        else
        {
            screenService.deleteBroadcast({
                id:$scope.broadcastId 
            },
            null,
            result => {
                $scope.isBroadcast = false;
                $scope.broadcastId = '';                
            },
            err => {               
                groupScreen.IsRecevice = !groupScreen.IsRecevice; 
            })
            .$promise
            .finally(() => {
                $scope.isOpreate = false;
            });      
        }
    };

    //不获取
    $scope.endReceive = function(){
        let screenType = '';
        if(!$scope.isMonitor && !$scope.isProjection){
            return;
        }
      
        //先解锁屏幕
        if($scope.isMonitor){
            screenType = 'GROUP_SCREEN';
            let deviceIds = [];          
            screenService.lockDevices(
            {id:$scope.receiveId},
            {
                DeviceIds:deviceIds               
            });           
        }
        else{
            screenType = 'PHONE_SCREEN';
        }
     
        
        //关闭定时器，缩小页面           
        clearTimeout(checkChannel);

        screenService.deleteReceive({
            id: $scope.receiveId,
            receptor:screenType
        },
        null,
        result => {                     
            $scope.channels.forEach(channel => {
                channel.IsShow = false;
               if(channel.IsPlaying && channel.Player){
                    channel.Player.stop();
                    channel.IsPlaying = false;
                }                                     
            });                       
            $scope.isMonitor = false;
            $scope.isProjection = false;
            $scope.receiveId = '';
            $scope.screenType = '';           
        });  

        $clientProxy.showWindow({
            id:'ClassroomTeaching.Screen.TeacherScreen.Controlbar',
            param:{
                lessonid:lessonId,               
            }
        }); 
    };

    //获取小组屏
    $scope.receiveGroupScreens = function(){
        if($scope.isMonitor){
            return;
        }     

        if($scope.isProjection){
            if(!$scope.isLoading){
                $scope.isLoading = true;
                clearTimeout(checkChannel);
                screenService.deleteReceive({
                    id: $scope.receiveId,
                    receptor: $scope.screenType
                },
                result => {                     
                    $scope.channels.forEach(channel => {
                        channel.DataChannel == null;
                        channel.IsShow = false;
                       if(channel.IsPlaying && channel.Player){
                            channel.Player.stop();
                            channel.IsPlaying = false;
                        }                                     
                    });                       
                    $scope.receiveId = '';
                    $scope.isLoading = false;
                    startReceiveGroupScreen();        
                }).$promise
                .finally(() => {
                    $scope.isLoading = false;
                });  
            }
        } else{
            startReceiveGroupScreen();
        }
    };

    function startReceiveGroupScreen(){
        if(!$scope.isLoading){
            $scope.isLoading = true;
            $scope.screenType = 'GROUP_SCREEN';  
            screenService.startReceive({
                id: lessonId,
                receptor: $scope.screenType
            },
            null,
            result => {
                $scope.isMonitor = true;
                $scope.isProjection = false;
                $scope.isFullScreen = false;
                $scope.showType = $scope.showTypes[1];
                $scope.currentPage = 1;
                $scope.currentIndex = 1;
                //接收画面
                receiveScreen(result.ReceptionId,$scope.screenType);
            }).$promise
            .finally(() => {
                $scope.isLoading = false;
            }); 
        }
    }
    //获取手机投屏
    $scope.receivePhoneScreens = function(){
        if($scope.isProjection){
            return;
        }
        if($scope.isMonitor){
            if(!$scope.isLoading){
                $scope.isLoading = true;
                screenService.deleteReceive({
                    id: $scope.receiveId,
                    receptor: $scope.screenType
                },
                result => {             
                    $scope.receiveId = '';     
                    $scope.isLoading = false;  
                    startReceivePhoneScreen();
                }).$promise
                .finally(() => {
                    $scope.isLoading = false;
                });  
            }
        } else{
            startReceivePhoneScreen();
        } 
    };

    function startReceivePhoneScreen(){  
        if(!$scope.isLoading){
            $scope.isLoading = true;
            $scope.screenType = 'PHONE_SCREEN';
            screenService.startReceive({
                id: lessonId,
                receptor: $scope.screenType
            },
            result => {         
                $scope.isProjection = true;
                $scope.isMonitor = false;
                $scope.isFullScreen = false;
                $scope.showType = $scope.showTypes[1];
                $scope.currentPage = 1;
                $scope.currentIndex = 1;
                //接收画面
                receiveScreen(result.ReceptionId, $scope.screenType);
            }).$promise
            .finally(() => {
                $scope.isLoading = false;
            }); 
        }
    }

    //改变显示模式
    $scope.changShowModel = function(showModel)
    {
        $scope.showType = showModel;
        $scope.currentIndex = 1; 
        $scope.currentPage = 1;    

        showScreens();
    };

    //切换页码
    $scope.changePage = function(derection)
    {
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
        if(!$scope.isFullScreen)
        {
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
        else
        {          
            $scope.isFullScreen = false;
            //恢复之前的显示模式
            $scope.showType = $scope.showModelData.showType;
            $scope.currentIndex = $scope.showModelData.currentIndex;
            $scope.currentPage = $scope.showModelData.currentPage;
           
            showScreens();
        }
    };

    /*************************公共方法******************************* */
    //是否所有小组屏都在接收广播
    $scope.isBroadcastAll = function(){     
        return $scope.groupScreens.every(item => item.IsRecevice);
    };

    //接收画面
    function receiveScreen(receiveId, screenType) {
        $clientProxy.showWindow({
            id: 'ClassroomTeaching.Screen.TeacherScreen.FullScreen',
            param: {
                lessonid: lessonId,
            }
        });         

        screenService.receiveScreen(null,{
            LessonId: lessonId,
            ReceiveId: receiveId,
            ScreenType: screenType
        },
        result => {
            $scope.receiveId = receiveId;
            $scope.pageCount = result.length == 0 ? 1 : result.length;
            $scope.channels = result;
            $scope.channels.forEach(channel => {
                channel.Type = screenType;
                channel.IsShow = false;
                channel.Index = result.indexOf(channel) + 1;
                if ($scope.screenType == 'PHONE_SCREEN') {
                    channel.Player = null;
                    channel.IsPlaying = false;
                    channel.OnInit = function (p) {
                        channel.Player = p;
                    };
                }
            });
            showScreens();
            if ($scope.screenType == 'PHONE_SCREEN') {
                checkChannels();
            }
        });                
    }

    //显示画面
    function showScreens(){
        $scope.channels.forEach(channel => {
            channel.ShowType = $scope.showType;
            if(($scope.currentPage - 1) * $scope.showType.Count < channel.Index && channel.Index <= $scope.currentPage * $scope.showType.Count){
                channel.IsShow = true;
            }
            else{
                channel.IsShow = false;
            }
        });
        $scope.selectedChannel = $scope.channels.find(item => item.IsShow == true);

        //广播时锁定监控设备
        if($scope.isBroadcast && $scope.screenType == 'GROUP_SCREEN'){
            lockDevice();  
        }
    }

    //查询画面是否包含数据
    function checkChannels(){
       if($scope.screenType == 'PHONE_SCREEN'){
            //当前页面通道的标识
            let channelIds = [];
            $scope.channels.forEach(channel => {
                if(channel.IsShow) {
                    channelIds.push(channel.Id);      
                }               
            });    
            if(channelIds.length > 0)
            {
                screenService.checkScreen(
                null,
                {
                    ChannelIds:channelIds,
                    LessonId:lessonId
                },
                result => {
                    result.forEach(channelInfo => {
                        let channel = $scope.channels.find(item => item.Id == channelInfo.Id);                      
                        channel.HasReceiveData = channelInfo.HasReceiveData;
                        if(!channel.IsPlaying && channel.HasReceiveData && channel.Player) {
                            channel.Player.play(channel.DataChannel, { lastFrame: channel.TotalFrameCount });
                            channel.IsPlaying = true;
                        } 
                        if(channel.IsPlaying && !channel.HasReceiveData && channel.Player){
                            channel.Player.stop();
                            channel.IsPlaying = false;
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
    }

    //广播时锁定监控设备
    function lockDevice(){
        let deviceIds = [];
        $scope.channels.forEach(channel => {
            if(channel.IsShow){
                deviceIds.push(channel.Id);
            }                           
        }); 
        screenService.lockDevices(
        {id:$scope.receiveId},
        {
            DeviceIds:deviceIds               
        },
        result => {                                                
        },
        err => {         
        })
        .$promise
        .finally(()=>{               
        });            

    }

    /********************************初始化*****************************/
    function init(){
        $scope.isLoading = true;
        screenService.getWorkState(
        { id: lessonId },
        result => {
            $scope.isBroadcast = result.IsBroadcast;
            $scope.broadcastId = result.BroadcastId;
            $scope.isMonitor = result.IsMonitor;
            $scope.isProjection = result.IsProjection;
            $scope.groupScreens = result.GroupScreens;
            $scope.groupScreens.sort((a, b) => { 
                var name1 = a.DeviceName.toLowerCase();
                var name2 = b.DeviceName.toLowerCase();

                if (!isNaN(parseInt(name1)) && !isNaN(parseInt(name2))) {
                    name1 = parseInt(name1);
                    name2 = parseInt(name2);
                }

                if (name1 < name2) {
                    return -1;
                } else if (name1 > name2) {
                    return 1;
                } else {
                    return 0;
                }   
            });

            if(result.IsMonitor || result.IsProjection){        
                if(result.IsMonitor){
                    $scope.receiveId = result.MonitorId;
                    $scope.screenType = 'GROUP_SCREEN';
                }
                else if(result.IsProjection){
                    $scope.receiveId = result.ProjectionId;
                    $scope.screenType = 'PHONE_SCREEN';
                }

                receiveScreen($scope.receiveId, $scope.screenType);
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