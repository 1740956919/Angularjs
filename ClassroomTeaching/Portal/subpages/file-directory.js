(function ()
{
'use strict';

angular.module('File.Directory', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',

    'Classroom.Component.FileBrowse',
    'ClassroomTeaching.Portal.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'LINDGE-Toast',
])

.controller('FileDirectoryCtrl', ['$scope', '$state', '$lindgeToast', 'portalManageService', '$stateParams', '$clientProxy',
function ($scope, $state, $lindgeToast, portalManageService, $stateParams, $clientProxy) {
    var fileBrowseInstance = null;
    var admZip = require('adm-zip');
    var lessonInfo = null;
    $scope.selectedItem = null;

    $scope.getFileBrowseInstance = function(instance) {
        fileBrowseInstance = instance;
        fileBrowseInstance.setFilter((file) => {
            if (file.type == 'FILE' && file['extension'].toLowerCase() == 'zip') {
                return true;
            } else {
                return false;
            }
        });
    };

    $scope.getSelectedItem = function(item) {
        $scope.selectedItem = item;
    };

    $scope.startImportLesson = function() {
        let zip = new admZip($scope.selectedItem.fullPath);
        let zipEntries = zip.getEntries();
        zipEntries.forEach((item) => {
            if (item.name == "Lesson.json") {
                lessonInfo = JSON.parse(item.getData().toString());
            }
        });
        if (lessonInfo && $stateParams.state == 'Unstart') {
            portalManageService.beginClass({
                id: $stateParams.classroomId
            },{
                IsRelateCloud: true,
                CloudLessonInfo: {
                    CourseName: lessonInfo.CourseName,
                    TeachingClassName: lessonInfo.TeachingClassName,
                    LessonName: lessonInfo.LessonName,
                    CloudTeachingSpaceId: lessonInfo.LessonSyncRecord.SourceSpaceId,
                    CloudLessonId: lessonInfo.LessonSyncRecord.SourceLessonId,
                    ExportTime: lessonInfo.LessonSyncRecord.ExportTime
                }
            }, result => {
                //$clientProxy.sendMessage('BeginLesson');
                
                portalManageService.startImportLesson({
                    id: result.LessonId
                },{
                    ClassroomId: $stateParams.classroomId,
                    LessonPackagePath: $scope.selectedItem.fullPath
                }, result => {
                    $state.go('portalEntrance');
                });
            });
        } else if(lessonInfo && $stateParams.state != 'Unstart'){
            portalManageService.startImportLesson({
                id: $stateParams.lessonId
            },{
                ClassroomId: $stateParams.classroomId,
                LessonPackagePath: $scope.selectedItem.fullPath
            }, result => {
                $state.go('portalEntrance');
            });
        }
        else {
            showBubble('导入课程', '找不到课时信息', 'ERROR');
        }
    };

    $scope.cancel = function() {
        $state.go('portalEntrance');
    };

    $scope.refresh = function() {
        fileBrowseInstance.refresh();
        $scope.selectedItem = null;
    };

    function showBubble(title, message, type){
        let tosatType = '';
        let icon = '';
        switch (type.toUpperCase()) {
            case 'SUCCESS':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.SUCCESS;
                icon = 'lic-check-circle-fill'; break;
            case 'ERROR':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.ERROR;
                icon = 'lic-remove-circle-fill'; break;
        }
        $lindgeToast.notify(tosatType,{
            header: title,
            body: message,
            icon: icon,
            timeout: 4000
        });
    }

}]);

}());