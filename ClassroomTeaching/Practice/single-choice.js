    (function ()
    {
    'use strict';

    angular.module('ClassroomTeaching.Practice.SingleChoice', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',

    'ClassroomTeaching.Practice.Service',
    'Figure-Config-RouteTable', 
    'Client.Services.ClientProxy', 
    'Client.Services.Initiation',
    'LINDGE-ClassroomApp.MutualScoreView'
    ])

    .filter('sliceContent',['$filter',function($filter){
        return function sliceContent(text) {
            let len = 4;       
            if(text.length > len) {
                let textArr = text.substr(0,len);
                return textArr+'...';
            }
            else{
               return text;
            }
        };
    }])

    .controller('SingleChoiceCtrl', ['$scope','practiceService', 'studentManageService', 'queryString', 'localStorageService','$clientProxy','$interval',
    function ($scope,practiceService, studentManageService, queryString, localStorage, $clientProxy,$interval) {
    // controller code here

    /*******************************初始化参数*******************************/
    var practiceId = queryString.get('relationid');
    var type = queryString.get('type');
    var lessonId = queryString.get('lessonid');

    $scope.isLoading = false;
    //练习状态
    $scope.state = '';
    //练习信息
    $scope.parcticeInfo = null;

    //是否存在未结束的互评
    $scope.isExistMutualEvaluative = false;
    $scope.mutualEvaluateId = '';

    //学生信息
    $scope.studentInfos = [];
    $scope.StudentShowData = [];
    //讲评汇总信息
    $scope.sumarryInfo = [];

    //讲评方式
    $scope.evaluationStyle = 'HIDE_DETAIL';
    //点击选中的答案
    $scope.selectAnswer = '';

    //计时器
    $scope.timeData = '';
    var duringSeconds = 0;
    //定时器
    var timer = null;
    var practiceProgress = null;

    /*********************************功能按钮********************************/
    //停止练习
    $scope.stopPractice = function(){
        if($scope.isStop == true){
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
    $scope.endPractice = function(){
        if($scope.isEnd == true){
            return;
        }

        $scope.isEnd == true;
        practiceService.deletePracticeReview(
        { id: practiceId,receptor:lessonId },
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
                    id:'ClassroomTeaching.Practice',
                    isForceReload : true                
                }); 
            });                                  
        })
        .$promise
        .finally(() => {  
            $scope.isEnd == false;        
        });
    };

     //评价
     $scope.appraiseStudent = function(){
         let students = $scope.StudentShowData.find(item => item.Answer == $scope.selectAnswer).Students;
         let studentName = '';
         if(students.length > 1){
            studentName = students[0].Name + '等';
         }
         else{
            studentName = students[0].Name;
         }         
         let studentIds = students.map((item) => { return item.StudentId; });
        studentManageService.startScore(
            { id: lessonId },
            { 
                TargetIds: studentIds,
                TargetType: 'MANY_USER'
            },
            result => {
                $clientProxy.showWindow({
                    id: 'ClassroomTeaching.Students.Score', 
                    param: {
                        lessonid: lessonId,
                        behaviorid: result.BehaviorId,
                        studentname: studentName,
                    }
                });
            }
        );     
    };

    //点击简报
    $scope.showBrief = function(){         
        //现在是否在显示详情     
        if($scope.evaluationStyle == 'SHOW_DETAIL'){       
            $scope.selectAnswer = '';   
            $scope.StudentShowData = [];           
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Practice.Choice.Controlbar',
                param:{
                    relationid:practiceId,
                    type:type
                }
            });  
        }

        //通知外壳打开简报窗口
        $clientProxy.showWindow({
            id:'ClassroomTeaching.Practice.Brief',
            param: {
                id: practiceId,
                type: type
            }
        });
      
        $scope.evaluationStyle = 'HIDE_DETAIL';     
        localStorage.set(practiceId, $scope.evaluationStyle);  
    };

    //详情
    $scope.showDetail = function(){  
        if($scope.evaluationStyle == 'HIDE_DETAIL'){
            $scope.evaluationStyle = 'SHOW_DETAIL';                              
            getPracticeDetail();
        }
        else{
            $scope.evaluationStyle = 'HIDE_DETAIL';  
            $scope.selectAnswer = '';   
            $scope.StudentShowData = [];   
            $scope.otherAnswer = [];   
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Practice.Choice.Controlbar',
                param:{
                    relationid:practiceId,
                    type:type
                }
            });          
        }
        localStorage.set(practiceId, $scope.evaluationStyle);
    };

    /**********************************方法**********************************/
    //显示时间
    function showTimer(){
        let minute = Math.floor(duringSeconds / 60) % 60;
        let second = duringSeconds % 60;
        if(minute < 10){
            minute = '0' + minute;
        }
        if(second < 10){
            second = '0' + second;
        }
        $scope.timeData = minute + ':' + second;  
        duringSeconds += 1;  
    }

    //查询练习的进度信息
    function getpracticeProgress(){     
        practiceService.getPracticeProgress(
        { id: practiceId },
        null,
        result => {           
            if(result.WaitAnswerStudents.length == 5){
                result.WaitAnswerStudents = result.WaitAnswerStudents.toString() + "...";              
            }   
            else{
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
    function getPracticeComplete(){
        practiceService.getPracticeReview(
        { id: practiceId },
        null,
        result => {           
            $scope.parcticeInfo = result.PracticeSummaryInfo;    
            if(result.IsExistMutualEvaluative){
                $scope.isExistMutualEvaluative = true;                          
            }     
            duringSeconds = result.PracticeSummaryInfo.DuringSeconds;   
            showTimer();                   
        })
        .$promise
        .finally(() => {   
            getLocalStorage(practiceId);    
        });              
    }
   
    //查询页面缓存数据 
    function getLocalStorage(practiceId) {
        $scope.evaluationStyle = localStorage.get(practiceId);
        if ($scope.evaluationStyle == 'SHOW_DETAIL') {
            //展开页面      
            $clientProxy.showWindow({
                id: 'ClassroomTeaching.Practice.Choice.FullScreen',
                param: {
                    relationid: practiceId,
                    type: type
                }
            });
            getPracticeDetail();
        }
        else{
            $scope.evaluationStyle = 'HIDE_DETAIL';
        }
    }

    //查询讲评详情信息
    function getPracticeDetail(){
        $scope.isLoading = true;
        practiceService.getPracticeDetail(
        { id: practiceId ,receptor: lessonId },
        null,
        result => {  
            $scope.studentInfos = result.PracticeStudentInfos; 
            if($scope.studentInfos.length > 0){
                let answers = $scope.studentInfos.map(
                    function(studentInfo){
                        return studentInfo.Answer;
                    }
                );
                summaryAnswer(answers);
            }           
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Practice.Choice.FullScreen',
                param:{
                    relationid:practiceId,
                    type:type                      
                }
            });
        });       
    }

    //筛选学生
    $scope.filterStudent = function(info){
        $scope.selectAnswer = info.Answer.toUpperCase();
        $scope.otherAnswer = [];
        if(info.Answer == '其他'){
            $scope.otherAnswer = $scope.StudentShowData.slice(4).map(item => item.Answer);
        }       
    };

    //计算学生答案汇总信息
    function summaryAnswer(answers) {
        //拆分多选答案 
        if (type == 'MULTIPLE') {
            let answerString = answers.toString();
            answers = answerString.split(',');
        }

        //统计每项答案数量
        $scope.sumarryInfo = answers.reduce((obj, item) => {
            let answer = item.toUpperCase();
            let find = obj.find(i => i.Answer === answer);
            let _d = {
                Answer: answer,
                Frequency: 1,
            };
            find ? (find.Frequency++) : obj.push(_d);
            return obj;
        }, []);

        //将答案排序      
        $scope.sumarryInfo.sort((a, b) => {
            let val1;
            let val2;
            if (type == 'SINGLE' || type == 'MULTIPLE') {
                val1 = a.Answer;
                val2 = b.Answer;
                if (val1 < val2) {
                    return -1;
                } else if (val1 > val2) {
                    return 1;
                } else {
                    return 0;
                }
            }
            else {
                val1 = a.Frequency;
                val2 = b.Frequency;
                if (val1 < val2) {
                    return 1;
                } else if (val1 > val2) {
                    return -1;
                } else {
                    return 0;
                }
            }
        });    

        //用于页面右侧显示的信息
        $scope.sumarryInfo.forEach(info =>{
            let studentInfo = {
                Answer:'',
                Students:[]
            };
            studentInfo.Answer = info.Answer;           
            if(type == 'MULTIPLE'){
                studentInfo.Students = $scope.studentInfos.filter(i => i.Answer.toUpperCase().includes(info.Answer));              
            }else{
                studentInfo.Students = $scope.studentInfos.filter(i => i.Answer.toUpperCase() == info.Answer);
            }
            $scope.StudentShowData.push(studentInfo);
        });

        //汇总填空题后面的数据
        if(type == 'FILL_BLANK' && $scope.sumarryInfo.length >= 5){         
            let subArr = $scope.sumarryInfo.slice(4);
            let otherCount = 0;
            subArr.forEach(item => {
                otherCount += item.Frequency;
            });
            let otherData = {
                Answer: '其他',
                Frequency: otherCount
            };
            $scope.sumarryInfo.splice(4,$scope.sumarryInfo.length - 4,otherData);
        }
        
        //计算每项答案的百分比
        $scope.sumarryInfo.forEach(item => {
            item['Percent'] = item.Frequency / answers.length * 100 ;             
        });       
    }
    
    

    /**********************************初始化************************************/
    const DEFAULT_SYNC_INTERVAL = 1000;  
    function init(){
        $scope.isLoading = true;
        practiceService.getPractice(
        { id: practiceId },
        null,
        result => {
            $scope.state = result.PracticeState;
            if($scope.state == 'PRACTICING'){   
                practiceService.getPracticeProgress(
                { id: practiceId },
                null,
                result => {                             
                    duringSeconds = result.DuringSeconds;   
                    showTimer();
                    if(result.WaitAnswerStudents.length == 5){
                        result.WaitAnswerStudents = result.WaitAnswerStudents.toString() + "...";              
                    }   
                    else{
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
            else if($scope.state == 'PRACTICE_COMPLETE'){               
                getPracticeComplete();                                     
            }       
        })
        .$promise
        .finally(()=>{
            $scope.isLoading = false;
        });      
    }
    init();
    
    }]);
}());