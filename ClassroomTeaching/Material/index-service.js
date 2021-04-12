(function ()
{
'use strict';

angular.module('ClassroomTeaching.Material.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('materialManageService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];
    
    var lessonMaterialStatus = $resource(path.combine(serviceRoot, 'LessonMaterialStatus/:id'), { id: '@id'}, {
        getLessonMaterialStatus: { method: 'GET' }
    });
    
    var lessonMaterialRes = $resource(path.combine(serviceRoot, 'LessonMaterial/:id/:receptor'), { id: '@id', receptor: '@receptor'}, {
        openLessonMaterial: { method: 'PUT' },
        previewMaterial: { method: 'POST' }
    });

    var localMaterialRes = $resource(path.combine(serviceRoot, 'LocalMaterial/:id'), { id: '@id'}, {
        openLocalMaterial: { method: 'PUT' },
        getOpenedLocalMaterial: { method: 'GET', isArray: true }
    });

    var cookieRes = $resource(path.combine(serviceRoot, 'CookieSet/:id'), { id: '@id'}, {
        setCookie: { method: 'PUT' }
    });

    this.getLessonMaterialStatus = lessonMaterialStatus.getLessonMaterialStatus.bind(lessonMaterialStatus);

    this.openLessonMaterial = lessonMaterialRes.openLessonMaterial.bind(lessonMaterialRes);
    this.previewMaterial = lessonMaterialRes.previewMaterial.bind(lessonMaterialRes);

    this.openLocalMaterial = localMaterialRes.openLocalMaterial.bind(localMaterialRes);
    this.getOpenedLocalMaterial = localMaterialRes.getOpenedLocalMaterial.bind(localMaterialRes);

    this.setCookie = cookieRes.setCookie.bind(cookieRes);
}]);

}());