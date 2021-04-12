angular.module('ClassroomTeaching.ErrorService', [
    'LINDGE-Toast'
])

.service('errorService', ['$lindgeToast', function ($lindgeToast) {
    var actionMap = {
        grab_answer: '请关闭抢答后重试',
        classroom_practice: '请关闭随堂练习后重试',
        mutual_evaluate: '请关闭互评后重试',
        grouping: '请关闭分组后重试',
        group_discuss: '请关闭分组讨论后重试'
    };

    var codeMessageMap = {
        1002: '操做失败',
        1003: '文件不存在',
        4001: '班级中不存在学生'
    };

    function showErrorMessage(error, title = '错误提示') {
        let body = '';
        if (error.data && error.data.Code) {
            let code = error.data.Code;
            if (code == 1001) {
                let data = String(error.data.Data).toLowerCase();
                body = actionMap[data] || '未知错误';
            } else {
                body = codeMessageMap[code] || '未知错误';
            }
        } else {
            body = '未知错误';
        }
        $lindgeToast.notify($lindgeToast.NOTIFICATION_TYPE.WARN, {
            header: title,
            body: body,
            icon: 'lic-exclamation-triangle-fill',
            timeout: 4000
        });
    }

    this.showErrorMessage = showErrorMessage;
}]);