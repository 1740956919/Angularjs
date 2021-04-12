(function () {
'use strict';

angular.module('ClassroomTeaching.Discussion', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',

    'ClassroomTeaching.Discussion.Service',
    'Figure-Config-RouteTable',
    'Figure-Config-ConfigSection',
    'LINDGE-Toast',
    'ClassroomTeaching.ErrorService',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'ClassroomTeaching.Control.ToolbarButton'
])

.controller('MainCtrl', ['$scope', '$luiHref', 'discussionService', 'discussType', 'queryString', 'errorService','$clientProxy',
function ($scope, $luiHref, discussionService,discussType, queryString,errorService,$clientProxy) {
    // controller code here
    var lessonId = queryString.get('lessonid');
    $scope.groupCount = 0;
    $scope.state = '';
    $scope.discussionType = "";
    $scope.isLoading = false;
    //讨论类型
    $scope.discussTypes = discussType;

    //选择类型
    $scope.selecteDiscussType = function(discussionType){
        $scope.discussionType = discussionType;
    };

    //开始分组讨论
    $scope.startDiscuss = function(){
        if($scope.isBeginning){
            return;
        }
        $scope.isBeginning = true;
        discussionService.startDiscussion(
        { id: lessonId },
        {
            DiscussionType:$scope.discussionType
        },
        result => {
            let discussionId = result.DiscussionId;    
            $clientProxy.addRecord({
                lessonId: lessonId,
                action: $scope.discussionType == 'BRAINSTORMING' ? 'START_BRAINSTORMING' : 'START_COOPERATION',
                content: $scope.discussionType == 'BRAINSTORMING' ? '头脑风暴' : '协作研讨',
                needCapture: true
            }).finally(() => {
                $luiHref.goto('group-discuss.html', {
                    lessonid: lessonId,
                    relationid: discussionId,
                    relationtype:$scope.discussionType,             
                });  
            });                 
        },
        err => {
            errorService.showErrorMessage(err); 
        })
        .$promise
        .finally(() => {
            $scope.isBeginning = false;
        });
    };

    /******************************初始化****************************/
    function init() {
        $scope.isLoading = true;
        discussionService.getDiscussionState(
        { id:  lessonId },
        null,
        result => {
            $scope.groupCount = result.GroupCount;
            $scope.isActive = result.IsActive;
            $scope.state = result.State;
            let discussionId = result.DiscussionId;           
            if ($scope.state == 'PROGRESSING') {
                $luiHref.goto('group-discuss.html', {
                    lessonid: lessonId,
                    relationid: discussionId,
                    relationtype: result.Type,
                });
            }
            else if ($scope.state == 'PAUSED') {                 
                $luiHref.goto('group-review.html', {
                    lessonid: lessonId,
                    relationid: discussionId,
                    relationtype: result.Type,
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