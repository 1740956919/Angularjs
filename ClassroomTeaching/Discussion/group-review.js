(function ()
{
'use strict';

angular.module('ClassroomTeaching.Discussion.Review', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'Figure-Config-RouteTable',

    'LINDGE-Toast',
    'LINDGE-ClassroomApp.MJpegPlayer',
    'LINDGE-ClassroomApp.MutualScoreView',
    'ClassroomTeaching.ErrorService',
    'Client.Services.ClientProxy', 
    'ClassroomTeaching.Discussion.Service'    
])

//排列模式
.constant('DISPLAY_MODES',[
    {
        Style:'1',
        Name:'2X2',
        Count:4
    },
    {
        Style:'2',
        Name:'3X2',
        Count:6
    },
    {
        Style:'3',
        Name:'4X3',
        Count:12
    } 
])

.controller('ReviewCtrl', ['$scope', '$luiHref', '$clientProxy','discussionService','studentManageService', 'queryString', 'DISPLAY_MODES','localStorageService','errorService','$filter',
function ($scope, $luiHref,$clientProxy, discussionService, studentManageService, queryString,DISPLAY_MODES,localStorage,errorService,$filter) {
    // controller code here
    $scope.lessonId = queryString.get('lessonid');
    $scope.discussionId = queryString.get('relationid'); 
    var relationType = queryString.get('relationtype'); 

    $scope.groups = [];   
    $scope.isLoading = false;
    $scope.isExistMutualEvaluative = false;
    $scope.isReviewScreen = false;
    $scope.displayModes = DISPLAY_MODES;  
    $scope.discussType = '';
    //页码
    var currentPage = 1; 
    //行为属性数据
    var behaviorAttributeData = {
        DisplayMode: {},
        GroupId : '',
        IsReview : false 
    };
     //默认显示模式
     $scope.displayMode = DISPLAY_MODES[0];
    //选中的小组屏
    $scope.selectedScreen = {};
    
    //播放类型
    $scope.playType = 'Channel';


    /*************************页面按钮********************************* */
    //结束讨论
    $scope.endDiscuss = function () {
        if ($scope.isEnd) {
            return;
        }

        $scope.isEnd = true;
        discussionService.endDiscussion(
        {
            id: $scope.lessonId,
            receptor: $scope.discussionId
        },
        null,
        result => {
            if($scope.isReviewScreen){
                //通知外壳关闭小组屏幕              
                if($scope.discussType == 'BRAINSTORMING'){              
                    $clientProxy.hideWindow('ClassroomTeaching.Brainstorming');  
                }
                else{              
                    $clientProxy.hideWindow('ClassroomTeaching.Cooperation.Content');  
                }   
            }    
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Discussion',
                param:{
                    lessonid:$scope.lessonId,               
                },
                isForceReload : true        
            });             
        })
        .$promise
        .finally(() => {
            $scope.isEnd = false;
        });
    };

    //改变显示模式
    $scope.changArrangeModel = function (displayMode) {     
        $scope.displayMode = displayMode;
        currentPage = 1;

        showScreens();
    };

    //切换页码
    $scope.changePage = function(derection)
    {
        if(derection == 'previous'){          
            currentPage -= 1;
        }
        else if(derection == 'next'){           
            currentPage += 1;
        }
        showScreens();
    };

    //全屏显示
    $scope.zoomScreen = function(selectedScreen){
        if($scope.isReviewScreen)
        {
            $scope.isReviewScreen = false;
            currentPage = Math.ceil($scope.selectedScreen.Index / $scope.displayMode.Count);
            //通知外壳关闭小组屏幕
            if($scope.discussType == 'BRAINSTORMING'){              
                $clientProxy.hideWindow('ClassroomTeaching.Brainstorming');  
            }
            else{              
                $clientProxy.hideWindow('ClassroomTeaching.Cooperation.Content');  
            }           
            //通知外壳展开页面                
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Discussion.Review.FullScreen',
                param:{
                    lessonid:$scope.lessonId,     
                    relationid:$scope.discussionId,
                    relationtype: relationType         
                }
            });               
        }
        else
        {          
            $scope.isReviewScreen = true;            
            currentPage = selectedScreen.Index;     
             //通知外壳折叠页面
             $clientProxy.showWindow({
                id:'ClassroomTeaching.Discussion.Review.Controlbar',
                param:{
                    lessonid:$scope.lessonId,             
                    relationid:$scope.discussionId,
                    relationtype: relationType     
                }
            });                              
        }                 
        showScreens();          
    };

    $scope.changePlayMode = function(palyMode){
        $scope.playType = palyMode;
    };

    //评价
    $scope.appraiseStudent = function(){
        studentManageService.startScore(
            { id: $scope.lessonId },
            { 
                TargetIds: [$scope.selectedScreen.GroupId],
                TargetType: 'GROUP'
            },
            result => {
                $clientProxy.showWindow({
                    id: 'ClassroomTeaching.Students.Score', 
                    param: {
                        lessonid: $scope.lessonId,
                        behaviorid: result.BehaviorId,
                        studentname: $scope.selectedScreen.GroupName
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
                lessonId: $scope.lessonId,
                action: 'START_MUTUAL_EVALUATE',
                content: $state.sessionId,
                needCapture: true
            });   
        }
    };

    //结束互评
    $scope.stopMutualScore = function($state){
        $scope.isExistMutualEvaluative = false;
        $clientProxy.addRecord({
            lessonId: $scope.lessonId,
            action: 'STOP_MUTUAL_EVALUATE',
            content: $state.sessionId,
            needCapture: true
        });
    };

    //互评错误信息
    $scope.showErrorMessage = function($error){
        errorService.showErrorMessage($error.detail);
    };
    
    /*****************************公共方法************************************ */
    //获取行为属性
    function getDiscussionAttr(){
        let attributeData = localStorage.get($scope.discussionId+'review');     
        if(attributeData){
            $scope.displayMode = attributeData.DisplayMode;
            $scope.selectedScreen = $scope.groups.find(g=>g.GroupId == attributeData.GroupId);
            if(attributeData.IsReview){
                $scope.isReviewScreen = true;
                currentPage = $scope.selectedScreen.Index;
            }
            else{
                currentPage = Math.ceil($scope.selectedScreen.Index / $scope.displayMode.Count);                            
            }
        }
        if(!$scope.isReviewScreen){
             //通知外壳展开页面           
            $clientProxy.showWindow({
                id:'ClassroomTeaching.Discussion.Review.FullScreen',
                param:{
                    lessonid:$scope.lessonId, 
                    relationid:$scope.discussionId,
                    relationtype: relationType            
                }
            });
        }
        showScreens();
    };

    //显示画面
    function showScreens() {
        if ($scope.isReviewScreen) {
            $scope.selectedScreen = $scope.groups.find(group => group.Index == currentPage);
            $scope.scoredTarget = {
                ScoredId: $scope.selectedScreen.GroupId,
                TargetType: 'GROUP',                
                Name: $scope.selectedScreen.GroupName
            };  
            if($scope.discussType == 'BRAINSTORMING'){                
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Brainstorming',
                    param:{
                        id:  $scope.selectedScreen.DiscussBoardId,
                        readonly: true,
                        state: 'review'
                    },
                    isForceReload : true
                });
            }
            else{              
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Cooperation.Content',
                    param:{
                        id:  $scope.selectedScreen.DiscussBoardId       
                    },
                    isForceReload : true
                });
            }              
        }
        else {
            $scope.groups.forEach(group => {
                if ((currentPage - 1) * $scope.displayMode.Count < group.Index && group.Index <= currentPage * $scope.displayMode.Count) {
                    group.IsShow = true;
                    group.Style = $scope.displayMode.Style;
                }
                else {
                    group.IsShow = false;
                }
            });          
            $scope.selectedScreen = $scope.groups.find(item => item.IsShow == true);              
        }  
       
        behaviorAttributeData.DisplayMode = $scope.displayMode;          
        behaviorAttributeData.IsReview = $scope.isReviewScreen; 
        behaviorAttributeData.GroupId = $scope.selectedScreen.GroupId;
        let attributeData = JSON.stringify(behaviorAttributeData);
        localStorage.set($scope.discussionId+'review', attributeData);          
    };
   
    /**********************************初始化************************************/
    function init(){
        $scope.isLoading = true;
        discussionService.getGroupDiscussionReview(
        { id: $scope.discussionId },
        null,
        result => {      
            $scope.discussType = result.DiscussType;
            $scope.isExistMutualEvaluative = result.IsExistMutualEvaluative;              
            if(result.GroupDiscussResults.length > 0){
                $scope.groups = result.GroupDiscussResults;  
                $scope.groups.sort((a, b) => {
                    let val1 = a.GroupName;
                    let val2 = b.GroupName;;                              
                    if (val1 < val2) {
                        return -1;
                    } else if (val1 > val2) {
                        return 1;
                    } else {
                        return 0;
                    }                   
                });                 
                $scope.groups.forEach(group => {
                    group.Style = $scope.displayMode.Style;
                    group.IsShow = false;                    
                    group.Index = result.GroupDiscussResults.indexOf(group)+1;                                      
               });                       
               getDiscussionAttr();      
            }
            else{
                $clientProxy.showWindow({
                    id:'ClassroomTeaching.Discussion.Review.FullScreen',
                    param:{
                        lessonid: $scope.lessonId,     
                        relationid: $scope.discussionId,
                        relationtype: relationType  
                    }
                });   
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