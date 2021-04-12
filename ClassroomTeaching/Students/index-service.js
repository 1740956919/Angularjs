(function ()
{
'use strict';

angular.module('ClassroomTeaching.Students.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('studentManageService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];

    var studentOverseeRes = $resource(path.combine(serviceRoot, 'StudentOversee/:id'), { id: '@id' }, {
        overseeStudent: { method: 'GET' }
    });
    var studentInfoRes = $resource(path.combine(serviceRoot, 'StudentQuery/:id'), { id: '@id'}, {
        getStudentInfo: { method: 'GET', isArray: true }
    });
    var scoreStudentRes = $resource(path.combine(serviceRoot, 'PerformanceScore/:id'), { id: '@id'}, {
        startScore: { method: 'PUT' },
        completeScore: {method: 'POST'}
    });

    var studentSignRes = $resource(path.combine(serviceRoot, 'StudentSign/:id'), { id: '@id' }, {
        startSign: { method: 'PUT' },
        stopSign: { method: 'DELETE' }
    });

    this.overseeStudent = studentOverseeRes.overseeStudent.bind(studentOverseeRes);
    this.getStudentInfo = studentInfoRes.getStudentInfo.bind(studentInfoRes);
    this.startScore = scoreStudentRes.startScore.bind(scoreStudentRes);
    this.completeScore = scoreStudentRes.completeScore.bind(scoreStudentRes);

    this.startSign = studentSignRes.startSign.bind(studentSignRes);
    this.stopSign = studentSignRes.stopSign.bind(studentSignRes);
}]);

}());