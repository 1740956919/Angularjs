(function ()
{
'use strict';

angular.module('ClassroomTeaching.Portal.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('portalManageService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];

    var classroomStateRes = $resource(path.combine(serviceRoot, 'ClassroomState/:id'), { id: '@id' }, {
        getClassroomState: { method: 'GET' }
    });
    var classroomQRCodeRes = $resource(path.combine(serviceRoot, 'ClassroomQRCode/:id'), { id: '@id' }, {
        getClassroomQRCode: { method: 'GET' }
    });
    var lessonStateRes = $resource(path.combine(serviceRoot, 'LessonState/:id'), { id: '@id' }, {
        beginClass: { method: 'PUT' },
        classOver: { method: 'DELETE' }
    });
    var lessonImportRes = $resource(path.combine(serviceRoot, 'LessonImport/:id'), { id: '@id'}, {
        startImportLesson: { method: 'PUT' },
        executeDataImport: { method: 'POST' },
        stopImportLesson: { method: 'DELETE' }
    });

    this.getClassroomState = classroomStateRes.getClassroomState.bind(classroomStateRes);
    
    this.getClassroomQRCode = classroomQRCodeRes.getClassroomQRCode.bind(classroomQRCodeRes);

    this.beginClass = lessonStateRes.beginClass.bind(lessonStateRes);
    this.classOver = lessonStateRes.classOver.bind(lessonStateRes);

    this.startImportLesson = lessonImportRes.startImportLesson.bind(lessonImportRes);
    this.executeDataImport = lessonImportRes.executeDataImport.bind(lessonImportRes);
    this.stopImportLesson = lessonImportRes.stopImportLesson.bind(lessonImportRes);
}]);

}());