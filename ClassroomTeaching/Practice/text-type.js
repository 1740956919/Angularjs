(function () {
'use strict';

angular.module('ClassroomTeaching.Practice.TextType', [
'ngMaterial',
'ngResource',
'LINDGE-Service',
'LINDGE-Platform',
'ClassroomTeaching.Practice.Service',
'Figure-Config-RouteTable',
'Client.Services.ClientProxy',
'Client.Services.Initiation',
'LINDGE-ClassroomApp.MutualScoreView',
'LINDGE-Toast',
'LINDGE-ClassroomApp.AudioPlayer',
'LINDGE-ClassroomApp.TouchImageViewer',
'LINDGE-WebMedia',
'ClassroomTeaching.ErrorService'
])

.controller('TextTypeCtrl', ['$scope', 'practiceService', 'studentManageService', 'queryString', '$log', 'localStorageService', '$clientProxy', '$interval', '$filter', 'errorService',
function ($scope, practiceService, studentManageService, queryString, $log, localStorage, $clientProxy, $interval, $filter, errorService) {
    // controller code here

    /*******************************初始化参数*******************************/
    var platformImage = $filter('platformImage');

    var lessonId = queryString.get('lessonid');
    var practiceId = queryString.get('relationid');
    var relationType = queryString.get('relationtype');
    $scope.taskType = queryString.get('type'); 

    $scope.isLoading = false;
    $scope.loadData = false;
    $scope.state = '';
    $scope.parcticeInfo = {
        ReplyCount: 0,
        TotalCount: 0,
        WaitAnswerStudednts: ''
    };

    //是否显示简报按钮
    $scope.isExistBrief = false;
    //是否存在未结束的互评
    $scope.isExistMutualEvaluative = false;
    $scope.mutualEvaluateId = '';
    $scope.studentTargetId = '';

    //学生信息
    $scope.studentInfos = [];
    //选中的学生数据
    $scope.selectStudent = {
        StudentId : '',
        Answer : ''
    };

    //讲评方式
    $scope.evaluationStyle = '';

    //计时器
    $scope.timeData = '';
    var duringSeconds = 0;
    var timer = null;
    var practiceProgress = null;


    /*********************************功能按钮********************************/
    //停止练习
    $scope.stopPractice = function () {
        if ($scope.isStop == true) {
            return;
        }
        $scope.isStop == true;
        practiceService.deletePractice(
            { id: practiceId },
            null,
            result => {
                $clientProxy.addRecord({
                    lessonId: lessonId,
                    action: 'STOP_EXERCISE',
                    content: practiceId,
                    needCapture: true
                })
                    .finally(() => {
                        $scope.state = 'PRACTICE_COMPLETE';
                        $interval.cancel(timer);
                        clearTimeout(practiceProgress);
                        getPracticeComplete();
                    });
            })
            .$promise
            .finally(() => {
                $scope.isStop == false;
            });
    };

    //结束互动
    $scope.endPractice = function () {
        if ($scope.isEnd == true) {
            return;
        }

        $scope.isEnd == true;
        practiceService.deletePracticeReview(
            { id: practiceId, receptor: lessonId },
            null,
            result => {
                $clientProxy.addRecord({
                    lessonId: lessonId,
                    action: 'COMPLETE_EXERCISE',
                    content: practiceId,
                    needCapture: true
                })
                    .finally(() => {
                        $clientProxy.showWindow({
                            id: 'ClassroomTeaching.Practice',
                            isForceReload: true
                        });
                    });
            }
        )
            .$promise
            .finally(() => {
                $scope.isEnd == false;
            });
    };

    //点击详情
    $scope.showDetail = function () {
        if ($scope.evaluationStyle == 'HIDE_DETAIL') {
            $scope.evaluationStyle = 'SHOW_DETAIL';
            localStorage.set(practiceId, $scope.evaluationStyle);
            // $scope.selectStudent.StudentId = '';
            // getPracticeDetail();
            $clientProxy.showWindow({
                id: 'ClassroomTeaching.Practice.Text.FullScreen',
                param: {
                    relationid: practiceId,
                    relationtype: relationType,
                    type: $scope.taskType
                }
            });    
        }
        else {
            $scope.evaluationStyle = 'HIDE_DETAIL';
            localStorage.set(practiceId, $scope.evaluationStyle);
            // $scope.studentInfos = [];
            if ($scope.selectStudent.StudentId) {
                imageCtr.reset();   
            }
            $clientProxy.showWindow({
                id: 'ClassroomTeaching.Practice.Text.Controlbar',
                param: {
                    relationid: practiceId,
                    relationtype: relationType,
                    type: $scope.taskType
                }
            });
        }
        
    };

    //评价
    $scope.appraiseStudent = function () {
        studentManageService.startScore(
            { id: lessonId },
            {
                TargetIds: [$scope.selectStudent.StudentId],
                TargetType: 'SINGLE_USER'
            },
            result => {
                $clientProxy.showWindow({
                    id: 'ClassroomTeaching.Students.Score',
                    param: {
                        lessonid: lessonId,
                        behaviorid: result.BehaviorId,
                        studentname: $scope.selectStudent.Name
                    }
                });
            }
        );
    };
    //互评
    $scope.startMutualScore = function ($state) {
        $scope.isExistMutualEvaluative = true;
        if ($state.isNewSession) {
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'START_MUTUAL_EVALUATE',
                content: $state.sessionId,
                needCapture: true
            });   
        }
    };

    //结束互评
    $scope.stopMutualScore = function ($state) {
        $scope.isExistMutualEvaluative = false;
        $clientProxy.addRecord({
            lessonId: lessonId,
            action: 'STOP_MUTUAL_EVALUATE',
            content: $state.sessionId,
            needCapture: true
        });
    };

    //互评错误信息
    $scope.showErrorMessage = function ($error) {
        errorService.showErrorMessage($error.detail);
    };

    $scope.generateImageUrl = function (imageUrl) {
        return  `url(${$filter('fastUploadStreamFilter')(imageUrl)})`;
    };

    //设置计时器
    function showTimer() {
        let minute = Math.floor(duringSeconds / 60) % 60;
        let second = duringSeconds % 60;
        if (minute < 10) {
            minute = '0' + minute;
        }
        if (second < 10) {
            second = '0' + second;
        }
        $scope.timeData = minute + ':' + second;
        duringSeconds += 1;
    }

    /**********************************请求方法**********************************/
    //查询练习的进度信息
    function getpracticeProgress() {
        practiceService.getPracticeProgress(
        { id: practiceId },
        null,
        result => {
            if (result.WaitAnswerStudents.length == 5) {
                result.WaitAnswerStudents = result.WaitAnswerStudents.toString() + "...";
            }
            else {
                result.WaitAnswerStudents = result.WaitAnswerStudents.toString();
            }
            $scope.parcticeInfo = result;
        })
        .$promise
        .finally(() => {
            practiceProgress = setTimeout(getpracticeProgress, 1000);
        });
    }

    //查询练习完成后的信息
    function getPracticeComplete() {
        practiceService.getPracticeReview(
        { id: practiceId },
        null,
        result => {
            $scope.parcticeInfo = result.PracticeSummaryInfo;             
            duringSeconds = result.PracticeSummaryInfo.DuringSeconds;
            showTimer();
        })
        .$promise
        .finally(() => {
            getLocalStorage(practiceId);                     
        });
    }

    //查询讲评详情信息(填空，简答，拍照，口语)
    function getPracticeDetail() {
        $scope.loadData = true;
        practiceService.getPracticeDetail(
        { id: practiceId, receptor: lessonId },
        null,
        result => {
            $scope.studentInfos = result.PracticeStudentInfos;            
            if (result.IsExistMutualEvaluative) {
                $scope.isExistMutualEvaluative = true;
                $scope.mutualEvaluateId = result.MutualEvaluateId;
                $scope.studentTargetId = result.StudentTargetId;
                $scope.studentInfos.forEach(s => {
                    if(s.StudentId == result.StudentTargetId){
                        $scope.selectStudent = s; 
                        $scope.scoredTarget = {
                            ScoredId: $scope.selectStudent.StudentId,
                            TargetType: 'SINGLE_USER',
                            Image: platformImage($scope.selectStudent.Photo, 'avatar.small'),
                            Name: $scope.selectStudent.Name
                        };
                        if ($scope.taskType == 'RECORD') {
                            //重置录音播放组件
                            audioService.terminatePlayback();
                            let audioUrl = $scope.selectStudent.Answer;
                            audioService.initPlayback({
                                file: $filter('fastUploadStreamFilter')(audioUrl),
                                autoStart: false
                            });
                        }                           
                    }
                });
            }
            disposalAnswer($scope.studentInfos);               
        },
        err => {
            $log.error('获取讲评详情信息失败', err);
        })
        .$promise
        .finally(() => {
            $scope.loadData = false;
        });
    }

    /*************************************页面方法******************************** */
    //查询页面缓存数据 
    function getLocalStorage(practiceId) {
        let evaluationStyle = localStorage.get(practiceId);
        if (evaluationStyle == 'SHOW_DETAIL') {
            $scope.evaluationStyle = 'SHOW_DETAIL';
            $clientProxy.showWindow({
                id: 'ClassroomTeaching.Practice.Text.FullScreen',
                param: {
                    relationid: practiceId,
                    relationtype: relationType,
                    type: $scope.taskType
                }
            });    
        }
        else {
            $scope.evaluationStyle = 'HIDE_DETAIL';
        }
    }

    var audioService = null;
    var imageCtr = null;
    //筛选学生
    $scope.filterStudent = function (info) {
        if ($scope.isExistMutualEvaluative) {
            return;
        }
        
        $scope.selectStudent = $scope.studentInfos.find(item => item.Answer == info.Answer && item.StudentId == info.StudentId);
        $scope.scoredTarget = {
            ScoredId: $scope.selectStudent.StudentId,
            TargetType: 'SINGLE_USER',
            Image: platformImage($scope.selectStudent.Photo, 'avatar.small'),
            Name: $scope.selectStudent.Name
        };

        if ($scope.taskType == 'RECORD') {
            //重置录音播放组件
            audioService.terminatePlayback();
            let audioUrl = $scope.selectStudent.Answer;
            audioService.initPlayback({
                file: $filter('fastUploadStreamFilter')(audioUrl),
                autoStart: false
            });
        }
    };

    //音频
    $scope.onAudioInit = function (audio) {
        audioService = audio;
    };

    //图片 
    $scope.onImageInit = function (image) {
        imageCtr = image;
    };

    $scope.rotateLeft = function () {
        imageCtr.rotateLeft();
    };
    
    var zoomMultiple = 1;
    $scope.zoomIn = function () { 
        imageCtr.zoomIn(zoomMultiple);
    };
    $scope.zoomOut = function () {
        imageCtr.zoomOut(zoomMultiple);
    };

    //整理学生答案
    function disposalAnswer(studentInfos) {
        // studentInfos.forEach(studentInfo => {
        //     let answers = studentInfo.Answer.split(',');
        //     answers.forEach(answer => {
        //         let info = Object.create(studentInfo);
        //         info.Answer = answer;
        //         $scope.studentInfos.push(info);
        //     });
        // });

        if (studentInfos.length < 16) {
            let row = Math.ceil(studentInfos.length / 4);
            let fillDiv = document.getElementById('fillAnswer');
            fillDiv.style.height = 100 - 12.5 * row + "%";
            fillDiv.style.minHeight = 50 + '%';
        }
    };

    /**********************************初始化************************************/
    const DEFAULT_SYNC_INTERVAL = 1000;
    function init() {
        $scope.isLoading = true;
        practiceService.getPractice(
            { id: practiceId },
            null,
            result => {
                $scope.state = result.PracticeState;
                //练习中
                if ($scope.state == 'PRACTICING') {
                    practiceService.getPracticeProgress(
                        { id: practiceId },
                        null,
                        result => {
                            duringSeconds = result.DuringSeconds;
                            showTimer();
                            if (result.WaitAnswerStudents.length == 5) {
                                result.WaitAnswerStudents = result.WaitAnswerStudents.toString() + "...";
                            }
                            else {
                                result.WaitAnswerStudents = result.WaitAnswerStudents.toString();
                            }
                            $scope.parcticeInfo = result;
                        })
                        .$promise
                        .finally(() => {
                            timer = $interval(showTimer, DEFAULT_SYNC_INTERVAL);
                            getpracticeProgress();
                        });
                }
                else if ($scope.state == 'PRACTICE_COMPLETE') {
                    getPracticeDetail();       
                    getPracticeComplete();                                
                }
            })
            .$promise
            .finally(() => {
                $scope.isLoading = false;
            });
    }

    init();
}]);

}());