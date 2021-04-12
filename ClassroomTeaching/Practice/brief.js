(function () {
'use strict';

angular.module('ClassroomTeaching.Practice.Brief', [
    'ngMaterial',
    'ngResource',
    'LINDGE-Service',
    'LINDGE-Platform',
    
    'ClassroomTeaching.Practice.Service',
    'Figure-Config-RouteTable',
    'Client.Services.ClientProxy',
    'Client.Services.Initiation'
])

.filter('sliceContent',['$filter',function($filter){
    return function sliceContent(text) {
        let len = 4;       
        if(text.length > len) {
            let textArr = text.substr(0,len);
            return textArr+'...';
        }
        else{
           return text;
        }
    };
}])

.controller('BriefCtrl', ['$scope', 'practiceService', 'queryString', '$log','$clientProxy',
function ($scope, practiceService, queryString, $log,$clientProxy) {
    // controller code here

    /*******************************初始化参数*******************************/
    //练习标识
    var practiceId = queryString.get('id');
    var type = queryString.get('type');
    $scope.isLoading = false;
    $scope.answerInfos = [];

    //关闭简报
    $scope.close = function(){
        $clientProxy.hideWindow('ClassroomTeaching.Practice.Brief');        
    };

     //计算学生答案汇总信息
     function summaryAnswer() {   
        let answerCount =  0;
        $scope.answerInfos.forEach(item => {
           answerCount += item.Count;
        });;
       //将答案排序      
       $scope.answerInfos.sort((a, b) => {
           let val1;
           let val2;
           if (type == 'SINGLE' || type == 'MULTIPLE') {
               val1 = a.Answer;
               val2 = b.Answer;
               if (val1 < val2) {
                   return -1;
               } else if (val1 > val2) {
                   return 1;
               } else {
                   return 0;
               }
           }
           else {
               val1 = a.Count;
               val2 = b.Count;
               if (val1 < val2) {
                   return 1;
               } else if (val1 > val2) {
                   return -1;
               } else {
                   return 0;
               }
           }
       });    

       //汇总填空题后面的数据
       if(type == 'FILL_BLANK' && $scope.answerInfos.length > 5){
           let subArr = $scope.answerInfos.slice(4);
           let otherCount = 0;
           subArr.forEach(item => {
               otherCount += item.Count;
           });
           let otherData = {
               Answer: '其他',
               Count: otherCount
           };
           $scope.answerInfos.splice(4,$scope.answerInfos.length - 4,otherData);
       }
       
       //计算每项答案的百分比
       $scope.answerInfos.forEach(item => {
           item['Percent'] = item.Count / answerCount * 100 ;             
       });       
   }

    /**********************************初始化************************************/  
    function init() {
        $scope.isLoading = true;
        practiceService.getPracticeBrief({
            id: practiceId
        }, result => {
            $scope.answerInfos = result; 
            summaryAnswer();   
        }, err => {          
            $log.error('加载讲评简报信息失败', err);
        }).$promise
        .finally(() => {
            $scope.isLoading = false;
        });
    }

    init();
}]);

}());