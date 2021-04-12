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
    runtime.setVirtualDirectory('/Static/', path.join(devRoot, '/ClassroomTeaching/Group/.data/runtime'));
    // system config
    runtime.registerProxyHandler(HTTP_METHODS.GET, /\/SystemConfig\.js/i, 'http://devfront.corp.lindge.com/dev/resource/SystemConfig.js');
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
        'classroomteaching_discussion': '/Translayer/ClassroomTeaching.Discussion/api/'
    })
    .active(runtime);

    // 开始分组
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Group\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
    // 完成分组
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Group\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
    // 获取分组结果
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Discussion\/api\/Group\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                IsGrouping: true,
                DuringSeconds: 360,
                Groups: [{
                    GroupId: "asdasd",
                    Name: '组A',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "迪丽热巴",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "古力娜扎",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "哈尼克孜",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "迪丽热巴",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "古力娜扎",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "哈尼克孜",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "迪丽热巴",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "古力娜扎",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    },{
                        MemberId: "assdasd",
                        Name: "小明",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组B',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小李",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组C',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小张",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组D',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小刘",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组E',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小王",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组E',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小王",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组E',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小王",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组E',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小王",
                        Portrait: "portrait"
                    }]
                },{
                    GroupId: "asdasd",
                    Name: '组E',
                    Members: [{
                        MemberId: "assdasd",
                        Name: "小王",
                        Portrait: "portrait"
                    }]
                }],
                GroupedStudentCount: 5,
                TotalStudentCount: 20,
                UngroupStudents: ['小红','小乘','小黄','小绿','小青']
            });
        }
    );
};