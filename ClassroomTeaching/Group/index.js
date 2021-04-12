(function ()
{
'use strict';

angular.module('ClassroomTeaching.Group', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    
    'ClassroomTeaching.Group.Service',
    'Figure-Config-RouteTable',
    'LINDGE-Toast',
    'ClassroomTeaching.ErrorService',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation'
])

.filter('ShowDuringSecondsFilter', [function () {
    return function (seconds){
        var minutesShow = parseInt(seconds / 60) < 10 ? '0' + parseInt(seconds / 60) : parseInt(seconds / 60);
        var secondsShow = seconds % 60 < 10 ? '0' + seconds % 60 : seconds % 60;
        return minutesShow + ':' + secondsShow;
    };
}])

.controller('MainCtrl', ['$scope', 'groupArrangeService', 'queryString', '$lindgeToast', 'errorService', 
        function ($scope, groupArrangeService, queryString, $lindgeToast, errorService) {
    var lessonId = queryString.get('lessonid');
    var initDuringSeconds = 0;
    var getGroupResultTimer = null;
    var updateDuringSecondsTimer = null;
    $scope.isLoading = true;
    $scope.duringSeconds=0;
    $scope.groups = [];
    $scope.groupedStudentCount=0;
    $scope.totalStudentCount=0;
    $scope.ungroupStudents='';
    $scope.page={
    pageSize:6,
    pageIndex:1,
    pageCount:1
    };
    
    $scope.startGroup = function(){
        if(!$scope.isStartGroup){
            $scope.isStartGroup = true;
            groupArrangeService.startGroup(
                { id: lessonId}, 
                result => {
                    $scope.duringSeconds=0;
                    $scope.isGrouping=true;
                    getGroupResult();
                    //getGroupResultTimer = setInterval(getGroupResult, 3000);
                    updateDuringSecondsTimer = setInterval(updateGroupDuringSeconds, 1000);
                }, err => {
                    errorService.showErrorMessage(err);
                }
            )
            .$promise
            .finally(() => {
                $scope.isStartGroup = false;
            });
        }
    };

    $scope.completeGroup = function(){
        if(!$scope.isCompleteGroup){
            $scope.isCompleteGroup = true;
            groupArrangeService.completeGroup({
                id: lessonId
            }, result => {
                $scope.isGrouping=false;
                clearTimeout(getGroupResultTimer);
                clearInterval(updateDuringSecondsTimer);
            })
            .$promise
            .finally(() => {
                $scope.isCompleteGroup = false;
            });
        }
    };

    $scope.nextPage = function(){
        if($scope.page.pageIndex < $scope.page.pageCount){
            $scope.page.pageIndex++;
            $scope.groups.forEach((g, index) => {
                if(index >= $scope.page.pageSize * ($scope.page.pageIndex - 1) && index <= $scope.page.pageIndex * $scope.page.pageSize - 1){
                    g.IsShow = true;
                } else {
                    g.IsShow = false;
                }
            });
        }
    };

    $scope.previousPage = function(){
        if($scope.page.pageIndex > 1){
            $scope.page.pageIndex--;
            $scope.groups.forEach((g, index) => {
                if(index >= $scope.page.pageSize * ($scope.page.pageIndex - 1) && index <= $scope.page.pageIndex * $scope.page.pageSize - 1){
                    g.IsShow = true;
                } else {
                    g.IsShow = false;
                }
            });
        }
    };

    function getGroupResult(){
        groupArrangeService.getGroupResult({
            id: lessonId
        }, result => {
            $scope.isGrouping = result.IsGrouping;
            if(result.Groups.length > 0) {
                $scope.page.pageCount = Math.ceil(result.Groups.length/6);
            }
            initDuringSeconds = result.DuringSeconds;
            result.Groups.forEach((g, index) => {
                if(index >= $scope.page.pageSize * ($scope.page.pageIndex - 1) && index <= $scope.page.pageIndex * $scope.page.pageSize - 1){
                    g.IsShow = true;
                } else {
                    g.IsShow = false;
                }
            });
            $scope.groups = result.Groups;
            $scope.groupedStudentCount = result.GroupedStudentCount;
            $scope.totalStudentCount = result.TotalStudentCount;
            $scope.ungroupStudents='';
            result.UngroupStudents.forEach((u, index) => {
                if(index == 0){
                    $scope.ungroupStudents += u;
                } else {
                    $scope.ungroupStudents += ('、' + u);
                }
            });
        })
        .$promise
        .finally(() => {
            getGroupResultTimer = setTimeout(getGroupResult, 3000);
        });
    }

    function getBasicGroupResult(){
        groupArrangeService.getGroupResult({
            id: lessonId
        }, result => {
            $scope.isGrouping = result.IsGrouping;
            $scope.isProcessing = result.IsProcessing;
            if(result.Groups.length != 0){
                $scope.page.pageCount = Math.ceil(result.Groups.length/6);
            }
            result.Groups.forEach((g, index) => {
                if(index >= $scope.page.pageSize * ($scope.page.pageIndex - 1) && index <= $scope.page.pageIndex * $scope.page.pageSize - 1){
                    g.IsShow = true;
                } else {
                    g.IsShow = false;
                }
            });
            $scope.groups = result.Groups;
            $scope.groupedStudentCount = result.GroupedStudentCount;
            $scope.totalStudentCount = result.TotalStudentCount;
            $scope.ungroupStudents='';
            result.UngroupStudents.forEach((u, index) => {
                if(index == 0){
                    $scope.ungroupStudents += u;
                } else {
                    $scope.ungroupStudents += ('、' + u);
                }
            });
            if ($scope.isGrouping) {
                $scope.duringSeconds = result.DuringSeconds;
                getGroupResult();
                //getGroupResultTimer = setInterval(getGroupResult, 3000);
                updateDuringSecondsTimer = setInterval(updateGroupDuringSeconds, 1000);
            }
        }).$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    }

    function updateGroupDuringSeconds(){
        $scope.duringSeconds++;
        $scope.$apply();
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

    function init(){
        getBasicGroupResult();
    }   

    init();
}]);

}());