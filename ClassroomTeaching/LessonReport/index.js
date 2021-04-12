(function ()
{
'use strict';

const subpageModules = [
    'SelectLessonReport',
    'PreviewLessonReport',
    'ExportLessonReport',
];

angular.module('ClassroomTeaching.LessonReport', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'ui.router',

    'ClassroomTeaching.LessonReport.Service',
    'Figure-Config-RouteTable',

    ...subpageModules
])

.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('selectLessonReport', {    
            templateUrl: 'subpages/select-lessonReport.html',
            controller: 'SelectLessonReportCtrl',   
            params:{}       
        })
        .state('previewLessonReport', {        
            templateUrl: 'subpages/preview-lessonReport.html',
            controller: 'PreviewLessonReportCtrl',
            params: {
                lesson: null
            }
        })
        .state('exportLessonReport', {         
            templateUrl: 'subpages/export-lessonReport.html',
            controller: 'ExportLessonReportCtrl',
            params: {
                isExport: false,
                behaviorId: '',
                selectedLessonId: ''         
            }
        });        
}])

.controller('MainCtrl', ['$scope','$log','$state','lessonExportService','queryString',
 function ($scope,$log,$state,lessonExportService,queryString) {
    // controller code here    
    var sceneId = queryString.get('sceneid');
    function init(){            
        $scope.isLoading = true;
        lessonExportService.getLessonExportState(
        { id: sceneId },
        null,
        result => {
            if(result.State == 'UNSTART'){
                $state.go('selectLessonReport');
            }
            else{
                $state.go('exportLessonReport', {
                    isExport: true,
                    behaviorId: result.BehaviorId,
                    selectedLessonId: ''
                });
            }
        },
        err => {         
            $log.error('获取课堂记录导出状态失败!', err);
        })
        .$promise
        .finally(()=>{
            $scope.isLoading = false;
        });        
    }  
    init();
}]);

}());