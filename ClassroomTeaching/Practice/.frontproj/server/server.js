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

    //加载图片
    runtime.setVirtualDirectory('/Static/', path.join(devRoot, 'ClassroomTeaching/Practice/.data/runtime/static/'));


    //模拟左侧导航栏的请求，不加也没关系，但是会在控制台有报错，所以最好加上
    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);

     //模拟平台的前端路由表请求，返回一段js代码，内置缓存机制
    plugins.load('lindge-route-table')
        .loadDefaultRoute()
        .setRoute({
            'classroomteaching_quiz': '/Translayer/ClassroomTeaching.Quiz/api/',           
        })
        .active(runtime);

    //适配对前端开发公共引用目录中文件的请求
    //设置搜索的起始根目录，即views所对应的目录，从这一级目录开始，每一层目录下的__public__目录都会被搜索
    plugins.load('lindge-public-include')
    .setSearchRoot(devRoot)
    .active(runtime);

     //该扩展用于程序化模拟figure.config服务下加载系统配置的请求
     plugins.load('lindge-figureconfig')
     .addConfigSection('PracticeType', fileAccessor.getPath('config/PracticeType.json'), true) 
     .active(runtime);

    //模拟平台行为服务，支持增量/非增量模式行为数据的查询、写入
    var behaviorService = plugins.load('lindge-behavior')
    .setStorageRoot(fileAccessor.getPath('behavior'))
    .active(runtime);
 
    require('./mutual-score')(context);

    // other configuration goes here

     /************************************查询互动************************************/
    //查询互动的状态
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/InteractionState\b/i,
        function(urlInfo, headers, body, params){
            return JsonResponse.create({
                State:'NOTSTART',
                InteractionId:'interactionId0001',
                IsActive:true
            });
        }
    );

     /************************************发起抢答************************************/
     //创建抢答
     runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/GrabAnswer\b/i,
        function(urlInfo, headers, body, params){
            return JsonResponse.create({             
                GrabAnswerId:'grabAnswerId001'
            });
        }
    );

     //结束抢答
     runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/GrabAnswer\/(.+)/i,
        function(urlInfo, headers, body, params){
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );
   
    var count = 0;
     //获取抢答信息
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/GrabAnswer\b/i,
        function(urlInfo, headers, body, params){
            count++;
            let isGrabbing = true;
            if (count == 15) {
                isGrabbing = false;
                count = 0;
            }
            var student = {
                StudentId:'ssr001',
                Name:'子受',
                Photo:'photo'
            };
                      
            return JsonResponse.create({         
                IsGrabbing: isGrabbing,    
                Student: student,
                LeftSeconds: 4 - count,
                DuringSeconds: count - 4,
                IsExistMutualEvaluative: false,
                MutualEvaluateId: 'scoreSessonId001'
            },1000);
        }
    );


     /************************************发起随堂练习************************************/
     //创建课堂练习
     runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/Practice\b/i,
        function(urlInfo, headers, body, params){
            let practiceId = null;
            if(body.Type=='SINGLE')
            {
                practiceId = 'practiceId001';
            }
            else if(body.Type=='MULTIPLE')
            {
                practiceId = 'practiceId002';
            }
            else if(body.Type=='FILL_BLANK')
            {
                practiceId = 'practiceId003';
            }
            else if(body.Type=='SHORT_ANSWER')
            {
                practiceId = 'practiceId004';
            }
            else if(body.Type=='RECORD')
            {
                practiceId = 'practiceId005';
            }
            else if(body.Type=='PHOTO')
            {
                practiceId = 'practiceId006';
            }
            else if(body.Type=='ORAL')
            {
                practiceId = 'practiceId007';
            }
            return JsonResponse.create({             
                PracticeId:practiceId
            });
        }
    );

     //显示随堂练习状态
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/Practice\b/i,
        function(urlInfo, headers, body, params){
            return JsonResponse.create({
                PracticeState:'PRACTICE_COMPLETE',
            });
        }
    );

     //停止随堂练习
     runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/Practice\b/i,
        function(urlInfo, headers, body, params){
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );


    /************************************查询课堂练习************************************/
    var parcticeCount = 0;
    //查询随堂练习进度
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeProgress\b/i,
        function(urlInfo, headers, body, params){
            parcticeCount++;
            let replyCount = 66;
            replyCount += parcticeCount;
            if(parcticeCount == 20){
                parcticeCount = 0;
            }
            var waitAnswers = ['子受','子命','子于','子天','子由']
            return JsonResponse.create({             
                ReplyCount: replyCount,
                TotalCount: 100,
                DuringSeconds: 60,
                WaitAnswerStudents: waitAnswers
            });
        }
    );

    /************************************管理讲评************************************/
     //查询课堂练习完成后的状态
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeReview\b/i,
        function(urlInfo, headers, body, params){
            let isExistBrief = false;
            // if(params[0]=="practiceId001" || params[0]=="practiceId002")
            // {
            //     isExistBrief = true;
            // }
            // else{
            //     isExistBrief = false;
            // }
            return JsonResponse.create({
                IsExistBrief: isExistBrief,
                IsExistMutualEvaluative:true,
                MutualEvaluateId: 'scoreSessonId001',
                PracticeSummaryInfo: {
                    ReplyCount: 100,
                    TotalCount: 100,
                    DuringSeconds: 65
                }
            });
        }
    );

     //结束讲评
     runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeReview\/(.+)/i,
        function(urlInfo, headers, body, params){
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

    /************************************显示讲评信息************************************/   
     //显示随堂练习简报
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeDetail\b/i,
        function(urlInfo, headers, body, params){
            var answerList = [
                {Answer: 'A', Count: 10},
                {Answer: 'B', Count: 20},
                {Answer: 'C', Count: 30},
                {Answer: 'D', Count: 40},
            ];          
            return JsonResponse.create(answerList,{
                waiting: 1000
            });
        }
    );

     //显示随堂练习详情
     runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeDetail\/(.+)/i,
        function(urlInfo, headers, body, params){
            var studentInfos = fileAccessor.readJSON('practiceId001.json');
            if(params[0]=="practiceId001")
            {
                studentInfos = fileAccessor.readJSON('practiceId001.json');
            }
            else if(params[0]=="practiceId002")
            {
                studentInfos = fileAccessor.readJSON('practiceId002.json');
            }
            else if(params[0]=="practiceId003")
            {
                studentInfos = fileAccessor.readJSON('practiceId003.json');
            }
            else if(params[0]=="practiceId004")
            {
                studentInfos = fileAccessor.readJSON('practiceId004.json');
            }
            else if(params[0]=="practiceId005")
            {
                studentInfos = fileAccessor.readJSON('practiceId005.json');
            }
            else if(params[0]=="practiceId006")
            {
                studentInfos = fileAccessor.readJSON('practiceId006.json');
            }
            else if(params[0]=="practiceId007")
            {
                studentInfos = fileAccessor.readJSON('practiceId007.json');
            }
          
            return JsonResponse.create(studentInfos, {
                waiting: 1000
            });
        }
    );

    //批阅学生
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/PracticeDetail\/(.+)/i,
        function(urlInfo, headers, body, params){           
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

    /************************************随机选人************************************/
      //创建随机选人
     runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/RandomCandidate\b/i,
        function(urlInfo, headers, body, params){
        
            return JsonResponse.create({             
                RandomRollCallId:'RandomRollCallId001',              
            });
        }
    );

     //查询随机信息
     runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/RandomCandidate\b/i,
        function(urlInfo, headers, body, params){
            var student = {
                StudentId:'ssr001',
                Name:'子受',
                Photo:'photo'
            };

            return JsonResponse.create({
                Student: student,
                IsExistMutualEvaluative:false,
                MutualEvaluateId: '',
            });
        }
    );

     //结束随机
     runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/RandomCandidate\/(.+)/i,
        function(urlInfo, headers, body, params){
            return{             
                code: HTTP_STATUS_CODE.success,
                waiting: 1000
            };
        }
    );

    //学生
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Quiz\/api\/RandomCandidate\b/i,
        function(urlInfo, headers, body, params){
            let studentInfos = fileAccessor.readJSON('students.json');

            return JsonResponse.create(studentInfos);
        }
    );
    
};