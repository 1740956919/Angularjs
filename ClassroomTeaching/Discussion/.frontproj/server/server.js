const miniserver = require('mini-server-core');

const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;

//设置项目目录
const path = require('path');
const devRoot = path.join(process.cwd(), '../..');
//加载插件模块，提供插件管理和加载运行时的能力
const plugins = require('mini-server-plugins');
//提供JSON数据结构编码
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

    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);

    plugins.load('lindge-route-table')
        .loadDefaultRoute()
        .setRoute({
            'classroomteaching_discussion': '/Translayer/ClassroomTeaching.Discussion/api/',           
        })
        .active(runtime);


    //该扩展用于程序化模拟figure.config服务下加载系统配置的请求
    plugins.load('lindge-figureconfig')
    .addConfigSection('DiscussType', fileAccessor.getPath('config/DiscussType.json'), true) 
    .active(runtime);

    //模拟平台行为服务，支持增量/非增量模式行为数据的查询、写入
    var behaviorService = plugins.load('lindge-behavior')
    .setStorageRoot(fileAccessor.getPath('behavior'))
    .active(runtime);

   // other configuration goes here
    //获取分组讨论状态
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Lifecycle\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                State: 'UNSTART',
                GroupCount: 8,
                DiscussionId: 'BHS_12345678'
            });
        }
    );

    //开始分组讨论
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Lifecycle\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({             
                DiscussionId:'BHS_12345678'
            });
        }
    );

    //停止分组讨论
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Lifecycle\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

    //结束分组讨论
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Lifecycle\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

    //获取小组的监控情况
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Monitor\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var groups = fileAccessor.readJSON('groups.json');
            return JsonResponse.create({
                DuringSeconds: 30,
                Groups: groups              
            });
        }
    );

    //评审小组讨论结果
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Review\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var groups = fileAccessor.readJSON('groupDiscussResults.json');
            return JsonResponse.create({
                IsExistMutualEvaluative: false,
                GroupDiscussResults: groups                
            });
        }
    );
};