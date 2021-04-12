(function ()
{
'use strict';

angular.module('ClassroomTeaching.Practice.Service', [
    'ngResource',
    'Figure-Config-RouteTable'
])

.service('practiceService', ['$resource','path','routeTable','$q',function ($resource,path,routeTable,$q) {
    var sreviceRoot = routeTable['classroomteaching_quiz'];

    //查询课堂互动状态
    var practiceStateRes = $resource(path.combine(sreviceRoot, "InteractionState/:id"),{ id: "@id"},{
        getInteractionState:{ method: "GET"}
    });
    this.getInteractionState = practiceStateRes.getInteractionState.bind(practiceStateRes);

     //发起抢答
    var grabAnswerRes = $resource(path.combine(sreviceRoot, "GrabAnswer/:id/:receptor"),{ id: "@id",receptor:"@receptor" },{
        createGrabAnswer:{ method: "PUT"},
        deleteGrabAnswer:{ method: "DELETE"},
        getGrabAnswer:{ method: "GET"},
    });
  
    this.createGrabAnswer = grabAnswerRes.createGrabAnswer.bind(grabAnswerRes);
    this.deleteGrabAnswer = grabAnswerRes.deleteGrabAnswer.bind(grabAnswerRes);
    this.getGrabAnswer = grabAnswerRes.getGrabAnswer.bind(grabAnswerRes);
  
    //随机选人
    var randomCandidateRes = $resource(path.combine(sreviceRoot, "RandomCandidate/:id/:receptor"),{ id: "@id",receptor:"@receptor" },{
        createRandomCandidate:{ method: "PUT"},
        deleteRandomCandidate:{ method: "DELETE"},
        getRandomCandidate:{ method: "GET"},
        getAllStudents:{method:"POST",isArray:true}
    });

    this.createRandomCandidate = randomCandidateRes.createRandomCandidate.bind(randomCandidateRes);
    this.deleteRandomCandidate = randomCandidateRes.deleteRandomCandidate.bind(randomCandidateRes);
    this.getRandomCandidate = randomCandidateRes.getRandomCandidate.bind(randomCandidateRes);
    this.getAllStudents = randomCandidateRes.getAllStudents.bind(randomCandidateRes);

    //发起练习
    var practiceRes = $resource(path.combine(sreviceRoot, "Practice/:id"),{ id: "@id"},{
        createPractice:{ method: "PUT"},
        deletePractice:{ method: "DELETE"},
        getPractice:{ method: "GET"},
    });

    this.createPractice= practiceRes.createPractice.bind(practiceRes);
    this.deletePractice = practiceRes.deletePractice.bind(practiceRes);
    this.getPractice = practiceRes.getPractice.bind(practiceRes);
    

    //查询练习进度
    var practiceProgressRes = $resource(path.combine(sreviceRoot, "PracticeProgress/:id"),{ id: "@id"},{      
        getPracticeProgress:{ method: "GET"},
    });

    this.getPracticeProgress = practiceProgressRes.getPracticeProgress.bind(practiceProgressRes); 

    //管理讲评
    var practiceReviewRes = $resource(path.combine(sreviceRoot, "PracticeReview/:id/:receptor"),{ id: "@id",receptor:"@receptor" },{      
        getPracticeReview:{ method: "GET"},
        deletePracticeReview:{ method: "DELETE"}
    });

    this.getPracticeReview = practiceReviewRes.getPracticeReview.bind(practiceReviewRes);
    this.deletePracticeReview = practiceReviewRes.deletePracticeReview.bind(practiceReviewRes);

    //显示讲评
    var practiceDetailRes = $resource(path.combine(sreviceRoot, "PracticeDetail/:id/:receptor"),{ id: "@id",receptor:"@receptor" },{      
        getPracticeBrief:{ method: "GET",isArray: true},
        getPracticeDetail:{ method: "POST"},
        evaluateStudent:{ method: "PUT"}       
          
    });

    this.getPracticeBrief = practiceDetailRes.getPracticeBrief.bind(practiceDetailRes);
    this.getPracticeDetail = practiceDetailRes.getPracticeDetail.bind(practiceDetailRes);
    this.evaluateStudent = practiceDetailRes.evaluateStudent.bind(practiceDetailRes);

}])

.service('studentManageService', ['$resource', 'path', 'routeTable', function ($resource, path, routeTable) {
    var serviceRoot = routeTable['classroomteaching_interaction'];

    var scoreStudentRes = $resource(path.combine(serviceRoot, 'PerformanceScore/:id'), { id: '@id'}, {
        startScore: { method: 'PUT' }
    });

    this.startScore = scoreStudentRes.startScore.bind(scoreStudentRes);
}]);

}());