(function ()
{
'use strict';

angular.module('ClassroomTeaching.Cooperation.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('cooperationService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_cooperation'];
    
    var arrangeMemberRes = $resource(path.combine(serviceRoot, 'Member/:id/:receptor'), { id: '@id', receptor: '@receptor'}, {
        getAllGroupMembers: { method: 'GET' },
        setChair: { method: 'PUT' },
        chairDiscussion: { method: 'POST' }
    });

    this.getAllGroupMembers = arrangeMemberRes.getAllGroupMembers.bind(arrangeMemberRes);
    this.setChair = arrangeMemberRes.setChair.bind(arrangeMemberRes);
    this.chairDiscussion = arrangeMemberRes.chairDiscussion.bind(arrangeMemberRes);

    var arrangeMessageRes = $resource(path.combine(serviceRoot, 'MessageQuery/:id'), { id: '@id' }, {
        getAllMessages: { method: 'GET' },
        querySpecifiedMessages: { method: 'POST', isArray: true}
    });

    this.getAllMessages = arrangeMessageRes.getAllMessages.bind(arrangeMessageRes);
    this.querySpecifiedMessages = arrangeMessageRes.querySpecifiedMessages.bind(arrangeMessageRes);

    var res = $resource(path.combine(serviceRoot, 'Environment'), null, {
        getRoute: { method: 'GET'},
    });
    this.getRoute = res.getRoute.bind(res);
    
}]);

}());