(function ()
{

'use strict';

angular.module('LINDGE-ClassroomApp.MutualScoreView', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'Figure-Config-RouteTable'
])

.service('$mutualScoreService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];

    var errorCodes = {
        '4001': '互评已存在',
        '4002': '创建会话失败'
    };

    var mutualScoreRes = $resource(path.combine(serviceRoot, 'MutualScore/:id'), { id: '@id' }, {
        begin: { method: 'PUT' },
        end: { method: 'DELETE' },
        checkSession: { method: 'GET' }
    });
    var mutualScoreProgressRes = $resource(path.combine(serviceRoot, 'MutualScoreProgress/:id'), { id: '@id' }, {
        getState: { method: 'GET' },
    });

    this.beginScore = mutualScoreRes.begin.bind(mutualScoreRes);
    this.endScore = mutualScoreRes.end.bind(mutualScoreRes);
    this.checkScoreSession = mutualScoreRes.checkSession.bind(mutualScoreRes);
    
    this.getScoreState = mutualScoreProgressRes.getState.bind(mutualScoreProgressRes);

    this.getErrorMessage = function (code) {
        var msg = errorCodes[String(code)];
        return msg;
    };
}])

.directive('mutualScoreView', ['$log', '$mutualScoreService', 'queryString', '$luiTimer',
function ($log, $mutualScoreService, queryString, Timer) {
    var template = `<button ng-disabled="isLoading" class="mutual-score-btn toolbar-button square hilight-primary" ng-class="{actived:scoreState.isScoring}" ng-bind="scoreState.nextAction" ng-click="onBtnClick()">互评</button>
                    <div class="state-info" ng-class="{open:scoreState.isScoring}">
                        <div class="target-info">
                            <img ng-src="{{targetInfo.image}}" ng-if="targetInfo.image" />
                            <div class="target-name" ng-bind="targetInfo.name"></div>
                        </div>
                        <div class="score-time">时长：{{scoreState.duration|periodFormatFilter:true}}</div>
                        <div class="score-count">互评人数：{{scoreState.scoredCount}}/{{scoreState.totalCount}}</div>
                        <div class="average-score">平均分：{{scoreState.averageScore | number:1}}分</div>
                    </div>`;

    var CLASSROOM_KEY = 'classroomid';
    var RELATION_KEY = 'relationid';            // 可选

    var SYNC_INTERVAL = 1000;

    return {
        priority: 1,
        scope: {
            target: '=',
            onBegin: '&',
            onEnd: '&',
            onError: '&',
            relationType: '@'
        },
        restrict: 'E',
        template: template,
        replace: false,
        transclude: false,
        link: function(scope, iElm, iAttrs) {
            var gSessionId = '';
            var syncHandle = -1;
            var currentTarget = null;
            var scoreTimer = null;

            scope.isLoading = false;

            scope.scoreState = {
                isScoring: false,
                nextAction: '互评',
                scoredCount: 0,
                totalCount: 0,
                averageScore: 0,
                duration: 0
            };

            scope.targetInfo = {
                image: '',
                name: ''
            };

            function getOutputState() {
                return {
                    sessionId: gSessionId,
                    scoredCount: scope.scoreState.scoredCount,
                    totalCount: scope.scoreState.totalCount,
                    averageScore: scope.scoreState.averageScore,
                    scoredId: currentTarget ? currentTarget.ScoredId : ''
                };
            }

            function resetState() {
                gSessionId = '';
                scope.scoreState.scoredCount = 0;
                scope.scoreState.totalCount = 0;
                scope.scoreState.averageScore = 0;
                scope.scoreState.duration = 0;
            }

            function updateDisplayText() {
                if (scope.scoreState.isScoring) {
                    scope.scoreState.nextAction = '结束\n互评';
                } else {
                    scope.scoreState.nextAction = '互评';
                }
            }

            function updateTarget(target) {
                currentTarget = target;

                if (target === null) {
                    scope.targetInfo.image = '';
                    scope.targetInfo.name = '';
                } else {
                    scope.targetInfo.image = target.Image;
                    scope.targetInfo.name = target.Name;
                }
            }

            function notifyError(err, code) {
                scope.onError({ $error: { detail: err, code: code } });
            }

            function startSync() {
                function doSync() {
                    $mutualScoreService.getScoreState(
                        { id: gSessionId },
                        result => {
                            if (scope.scoreState.isScoring) {
                                scope.scoreState.scoredCount = result.ScoredCount;
                                scope.scoreState.totalCount = result.TotalCount;
                                scope.scoreState.averageScore = result.AverageScore;
                            }
                        },
                        err => {
                            // body...
                        }
                    )
                    .$promise
                    .finally(() => {
                        if (scope.scoreState.isScoring) {
                            syncHandle = setTimeout(doSync, SYNC_INTERVAL);
                        }
                    });
                }
                
                syncHandle = setTimeout(doSync, SYNC_INTERVAL);
            }

            function stopSync() {
                clearTimeout(syncHandle);
                syncHandle = -1;
            }

            function beginSession(sessionId, isNew) {
                gSessionId = sessionId;

                // update score informations
                scope.scoreState.isScoring = true;
                updateDisplayText();

                // start timer
                scoreTimer = new Timer(1000);
                scoreTimer.start(() => {
                    scope.scoreState.duration += 1;
                    scope.$evalAsync(angular.noop);
                    return true;
                });

                // start state syncing
                startSync();

                // notify
                var scoreState = getOutputState();
                scoreState.isNewSession = !!isNew;
                scope.onBegin({ $state: scoreState });
            }

            function beginScore() {
                var relationType = scope.relationType;
                var relationId = queryString.get(RELATION_KEY);
                var classroomId = queryString.get(CLASSROOM_KEY);

                if (!!classroomId && !!relationType && !!currentTarget) {
                    resetState();
                    scope.isLoading = true;
                    $mutualScoreService.beginScore(
                        null,
                        {
                            ClassroomId: classroomId,
                            RelationType: relationType,
                            RelationId: relationId || '',
                            ScoredTarget: currentTarget
                        },
                        result => {
                            beginSession(result.ScoreSessonId, true);
                        },
                        err => {
                            var msg = $mutualScoreService.getErrorMessage(err.data.Code) || '开始互评失败。';
                            $log.error(msg);
                            notifyError(err, err.data.Code || 0);
                        }
                    )
                    .$promise
                    .finally(() => {
                        scope.isLoading = false;
                    });
                }
            }

            function endScore() {
                scope.isLoading = true;
                $mutualScoreService.endScore(
                    { id: gSessionId },
                    result => {
                        stopSync();

                        scope.scoreState.isScoring = false;
                        updateDisplayText();
                        updateTarget(null);

                        if (scoreTimer) {
                            scoreTimer.stop();
                            scoreTimer = null;
                        }

                        try {
                            scope.onEnd({ $state: getOutputState() });
                        } finally {
                            gSessionId = '';
                        }
                    },
                    err => {
                        $log.error("结束互评失败。");
                    }
                )
                .$promise
                .finally(() => {
                    scope.isLoading = false;
                });
            }

            scope.onBtnClick = function () {
                if (!scope.isLoading) {
                    if (scope.scoreState.isScoring) {
                        endScore();
                    } else {
                        updateTarget(scope.target);
                        beginScore();
                    }
                }
            };

            function init() {
                scope.isLoading = true;

                var classroomId = queryString.get(CLASSROOM_KEY);
                var relationType = scope.relationType;
                var relationId = queryString.get(RELATION_KEY);
                if (!!classroomId && !!relationType) {
                    $mutualScoreService.checkScoreSession(
                        { id: classroomId },
                        result => {
                            if (result.IsMutualScoring && (result.MutualScoreInfo.RelationType == relationType && !!!result.MutualScoreInfo.RelationId && !!!relationId) ||
                                (result.MutualScoreInfo.RelationType == relationType && result.MutualScoreInfo.RelationId == relationId)) {
                                updateTarget(result.MutualScoreInfo.ScoredTarget);

                                var duration = Number(result.MutualScoreInfo.DuringSeconds);
                                scope.scoreState.duration = (isNaN(duration) || duration < 0) ? 0 : duration;

                                beginSession(result.ScoreSessonId, false);
                            }
                        },
                        err => {
                            $log.error("开始互评失败。", err);
                        }
                    )
                    .$promise
                    .finally(() => {
                        scope.isLoading = false;
                    });
                } else {
                    scope.isLoading = false;
                }
            }

            init();
        }
    };
}]);

}());