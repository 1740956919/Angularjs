(function ()
{
'use strict';

angular.module('ClassroomTeaching.Cooperation', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    
    'ClassroomTeaching.Control.ToolbarButton',
    'ClassroomTeaching.Cooperation.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'LINDGE-Toast'
])

.controller('MainCtrl', ['$scope', 'cooperationService', '$lindgeToast', '$clientProxy', 'queryString',
function ($scope, cooperationService, $lindgeToast, $clientProxy, queryString) {
    var discussionId = queryString.get('id');
    const { ipcRenderer } = require('electron');
    $scope.chairId = '';
    $scope.isDiscussing = true;
    $scope.isSidebarOpening = false;
    $scope.groupMembers = [];

    $scope.clickSidebar = function () {
        if ($scope.isSidebarOpening) {
            $scope.isSidebarOpening = false;
            $clientProxy.hideWindow('ClassroomTeaching.Cooperation.Content');
        } else {
            $scope.isSidebarOpening = true;
            $clientProxy.showWindow({id: 'ClassroomTeaching.Cooperation.Content', param: {
                id: discussionId
            }});
        }
    };

    $scope.replaceChair = function (item) {
        if (item.MemberId != $scope.chairId) {
            $scope.isReplacing = true;
            if ($scope.chairId) {
                cooperationService.setChair({
                    id: discussionId,
                    receptor: item.MemberId
                }, result => {
                    setChair(item.MemberId);
                })
                .$promise
                .finally(() => {
                    $scope.isReplacing = false;
                });
            } else {
                cooperationService.chairDiscussion({
                    id: discussionId
                }, {
                    IsAssignMember: true,
                    MemberId: item.MemberId
                }, result => {
                    setChair(item.MemberId);
                })
                .$promise
                .finally(() => {
                    $scope.isReplacing = false;
                });
            }
        }
    };

    function updateGroupMembers() {
        cooperationService.getAllGroupMembers({
            id: discussionId
        }, result => {
            $scope.isDiscussing = result.State == 'PROGRESSING' ? true : false;
            $scope.groupMembers = result.GroupMembers;
            if ($scope.groupMembers.some(g => g.IsChair)) {
                $scope.groupMembers.forEach(g => {
                    if (g.IsChair) {
                        $scope.chairId = g.MemberId;
                        if ($scope.isSidebarOpening) {
                            setChair(g.MemberId);
                        } 
                    }
                });
            } else {
                if ($scope.isDiscussing) {
                    setTimeout(updateGroupMembers, 1000);
                }
            }
        });
    }

    function setChair(memberId) {
        if ($scope.chairId != memberId) {
            $scope.chairId = memberId;
            if ($scope.isSidebarOpening) {
                $clientProxy.sendMessage('change-chair', memberId);
            }
        } else {
            $clientProxy.sendMessage('change-chair', memberId);
        }
    }

    function init() {
        ipcRenderer.on('set-discussion-state', (event, arg) => {
            $scope.isDiscussing = arg == 'PROGRESSING' ? true : false;
            $scope.$apply();
        });
        $scope.clickSidebar();
        updateGroupMembers();
    }

    init();
}]);

}());