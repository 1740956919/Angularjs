(function ()
{
'use strict';

angular.module('ClassroomTeaching.Discussion.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('discussionService', ['$resource','path','routeTable','$q',function ($resource,path,routeTable,$q) {
    var sreviceRoot = routeTable['classroomteaching_discussion'];

    //提供分组讨论控制的能力
    var groupDiscussionRes = $resource(path.combine(sreviceRoot, "Lifecycle/:id/:receptor"),{ id: "@id",receptor:"@receptor" },{
        getDiscussionState: { method: "GET" },
        startDiscussion: { method: "PUT" },
        stopDiscussion: { method: "POST" },
        endDiscussion: { method: "DELETE" }
    });
    this.getDiscussionState = groupDiscussionRes.getDiscussionState.bind(groupDiscussionRes);
    this.startDiscussion = groupDiscussionRes.startDiscussion.bind(groupDiscussionRes);
    this.stopDiscussion = groupDiscussionRes.stopDiscussion.bind(groupDiscussionRes);
    this.endDiscussion = groupDiscussionRes.endDiscussion.bind(groupDiscussionRes);

    //提供监控分组讨论的能力
    var discussionMonitorRes = $resource(path.combine(sreviceRoot, "Monitor/:id"), { id: "@id" }, {
        getMonitorGroups: { method: "GET" },
    });
    this.getMonitorGroups = discussionMonitorRes.getMonitorGroups.bind(discussionMonitorRes);

    //提供评审小组讨论结果的能力
    var discussionReviewRes = $resource(path.combine(sreviceRoot, "Review/:id"), { id: "@id" }, {
        getGroupDiscussionReview: { method: "GET"},
    });
    this.getGroupDiscussionReview = discussionReviewRes.getGroupDiscussionReview.bind(discussionReviewRes);
}])


.service('studentManageService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];

    var scoreStudentRes = $resource(path.combine(serviceRoot, 'PerformanceScore/:id'), { id: '@id'}, {
        startScore: { method: 'PUT' }
    });

    this.startScore = scoreStudentRes.startScore.bind(scoreStudentRes);
}]);


}());
