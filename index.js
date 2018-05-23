
var app = angular.module("chartApp", ['chart.js']);


/* dataFactory is used to request data from the tsa website, and defines the functions used to process the data into a useable format. */
app.factory('dataFactory', function($http) {
  var dataFactory = {};

  dataFactory.getData = function() {
    /* gets data from tsa.gov source via proxy */
    return $http({
      url: "https://cors-anywhere.herokuapp.com/https://www.dhs.gov/sites/default/files/publications/claims-2010-2013_0.xls",
      method: "GET",
      responseType: "arraybuffer",
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return dataFactory;
})







/* processFactory processes raw data to standard form */
app.factory('processFactory', function() {
  var processFactory = {};
  //Converts raw xls data to JSON using xlsx
  processFactory.convertToJSON = function(res) {
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
  processFactory.aggregateData = function(dataSet) {
    //retrieving initial values from data
    let airportName = dataSet[0]["Airport Name"].trim() + " (" + dataSet[0]["Airport Code"].trim() +")";
    let airlineName = dataSet[0]["Airline Name"].trim();
    let claimDate = dataSet[0]["Date Received"].slice(-6);
    let claimValueStr = dataSet[0]["Close Amount"];

    let claimValue = processFactory.processClaimValue(claimValueStr);

    //initializing data arrays
    var airlines = [airlineName];    
    var airports = [airportName];
    var monthlyClaims = [[{ date: claimDate, total: 1 }]]
    var monthlyValue = [[{ date: claimDate, value: claimValue }]]; /*array will hold arrays that correspond to the index of each airline.  each nested array will hold a series of objects.
                                                                     Objects in nested arrays will be structured in the format: { date: "JAN-10", value: 100.00 } */

                                                                  
    for (let i = 1; i < dataSet.length; i++) {
      //If the date recieved is not included, ignore item.   
      if (dataSet[i]["Date Received"] === undefined) {
        continue;
      } 

      //alter entry data to standard form
      airportName = dataSet[i]["Airport Name"].trim() + " (" + dataSet[i]["Airport Code"].trim() +")";
      airlineName = dataSet[i]["Airline Name"].trim();
      claimDate = dataSet[i]["Date Received"].slice(-6);
      claimValueStr = dataSet[i]["Close Amount"];

      claimValue = processFactory.processClaimValue(claimValueStr);

      //Check if the airports is associated with data previously processed
      let airportsLength = airports.length;
      for (let j = 0; j < airportsLength; j++) {
        if (airportName === airports[j]) {
          //if yes, check if claim is in the latest month
          if (monthlyClaims[j][monthlyClaims[j].length - 1].date === claimDate) {
            //if true, increment data
            monthlyClaims[j][monthlyClaims[j].length - 1].total += 1;
          } else {
            //else, create new month and append to existing array
            monthlyClaims[j].push({ date: claimDate, total: 1 });
          }
          break;
        } else if (j === airportsLength - 1) {     
          //else add new airport with item 
          airports.push(airportName);
          monthlyClaims.push([{ date: claimDate, total: 1 }]);
        }
      }

      //Check if the airline is associated with data previously processed
      let airlinesLength = airlines.length;
      for (let j = 0; j < airlinesLength; j++) {
        if (airlineName === airlines[j]) {
          //if yes, check if claim is in the latest month
          if (monthlyValue[j][monthlyValue[j].length - 1].date === claimDate) {
            //if yes, update data of latest month
            monthlyValue[j][monthlyValue[j].length - 1].value += claimValue;
          } else {
            //append data for latest month
            monthlyValue[j].push({ date: claimDate, value: claimValue });
          }
          break;
        } else if (j === airlinesLength - 1) {
          //add airline with new item
          airlines.push(airlineName);
          monthlyValue.push([{date: claimDate, value: claimValue}]);
        }
      }
    }
    return {airportList: airports, claims: monthlyClaims, airlineList: airlines, cost: monthlyValue};
  }

  // Returns string dollar value of format '$X.XX' as float.  (not limited to 3 digits).
  processFactory.processClaimValue = function(claimValueStr) {
    claimValueStr = claimValueStr.replace(/\s/g, '');
    claimValueStr = claimValueStr.replace(/\$/g, '');
    if (claimValueStr === '-' || claimValueStr === '') {
      claimValueStr = "0";
    }
    return parseFloat(claimValueStr);
  }
 
 return processFactory;
})






/* Updates data values based on changing parameters and returns updated values to controller */
app.factory('updateFactory', function() {
  var updateFactory = {};

  updateFactory.getMonths = function(dataBin) {
    let months = [];

    for (let i = 0; i < dataBin.cost[0].length; i++) { //using first entry because I know Delta has claims for every month and i'm a bit lazy.
      let month = dataBin.cost[0][i]["date"];
      months.push(month); 
    }

    return months;
  }

  //Ensures that graph labels correspond to range specified in options
  updateFactory.createLabels = function(months, dataBin, startDate, endDate) {
    let labelsArr = [];
    let rangeArr = [];

    let monthsLength = months.length;
    for (let i = 0; i < monthsLength; i++) {
      let month = dataBin.cost[0][i]["date"];
      if (month === startDate) {
        rangeArr.push(i);
        do {
          labelsArr.push(month); 
          i++;
          month = months[i];                           
        } while (month !== endDate); 
        if (month === endDate) {
          rangeArr.push(i);
        }
        labelsArr.push(month); 
        break;
      }
    }
    return {labels: labelsArr, range: rangeArr};
  }

  //updates data for line graph
  updateFactory.updateData = function(dataBin, selectedAirline, range, labels) {
    //find index of target
    var targetIndex = -1;
    let airlinesListLength = dataBin.airlineList.length
    for (let i = 0; i < airlinesListLength; i++) {
      if (selectedAirline === dataBin.airlineList[i]) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) {
      console.error("Unable to find matching airline in data set.");
    }
    
    //Find data by month in range, taking into account months with no data
    let target = dataBin.cost[targetIndex];
    let targetCount = range[0];
    let data = [];
    let value = 0;
    let labelsLength = labels.length
    for (let i = 0; i < labelsLength; i++) {
      if (target[targetCount]["date"] === labels[i]) {
        value = target[targetCount]["value"];
        targetCount++;
      } else {
        value = 0;
      }
      data.push(value);       
    }

    return data;
  }

  //updates data for bar graph
  updateFactory.updateBarData = function(dataBin, selectedAirport, range, labels) {
    var targetIndex = -1;

    //finds the index of the specified airport
    let airportListLength = dataBin.airportList.length;
    for (let i = 0; i < airportListLength; i++) {
      if (selectedAirport === dataBin.airportList[i]) {
        targetIndex = i;
      }
    }

    if (targetIndex === -1) {
      console.error("Unable to find matching airport in data set.");
    }

    //finds claims associated with the airports during the specified time range
    let target = dataBin.claims[targetIndex];
    let targetCount = range[0];
    let data = [];
    let total = 0;

    let labelsLength = labels.length;
    for (let i = 0; i < labelsLength; i++) {
      if (target[targetCount]["date"] === labels[i]) {
        total = target[targetCount].total;
        targetCount++;
      } else {
        total = 0;
      }
      data.push(total);     
    }

    return data;
  }
  
  //updates view for changing options concerning line graph
  updateFactory.updateLinePage = function() {
    //let type = "line";

    var lineOps = angular.element(document.querySelector("#barOptions"));     
    lineOps.addClass("hidden"); 
    var barOps = angular.element(document.querySelector("#lineOptions"));    
    barOps.removeClass("hidden");
    angular.element(document.querySelector("#airlineLabel")).removeClass("hidden");
    angular.element(document.querySelector("#airportLabel")).addClass("hidden");
    document.getElementById("yAxisLabel").innerHTML = "Value of Lost Claims";  //update y axis label

    document.getElementById("barBtn").classList.remove("active-btn");
    document.getElementById("lineBtn").classList.add("active-btn");
  }

  //updates view for changing options concerning bar graph
  updateFactory.updateBarPage = function() {
    //let type = "bar";
  
    var lineOps = angular.element(document.querySelector("#lineOptions"));     
    lineOps.addClass("hidden"); 
    var barOps = angular.element(document.querySelector("#barOptions"));    
    barOps.removeClass("hidden");
    angular.element(document.querySelector("#airlineLabel")).addClass("hidden");
    angular.element(document.querySelector("#airportLabel")).removeClass("hidden");
    document.getElementById("yAxisLabel").innerHTML = "Number of Claims";  //update y axis label
    document.getElementById("lineBtn").classList.remove("active-btn");
    document.getElementById("barBtn").classList.add("active-btn");
  }

  return updateFactory;
})







angular.module("chartApp")
  .controller("chartController", ['$scope', 'dataFactory', 'processFactory', 'updateFactory', function($scope, dataFactory, processFactory, updateFactory) { 
  $scope.selectedAirline = "Delta Air Lines"; 
  $scope.selectedAirport = "McCarran International (LAS)";
  $scope.startDate = "Jan-10";  //start date for graphical display
  $scope.endDate = "Dec-13";    //end date for graphical display
  $scope.months = [];           //months included between the start and end dates
  $scope.data = [];             //data associated with the months array
  $scope.labels = [];           
  $scope.series = ['Series A', 'Series B'];
  $scope.type = "line";

  dataFactory.getData()
  .then(function(res) {
    return processFactory.convertToJSON(res);
  }, function() {
    document.getElementById("loadingText").innerHTML = "Sorry, the TSA server is not responding. Please try again later.";
    document.getElementById("loadingAnimation").classList.remove("loading-animation");
  }).then(function(resJSON) {
    $scope.dataBin = processFactory.aggregateData(resJSON);
  })
  .then(function() {
    $scope.updateToLine();
  }).then(function() {
    document.getElementById("loadingIndicator").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
  })

  $scope.updateToLine = function() {
    $scope.type = "line";
    $scope.months = updateFactory.getMonths($scope.dataBin);
    let labelsRange = updateFactory.createLabels($scope.months, $scope.dataBin, $scope.startDate, $scope.endDate);
    $scope.labels = labelsRange.labels;
    $scope.range = labelsRange.range;
    $scope.data = updateFactory.updateData($scope.dataBin, $scope.selectedAirline, $scope.range, $scope.labels);
    updateFactory.updateLinePage();
  }

  $scope.updateToBar = function() {
    $scope.type = "bar";
    $scope.months = updateFactory.getMonths($scope.dataBin);
    let labelsRange = updateFactory.createLabels($scope.months, $scope.dataBin, $scope.startDate, $scope.endDate);
    $scope.labels = labelsRange.labels;
    $scope.range = labelsRange.range;
    $scope.data = updateFactory.updateBarData($scope.dataBin, $scope.selectedAirport, $scope.range, $scope.labels);
    updateFactory.updateBarPage();
  }
  

  $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }];
  $scope.options = {
    elements: {
      line: {
          tension: .3, // disables bezier curves
      }
    },
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