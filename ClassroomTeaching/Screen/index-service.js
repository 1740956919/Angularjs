(function ()
{
'use strict';

angular.module('ClassroomTeaching.Screen.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('screenService', ['$resource','path','routeTable','$q',function ($resource,path,routeTable,$q) {
    var serviceRoot = routeTable['classroomteaching_screen'];

    //查询屏幕广播工作状态
  
    var screenStateRes = $resource(path.combine(serviceRoot, 'WorkState/:id'),{ id: '@id' },{
        getWorkState:{ method: 'GET'}
    });
    this.getWorkState = screenStateRes.getWorkState.bind(screenStateRes);

    //管理屏幕广播
    var broadcastRes = $resource(path.combine(serviceRoot, 'Broadcast/:id'),{ id:'@id' },{
        updateBroadcast:{ method: 'PUT'},
        deleteBroadcast:{ method: 'DELETE'}
    });
    this.updateBroadcast = broadcastRes.updateBroadcast.bind(broadcastRes);
    this.deleteBroadcast = broadcastRes.deleteBroadcast.bind(broadcastRes);

    //接收画面
    var receiveRes = $resource(path.combine(serviceRoot,'Receive/:id/:receptor'),{ id: "@id",receptor:"@receptor" },{
        startReceive:{ method:'PUT' },
        receiveScreen:{ method:'POST', isArray: true},
        deleteReceive:{ method:'DELETE' }
    });
    this.startReceive = receiveRes.startReceive.bind(receiveRes);
    this.receiveScreen = receiveRes.receiveScreen.bind(receiveRes);
    this.deleteReceive = receiveRes.deleteReceive.bind(receiveRes);

    //检查画面是否有数据
    var channelRes = $resource(path.combine(serviceRoot, 'Channel'),null,{
        checkScreen:{ method:'POST', isArray: true }
    });
    this.checkScreen = channelRes.checkScreen.bind(channelRes);

    //小组屏接收广播
    var groupBroadRes = $resource(path.combine(serviceRoot, 'GroupBroadcast/:id'),{ id:'@id' },{
        getBroadcast: { method: 'GET' }
    });
    this.getBroadcast = groupBroadRes.getBroadcast.bind(groupBroadRes);
    
    //小组屏接收手机投屏
    var groupProjectiongRes = $resource(path.combine(serviceRoot, 'GroupProjection/:id'),{ id:'@id'},{
        startProjection: { method: 'PUT' },
        getProjection: { method: 'GET' },
        deleteProjection: { method: 'DELETE' }
    });
    this.startProjection = groupProjectiongRes.startProjection.bind(groupProjectiongRes);
    this.getProjection = groupProjectiongRes.getProjection.bind(groupProjectiongRes);
    this.deleteProjection = groupProjectiongRes.deleteProjection.bind(groupProjectiongRes);

    //锁定设备
    var deviceLockRes = $resource(path.combine(serviceRoot, 'DeviceLockerUpdate/:id'),{ id:'@id'},{
        lockDevices: { method: 'POST' },      
    });
    this.lockDevices = deviceLockRes.lockDevices.bind(deviceLockRes);

}]);

}());