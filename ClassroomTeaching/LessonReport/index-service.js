(function () {
    'use strict';

    angular.module('ClassroomTeaching.LessonReport.Service', [
        'ngResource',
        'Figure-Config-RouteTable'
    ])

    .service('lessonExportService', ['$resource', 'path', 'routeTable', '$q', function ($resource, path, routeTable, $q) {
        var serviceRoot = routeTable['classroomteaching_lessonreport'];

        var lessonRecordRes = $resource('data/lessons.json', null, {
            queryLessons: { method: 'Get', isArray: true}

        });
        var lessonRecord1Res = $resource('data/lessonRecord1.json', null,
            {
                queryLessonRecord1: { method: 'GET', isArray: true }
            }
        );
        var lessonRecord2Res = $resource('data/lessonRecord2.json', null,
            {
                queryLessonRecord2: { method: 'GET', isArray: true }
            }
        );

        this.queryLessons = lessonRecordRes.queryLessons.bind(lessonRecordRes);
        this.queryLessonRecord1 = lessonRecord1Res.queryLessonRecord1.bind(lessonRecord1Res);
        this.queryLessonRecord2 = lessonRecord2Res.queryLessonRecord2.bind(lessonRecord2Res);


        var lessonExportStateRes = $resource(path.combine(serviceRoot, 'LessonExportState/:id'),{ id: '@id' },{
            getLessonExportState:{ method: 'GET'}
        });
        this.getLessonExportState = lessonExportStateRes.getLessonExportState.bind(lessonExportStateRes);

        var lessonRecordQueryRes = $resource(path.combine(serviceRoot, "LessonReportQuery/:id"), { id: "@id" }, {
            queryLessonRecords: { method: "POST" },
            getLessonReport: { method:"GET",isArray: true }
        });
        this.queryLessonRecords = lessonRecordQueryRes.queryLessonRecords.bind(lessonRecordQueryRes);
        this.getLessonReport = lessonRecordQueryRes.getLessonReport.bind(lessonRecordQueryRes);


        var lessonRecordExportRes = $resource(path.combine(serviceRoot, "LessonReportExport/:id"), { id: "@id" }, {
            exportLessonRecord: { method: "PUT" },
            cancelExport: { method: "DELETE" }
        });
        this.exportLessonRecord = lessonRecordExportRes.exportLessonRecord.bind(lessonRecordExportRes);
        this.cancelExport = lessonRecordExportRes.cancelExport.bind(lessonRecordExportRes);
    }]);

}());