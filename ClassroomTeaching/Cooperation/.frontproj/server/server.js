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
    runtime.setVirtualDirectory('/Static/', path.join(devRoot, '/ClassroomTeaching/Cooperation/.data/runtime'));
    runtime.setVirtualDirectory('/Images/', path.join(devRoot, '/ClassroomTeaching/Cooperation/.data/runtime'));
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
        'classroomteaching_cooperation': '/Translayer/ClassroomTeaching.Cooperation/api/'
    })
    .active(runtime);

    // 获取所有的组成员
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Cooperation\/api\/Member\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create([
                {
                    MemberId: 'member1',
                    Name: '小红',
                    IsChair: false
                },
                {
                    MemberId: 'member2',
                    Name: '小蓝',
                    IsChair: false
                },
                {
                    MemberId: 'member3',
                    Name: '小白',
                    IsChair: false
                },
                {
                    MemberId: 'member4',
                    Name: '小黄',
                    IsChair: false
                },
                {
                    MemberId: 'member5',
                    Name: '小黑',
                    IsChair: true
                }
            ]);
        }
    );
    // 更换主持人
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Cooperation\/api\/Member\/(.+)\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
    // 主持讨论
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Cooperation\/api\/Member\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                Code: '200'
            });
        }
    );
    // 获取所有的讨论消息
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Cooperation\/api\/MessageQuery\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                State: 'PROGRESSING',
                // Messages:[]
                Messages: [{
                    MessageId: 'message1',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member1',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: "type 参数仅在 Windows 上可用，在其他平台上则会被忽略。 它可以被设置为 'dir'. 'file' 或 'junction。'",
                    IsFile: false,
                    FileInfo:{
                        Handle: 'file',
                        FileType: 'TEXT',
                        FileName: 'fileName1',
                        Size: '123123'
                    }
                }, {
                    MessageId: 'message2',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member2',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: '不建议在调用 fs.open()、 fs.readFile() 或 fs.writeFile() 之前使用 fs.stat() 检查文件的存在性。 而是应该直接地打开、读取或写入文件，如果文件不可用，则处理引发的错误。',
                    IsFile: true,
                    FileInfo:{
                        Handle: 'file://Bank2.CasualStream/87918820219B4EE9BB1ACB36EE34DEA1',
                        FileType: 'IMAGE',
                        FileName: '图片1',
                        Size: '37365'
                    }
                }, {
                    MessageId: 'message3',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member3',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: 'content1',
                    IsFile: true,
                    FileInfo:{
                        Handle: 'file://Bank2.CasualStream/87918820219B4EE9BB1ACB36EE34DEA2',
                        FileType: 'IMAGE',
                        FileName: '图片1',
                        Size: '37365'
                    }
                }, {
                    MessageId: 'message4',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member4',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: 'content4',
                    IsFile: true,
                    FileInfo:{
                        Handle: 'file://Bank2.CasualStream/87918820219B4EE9BB1ACB36EE34DEA9',
                        FileType: 'VIDEO',
                        FileName: '视频1',
                        Size: '13550399'
                    }
                }, {
                    MessageId: 'message5',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member1',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: "type 参数仅在 Windows 上可用，在其他平台上则会被忽略。 它可以被设置为 'dir'. 'file' 或 'junction。'type 参数仅在 Windows 上可用，在其他平台上则会被忽略。 它可以被设置为 'dir'. 'file' 或 'junction。'",
                    IsFile: true,
                    FileInfo:{
                        Handle: 'file://Bank2.CasualStream/87918820219B4EE9BB1ACB36EE34DEA3',
                        FileType: 'IMAGE',
                        FileName: 'fileName1',
                        Size: '123123'
                    }
                }, {
                    MessageId: 'message6',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member5',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: "我上初中不久，父亲的自行车被偷了，父亲便没有再买。不过，没过多久，父亲有了另一辆车：三轮大板车。这种车如今不多见了，需要稍微描述一下：车分前后两部分，前面是铁条焊接、木板搭成的车斗，长约1.5米，宽约1.2米，可载人，可载物；后面有半辆自行车焊接在车把上，作为动力。这种车特别沉，不好操作，就算一个年轻汉子，骑不了多久，也会满身大汗。",
                    IsFile: true,
                    FileInfo:{
                        Handle: 'file://Bank2.CasualStream/87918820219B4EE9BB1ACB36EE34DEA4',
                        FileType: 'IMAGE',
                        FileName: 'fileName1',
                        Size: '123123'
                    }
                }, {
                    MessageId: 'message7',
                    CreateTime: new Date(),
                    Author: {
                        AuthorId: 'member3',
                        Portrait: 'portrait',
                        DisplayName: '小黑'
                    },
                    Content: "神话的产生和原始人类为了自身生存而进行的同大自然的斗争结合在一起。当时生产工具简陋，变幻莫测的自然力对人类形成严重的威胁。与此同时，原始人对客观世界的认识，也处于极为幼稚的阶段。举凡日月的运行、昼夜的变化、水旱灾害的产生，生老病死等，都使他们迷惑、惊奇和恐慌。诸如此类的自然现象，都和原始人类的生产、生活有密切关系，他们迫切地希望认识自然，于是便以自身为依据，想象天地万物都和人一样，有着生命、意志的；对于自然现象的过程和因果关系，也加以人间形式的假设和幻想，并以为自然界的一切都受有灵感的神的主宰。在这种思想支配下，所有的自然物和自然力都被神化了。原始人不想屈服，与大自然展开了不懈的斗争，一心渴望认识自然、征服自然，减轻劳动，保障生活。他们把这一意志和愿望通过不自觉的想象化为具体的形象和生动的情节，于是便有了神话的产生。由此可见，神话是原始人在那极为困难的条件下，企图认识自然、控制自然的一种精神活动。",
                    IsFile: false,
                    FileInfo:{
                        Handle: 'file',
                        FileType: 'TEXT',
                        FileName: 'fileName1',
                        Size: '123123'
                    }
                }]
            });
        }
    );

    // 查询指定时间后创建的消息
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Cooperation\/api\/MessageQuery\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create([]);
        }
    );

};