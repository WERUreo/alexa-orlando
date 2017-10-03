var Alexa = require('alexa-sdk');
var CityCouncilDates = require('./citycouncildates.json');
var FunFacts = require('./funFacts.json');
var xml2js = require('xml2js');
var axios = require('axios');
var moment = require('moment');

var handlers = {
    'GetCrimeReportIntent': function() {
        var that = this;
        getCrimeReport( function(crime) {
          that.emit(':tell', crime)
        });
    },
    'GetFunFactsIntent': function() {
        var funFact = getRandomOrlandoFunFact();
        this.emit(':tell', funFact);
    },
    'GetDistrictIntent': function() {
        this.emit(':tell', "This is not implemented yet!");
    },
    'GetNextCityCouncilMeetingIntent': function() {
        //aDates = array of dates (Must be sorted past to present)
        //date   = Current date in seconds

        var aDates = CityCouncilDates.date;
        var sDateInSec = GetDayInSec();
        var sNext = NextDate(aDates, sDateInSec);
        var sResponse = "The next City Council meeting will be held on " + sNext + "at 2:00 P.M.";
        //We are not completely certain it will always be at 2:00 pm the day of the meeting.
        this.emit(':tell', sResponse);
        
    },
    'GetLocationOfCityCouncilMeetingIntent': function() {
        this.emit(':tell', "City Council meetings are held in Council Chamber, 2nd Floor, City Hall, 400 S. Orange Avenue.  For additional information, please contact the City Clerk’s Office, 407.246.2251.");
    },
    'GetCityCommissioner': function() {

        var address = this.event.request.intent.slots.address.value;

        //get ward
        // function GetCommissioner(ward) {}
        var that = this;
        getWard(address, function(ward) {
            getCommissioner(ward, function(commissioner) {
                console.log("Commissioner: " + commissioner);
                that.emit(':tell', commissioner);
            });
        });
    },
    'GetCityClerksPhoneNumber': function() {
        this.emit(':tellWithCard', "You can call the city clerk's office at 407.246.2251", "City Clerk Phone Number", "407-246-2251");
    },
    'GetMayorNameIntent': function() {
        this.emit(':tell', "Buddy Dyer has served as Mayor of the City of Orlando since 2003");
    },
    'GetPhoneNumberIntent' : function() {
        var departmentId = this.event.request.intent.slots.department.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        var responseString = getPhoneNumberForDepartment(departmentId);
        this.emit(':tell', responseString);
    },
    'GetEventParkingIntent' : function() {

        that = this;
        var date = this.event.request.intent.slots.date.value;
        getEventParking(date, function(hasEventParking) {
            if (hasEventParking) {
                that.emit(':tell', "Yes, there is event parking on that date");
            } else {
                that.emit(':tell', "No, there is not event parking on that date");
            }
        });
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = HELP_MESSAGE;
        var reprompt = HELP_REPROMPT;

        this.response.speak(speechOutput).listen(reprompt);
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak(STOP_MESSAGE);
        this.emit(':responseReady');
    }
};

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context, callback);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

function getPhoneNumberForDepartment(department) {
    var phoneNumbers = {
        "business": "The phone number for business and financial services is 407.246.2341",
        "parking": "The phone number for the parking division is 407.246.2155",
        "waste": "The phone number for solid waste is 407.246.2314",
        "communications": "The phone number for communications and neighborhood relations is 407.246.2169",
        "clerk": "The phone number for the city clerk's office is 407.246.2251",
        "parks": "The phone number for the parks division is 407.246.2283",
        "mayor": "The phone number for the office of the mayor is 407.246.2221",
        "fire": "The non-emergency number for the fire department is 321.246.3473. If this is an emergency please call 911",
        "police": "The non-emergency number for OPD is 407.246.2470. If this is an emergency please call 911",
        "attorney": "The phone number for the city attorney's office is 407.246.2295",
    };

    return phoneNumbers[department];

}

function GetDayInSec() {
    //Takes the current date, removes the time, and then returns the seconds
	var tDate = new Date();
	tDate =  (tDate.getMonth() +1)+ "/" + tDate.getDate() + "/" + tDate.getFullYear();

	sDateInSec = Date.parse(tDate);
    return sDateInSec;
}

function NextDate(aDates, CurrentDate) {
    //step through dates until it finds one that hasn't occurred
    //aDates must be ordered or this fails
    var nLength = aDates.length;
	var i = 0;
	while (i < nLength) {
        sCurr = Date.parse(aDates[i]);
        if (sCurr > CurrentDate)  {
            sNext = aDates[i];
            break;
        }

        i++;
	}

    return sNext;
}

function getRandomOrlandoFunFact() {
    var randomIndex = Math.floor(Math.random() * FunFacts.facts.length);
    return FunFacts.facts[randomIndex];
}

function getCrimeReport(callback) {
   axios({
        url: "http://www1.cityoforlando.net/opd/activecalls/activecad.xml",
        method: "get",
        responseType: "text"
    })
    .then( function(response) {
        xml2js.parseString(response.data, function(error, result) {
            if (error) {
                console.log("xml2js Error: " + error);
                callback("There was a problem parsing the data.");
            } else {
                var crimeData = result.CALLS.CALL[0];
                var crimeString = "There was a " + crimeData.DESC + " reported at " + crimeData.LOCATION;
                callback(crimeString);
            }
         });
    })
    .catch( function(error) {
        console.log("axios Error:" + error);
        callback("There was a problem getting the data.");
    });
}

function getEventParking(date, callback) {
    axios({
        url: "https://event-parking.herokuapp.com/events",
        method: "get",
        responseType: "text"
    })
    .then(function(response) {

        var today = moment(date, "YYYY-MM-DD");

        var hasEvent = false;
        for (i = 0; i<response.data.length; i++) {
            date = moment(response.data[i], "YYYY-MM-DD");
            if (today.isSame(date)) {
                hasEvent = true;
                break;
            }
        }

        callback(hasEvent);
    });
}

function getWard(address, callback) {
    // global city_Ward variable to access data
    var city_Ward;
    var baseApiUrl = 'https://alpha.orlando.gov/OCServiceHandler.axd?url=ocsvc/public/spatial/findaddress&address=';
    // encode uri for the baseApiUrl
    address = encodeURIComponent(address);

    var apiURL = baseApiUrl + address;
    axios.get(apiURL)
        .then(function(response) {
            // check for error
            if (response.status !== 200) {
                return;
            }
            //check if data response came through
            //loop through data to find the District Ward.
            // the data json should look like this -> { locations: [{}], abc: '', xyz: '' }
            // city_Ward ->>>> 'Ward': 'some number'
            for (var i=0; i<response.data.locations.length; i++) {
                var location = response.data.locations[i];
                city_Ward = location.Ward;
                callback(city_Ward);
            }
        })
        .catch(function(err) {
            console.log("Error: " + err);
        });
}

function getCommissioner(ward, callback) {
    console.log("Getting commissioner");
    var commissioner;
    var baseApiUrl = 'https://alpha.orlando.gov/OCServiceHandler.axd?url=ocsvc/Public/InMyNeighbourhood/Councillors&Ward=';
    //encode uri for ward
    ward = encodeURIComponent(ward);
    //final api url
    var apiURL = baseApiUrl + ward;
    console.log("API URL: " + apiURL);
    axios.get(apiURL)
        .then(function(response) {
            // check for error
            // if (response.data !== 200) { console.log("Error Response"); response.status; return; }
            // extract { response.data.responseContent } -> long html string
            // regex and find the text in between the 2nd instance of { <h3> _ </h3> }
            console.log("Response Content: " + response.data.responseContent);
            var commissioner = findCommissionerString(response.data.responseContent); // returns commissioner
            callback(commissioner);
        });
}

function findCommissionerString(dataString) {
    var delimiter = 'h3',
    start = 2,
    //splits the first 2 <h3> instances
    tokens = dataString.split(delimiter).slice(start),
    half_str = tokens.join(delimiter);

    var beg_h3 = half_str.indexOf('h3', 0);
    var end_h3 = half_str.indexOf('h3', (beg_h3 + 1));
    var h3_str = half_str.slice(beg_h3 -1, end_h3 + 3);

    brack_1 = h3_str.indexOf('>', 1);
    brack_2 = h3_str.indexOf('<', brack_1);

    var final_str = h3_str.slice(brack_1 + 1, brack_2);

    return final_str;
}