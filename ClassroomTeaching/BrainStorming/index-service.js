(function ()
{
'use strict';

angular.module('ClassroomTeaching.BrainStorming.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('brainStormingService', ['routeTable', 'path', '$resource', function (routeTable, path, $resource) {
    var serviceUrl = routeTable['classroomteaching_brainstorming'];

    var queryRes = $resource(path.combine(serviceUrl, 'Oversee/:id'), { id: '@id' }, {
        getBrainstormData: { method: 'POST'}
    });

    var stateRes = $resource(path.combine(serviceUrl, 'State/:id'), { id: '@id' }, {
        getBrainstormState: { method: 'GET'},
        startDiscussion: { method: 'PUT'}
    });

    var ideaRes = $resource(path.combine(serviceUrl, 'Idea/:id/:receptor'), { id: '@id', receptor: '@receptor' }, {
        deleteIdea: { method: 'DELETE' }
    });

    var categoryRes = $resource(path.combine(serviceUrl, 'Category/:id'), { id: '@id' }, {
        create: { method: 'PUT' },
    });

    var ideaCategoryRes = $resource(path.combine(serviceUrl, 'IdeaCategory/:id/:receptor'), { id: '@id', receptor: '@receptor' }, {
        updateIdeaCategory: { method: 'POST' },
        clearIdeaCategory: { method: 'DELETE' }
    });

    this.getBrainstormData = queryRes.getBrainstormData.bind(queryRes);
    this.getBrainstormState = stateRes.getBrainstormState.bind(stateRes);
    this.startDiscussion = stateRes.startDiscussion.bind(stateRes);
    this.deleteIdea = ideaRes.deleteIdea.bind(ideaRes);
    this.createCategory = categoryRes.create.bind(categoryRes);
    this.updateIdeaCategory = ideaCategoryRes.updateIdeaCategory.bind(ideaCategoryRes);
    this.clearIdeaCategory = ideaCategoryRes.clearIdeaCategory.bind(ideaCategoryRes);
}])

.service('votingService', ['routeTable', 'path', '$resource', function (routeTable, path, $resource) {
    var serviceUrl = routeTable['classroomteaching_brainstorming'];

    var voteRes = $resource(path.combine(serviceUrl, 'Vote/:id'), { id: '@id' }, {
        start: { method: 'PUT' },
        stop: { method: 'DELETE' },
        check: { method: 'GET' }
    });

    this.startVoting = voteRes.start.bind(voteRes);
    this.stopVoting = voteRes.stop.bind(voteRes);
    this.checkVoting = voteRes.check.bind(voteRes);
}])

.service('remoteInputService', ['routeTable', 'path', '$resource', function (routeTable, path, $resource) {
    var serviceUrl = routeTable['classroomteaching_brainstorming'];

    var remoteInputRes = $resource(path.combine(serviceUrl, 'TextInput/:id'), { id: '@id' }, {
        beginInput: { method: 'PUT' },
        getInput: { method: 'GET' },
        cancelInput: { method: 'DELETE' }
    });

    this.beginRemoteInput = remoteInputRes.beginInput.bind(remoteInputRes);
    this.getRemoteInput = remoteInputRes.getInput.bind(remoteInputRes);
    this.cancelRemoteInput = remoteInputRes.cancelInput.bind(remoteInputRes);
}])

.service('lifecycleService', ['routeTable', 'path', '$resource', function (routeTable, path, $resource) {
    var serviceUrl = null;

    function setServiceUrl(routeKey) {
        serviceUrl = routeTable[routeKey];
        var lifecycleRes = $resource(path.combine(serviceUrl, 'Lifecycle/:id'), { id: '@id' }, {
            reviewBrainstorm: { method: 'DELETE' }
        });

        this.reviewBrainstorm = lifecycleRes.reviewBrainstorm.bind(lifecycleRes);
    }

    this.setServiceUrl = setServiceUrl;
}]);

}());