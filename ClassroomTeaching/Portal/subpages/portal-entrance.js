(function ()
{
'use strict';

angular.module('Portal.Entrance', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'LINDGE-UI-Core',

    'ClassroomTeaching.Portal.Service',
    'Figure-Config-RouteTable',
    'Electron-Upload',
    'LINDGE-Toast',
    'Client.Services.ClientProxy',
    'ClassroomTeaching.ErrorService'
])

.controller('PortalEntranceCtrl', ['$scope', '$state', 'portalManageService', 'queryString', '$electronUpload', 'lplDefaultJobManager', '$lindgeToast', '$clientProxy',  'errorService',
function ($scope, $state, portalManageService, queryString, $electronUpload, lplDefaultJobManager, $lindgeToast, $clientProxy, errorService) {
    $scope.state = '';
    $scope.qRCodeInfo = '';
    $scope.isUploading = false;
    $scope.nowTime = '';
    $scope.behaviorId = '';
    $scope.jobQueryTask = null;
    $scope.isPrepareClassOver = false;
    $scope.relatedLessonInfo ={
        isRelated: false,
        courseName: '',
        lessonName: '',
        teachingClassName: '',
        cover: '',
        lessonId: ''
    };
    $scope.relatedTeacherInfo={
        isRelated: false,
        teacherName: '',
        teacherPortrait: ''
    };
    var lessonPackagePath = '';
    var classroomId = queryString.get('classroomid');
    var updateTimeTimer = null;
    var queryStateTimer  = null;

    $scope.$on('$destroy', function () {
        if (queryStateTimer) {
            clearInterval(queryStateTimer);
        }
        if (updateTimeTimer) {
            clearInterval(updateTimeTimer);
        }
    });

    $scope.skipSign = function(){
        if(!$scope.isCreateLesson){
            $scope.isCreateLesson = true;
            portalManageService.beginClass({
                id: classroomId
            },{
                IsRelateCloud: false
            }, result => {
                $scope.state = 'InClass';
                $scope.relatedLessonInfo.lessonId = result.LessonId;
                //$clientProxy.sendMessage('BeginLesson');
            })
            .$promise
            .finally(() => {
                $scope.isCreateLesson = false;
            });
        }
    };

    $scope.prepareImportLesson = function(){
        if(!$scope.isCreateLesson){
            $state.go('fileDirectory', { classroomId: classroomId, state: $scope.state, lessonId: $scope.relatedLessonInfo.lessonId });
        }
    };

    $scope.classOver = function(){
        if(!$scope.isClassOver){
            $scope.isClassOver = true;
            portalManageService.classOver({
                id: classroomId
            }, result => {
                $scope.isPrepareClassOver = false;
                $scope.state = 'Unstart';
                $scope.relatedLessonInfo.isRelated = false;
                //$clientProxy.sendMessage('EndLesson');
            })
            .$promise
            .finally(() => {
                $scope.isClassOver = false;
            });
        }
    };

    $scope.prepareClassOver = function(){
        $scope.isPrepareClassOver = true;
    };

    $scope.cancelClassOver = function(){
        $scope.isPrepareClassOver = false;
    };

    function executeDataImport() {
        portalManageService.executeDataImport({
            id: $scope.workBehaviorId
        },{
            Handle: $scope.uploadResult.token
        }, result => {
        }, err => {
            errorService.showErrorMessage(err);
        }).$promise
        .finally(() => {
            $scope.isUploading = false;
        });
    }

    function stopImport() {
        portalManageService.stopImportLesson({
            id: $scope.workBehaviorId
        }, result => {
        }, err => {
            errorService.showErrorMessage(err);
        });
    }

    function uploadLessonFile() {
        $scope.isUploading = true;
        $scope.uploadResult = $electronUpload.upload(lessonPackagePath, null, { onFinish: executeDataImport, onFailed: stopImport });
    };

    function queryImportProgress(workBehaviorId){
        $scope.jobQueryTask = lplDefaultJobManager.queryTask(workBehaviorId, null);
        $scope.jobQueryTask.promise.then(result => {
            //$clientProxy.sendMessage('BeginLesson');
        }, err => {
            errorService.showErrorMessage(err);
        });
    }

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

    function getClassroomState() {
        portalManageService.getClassroomState(
            { id: classroomId },
            result => {
                $scope.relatedLessonInfo.lessonId = result.LessonInfo.LessonId;
                $scope.relatedLessonInfo.isRelated = result.HasRelatedLesson;
                if($scope.relatedLessonInfo.isRelated){
                    $scope.relatedLessonInfo.courseName = result.LessonInfo.CourseName;
                    $scope.relatedLessonInfo.lessonName = result.LessonInfo.LessonName;
                    $scope.relatedLessonInfo.teachingClassName = result.LessonInfo.TeachingClassName;
                    $scope.relatedLessonInfo.cover = result.LessonInfo.Cover;
                }
                $scope.relatedTeacherInfo.isRelated = result.HasRelatedTeacher;
                if($scope.relatedTeacherInfo.isRelated){
                    $scope.relatedTeacherInfo.teacherName = result.TeacherInfo.TeacherName;
                    $scope.relatedTeacherInfo.teacherPortrait = result.TeacherInfo.TeacherPortrait;
                }
                if ($scope.state != result.State) {
                    $scope.state = result.State;
                    $scope.workBehaviorId = result.WorkBehaviorId;
                    if ($scope.state == 'LessonSynching' || $scope.state == 'LessonImporting') {
                        queryImportProgress(result.WorkBehaviorId);
                    }
                    if ($scope.state == 'LessonUploading') {
                        lessonPackagePath = result.LessonInfo.LessonPackagePath;
                        uploadLessonFile();
                    }
                }
            }, 
            err => {
                errorService.showErrorMessage(err);
            }
        ).$promise
        .finally(() => {
            queryStateTimer = setTimeout(getClassroomState, 3000);
        });
    }

    function getQRCode(){
        portalManageService.getClassroomQRCode(
        { id: classroomId },
        result => {
            $scope.qRCodeInfo = result;
            let qrcode = new QRCode("QRCodeContainer", { correctLevel: QRCode.CorrectLevel.L, width:234,height:234});
            qrcode.makeCode(JSON.stringify($scope.qRCodeInfo));
        }, 
        err => {
            errorService.showErrorMessage(err);
        });
    }

    function getNowTime(){
        var date = new Date();
        var seperator = ':';
        var hour = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
        var minutes = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
        $scope.nowTime = hour + seperator + minutes;
        updateTimeTimer = setTimeout(getNowTime, 500);
    }

    function init(){
        getClassroomState();
        getQRCode();
        getNowTime();
    }

    init();
}]);

}());