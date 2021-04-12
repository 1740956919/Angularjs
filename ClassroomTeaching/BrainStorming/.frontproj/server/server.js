const path = require('path');
const crypto = require('crypto');

const miniserver = require('mini-server-core');
const plugins = require('mini-server-plugins');

const JsonResponse = miniserver.JsonResponse;

const HTTP_STATUS_CODE = miniserver.HTTP_STATUS_CODE;
const HTTP_METHODS = miniserver.HTTP_METHODS;

const devRoot = path.join(process.cwd(), '../..');

/**
 * context { runtime, fileAccessor }
 */
module.exports = function (context) {
    const runtime = context.runtime;
    const fileAccessor = context.fileAccessor;

    // logger filtering
    runtime.logger.addFilter(/favicon/i);

    // CDN files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /CDN\/(.+)/, 'http://devfront.corp.lindge.com/CDN/{0}');
    // Framework files
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Framework\/(.+)/, 'http://devfront.corp.lindge.com/Framework/{0}');
    // global clock
    runtime.registerProxyHandler(HTTP_METHODS.GET, /Translayer\/Figure\.Config\/ServerTime\/global_init_time/,
        'http://devfront.corp.lindge.com/Translayer/Figure.Config/ServerTime/global_init_time');
    // system config
    runtime.registerProxyHandler(HTTP_METHODS.GET, /\/SystemConfig\.js/i, 'http://devfront.corp.lindge.com/dev/resource/SystemConfig.js');

    // other configuration goes here
    plugins.load('lindge-public-include')
        .setSearchRoot(devRoot)
        .active(runtime);

    plugins.load('lindge-route-table')
        .loadDefaultRoute()
        .setRoute({
            'classroomteaching_brainstorming': '/Translayer/ClassroomTeaching.BrainStorming/api/'
        })
        .active(runtime);

    runtime.setVirtualDirectory('/avatar', fileAccessor.getPath('avatar'));

    // 获取数据收集结果
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Oversee\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var ideas = fileAccessor.readJSON('idea.json');
            var categories = fileAccessor.readJSON('category.json');

            return JsonResponse.create({
                MemberIdeas: ideas,
                DisscussResults: categories
            });
        }
    );

    // 获取头脑风暴状态
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/State\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var state = {
                State: 'PREPARING',
                DuringSeconds: 0,
                JoinCount: 0,
                TotalCount: 0
            };
            return JsonResponse.create(state);
        }
    );

    // 开始讨论
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/State\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return {
                code: HTTP_STATUS_CODE.success
            };
        }
    );

    // 去除成员的点子 返回去除的点子列表
    function extractIdeas(ideaIds) {
        var output = [];
        var members = fileAccessor.readJSON('idea.json');
        var remain = ideaIds.length;
        for (let i = 0; i < members.length && remain > 0; i++) {
            let member = members[i];
            for (let j = 0; j < member.Ideas.length && remain > 0; j++) {
                let idea = member.Ideas[j];
                if (ideaIds.indexOf(idea.IdeaId) >= 0) {
                    output.push(idea);
                    idea.AuthorId = member.MemberId;
                    remain--;

                    member.Ideas.splice(j, 1);
                    j--;
                }
            }
        }

        if (output.length > 0) {
            fileAccessor.writeJSON('idea.json', members);
        }

        return output;
    }

    // 删除点子
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Idea\/(.+?)\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var ideaId = parts[1];

            var ideas = fileAccessor.readJSON('idea.json');
            var found = false;
            for (let i = 0; i < ideas.length && !found; i++) {
                let collection = ideas[i].Ideas;
                for (let j = 0; j < collection.length && !found; j++) {
                    if (collection[j].IdeaId == ideaId) {
                        collection.splice(j, 1);
                        found = true;
                    }
                }
            }

            if (found) {
                fileAccessor.writeJSON('idea.json', ideas);
            }

            return {
                code: HTTP_STATUS_CODE.success
            };
        }
    );

    // 创建分类
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Category\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            if (!body || !body.CategoryName) {
                return {
                    code: HTTP_STATUS_CODE.badRequest,
                    data: 'invalid body'
                };
            }

            var categoryId = `cat_${crypto.randomBytes(16).toString('hex')}`;
            var category = {
                CategoryId: categoryId,
                Name: body.CategoryName,
                IsVoted: false,
                VoteCount: 0,
                Ideas: []
            };

            var categories = fileAccessor.readJSON('category.json');
            categories.push(category);

            if (Array.isArray(body.IdeaIds) && body.IdeaIds.length > 0) {
                category.Ideas.push(...extractIdeas(body.IdeaIds));
            }

            fileAccessor.writeJSON('category.json', categories);

            return JsonResponse.create({ CategoryId: categoryId });
        }
    );

    // 更新点子分类
    runtime.registerEXHandler(
        HTTP_METHODS.POST,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/IdeaCategory\/(.+?)\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var ideas = fileAccessor.readJSON('idea.json');
            var categories = fileAccessor.readJSON('category.json');
            var idea = null;
            var hasCategory = false;
            // 检查点子是否有分类 有分类移除点子 并检查是否移除分类
            outer: for (let i = 0; i < categories.length; i++) {
                for (let j = 0; j < categories[i].Ideas.length; j++) {
                    if (categories[i].Ideas[j].IdeaId == parts[1]) {
                        hasCategory = true;
                        idea = categories[i].Ideas[j];
                        categories[i].Ideas.splice(j, 1);
                        if (categories[i].Ideas.length == 0) {
                            categories.splice(i, 1);
                        }

                        break outer;
                    }
                }
            }
            if (hasCategory) {
                // 给新分类添加点子
                for (let i = 0; i < categories.length; i++) {
                    if (categories[i].CategoryId == body.CategoryId) {
                        categories[i].Ideas.push(idea);
                    }
                }
            } else {
                // 查出成员的点子 删除
                for (let i = 0; i < ideas.length; i++) {
                    for (let j = 0; j < ideas[i].Ideas.length; j++) {
                        if (ideas[i].Ideas[j].IdeaId == parts[1]) {
                            idea = ideas[i].Ideas[j];
                            idea.AuthorId = ideas[i].MemberId;
                            ideas[i].Ideas.splice(j, 1);
                        }
                    }
                }
                fileAccessor.writeJSON('idea.json', ideas);

                // 给新分类添加点子
                for (let i = 0; i < categories.length; i++) {
                    if (categories[i].CategoryId == body.CategoryId && idea) {
                        categories[i].Ideas.push(idea);
                    }
                }
            }
            
            fileAccessor.writeJSON('category.json', categories);

            return {
                code: HTTP_STATUS_CODE.success
            };
        }
    );

    // 清除点子分类
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/IdeaCategory\/(.+?)\/(.+)/i,
        function (urlInfo, headers, body, parts) {

            var ideas = fileAccessor.readJSON('idea.json');
            var categories = fileAccessor.readJSON('category.json');
            var idea = null;

            // 删分类点子 分类下无点子删分类
            outer: for (let i = 0; i < categories.length; i++) {
                for (let j = 0; j < categories[i].Ideas.length; j++) {
                    if (categories[i].Ideas[j].IdeaId == parts[1]) {
                        idea = categories[i].Ideas[j];
                        categories[i].Ideas.splice(j, 1);
                        if (categories[i].Ideas.length == 0) {
                            categories.splice(i, 1);
                        }

                        break outer;
                    }
                }
            }
            fileAccessor.writeJSON('category.json', categories);
            // 给成员添加点子
            if (idea !== null) {
                for (let i = 0; i < ideas.length; i++) {
                    if (ideas[i].MemberId == idea.AuthorId) {
                        ideas[i].Ideas.push({
                            IdeaId: idea.IdeaId,
                            IdeaContent: idea.IdeaContent
                        });
                    }
                }

                fileAccessor.writeJSON('idea.json', ideas);
            }

            return {
                code: HTTP_STATUS_CODE.success
            };
        }
    );

    var voteInfo = {
        currentId: '',
        isVoting: false,
        result: {}
    };

    // 开始投票
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Vote\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var voteId = `vote_${crypto.randomBytes(16).toString('hex')}`;

            voteInfo.currentId = voteId;
            voteInfo.isVoting = true;

            var categories = fileAccessor.readJSON('category.json');
            voteInfo.result = categories.reduce((m, c) => {
                m[c.CategoryId] = 2 + Math.round(Math.random() * 20);
                return m;
            }, {});

            return JsonResponse.create({ VoteId: voteId });
        }
    );

    // 结束投票
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Vote\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            if (voteInfo.isVoting && parts[0] == voteInfo.currentId) {
                voteInfo.isVoting = false;
                return { code: HTTP_STATUS_CODE.success };
            } else {
                return { code: HTTP_STATUS_CODE.badRequest };
            }
        }
    );

    // 检查是否存在投票
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Vote\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var result = {
                IsVoting: voteInfo.isVoting,
                VoteId: voteInfo.currentId,
                VoteInfo: {
                    DuringSeconds: 0,
                    JoinCount: 28,
                    VoteResult: Object.keys(voteInfo.result).map(id => ({
                        CategoryId: id,
                        VoteCount: voteInfo.result[id],
                        IsVoted: false
                    }))
                }
            };

            return JsonResponse.create(result);
        }
    );

    var inputInfo = {
        currentId: '',
        IsCompleted: false
    };

    // 创建内容输入行为
    runtime.registerEXHandler(
        HTTP_METHODS.PUT,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/TextInput\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            var inputId = `input${crypto.randomBytes(16).toString('hex')}`;
            inputInfo.currentId = inputId;
            inputInfo.IsCompleted = false;
            return JsonResponse.create({ BehaviorId: inputId });
        }
    );

    // 获取内容输入结果
    runtime.registerEXHandler(
        HTTP_METHODS.GET,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/TextInput\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            return JsonResponse.create({ IsCompleted: inputInfo.IsCompleted, InputContent: null });
        }
    );

    // 放弃输入
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/TextInput\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            if (!inputInfo.IsCompleted && parts[0] == inputInfo.currentId) {
                inputInfo.IsCompleted = true;
                return { code: HTTP_STATUS_CODE.success };
            } else {
                return { code: HTTP_STATUS_CODE.badRequest };
            }
        }
    );

    // 讲评头脑风暴
    runtime.registerEXHandler(
        HTTP_METHODS.DELETE,
        /\/Translayer\/ClassroomTeaching\.BrainStorming\/api\/Lifecycle\/(.+)/i,
        function (urlInfo, headers, body, parts) {
            voteInfo.isVoting = false;
            return JsonResponse.create({ JoinCount: 15, TotalCount: 30 });
        }
    );
};