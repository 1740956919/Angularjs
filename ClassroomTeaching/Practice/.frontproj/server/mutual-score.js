const path = require('path');

const miniserver = require('mini-server-core');
const plugins = require('mini-server-plugins');

const JsonResponse = miniserver.JsonResponse;

const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;


/**
 * context { runtime, fileAccessor }
 */
module.exports = function (context) {
    const { runtime, fileAccessor } = context;

    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/MutualScore\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({
                ScoredCount: 28,
                TotalCount: 32,
                AverageScore: 9.2
            });
        }
    );

    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/MutualScore\b/i,
        function (urlInfo, headers, body, parts) {
            if (!body) {
                return {
                    code: HTTP_STATUS_CODE.badRequest
                };
            }

            if (!body.ScoreLocation || !body.ScenarioId || !body.ScoredId) {
                return {
                    code: HTTP_STATUS_CODE.badRequest
                };
            }

            return JsonResponse.create({
                Code: 0,
                ScoreSessonId: 'session_01'
            }, { waiting: 150 });
        }
    );

    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/MutualScore\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return {
                code: HTTP_STATUS_CODE.success,
                waiting: 150
            };
        }
    );

    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.Interaction\/api\/MutualScore\b/i,
        function (urlInfo, headers, body, parts) {
            if (!body) {
               return {
                   code: HTTP_STATUS_CODE.badRequest
               };
            }

            if (!body.ScoreLocation || !body.ScenarioId) {
               return {
                   code: HTTP_STATUS_CODE.badRequest
               };
            }

            return JsonResponse.create({
                IsMutualScoring: false,
                ScoreSessonId: 'session_01'
            });
        }
    );
};