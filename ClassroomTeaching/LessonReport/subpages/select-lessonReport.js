(function ()
{
'use strict';

angular.module('SelectLessonReport', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform', 
    'ui.router',
    
    'ClassroomTeaching.LessonReport.Service',
    'Figure-Config-RouteTable'
])

.constant('ORDER_MODEL',[
    {
        Code:'TEACHING_CALSS_NAME',
        Name:'教学班排序',
    },
    {
        Code:'LESSON_NAME',
        Name:'课时\n排序',
    },
    {
        Code:'BEGIN_TIME',
        Name:'时间\n排序',
    }
])

.controller('SelectLessonReportCtrl', ['$scope','$log','$state','lessonExportService','queryString','ORDER_MODEL',
 function ($scope,$log,$state,lessonExportService,queryString,ORDER_MODEL) {
    // controller code here

    var sceneId = queryString.get('sceneId');
    $scope.isLoading = false;
    $scope.lessons = [];
    $scope.orderModel = ORDER_MODEL;
    $scope.pageCount = 1;
    $scope.selectedLessonId = '';
    //排序方式第一项的样式
    $scope.defaultCode = $scope.orderModel[0].Code;
    
    $scope.queryParam = {
        PageSize:12,
        PageIndex:1,
        OrderName:$scope.orderModel[2].Code,
    };


     $scope.changePage = function(derection)
     {
         if(derection == 'previous'){
            $scope.queryParam.PageIndex -= 1;
         }
         else if(derection == 'next'){
            $scope.queryParam.PageIndex += 1;
         }
         loadLessons();
     };

     //单选
     $scope.selectOne = function (lesson,evt) {  
        if (evt) { 
            evt.preventDefault(); 
            evt.stopPropagation(); 
        }      
        $scope.selectedLessonId = lesson.LessonId;
    };

    //导出课堂记录
    $scope.exportReport = function(){      
        $state.go('exportLessonReport', 
        {
            isExport: false,
            behaviorId: '',
            selectedLessonId: $scope.selectedLessonId
        });
    };

    //查看课堂报告详情
     $scope.checkDetail = function (lesson) {
         $state.go('previewLessonReport', {
             lesson: lesson
         });
     };

     $scope.changOrder = function(order){
         if($scope.queryParam.OrderName == order){
             return;
         }
        $scope.queryParam.OrderName = order;
        loadLessons();
     };

    //加载数据
    function loadLessons(){
        $scope.isLoading = true;
        lessonExportService.queryLessonRecords(
        { id: sceneId },
        {
            PageSize: $scope.queryParam.PageSize,
            PageIndex: $scope.queryParam.PageIndex - 1,
            OrderName: $scope.queryParam.OrderName,
        },
        result => {
            $scope.lessons = result.LessonInfos;
            let pageCount = Math.ceil(result.TotalCount/$scope.queryParam.PageSize);
            $scope.pageCount = pageCount != 0 ? pageCount : 1;
        },
        err => {         
            $log.error('获取课堂记录失败!', err);
        })
        .$promise
        .finally(()=>{
            $scope.isLoading = false;
        });     
    }

    function init(){
        loadLessons();       
    }

    init();

}]);

}());