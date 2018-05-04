
var app = angular.module("chartApp", ['chart.js']);


/* dataFactory is used to request data from the tsa website, and defines the functions used to process the data into a useable format. */
app.factory('dataFactory', function($http) {
  var dataFactory = {};

  dataFactory.getData = function() {
    /* gets data from tsa.gov source via proxy */
    return $http({
      url: "https://cors-anywhere.herokuapp.com/https://www.dhs.gov/sites/default/files/publications/claims-2010-2013_0.xls",
      method: "GET",
      responseType: "arraybuffer"
    })
  }

  //Converts raw xls data to JSON using xlsx
  dataFactory.convertToJSON = function(res) {
    let data = new Uint8Array(res.data);
    let workbook = XLSX.read(data, {type: 'array'});
    let sheet = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[sheet];

    return XLSX.utils.sheet_to_json(worksheet);
  }

  /*
    Aggregates data into an object containing 4 arrays:
      "airlines": contains a non-repeating list of airlines (as strings) listed in the data.
      "claims": contains integers indicating the number of claims for each airline. The index of each element corresponds to the associated airline in "airlines".
      "airports": contains a list of non-repeating airline codes (as strings).  Used instead of airport names due to less ambiguity.
      "montlyValue": contains a series of arrays, with the index of each nested array corresponding to the index of associated airport in "airports".
          *Each nested array contains a series of objects, each having two attributes: 1) the month ('MM-YY') and 2) the total value of claims for that month (float).
  */
  dataFactory.aggregateData = function(dataSet) {
    //retrieving initial values from data
    let airportName = dataSet[0]["Airport Name"].trim() + " (" + dataSet[0]["Airport Code"].trim() +")";
    let airlineName = dataSet[0]["Airline Name"].trim();
    let claimDate = dataSet[0]["Date Received"].slice(-6);
    let claimValueStr = dataSet[0]["Close Amount"];

    let claimValue = dataFactory.processClaimValue(claimValueStr);

    //initializing data arrays
    var airlines = [airlineName];    
    var airports = [airportName];
    var monthlyClaims = [[{ date: claimDate, total: 1 }]]
    var monthlyValue = [[{ date: claimDate, value: claimValue }]]; /*array will hold arrays that correspond to the index of each airline.  each nested array will hold a series of objects.
                                                                     Objects in nested arrays will be structured in the format: { date: "JAN-10", value: 100.00 } */

    for (let i = 1; i < dataSet.length; i++) {
      if (dataSet[i]["Date Received"] === undefined) {
        continue;
      } 

      airportName = dataSet[i]["Airport Name"].trim() + " (" + dataSet[i]["Airport Code"].trim() +")";
      airlineName = dataSet[i]["Airline Name"].trim();
      claimDate = dataSet[i]["Date Received"].slice(-6);
      claimValueStr = dataSet[i]["Close Amount"];

      claimValue = dataFactory.processClaimValue(claimValueStr);

      for (let j = 0; j < airports.length; j++) {
        if (airportName === airports[j]) {

          if (monthlyClaims[j][monthlyClaims[j].length - 1].date === claimDate) {
            monthlyClaims[j][monthlyClaims[j].length - 1].total += 1;
          } else {
            monthlyClaims[j].push({ date: claimDate, total: 1 });
          }
          break;
        } else if (j === airports.length - 1) {      
          airports.push(airportName);
          monthlyClaims.push([{ date: claimDate, total: 1 }]);
        }
      }

      for (let j = 0; j < airlines.length; j++) {
        if (airlineName === airlines[j]) {
          if (monthlyValue[j][monthlyValue[j].length - 1].date === claimDate) {
            monthlyValue[j][monthlyValue[j].length - 1].value += claimValue;
          } else {
            monthlyValue[j].push({ date: claimDate, value: claimValue });
          }
          break;
        } else if (j === airlines.length - 1) {
          airlines.push(airlineName);
          monthlyValue.push([{date: claimDate, value: claimValue}]);
        }
      }
    }
    return {airportList: airports, claims: monthlyClaims, airlineList: airlines, cost: monthlyValue};
  }

  // Returns string dollar value of format '$X.XX' as float.  (not limited to 3 digits).
  dataFactory.processClaimValue = function(claimValueStr) {
    claimValueStr = claimValueStr.replace(/\s/g, '');
    claimValueStr = claimValueStr.replace(/\$/g, '');
    if (claimValueStr === '-' || claimValueStr === '') {
      claimValueStr = "0";
    }
    return parseFloat(claimValueStr);
  }

  return dataFactory;
})


app.controller("chartController", ['$scope', 'dataFactory', function($scope, dataFactory) { 
  $scope.selectedAirline = "Delta Air Lines";
  $scope.selectedAirport = "McCarran International (LAS)";
  $scope.startDate = "Jan-10";
  $scope.endDate = "Dec-13";
  $scope.months = [];
  $scope.data = [];
  $scope.labels = [];
  $scope.series = ['Series A', 'Series B'];
  $scope.type = "line";

  dataFactory.getData()
  .then(function(res) {
    let jsonData = dataFactory.convertToJSON(res);

    $scope.dataBin = dataFactory.aggregateData(jsonData);  //dataBin will hold all aggregated data, and will be referenced as needed.
  })
  .then(function() {
    $scope.updateLinePage();
  })

  $scope.getMonths = function() {
    $scope.months = [];

    for (let i = 0; i < $scope.dataBin.cost[0].length; i++) { //using first entry because I know Delta has claims for every month and i'm a bit lazy.
      let month = $scope.dataBin.cost[0][i]["date"];
      $scope.months.push(month); 
    }
  }

  //Ensures that graph labels correspond to range specified in options
  $scope.createLabels = function() {
    $scope.labels = [];
    $scope.range = [];
    for (let i = 0; i < $scope.months.length; i++) {
      let month = $scope.dataBin.cost[0][i]["date"];
      if (month === $scope.startDate) {
        $scope.range.push(i);
        do {
          $scope.labels.push(month); 
          i++;
          month = $scope.months[i];                           
        } while (month !== $scope.endDate); 
        if (month === $scope.endDate) {
          $scope.range.push(i);
        }
        $scope.labels.push(month); 
        break;
      }
    }
  }

  //updates data for line graph
  $scope.updateData = function() {
    //find index of target
    var targetIndex = -1;

    for (let i = 0; i < $scope.dataBin.airlineList.length; i++) {
      if ($scope.selectedAirline === $scope.dataBin.airlineList[i]) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) {
      console.error("Unable to find matching airline in data set.");
    }
    
    //Find data by month in range, taking into account months with no data
    let target = $scope.dataBin.cost[targetIndex];
    let targetCount = $scope.range[0];
    $scope.data = [];
    let value = 0;

    for (let i = 0; i < $scope.labels.length; i++) {
      if (target[targetCount]["date"] === $scope.labels[i]) {
        value = target[targetCount]["value"];
        targetCount++;
      } else {
        value = 0;
      }
      $scope.data.push(value);       
    }
  }

  //updates data for bar graph
  $scope.updateBarData = function() {
    var targetIndex = -1;
    for (let i = 0; i < $scope.dataBin.airportList.length; i++) {
      if ($scope.selectedAirport === $scope.dataBin.airportList[i]) {
        targetIndex = i;
      }
    }
    if (targetIndex === -1) {
      console.error("Unable to find matching airport in data set.");
    }

    let target = $scope.dataBin.claims[targetIndex];
    let targetCount = $scope.range[0];
    $scope.data = [];
    let total = 0;
    for (let i = 0; i < $scope.labels.length; i++) {
      if (target[targetCount]["date"] === $scope.labels[i]) {
        total = target[targetCount].total;
        targetCount++;
      } else {
        total = 0;
      }
      $scope.data.push(total);     
    }
  }
  
  //updates view for changing options concerning line graph
  $scope.updateLinePage = function() {
    $scope.type = "line";

    var lineOps = angular.element(document.querySelector("#barOptions"));     
    lineOps.addClass("hidden"); 
    var barOps = angular.element(document.querySelector("#lineOptions"));    
    barOps.removeClass("hidden");
    angular.element(document.querySelector("#airlineLabel")).removeClass("hidden");
    angular.element(document.querySelector("#airportLabel")).addClass("hidden");
    
    $scope.getMonths();
    $scope.createLabels();
    $scope.updateData();
  }

  //updates view for changing options concerning bar graph
  $scope.updateBarPage = function() {
    $scope.type = "bar";
  
    var lineOps = angular.element(document.querySelector("#lineOptions"));     
    lineOps.addClass("hidden"); 
    var barOps = angular.element(document.querySelector("#barOptions"));    
    barOps.removeClass("hidden");
    angular.element(document.querySelector("#airlineLabel")).addClass("hidden");
    angular.element(document.querySelector("#airportLabel")).removeClass("hidden");
    

    $scope.getMonths();
    $scope.createLabels();
    $scope.updateBarData();
  }

  $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }];
  $scope.options = {
    scales: {
      yAxes: [
        {
          id: 'y-axis-1',
          type: 'linear',
          display: true,
          position: 'left'
        }
      ]
    }
  };
 
  
}]);