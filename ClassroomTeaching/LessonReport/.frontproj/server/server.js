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

     plugins.load('lindge-public-include')
     .setSearchRoot(devRoot)
     .active(runtime);

     plugins.load('lindge-route-table')
         .loadDefaultRoute()
         .setRoute({
             'classroomteaching_lessonreport': '/Translayer/ClassroomTeaching.LessonReport/api/',           
         })
         .active(runtime);
 
 
     //模拟平台行为服务，支持增量/非增量模式行为数据的查询、写入
     var behaviorService = plugins.load('lindge-behavior')
     .setStorageRoot(fileAccessor.getPath('behavior'))
     .active(runtime);

    // other configuration goes here
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.LessonReport\/api\/LessonExportState\b/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                State:"UNSTART",
                BehaviorId:'behaviorId002',
            });
        }              
    );

    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.LessonReport\/api\/LessonReportQuery\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var lessons = fileAccessor.readJSON('lessons.json');
            return JsonResponse.create({
                LessonInfos:lessons,
                TotalCount:lessons.length,
            });
        }
    );


    //模拟JOB   
    var jobRepository = plugins.loadSingleton('lindge-job-query');
    jobRepository.active(runtime);

    var jobService = plugins.loadSingleton('lindge-behavior-job', jobRepository);
    jobService.active(runtime);
    const EXPORT_LIBRARY_JOB_ID = 'job_01';

    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.LessonReport\/api\/LessonReportExport\b/i,
        function (urlInfo, headers, body, parts) {
            var behaviorId = '';
            var currentJob = jobRepository.getJobInfo(EXPORT_LIBRARY_JOB_ID);
            if (currentJob !== null && (currentJob.State == jobRepository.states.waitexecute ||
                currentJob.State == jobRepository.states.executing)) {
                behaviorId = EXPORT_LIBRARY_JOB_ID;
            } 
            else {
                var importJob = jobService.createJob(EXPORT_LIBRARY_JOB_ID);
                importJob.setExecutionTask(jobRepository.states.successful, 100, 5);
                behaviorId = EXPORT_LIBRARY_JOB_ID;
            }
            return JsonResponse.create({
                BehaviorId: behaviorId,
                IsCompleted: false,
            });
        }
    );

    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.LessonReport\/api\/LessonRecordExport\b/i,
        function (urlInfo, headers, body, parts) {          
            return JsonResponse.create({
                code: HTTP_STATUS_CODE.success     
            });
        }
    );

  


};