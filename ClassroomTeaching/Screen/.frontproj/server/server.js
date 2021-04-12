const miniserver = require('mini-server-core');
const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;
const path = require('path');
const devRoot = path.join(process.cwd(), '../..');
const plugins = require('mini-server-plugins');
const JsonResponse = miniserver.JsonResponse;


/**
 * context { runtime, fileAccessor }
 */
module.exports = function (context) {
    const runtime = context.runtime;
    const fileAccessor = context.fileAccessor;

    // logger filtering
    runtime.logger.addFilter(/favicon/i);

    // CDN files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /CDN\/(.+)/, 'http://devfront.corp.lindge.com/CDN/{0}');
    // Framework files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Framework\/(.+)/, 'http://devfront.corp.lindge.com/Framework/{0}');
    // global clock
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Translayer\/Figure\.Config\/ServerTime\/global_init_time/,
        'http://devfront.corp.lindge.com/Translayer/Figure.Config/ServerTime/global_init_time');
    // system config
    runtime.registerProxyHandler(HTTP_METHODS.GET, /\/SystemConfig\.js/i, 'http://devfront.corp.lindge.com/dev/resource/SystemConfig.js');

    //加载图片
    //runtime.setVirtualDirectory('/Static/', path.join(devRoot, 'ClassroomTeaching/Screen/.data/runtime/static/'));


     plugins.load('lindge-public-include')
     .setSearchRoot(devRoot)
     .active(runtime);

     plugins.load('lindge-route-table')
         .loadDefaultRoute()
         .setRoute({
             'classroomteaching_screen': '/Translayer/ClassroomTeaching.Screen/api/',           
         })
         .active(runtime);
 
 
     //模拟平台行为服务，支持增量/非增量模式行为数据的查询、写入
     var behaviorService = plugins.load('lindge-behavior')
     .setStorageRoot(fileAccessor.getPath('behavior'))
     .active(runtime);

    // other configuration goes here

    //查询屏幕广播状态
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/WorkState\b/i,
        function(urlInfo, headers, body, parts){
            var groupScreens = fileAccessor.readJSON('groupScreens.json');
            return JsonResponse.create({             
                IsBroadcast: true,
                BroadcastId:'broadcastId001',
                GroupScreens:groupScreens,
                IsMonitor: false,
                MonitorId:'',
                IsProjection: false,
                ProjectionId:''              
            });
        }
    );

    //更新屏幕广播
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Broadcast\/(.+)/i,
        function(urlInfo, headers, body, parts){           
            return JsonResponse.create({                             
                BroadcastId:'broadcastId001',                          
            });
        }
    );

    //结束屏幕广播
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Broadcast\b/i,
        function(urlInfo, headers, body, parts){
            return{             
                code: HTTP_STATUS_CODE.success                
            };
        }
    );

    //开始接收画面
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Receive\/(.+)\/(.+)\b/i,
        function(urlInfo, headers, body, parts){
            var receptionId = '';
            if(parts[1] == 'GROUP_SCREEN')
            {
                receptionId = 'monitorId001';
            }
            else if(parts[1] =='PHONE_SCREEN')
            {
                receptionId = 'projectionId001';
            }
            
            return JsonResponse.create({
                ReceptionId: receptionId
            });
        }
    );

    //获取画面
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Receive\b/i,
        function(urlInfo, headers, body, parts){
            var channels;
            if(body.ScreenType =='GROUP_SCREEN')
            {
                channels = fileAccessor.readJSON('monitorScreen.json'); 
            }
            else if(body.ScreenType =='PHONE_SCREEN')
            {
                channels = fileAccessor.readJSON('projectionScreen.json'); 
            }
            
            return JsonResponse.create(channels,{
                waiting: 1000
            });
        }
    );

    //结束接收画面
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Receive\/(.+)/i,
        function(urlInfo, headers, body, parts){
            return{             
                code: HTTP_STATUS_CODE.success   
            };
        }
    );

    //检查画面是否包含数据
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/Channel\b/i,
        function(urlInfo, headers, body, parts){
            var channelInfos = fileAccessor.readJSON('channelinfo.json');           
            return JsonResponse.create(channelInfos,{
                waiting: 500
            });
        }
    );

    //小组屏接收广播
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/GroupBroadcast\b/i,
        function(urlInfo, headers, body, parts){           
            return JsonResponse.create({
                IsShow:true,
                DataChannel:'DataChannel'
            });
        }
    );

     //小组屏开始接收手机投屏
     runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/GroupProjection\b/i,
        function(urlInfo, headers, body, parts){          
            return JsonResponse.create({            
                ProjectionId:'projectionId001'
            });
        }
    );

     //小组屏获取手机投屏
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/GroupProjection\b/i,
        function(urlInfo, headers, body, parts){   
            var channels = fileAccessor.readJSON('projectionScreen.json');                  
            return JsonResponse.create({   
                IsProjection: true,         
                ProjectionId:'projectionId001',
                ChannelInfos:channels
            });
        }
    );

     //小组屏结束接收手机投屏
     runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Screen\/api\/GroupProjection\b/i,
        function(urlInfo, headers, body, parts){          
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

};