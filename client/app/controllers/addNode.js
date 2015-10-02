angular.module('treasureHunt.addWaypoint', ['treasureHunt.services'])

.controller('AddWaypoint', ['$scope', '$location', 'SendPicAndLoc', 
  function($scope, $location, SendPicAndLoc){
    //start requesting the user's location
    SendPicAndLoc.getLoc();
    
    $scope.status = {
      canUpload:false
    };

    $scope.$on('locReady', function(){
      // swap dummy button for Add Waypoint button with functionality
      $scope.$apply($scope.status.canUpload = true);
    });

    $scope.send = function(){
      if($scope.file){
        SendPicAndLoc.clue = $scope.clue;
        SendPicAndLoc.sendPic($scope.file);
      }
    };
    
    $scope.done = function(){
      $location.path('/invite');
    }

    $scope.createGame = function(){
      $location.path('/invite');
    }
}]);