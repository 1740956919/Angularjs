(function ()
{
'use strict';

angular.module('ClassroomTeaching.Material', [
    'ngResource',
    'LINDGE-Service',
    'LINDGE-UI-Core',
    'LINDGE-Platform',
    'ClassroomTeaching.Material.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation',
    'Classroom.Component.FileBrowse',
    'LINDGE-Toast',
    'Electron-Upload',
])

.constant('SupportBrowseTypes', [
    'MEDIA', 'ARTICLE'
])

.controller('MainCtrl', ['$scope', 'EntityType', 'materialManageService', 'queryString', '$lindgeToast', '$electronUpload', '$clientProxy', 'localStorageService', 'path', 'routeTable', 'SupportBrowseTypes', '$filter', 'ExcludeFileTypes', 'ExcludeDirectories',
function ($scope, EntityType, materialManageService, queryString, $lindgeToast, $electronUpload, $clientProxy, localStorageService, path, routeTable, SupportBrowseTypes, $filter, ExcludeFileTypes, ExcludeDirectories) {
    const shell = require('electron').shell;
    var entranceFiltrer = $filter('entranceFilter');
    var classroomId = queryString.get('classroomid');
    var fileBrowseInstance = null;
    var serviceRoot = routeTable['classroomteaching_interaction'];
    var lessonId = '';
    $scope.canOpen = true;
    $scope.selectedItem = null;
    $scope.openedLocalMaterials = [];
    $scope.uploadingLocalFiles = new Map();
    $scope.uploadResult = {};
    $scope.isOpeningFile = false;
    $scope.isProcessing = false;


    $scope.isMaterialOpened = function(){
        if($scope.openedLocalMaterials && $scope.selectedItem && $scope.selectedItem.type == EntityType.File){
            return $scope.openedLocalMaterials.some(o => (o.Path == $scope.selectedItem.fullPath && new Date(o.LastModifyTime).valueOf() == $scope.selectedItem.updateTime.valueOf())) || 
            $scope.selectedItem.isOpen;
        }
        return false;
    };

    $scope.openFile = function() {
        if ($scope.selectedItem.isLessonMaterial) {
            if(!$scope.isOpeningLessonFile){
                $scope.isOpeningLessonFile = true;
                materialManageService.previewMaterial({
                        id: $scope.selectedItem.lessonMaterialId
                    }, result => {
                        let behaviorId = result.BehaviorId;
                        if (SupportBrowseTypes.includes($scope.selectedItem.extension)) {
                            $clientProxy.getToken().then(result => {
                                let url = entranceFiltrer('ClassroomTeaching.MaterialContent',{
                                    resourceid: $scope.selectedItem.lessonMaterialId,
                                    token: result
                                });
                                shell.openExternal(url);
                            });
                        } else {
                            $scope.isOpeningFile = true;
                            let downLoadUrl = path.combine(routeTable['bank_presentation'], 'LoadPart') + '?id=' + behaviorId + '&style=download&cache=true';
                            let options = {
                                id: behaviorId,
                                url: downLoadUrl,
                                extension: ''
                            };
                            $clientProxy.downloadFile(options).then(resolve => {
                                $scope.isOpeningFile = false;
                            });
                        }
                        captureLessonMaterialScreen('SHOW_LESSON_MATERIAL', true);
                    })
                    .$promise
                    .finally(() => {
                         $scope.isOpeningLessonFile = false;
                    });
            }
        } else {
            captureLocalMaterialScreen('SHOW_LOCAL_MATERIAL', true);
            shell.openPath($scope.selectedItem.fullPath);
        }
    };

    function captureLocalMaterialScreen (action, isHideWindow) {
        $clientProxy.addRecord({
            lessonId: lessonId,
            action: action,
            content: $scope.selectedItem.name,
            needCapture: true
        }).finally(() => {
            if (isHideWindow) {
                $clientProxy.hideWindow('ClassroomTeaching.Material');
            }
        });
    }

    function captureLessonMaterialScreen (action, isHideWindow) {
        $clientProxy.addRecord({
            lessonId: lessonId,
            action: action,
            content: $scope.selectedItem.lessonMaterialId,
            needCapture: true
        }).finally(() => {
            if (isHideWindow) {
                $clientProxy.hideWindow('ClassroomTeaching.Material');
            }
        });     
    }

    $scope.sendMaterial = function(item) {
        if (item.isLessonMaterial && !$scope.isSendLessonMaterial) {
            $scope.isSendLessonMaterial = true;
            materialManageService.openLessonMaterial({
                id: lessonId,
                receptor: item.lessonMaterialId
            },
            result => {
                item.isOpen = true;
                $scope.openButtonName = '已下发';
                showBubble('文件下发', '文件下发成功', true);
                captureLessonMaterialScreen('OPEN_LESSON_MATERIAL');
            },
            err => {
                showBubble('文件发送', '文件下发失败,请重试', false);
            })
            .$promise
            .finally(() => {
                $scope.isSendLessonMaterial = false;
            });
        } else {
            $scope.uploadResult = $electronUpload.upload(item.fullPath, null, {
                 onFinish : () => {
                    let token = $scope.uploadingLocalFiles.get(item.fullPath).token;
                    $scope.uploadingLocalFiles.delete(item.fullPath);
                    materialManageService.openLocalMaterial({
                        id: lessonId
                    }, {
                        Handle: token,
                        FullPath: item.fullPath,
                        Name: item.name.substring(0, item.name.lastIndexOf('.')),
                        ModifyTime: item.updateTime
                    }, result => {
                        $scope.openedLocalMaterials.push({ Path: item.fullPath, LastModifyTime:item.updateTime });
                        $scope.openButtonName = '已下发';
                        showBubble('文件下发', '文件下发成功', true);
                        captureLocalMaterialScreen('OPEN_LOCAL_MATERIAL');
                    }, err => {
                        showBubble('文件发送', '文件下发失败,请重试', false);
                    });
                 }
            });
            $scope.uploadingLocalFiles.set(item.fullPath, $scope.uploadResult);
        }
    };

    $scope.refresh = function() {
        if(!$scope.isLoading){
            fileBrowseInstance.refresh();
            init();
            readCacheSelectedFilePath();
        }
    };

    $scope.cancel = function() {
        $scope.uploadResult.cancel();
        $scope.uploadingLocalFiles.delete($scope.selectedItem.fullPath);
    };

    $scope.isUploading = function() {
        if (!$scope.selectedItem){
            return false;
        } else {
            return $scope.uploadingLocalFiles.has($scope.selectedItem.fullPath);
        }
    };

    $scope.getFileBrowseInstance = function(instance) {
        fileBrowseInstance = instance;
        fileBrowseInstance.setFilter((file) => {
            if (file.type == EntityType.File && !ExcludeFileTypes.includes(file.extension) && !file.name.startsWith('~$')) {
                return true;
            } else {
                return false;
            }
        });
    };

    $scope.getSelectedItem = function(item) {
        $scope.selectedItem = item;
        if (item.type == EntityType.File) {
            if (!item.isLessonMaterial && $scope.uploadingLocalFiles.has(item.fullPath)) {
                $scope.uploadResult = $scope.uploadingLocalFiles.get(item.fullPath);
            }
        } 
        cacheSelectedFilePath(item.fullPath);
    };

    function getLessonMaterialStatus() {
        $scope.isLoading = true;
        materialManageService.getLessonMaterialStatus({
            id: classroomId
        }, result => {
            $scope.isProcessing = result.IsInClass;
            if (result.IsInClass){
                lessonId = result.LessonId;
                readCacheSelectedFilePath();
                if(result.HasMaterials){
                    fileBrowseInstance.loadLessonMaterial(path.combine(serviceRoot, 'LessonMaterial', lessonId));
                }
                materialManageService.getOpenedLocalMaterial({
                    id: lessonId
                }, result => {
                    $scope.openedLocalMaterials = result;
                });
            }
        })
        .$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    }

    function showBubble(title, message, success){
        let toastType = success ? $lindgeToast.NOTIFICATION_TYPE.SUCCESS : $lindgeToast.NOTIFICATION_TYPE.ERROR;
        let icon = success ? 'lic-check-circle-fill' : 'lic-remove-circle-fill';

        $lindgeToast.notify(toastType, {
            header: title,
            body: message,
            icon: icon,
            timeout: 4000
        });
    }
    
    function cacheSelectedFilePath(path) {
        let cacheFileInfo = { 
            filePath: path,
            cacheTime: new Date().getTime()
        };
        localStorageService.set(lessonId, cacheFileInfo);
    }

    function readCacheSelectedFilePath(){
        var storageObject = localStorageService.get(lessonId);
        var dateTime = new Date();
        var ticks = dateTime.setDate(dateTime.getDate() + 1);
        if (storageObject && (ticks > storageObject.cacheTime)) {
            fileBrowseInstance.select(storageObject.filePath);
        }
    }

    function init() {
        $scope.canOpen = queryString.get('issupportopen') === 'true';
        $scope.selectedItem = null;
        $scope.openedLocalMaterials = [];
        getLessonMaterialStatus();
    }

    init();
}]);

}());