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
    runtime.setVirtualDirectory('/Images/', path.join(devRoot, '/ClassroomTeaching/Portal/.data/runtime'));
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

    // 直接上课
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonState\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code:'200'
            });
        }
    );
    // 获取当前上课状态
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/ClassroomState\/(.+)/i,
        function (urlInfo, headers, body, parts) { 
            return JsonResponse.create({
                State: "Unstart",
                HasRelatedLesson: true,
                HasRelatedTeacher: true,
                WorkBehaviorId: '',
                LessonInfo: {
                    CourseName: '课程名',
                    LessonName: '课时名',
                    TeachingClassName: '班级名',
                    Cover: ''
                },
                TeacherInfo: {
                    TeacherName: '教师名',
                    TeacherPortrait: '/Images/portrait'
                }
            });
        }
    );
    // 下课
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonState\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code:'200'
            });
        }
    );
    // 获取二维码
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/ClassroomQRCode\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                C:"v123asd",
                S:"123345345",
                P:"192.167",
                U: "asd",
                E: "rwr",
                M: 0
            });
        }
    );
    // 开始导入课程
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonImport\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                CourseName: "课程名称",
                TeachingClassName: '教学班名称',
                LessonPackagePath: '课程包路径',
                LessonName: '课时名'
            });
        }
    );
    // 执行数据导入
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonImport\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code:'200'
            });
        }
    );
    // 停止导入课程
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/LessonImport\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code:'200'
            });
        }
    );
};