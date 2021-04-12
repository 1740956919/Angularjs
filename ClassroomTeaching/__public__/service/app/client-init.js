(function ()
{

'use strict';

angular.module('Client.Services.Initiation', [    
    'Client.Services.ClientProxy'
])

.factory('clientSessionExpiredInterceptor', ['$q', '$clientProxy', function ($q, $clientProxy) {
    return {
        'responseError': function (rejection) {
            if (rejection && rejection.config && !rejection.config.ignoreAuthModule) {
                switch (rejection.status) {
                    case 401:
                        $clientProxy.sendMessage('Unauthorized', 'ClassroomTeaching.Error');
                        break;
                }
            }

            return $q.reject(rejection);
        }
    };
}])

.config(['$httpProvider', function($httpProvider) {
    $httpProvider.interceptors.pop();
    $httpProvider.interceptors.push('clientSessionExpiredInterceptor');
}]);

}());