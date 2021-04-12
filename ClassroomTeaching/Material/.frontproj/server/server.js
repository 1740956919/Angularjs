const path = require('path');

const miniserver = require('mini-server-core');
const plugins = require('mini-server-plugins');

const JsonResponse = miniserver.JsonResponse;

const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;

const devRoot = path.join(process.cwd(), '../..');

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
    runtime.setVirtualDirectory('/Images/', path.join(devRoot, '/ClassroomTeaching/Material/.data/runtime'));
    // other configuration goes here
    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);

    plugins.load('lindge-casualstream')
    .setStorageRoot(fileAccessor.getPath('upload'))
    .active(runtime);

    plugins.load('lindge-route-table')
    .loadDefaultRoute()
    .setRoute({
        'classroomteaching_interaction': '/Translayer/ClassroomTeaching.Interaction/api/'
    })
    .active(runtime);

    // 获取课程资料
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/MaterialDisplay\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                HasMaterials: true,
                LessonId:"as2da3s4d1",
                LessonName: 'Unit1',
                Materials: [{
                    Id: '01',
                    Name: '视频1',
                    Type: 'MEDIA',
                    CreateTime: new Date(),
                    ModifyTime: new Date(),
                    IsOpened: true
                },{
                    Id: '02',
                    Name: '课文1',
                    Type: 'ARTICLE',
                    CreateTime: new Date(),
                    ModifyTime: new Date(),
                    IsOpened: false
                },{
                    Id: '03',
                    Name: '图片1',
                    Type: 'pdf',
                    CreateTime: new Date(),
                    ModifyTime: new Date(),
                    IsOpened: false
                }],
                OpenedLocalFiles: [],
                IsProcessing: true
            });
        }
    );
    // 下发课程资料
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonMaterial\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
    // 浏览课程资料
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonMaterial\/(.+)\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                BehaviorId: '2asdasd00'
            });
        }
    );
    // 下发本地资料
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LocalMaterial\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );

    // 设置cookie
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/CookieSet\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
};