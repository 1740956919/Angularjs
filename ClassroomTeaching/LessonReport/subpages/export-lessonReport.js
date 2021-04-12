(function ()
{
'use strict';

angular.module('ExportLessonReport', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    'ui.router',
    'LINDGE-ClassroomApp',
    
    'Classroom.Component.FileBrowse',
    'ClassroomTeaching.LessonReport.Service',
    'Figure-Config-RouteTable',
    'LINDGE-Toast',
    'Client.Services.ClientProxy',
])

.controller('ExportLessonReportCtrl', ['$scope','$log','$stateParams','$state','$lindgeToast','$clientProxy', 'lessonExportService','queryString',
    'lplBehavior','lplDefaultJobManager','path','routeTable',
 function ($scope,$log,$stateParams,$state,$lindgeToast,$clientProxy,lessonExportService,queryString,lplBehavior,lplDefaultJobManager,path,routeTable) {
    // controller code here

    var sceneId = queryString.get('sceneid');
    var behaviorId = $stateParams.behaviorId;
    var isExport = $stateParams.isExport;
    var selectedLessonId = $stateParams.selectedLessonId;
    var downloadDirectory='';
    var fileBrowseInstance = null;
    var selectedLessonInfo = {};
    $scope.selectedItem = null;

    $scope.state = '';
    $scope.isLoading = false;

    $scope.getFileBrowseInstance = function(instance) {
        fileBrowseInstance = instance;
        fileBrowseInstance.setFilter((file) => {
            if (file.type == 'FILE') {
                return true;
            } else {
                return false;
            }
        });
    };

    $scope.getSelectedItem = function(item) {
        $scope.selectedItem = item;
    };

    // $scope.refresh = function() {
    //     fileBrowseInstance.refresh();
    // };


    //导出按钮
    $scope.exportRecord = function () {
        if($scope.isExporting || $scope.state != 'WAITING'){
            return;
        }
          
        $scope.isExporting = true;
        lessonExportService.exportLessonRecord(
            {id:sceneId},
            {
                LessonId: selectedLessonId,
                DownloadDirectory: $scope.selectedItem.fullPath,
            },
            result => {
                if(result.IsCompleted){
                    selectedLessonInfo.LessonReportName = result.LessonReportName;
                    downloadFile();
                }
                else{
                    behaviorId = result.BehaviorId;
                    exportFile(result.BehaviorId);
                }
            },
            err => {
                $log.error('导出课堂记录出错!',err);
            }
        )
        .$promise
        .finally(()=>{
            $scope.isExporting = false;
        });
    };

    //取消按钮
    $scope.cancel = function () {
        if($scope.delete){
            return;
        }
        if ($scope.state == 'CREATING') {
            //停止job查询
            lplDefaultJobManager.terminate();

            $scope.delete = true;
            lessonExportService.cancelExport(
                {id: behaviorId},
                null,
                result => {
                    $scope.state = 'WAITING';
                },
                err => {
                    $log.error('取消导出课堂记录出错!',err);
                }
            ) 
            .$promise
            .finally(()=>{
                $scope.delete = false;
            });         
        }
        else if ($scope.state == 'DOWNLOADING') {
            $scope.state = 'WAITING';
        }
        else {
            $state.go('selectLessonReport');
        }
    };

    //导出文件
    function exportFile(behaviorId){
        let queryImmediateTask = lplDefaultJobManager.queryImmediateTask(behaviorId);
        queryImmediateTask.then(result => {
            if(result.state == 'waitexecute' || result.state == 'executing'){
                $scope.state = 'CREATING';
                createRecordFile(behaviorId);
            }
            else if(result.state == 'successful'){
                let attrList = ['LESSONREPORTINFO','DOWNLOADDIRECTORY'];
                lplBehavior.attr.get(behaviorId,attrList).then(data => {
                    let lessonInfo = data['LESSONREPORTINFO'];
                    selectedLessonInfo = JSON.parse(lessonInfo);
                    downloadDirectory = data['DOWNLOADDIRECTORY']; 
                    downloadFile();               
                });                
            }
            else{
                showBubble('导出课堂记录', '导出课堂记录失败', 'ERROR');
                $state.go('selectLessonReport');
            }     
        });     
    }

    //生成课堂记录压缩包
    function createRecordFile(behaviorId){
        $scope.jobQueryTask = lplDefaultJobManager.queryTask(behaviorId);
        $scope.jobQueryTask.promise.then(()=> {
            let attrList = ['LESSONREPORTINFO','DOWNLOADDIRECTORY'];
            lplBehavior.attr.get(behaviorId,attrList).then(data => {
                let lessonInfo = data['LESSONREPORTINFO'];
                selectedLessonInfo = JSON.parse(lessonInfo);
                downloadDirectory = data['DOWNLOADDIRECTORY']; 
                downloadFile();               
            });  
        }, err => {
            showBubble('导出课堂记录', '导出课堂记录失败', 'ERROR');
            $state.go('selectLessonReport');
        });
    }

    //将课堂记录文件下载到指定位置
    function downloadFile() {
        $scope.state = 'DOWNLOADING';     
        if(behaviorId == ''){
            selectedLessonInfo.LessonId = selectedLessonId;           
            downloadDirectory = $scope.selectedItem.fullPath;
        }
       
        //调用外壳下载方法       
        let downLoadUrl = path.combine(routeTable['classroomteaching_lessonreport'], 'LessonReportExport') + '?id=' + sceneId + '&receptor='+selectedLessonInfo.LessonId;
        let options = {
            id: selectedLessonInfo.LessonId,
            url: downLoadUrl,
            targetSource: {
                specifiedDirectory:downloadDirectory,
            },
            name: selectedLessonInfo.LessonReportName + '.zip',
            isAutoOpen: false,           
        };
        $clientProxy.downloadReportFile(options).then(resolve => {
            showBubble('导出课堂记录', '成功导出课堂记录', 'SUCCESS');
            $state.go('selectLessonReport');
        });
    }

    //显示导出结果
    function showBubble(title, message, type){
        let tosatType = '';
        let icon = '';
        switch (type.toUpperCase()) {
            case 'SUCCESS':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.SUCCESS;
                icon = 'lic-check-circle-fill'; break;
            case 'ERROR':
                tosatType = $lindgeToast.NOTIFICATION_TYPE.ERROR;
                icon = 'lic-remove-circle-fill'; break;
        }
        $lindgeToast.notify(tosatType,{
            header: title,
            body: message,
            icon: icon,
            timeout: 4000
        });
    };


    function init(){
        if(isExport){          
            exportFile(behaviorId);
        }
        else{
            $scope.state = 'WAITING';
        }
    }

    init();

}]);

}());