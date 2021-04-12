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
    runtime.setVirtualDirectory('/Static/', path.join(devRoot, '/ClassroomTeaching/Students/.data/runtime'));
    runtime.setVirtualDirectory('/Images/', path.join(devRoot, '/ClassroomTeaching/Students/.data/runtime'));
    // other configuration goes here
    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);

    plugins.load('lindge-route-table')
    .loadDefaultRoute()
    .setRoute({
        'classroomteaching_interaction': '/Translayer/ClassroomTeaching.Interaction/api/'
    })
    .active(runtime);

    plugins.load('lindge-figureconfig-angular')
    .addConfigSection('ScoreTypes',
    [{
        "Name": "课堂纪律",
        "Code": "Discipline"
    }, {
        "Name": "学习成果",
        "Code": "Outcome"
    }, {
        "Name": "积极性",
        "Code": "Motivation "
    }])
    .active(runtime);

    require('./mutual-score')(context);

    // 查询教学班信息
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/StudentOversee\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create(
            {
                IsOnClass: true,
                LessonMoment: 
                {
                    TeachingClassName: '教学班01',
                    LessonId: 'asdasd',
                    NameListId: 'asdasdasd',
                    IsMutualScoring: false,
                    SignInfo: {
                        IsSigning: false
                    }
                }
            });
        }
    );
    // 查询学生信息
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/StudentQuery\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var students = fileAccessor.readJSON('students.json');
            students.forEach(s => {
                s.LatestActiveTime = new Date();
            });
            return JsonResponse.create(students);
        }
    );
    // 开始签到
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/StudentSign\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                SignSessonId:'asdasd'
            });
        }
    );
    // 停止签到
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/StudentSign\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                code: 200
            });
        }
    );
    // 老师课堂表现打分
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/PerformanceScore\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
};