(function ()
{
'use strict';

angular.module('ClassroomTeaching.Practice', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    
    'ClassroomTeaching.Practice.Service',
    'Figure-Config-RouteTable',
    'Figure-Config-ConfigSection',
    'LINDGE-Toast',
    'ClassroomTeaching.ErrorService',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation'
])

.controller('MainCtrl', ['$scope','$luiHref','practiceService','practiceType','queryString','$lindgeToast','errorService','$clientProxy',
function ($scope, $luiHref,practiceService,practiceType,queryString,$lindgeToast,errorService,$clientProxy) {
    // controller code here

    /**********************初始化参数**************************/
    //加载数据
    $scope.isLoading = false;
    //抢答
    $scope.isGrapAnswer = false;
    //随机
    $scope.isRandom = false;
    //练习
    $scope.isPracite = false;

    //练习题型
    $scope.practiceTypes = practiceType;
    //互动状态
    $scope.state= '';   
  
    //课时标识
    var lessonId = queryString.get('lessonid');

    /*****************************功能按钮*******************************/
    //跳转到抢答页面
    $scope.gotoGrabAnswer = function(){            
        if($scope.isGrapAnswer == true){
            return;
        }

        $scope.isGrapAnswer = true;
        practiceService.createGrabAnswer(
        { id: lessonId },
        null,
        result => {            
            let grabAnswerId = result.GrabAnswerId;
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'START_GRAB_ANSWER',
                content: '抢答',
                needCapture: true
            })
            .finally(() => {
                let state = 'GRAB_ANSWER';
                gotoPage(state,grabAnswerId);   
            });       
        },
        err => {   
            errorService.showErrorMessage(err);                
        })
        .$promise
        .finally(()=>{
            $scope.isGrapAnswer = false;
        });       
    };

    //跳转到随机页面
    $scope.gotoRandom = function(){       
        if($scope.isGrapAnswer == true){
            return;
        }

        $scope.isGrapAnswer = true;
        practiceService.createRandomCandidate(
        { id: lessonId },
        null,
        result => {
            let randomId = result.RandomRollCallId;
            if(randomId != ''){
                $clientProxy.addRecord({
                    lessonId: lessonId,
                    action: 'START_RANDOM_ROLL_CALL',
                    content: '随机发言',
                    needCapture: true
                })                
                .finally(() => {
                    let state = 'RANDOM';
                    gotoPage(state,randomId);                      
                });
            }
            else{               
                CompletePerformanceScore();
            };        
        })
        .$promise
        .finally(()=>{
            $scope.isGrapAnswer = false;
        });           
    };

    function CompletePerformanceScore(){      
        let tosatType = $lindgeToast.NOTIFICATION_TYPE.WARN;      
        $lindgeToast.notify(tosatType,{
            header: '随机',
            body: '暂无学员',
            icon: 'lic-exclamation-triangle-fill',
            timeout: 4000
        });
    }

    //跳转到练习页面
    $scope.gotoPractice = function(practiceType){
        if($scope.isPracite == true){
            return;
        }
        $scope.isPracite = true;
        practiceService.createPractice(
        null,
        { 
            LessonId: lessonId,
            Type: practiceType.Code,
            Title: practiceType.Title
        },      
        result => {
            let practiceId = result.PracticeId;
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: 'START_EXERCISE',
                content: practiceType.Title,
                needCapture: true
            })               
            .finally(() => {
                showPractice(practiceType.Code, practiceId);
            });         
        },
        err => {
            errorService.showErrorMessage(err);          
        })
        .$promise
        .finally(()=>{     
            $scope.isPracite = false;       
        });     
    };


    /*****************************页面方法************************************/
    //显示练习窗口
    function showPractice(type, interactionId){
        let category = $scope.practiceTypes.find(item => item.Code == type).Category;      
        let path = '';
        if(category == "CHOICE"){
            path = 'single-choice.html';
        }
        else{
            path = 'text-type.html';
        }               
        $luiHref.goto(path, { 
            lessonid: lessonId,   
            relationid: interactionId,
            relationtype: 'practice',               
            type: type
        });    
    }

    //跳转页面(抢答和随机)
    function gotoPage(state,interactionId){
        let path = '';
        let location = '';
        if (state == 'GRAB_ANSWER') {
            path = 'grab-answer.html';
            location = 'grabAnswer';
        }
        else if (state == 'RANDOM') {
            path = 'random-candidate.html';
            location = 'random';
        }
        $luiHref.goto(path, {          
            lessonid: lessonId,
            relationid: interactionId,
            relationtype: location,
        });
    }


    /******************************初始化****************************/
    function init(){
        $scope.isLoading = true;
        practiceService.getInteractionState(
        { id: lessonId },
        null,
        result => {
            $scope.state = result.State;
            $scope.isActive = result.IsActive;
            let interactionId = result.InteractionId;
            if($scope.state == 'GRAB_ANSWER' || $scope.state == 'RANDOM'){
                gotoPage($scope.state,interactionId);
            }
            else if($scope.state == 'PRACTICE'){
                showPractice(result.Type, interactionId);
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