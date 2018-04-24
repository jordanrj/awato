var app = angular.module("chartApp", ['chart.js']);
app.controller("chartController", function($scope) {
    $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['Series A', 'Series B'];
  $scope.data = //[
    //[65, 59, 80, 81, 56, 55, 40]
    //[28, 48, 40, 19, 86, 27, 90]
  //];
  $scope.onClick = function (points, evt) {
    console.log(points, evt);
  };
  $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }, { yAxisID: 'y-axis-2' }];
  $scope.options = {
    scales: {
      yAxes: [
        {
          id: 'y-axis-1',
          type: 'linear',
          display: true,
          position: 'left'
        },
        {
          id: 'y-axis-2',
          type: 'linear',
          display: true,
          position: 'right'
        }
      ]
    }
  };
});

var fileName = "claims.xls";

/*function readFile(file) {
    var reader = new FileReader();
    reader.onlead = readSuccess;
    function readSuccess(e) {
        console.log("skjdflsdfjlksdjflksdjflk");
    };

    reader.readAsText(file);
};

readFile(fileName);*/

var reader= new XMLHttpRequest();
reader.open('GET', 'https://www.dhs.gov/sites/default/files/publications/claims-2010-2013_0.xls');
reader.onreadystatechange = readSuccess();
function readSuccess(evt) {                                             
   console.log(reader.responseText);                                
};
reader.send();