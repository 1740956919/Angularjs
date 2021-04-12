(function ()
{
'use strict';

angular.module('PreviewLessonReport', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform', 
    'ui.router',   

    'ClassroomTeaching.LessonReport.Service',
    'Client.Services.ClientProxy',
    'Figure-Config-RouteTable'
])

.controller('PreviewLessonReportCtrl', ['$scope', 'lessonExportService', '$stateParams', '$state','$clientProxy', '$filter',
function ($scope, lessonExportService, $stateParams, $state, $clientProxy, $filter) {
    const shell = require('electron').shell;
    var entranceFiltrer = $filter("entranceFilter");
    $scope.records = [];
    $scope.selectedRecord = null;
    
    $scope.lessonInfo = $stateParams.lesson;
    var lessonId = $scope.lessonInfo.LessonId;

    $scope.selectRecord = function (item) {
        if(!$scope.selectedRecord || ($scope.selectedRecord && $scope.selectedRecord != item)) {
            $scope.selectedRecord = item;
        }
    };
    
    $scope.back = function () {
        $state.go('selectLessonReport');
    };  
    
    $scope.openFile = function(material){
        if($scope.isOpening){
            return;
        }
        $scope.isOpening = true;
        $clientProxy.getToken().then(result => {
            let url = entranceFiltrer("ClassroomTeaching.MaterialContent",{
                resourceid: material.RelateId,
                lessonid: lessonId,
                token: result
            });
            $scope.isOpening = false;
            $clientProxy.hideWindow('ClassroomTeaching.LessonReport');
            shell.openExternal(url);         
        });
    };

    function init() {
        $scope.isLoading = true;
        
        lessonExportService.getLessonReport(
            { id:lessonId },
            result => {
            $scope.records = result;
            $scope.records.forEach((r, index) => {
                if (r.ContentType == "COMPLEX") {
                    r.ComplexContents = JSON.parse(r.Content);
                }
                if (!r.Image && index == 0) {
                    r.Image = "images/lesson-record.png";
                    r.ImageType = "DEFAULT";
                }
                if (!r.Image && index != 0) {
                    r.Image = $scope.records[index-1].Image;
                    r.ImageType = $scope.records[index-1].ImageType;
                }
            });
            $scope.selectRecord(result[0]);
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    };

    init();
    
}]);

}());