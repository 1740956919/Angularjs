const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

(function ()
{
'use strict';

angular.module('ClassroomTeaching.Cooperation.Content', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'LINDGE-Platform',
    'ClassroomTeaching.Cooperation.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'LINDGE-Toast'
])

.filter('ImageFilter',[function () {
    return function (type) {
        if (!type) {
            return;
        }
        let imgUrl;
        if (type == 'OTHER') {
            imgUrl = '/Images/filetype-unknown.png';
        } else {
            var imgArray = ['TEXT', 'IMAGE', 'PDF', 'WORD', 'PPT','EXCEL', 'AUDIO', 'VIDEO', 'ZIP'];
            if (imgArray.includes(type)) {
                switch(type) {
                    case 'VIDEO':
                        imgUrl = '/Images/filetype-video.png';
                        break;
                    case 'AUDIO':
                        imgUrl = '/Images/filetype-audio.png';
                        break;
                    case 'WORD':
                        imgUrl = '/Images/filetype-doc.png';
                        break;
                    case 'IMAGE':
                        imgUrl = '/Images/filetype-image.png';
                        break;
                    case 'PPT':
                        imgUrl = '/Images/filetype-ppt.png';
                        break;
                    case 'EXCEL':
                        imgUrl = '/Images/filetype-xls.png';
                        break;
                    case 'ZIP':
                        imgUrl = '/Images/filetype-archive.png';
                        break;
                    case 'TEXT':
                        imgUrl = '/Images/filetype-txt.png';
                        break;
                    case 'PDF':
                        imgUrl = '/Images/filetype-pdf.png';
                        break;
                    default:
                        break;
                }
            }
        }
        return imgUrl;
    };
}])

.filter('SizeFilter', [function () {
    return function (size) {
        return `${ size % (1.024*Math.pow(10,6)) == size ? `${ size % (1.024*Math.pow(10,3)) == size ? `小于1KB` : `${(size / (1.024*Math.pow(10,3))).toFixed(1)}KB`}` : `${(size / (1.024*Math.pow(10,6))).toFixed(1)}MB`}`;
    };
}])

.controller('MainCtrl', ['$scope', 'cooperationService', '$lindgeToast', '$clientProxy', 'routeTable', 'path', 'queryString',
function ($scope, cooperationService, $lindgeToast, $clientProxy, routeTable, path, queryString) {
    var disscussionId = queryString.get('id');
    var isDiscussing = false;
    var openingMessageIds = [];
    const { ipcRenderer } = require('electron');
    $scope.chairId = '';
    $scope.messages = [];
    
    $scope.openFile = function (item) {
        if (!item.FileInfo.IsDownloading && !$scope.isOpening) {
            $scope.isOpening = true;
            let downLoadUrl = path.combine(routeTable['classroomteaching_cooperation'], 'FileDownload', disscussionId, item.MessageId);
            let options = {
                id: item.MessageId,
                isAutoOpen: true,
                url: downLoadUrl,
                extension: getExtension(item.FileInfo.FileName)
            };
            $clientProxy.downloadMessageFile(options);
            openingMessageIds.push(item.MessageId);
            $scope.isOpening = false;
        }
    };

    function getExtension(fileName){
        let extension = fileName.lastIndexOf('.') > -1 ? fileName.slice(-(fileName.length - fileName.lastIndexOf('.'))) : '';
        return extension;
    }

    function getHistoryMessages () {
        $scope.isLoading = true;
        cooperationService.getAllMessages({
            id: disscussionId
        }, result => {
            $scope.isLoading = false;
            isDiscussing = result.State == 'PROGRESSING' ? true : false;
            $scope.chairId = result.ChairId;
            $scope.messages = result.Messages;
            if ($scope.messages.length > 0) {
                setTimeout(() => {
                    document.getElementById('scroll-container').scrollTop = document.getElementById('scroll-container').scrollHeight;
                }, 100);
                var messageIds = [];
                $scope.messages.forEach(m => {
                    if (m.IsFile) {
                        m.FileInfo.DownloadProgress = 0;
                        messageIds.push(m.MessageId);
                    }
                });
                getDownloadState(messageIds);
            }
        });
    }

    function Cycle() {
        if (isDiscussing) {
            let postTime = null;
            if ($scope.messages.length > 0) {
                postTime = $scope.messages[$scope.messages.length - 1].CreateTime;
            }
            cooperationService.querySpecifiedMessages({
                id: disscussionId
            }, {
                PostTime: postTime
            }, result => {
                if (result.length > 0) {
                    result.forEach(r=> {
                        if (r.IsFile) {
                            r.FileInfo.DownloadProgress = 0;
                        }
                    });
                    $scope.messages.push.apply($scope.messages, result);
                    setTimeout(() => {
                        document.getElementById('scroll-container').scrollTop = document.getElementById('scroll-container').scrollHeight;
                    }, 100);
                }
            })
            .$promise
            .finally(() => {   
                setTimeout(Cycle, 1000);
            });
        }
        else{
            setTimeout(Cycle, 1000);
        }

        getDownloadState(openingMessageIds);
    }

    function getDownloadState(messageIds) {
        if(messageIds.length > 0) {
            $clientProxy.retriveDownloadInfo(messageIds).then(result => {
                $scope.messages.forEach(item => {
                    if (result[item.MessageId]) {
                        item.FileInfo.IsDownloading = result[item.MessageId].state == "DOWNLOADING" ? true : false;
                        item.FileInfo.DownloadProgress = (result[item.MessageId].progress/item.FileInfo.Size)*100;
                        $scope.$apply();
                        if (result[item.MessageId].state == "DOWNLOADED" && openingMessageIds.includes(item.MessageId)) {
                            openingMessageIds.splice(openingMessageIds.indexOf(item.MessageId), 1);
                        }
                        if (result[item.MessageId].state == "DOWNLOADING" && !openingMessageIds.includes(item.MessageId)) {
                            openingMessageIds.push(item.MessageId);
                        }
                    }
                });
            });
        }
    }

    function replaceChair(memberId) {
        $scope.chairId = memberId;
        $scope.$apply();
    }
    
    function init() {
        ipcRenderer.on('set-discussion-state', (event, arg) => {
            isDiscussing = arg == 'PROGRESSING' ? true : false;
        });
        ipcRenderer.on('replace-chair', (event, arg) => {
            replaceChair(arg);
        });
        getHistoryMessages();
        Cycle();
    }

    init();
}]);

}());