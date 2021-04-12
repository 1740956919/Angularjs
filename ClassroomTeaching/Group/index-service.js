(function ()
{
'use strict';

angular.module('ClassroomTeaching.Group.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('groupArrangeService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_discussion'];
    
    var arrangeGroupRes = $resource(path.combine(serviceRoot, 'Group/:id'), { id: '@id'}, {
        startGroup: { method: 'PUT' },
        completeGroup: { method: 'DELETE' },
        getGroupResult: { method: 'GET' }
    });

    this.startGroup = arrangeGroupRes.startGroup.bind(arrangeGroupRes);
    this.completeGroup = arrangeGroupRes.completeGroup.bind(arrangeGroupRes);
    this.getGroupResult = arrangeGroupRes.getGroupResult.bind(arrangeGroupRes);

    var errorCodes = {
        '': ''
    };


    this.getErrorMessage = function (code) {
        code = String(code);
        var msg = errorCodes[code];
        return !!msg ? msg : '';
    };
}]);

}());