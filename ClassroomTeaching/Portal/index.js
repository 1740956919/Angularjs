(function ()
{
'use strict';

const subpageModules = [
    'File.Directory',
    'Portal.Entrance'
];

angular.module('ClassroomTeaching.Portal', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'ui.router',

    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    ...subpageModules
])

.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.when('', 'portalEntrance');

    $stateProvider
        .state('portalEntrance', {
            url: '/portalEntrance',
            templateUrl: 'subpages/portal-entrance.html',
            controller: 'PortalEntranceCtrl',
            params: {
                classroomId: '',
                state: '',
                lessonId: ''
            }
        })
        .state('fileDirectory', {
            url: '/fileDirectory',
            templateUrl: 'subpages/file-directory.html',
            controller: 'FileDirectoryCtrl',
            params: {
                classroomId: '',
                state: '',
                lessonId: ''
            }
        });
}])

.controller('MainCtrl', ['$scope', function ($scope) {
    // controller code here
}]);

}());