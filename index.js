// Returns string dollar value of format '$X.XX' as float.  (not limited to 3 digits).
var processClaimValue = function(claimValueStr) {
  claimValueStr = claimValueStr.replace(/\s/g, ''); //remove any potential spaces
  claimValueStr = claimValueStr.slice((claimValueStr.length - 1) * (- 1)); //remove dollar sign
  return parseFloat(claimValueStr);
}


var app = angular.module("chartApp", ['chart.js']);

app.factory('dataFactory', function($http) {
  var service = {};
  var monthYear = ''; //month and year in MON-YR format
  var airlines = [];
  var values = [];
  var airports = [];
  var claims = [];

  service.setMonthYear = function(month) {
    monthYear = month;
  }

  service.addAirline = function(airline) {

  }

  service.addValue = function(index, value) {

  }

  service.addAirport = function(airport) {

  }

  service.addClaim = function(index) {

  }

  service.getMonthYear = function() {
    return monthYear;
  }

  service.getAirlines = function() {
    return airlines;
  }

  service.getValues = function() {
    return values;
  }

  service.getAirports = function() {
    return airports;
  }

  service.getClaims = function() {
    return claims;
  }

  //returns the average claims for all airlines for the month
  service.getAverageClaims = function() {
    var totalClaims = 0;
    for (let i = 0; i < claims.length; i++) {
      totalClaims += claims[i];
    }
    return totalClaims / claims.length;
  }


})

app.controller("chartController", function($scope, $http) {
  $scope.labels = ["January", "February", "March", "April", "May", "June", "July"];
  $scope.series = ['Series A', 'Series B'];
  
  /* gets data from tsa.gov source via proxy;  converts to json using sheetjs */
  $http({
    url: "https://cors-anywhere.herokuapp.com/https://www.dhs.gov/sites/default/files/publications/claims-2010-2013_0.xls",
    method: "GET",
    responseType: "arraybuffer"
    

  })
  .then(function(res) {
    //converts raw data to JSON
    var data = new Uint8Array(res.data);
    //using xlsx and workbooks
    var workbook = XLSX.read(data, {type: 'array'});
    var sheet = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[sheet];

    return XLSX.utils.sheet_to_json(worksheet);
  })
  .then(function(dataSet) {
    $scope.aggregateData(dataSet);
  });


  $scope.aggregateData = function(dataSet) {
    /***** NOTE THAT THE NESTED ARRAYS WILL EVENTUALLY BE CUSTOM OBJECTS */
    //will aggregate data points by month using string matching of the "Date Received" object key.
    // All "Date Received" values are structured like so: '1-Jan-13'.  We will use the month and year portion.

    //initialize arrays with first data item
    var airports = [dataSet[0]["Airport Code"]];
    var claims = [1];
    var airlines = [dataSet[0]["Airline Name"]];
    let airlineName = dataSet[0]["Airline Name"];
    let claimDate = dataSet[0]["Date Received"].slice(-6);
    let claimValueStr = dataSet[0]["Close Amount"];
    let claimValue = processClaimValue(claimValueStr);

    
    
    var monthlyValue = [[{ date: claimDate, value: claimValue }]]; /*array will hold arrays that correspond to the index of each airline.  each nested array will hold a series of objects.
                             Objects in nested arrays will be structured in the format: { date: "JAN-10", value: 100 } */

    for (let i =1; i < dataSet.length; i++) {
      let airportName = dataSet[i]["Airport Code"];
      for (let j = 0; j < airports.length; j++) {
        if (airportName === airports[j]) {
          claims[j]++;
          break;
        } else if (j === airports.length - 1) {
          airports.push(airportName);
          claims.push(1);
        }
      }

      for (let j = 0; j < airlines.length; j++) {
        if (dataSet[i]["Date Received"] === undefined) {
          break;
        }

        airlineName = dataSet[i]["Airline Name"];
        claimDate = dataSet[i]["Date Received"].slice(-6);
        claimValueStr = dataSet[i]["Close Amount"];
        claimValue = processClaimValue(claimValueStr);
        
        if (airlineName === airlines[j]) {
          //do stuff
          if (monthlyValue[j][monthlyValue[j].length - 1].date === claimDate) {
            monthlyValue[j][monthlyValue[j].length - 1].value += claimValue;
          } else {
            monthlyValue[j].push({date: claimDate, value: claimValue});
          }
          break;
        } else if (j === airlines.length - 1) {
          //add airline to array
          airlines.push(airlineName);
          monthlyValue.push([{date: claimDate, value: claimValue}]);
        }
      }
    }
    console.log(airports);
    console.log(claims);
    console.log(airlines);
    console.log(monthlyValue);
  }


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


  /*//defining data class
  $scope.createNewMonth = function(monthYear) {
    this.monthYear = monthYear,
    //airports and claims
    this.airports = [],
    this.claims = [],

    //airlines and value should correspond
    this.airlines = [],
    this.value = []

    //this.entries = []
  }

  /*$scope.valueLostByAirline = function() {
    //cycles through each month to add up values of claims for each airline
    for (let i = 0; i < $scope.aggregatedData.length; i++) {
      for (let j = 0; j < $scope.aggregatedData[i].length; j++) {

      }
    }
  }

  $scope.addToMonth = function(item, month) {
    let airline = item["Airline Name"];
    let airportCode = item["Airport Code"];
    let airportName = item["Airport Code"];
    let claimValue = parseFloat(item["Close Amount"].slice(-4));

    for (let i = 0; i < month.airlines.length; i++) {
      if (airline === month.airlines[i]) {
        month.value[i] += claimValue;
        break;
      } else if (i === month.airlines.length - 1) {
        month.airlines.push(airline);
        month.value.push(claimValue);
      }
    }

    for (let i = 0; i < month.airports.length; i++) {
      if (airportCode === month.airports[i]) {
        month.claims[i]++;
        break;
      } else if (i === month.airports.length - 1) {
        month.airports.push(airportCode);
        month.claims.push(1);
      }
    }
  }*/