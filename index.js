var app = angular.module("chartApp", ['chart.js']);
app.controller("chartController", function($scope, $http) {
    $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['Series A', 'Series B'];
  
  /* gets data from tsa.gov source;  converts to json using sheetjs */
  $http({
    url: "https://cors-anywhere.herokuapp.com/https://www.dhs.gov/sites/default/files/publications/claims-2010-2013_0.xls",
    method: "GET",
    responseType: "arraybuffer"
  })
  .then(function(res) {
    var data = new Uint8Array(res.data);
    $scope.data = [];
    //using xlsx and workbooks
    var workbook = XLSX.read(data, {type: 'array'});
    var sheet = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[sheet];
    for (let i = 0; i < 10; i++) {
      $scope.data.push(XLSX.utils.sheet_to_json(worksheet)[i]);
    }
    console.log($scope.data);
  });

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
