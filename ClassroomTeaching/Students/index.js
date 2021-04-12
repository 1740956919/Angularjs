(function (){
'use strict';

angular.module('ClassroomTeaching.Students', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    
    'ClassroomTeaching.Students.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',

    'LINDGE-ClassroomApp.MutualScoreView',
    'LINDGE-Toast',
    'ClassroomTeaching.ErrorService'
])

.filter('signStateFilter', [function () {
    return function (isSigned) {
        return isSigned ? '已签到' : '未签到';
    };
}])

.filter('signTimeFilter', [function () {
    return function (latestActiveTime) {
        let result = '--';
        if (!!latestActiveTime) {
            latestActiveTime = new Date(latestActiveTime);
            var seperator = ':';
            var hour = latestActiveTime.getHours() < 10 ? '0' + latestActiveTime.getHours() : latestActiveTime.getHours();
            var minutes = latestActiveTime.getMinutes() < 10 ? '0' + latestActiveTime.getMinutes() : latestActiveTime.getMinutes();
            result = hour + seperator + minutes;
        } 
        return result;
    };
}])

.controller('MailCtrl', ['$scope', 'studentManageService', 'queryString', '$clientProxy', 'errorService', '$filter',
function ($scope, studentManageService, queryString, $clientProxy, errorService, $filter) {
    // controller code here
    var platformImage =  $filter('platformImage');
    var classroomId = queryString.get('classroomid');
    var queryStudentsTimer = null;
    var countDownTimer = null;
    var orderRecords = ['NUMBER'];
    $scope.isLoading = true;
    $scope.selectedStudent = null;
    $scope.orderByName = 'NUMBER';
    $scope.pageIndex = 1;
    $scope.pageSize = 36;
    $scope.pageCount = 1;
    $scope.nullData = true;
    $scope.studentInfos = [];    
    $scope.isMutualScoring = false;
    $scope.lessonInfo = {
        teachingClassName: '',
        totalCount: 0,
        logonCount:0,
        signCount: 0,
        lessonId: '',
        nameListId: '',
        scoredStudentInfo: {
            scoredStudentId: '',
        },
        signInfo: {
            isSigning: false,
            signSessonId: '',
            signDuringSeconds: 0
        }
    };

    function queryStudents(){
        studentManageService.getStudentInfo({
            id: $scope.lessonInfo.nameListId
        }, result => {
            $scope.lessonInfo.totalCount = result.length;
            if(result.length != 0){
                $scope.nullData = false;
                $scope.studentInfos = result;
                $scope.pageCount = Math.ceil(result.length/$scope.pageSize);
                sortStudentByOrderRecords();
                loadPresentStudents();
                let signedNum = 0;
                let logonNum = 0;
                $scope.studentInfos.forEach(s => {
                    if (s.IsSigned) {
                        signedNum++;
                    }
                    if (s.IsLogon) {
                        logonNum++;
                    }
                });
                $scope.presentStudent.forEach(column => {
                    column.forEach(s => {
                        if (s.StudentId == $scope.lessonInfo.scoredStudentInfo.scoredStudentId) {
                            $scope.selectedStudent = s;
                        }
                    });
                });
                $scope.lessonInfo.logonCount = logonNum;
                $scope.lessonInfo.signCount = signedNum;
            } else {
                $scope.nullData = true;
            }
        }, err => {
            errorService.showErrorMessage(err);
        })
        .$promise
        .finally(() => {
            queryStudentsTimer = setTimeout(queryStudents, 3000);
        });
    };

    function loadPresentStudents(){
        $scope.studentInfos.forEach((s, index) => {
            s.Index = index + 1;
        });
        $scope.presentStudent = [$scope.studentInfos.slice($scope.pageSize*($scope.pageIndex-1), $scope.pageSize*($scope.pageIndex-1)+($scope.pageSize/3)),
            $scope.studentInfos.slice($scope.pageSize*($scope.pageIndex-1)+$scope.pageSize/3, $scope.pageSize*($scope.pageIndex-1)+(2*$scope.pageSize/3)),
            $scope.studentInfos.slice($scope.pageSize*($scope.pageIndex-1)+2*$scope.pageSize/3, $scope.pageSize*($scope.pageIndex-1)+$scope.pageSize)];
    };

    function sortStudents(sortName){
        var attr = '';
        switch(sortName){
            case 'NUMBER':
                attr = 'Number';
                orderStudents();
                break;
            case 'NAME':
                attr = 'Name';
                orderStudents();
                break;
            case 'SIGNSTATE':
                attr = 'IsSigned';
                orderStudents();
                break;
            case 'ACTIVETIME':
                attr = 'LatestActiveTime';
                orderStudents();
                break;
            default:
                break;
        }
        function orderStudents(){
            $scope.studentInfos.sort(function(a, b){
                if (attr == 'IsSigned') {
                    var nameA = a[attr];
                    var nameB = b[attr];
                } else if (attr == 'LatestActiveTime'){
                    var nameA = new Date(a[attr]);
                    var nameB = new Date(b[attr]);
                    if (nameA < nameB) {
                        return 1;
                    }
                    if (nameA > nameB) {
                        return -1;
                    }
                    return 0;
                } else {
                    var nameA = a[attr].toUpperCase();
                    var nameB = b[attr].toUpperCase();
                }
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        };
    };

    function sortStudentByOrderRecords(){
        orderRecords.forEach(o => sortStudents(o));
    }

    $scope.selectStudent = function(student){
        if(!$scope.isMutualScoring && !$scope.lessonInfo.signInfo.isSigning){
            if (student != $scope.selectedStudent) {
                $scope.selectedStudent = student;
                $scope.scoredTarget = {
                    ScoredId: student.StudentId,
                    TargetType: 'SINGLE_USER',
                    Image: platformImage(student.Portrait, 'avatar.small'),
                    Name: student.Name
                };
            } else {
                $scope.selectedStudent = null;
            }
        }
    };

    $scope.startPerformanceScore = function(studentId, studentName){
        studentManageService.startScore(
            { id: classroomId },
            { 
                TargetIds: [studentId],
                TargetType: 'SINGLE_USER'
            },
            result => {
                $clientProxy.showWindow({id: 'ClassroomTeaching.Students.Score', param: {
                    lessonid: $scope.lessonInfo.lessonId,
                    behaviorid: result.BehaviorId,
                    studentname: studentName
                }});
            }
        );
    };

    $scope.sortStudentsBy = function(sortName){
        if (sortName != $scope.orderByName) {
            $scope.orderByName = sortName;
            if(orderRecords.includes(sortName)){
                orderRecords.splice(orderRecords.indexOf(sortName), 1);
            }
            orderRecords.push(sortName);
            sortStudents($scope.orderByName);
            loadPresentStudents();
        }
    };

    $scope.startMutualScore = function($state){
        $scope.lessonInfo.scoredStudentInfo.scoredStudentId = $state.scoredId;
        $scope.isMutualScoring = true;
        if ($state.isNewSession) {
            $clientProxy.addRecord({
                lessonId: $scope.lessonInfo.lessonId,
                action: 'START_MUTUAL_EVALUATE',
                content: $state.sessionId,
                needCapture: true
            });   
        }
    };

    $scope.stopMutualScore = function($state){
        $scope.isMutualScoring = false;
        $clientProxy.addRecord({
            lessonId: $scope.lessonInfo.lessonId,
            action: 'STOP_MUTUAL_EVALUATE',
            content: $state.sessionId,
            needCapture: true
        });
    };

    $scope.showErrorMessage = function($error){
        errorService.showErrorMessage($error.detail);
    };
    
    $scope.previousPage = function(){
        if ($scope.pageIndex > 1) {
            $scope.pageIndex = $scope.pageIndex - 1;
            loadPresentStudents();
        } 
    };

    $scope.nextPage = function(){
        if ($scope.pageIndex < $scope.pageCount) {
            $scope.pageIndex = $scope.pageIndex + 1;
            loadPresentStudents();
        } 
    };

    function countDownTime () {
        $scope.lessonInfo.signInfo.signDuringSeconds--;
        $scope.$evalAsync(angular.noop);
        if($scope.lessonInfo.signInfo.signDuringSeconds == 0) {
            clearTimeout(countDownTimer);
            $scope.stopSign();
        } else {
            countDownTimer = setTimeout(countDownTime, 1000);
        }
    }

    $scope.startSign = function () {
        studentManageService.startSign({
            id: classroomId
        }, result => {
            $scope.orderByName = 'NUMBER';
            orderRecords = ['NUMBER'];
            sortStudentByOrderRecords();
            loadPresentStudents();
            $scope.lessonInfo.signInfo.signSessonId = result.SignSessonId;
            $scope.lessonInfo.signInfo.isSigning = true;
            $scope.lessonInfo.signInfo.signDuringSeconds = 60;
            $scope.selectedStudent = null;
            countDownTime();
        }, err => {
            errorService.showErrorMessage(err);
        });
    };
    
    $scope.stopSign = function () {
        studentManageService.stopSign({
            id: $scope.lessonInfo.signInfo.signSessonId
        }, result => {
            $scope.lessonInfo.signInfo.isSigning = false;
            if (countDownTimer) {
                clearTimeout(countDownTimer);
            }
        }, err => {
            errorService.showErrorMessage(err);
        });
    };

    function overseeStudent(){
        studentManageService.overseeStudent({
            id: classroomId
        }, result => {
            $scope.isOnClass = result.IsOnClass;
            if ($scope.isOnClass) {
                $scope.lessonInfo.teachingClassName = result.LessonMoment.TeachingClassName;
                $scope.lessonInfo.lessonId = result.LessonMoment.LessonId;
                $scope.lessonInfo.nameListId = result.LessonMoment.NameListId;
                $scope.lessonInfo.signInfo.isSigning = result.LessonMoment.SignInfo.IsSigning;
                $scope.lessonInfo.signInfo.signSessonId = result.LessonMoment.SignInfo.SignSessonId;
                $scope.lessonInfo.signInfo.signDuringSeconds = result.LessonMoment.SignInfo.SignDuringSeconds;
                if ($scope.lessonInfo.signInfo.isSigning) {
                    countDownTime();
                }
                queryStudents();
            }
        }, err => {
            errorService.showErrorMessage(err);
        }).$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    }

    function init(){
        overseeStudent();
    };
    
    init();
}]);

}());