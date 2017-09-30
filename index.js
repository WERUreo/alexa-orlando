var Alexa = require('alexa-sdk');
var FunFacts = require('./funFacts.json');
var xml2js = require('xml2js');
var axios = require('axios');

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
        this.emit(':tell', "The next City Council meeting will be held on Monday, October 9, 2017 at 2:00 P.M.");
    },
    'GetLocationOfCityCouncilMeetingIntent': function() {
        this.emit(':tell', "City Council meetings are held in Council Chamber, 2nd Floor, City Hall, 400 S. Orange Avenue.  For additional information, please contact the City Clerk’s Office, 407.246.2251.");
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

function getRandomOrlandoFunFact() {
    var randomIndex = Math.floor(Math.random() * FunFacts.facts.length);
    return FunFacts.facts[randomIndex]
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
                var date = new Date(crimeData.DATE);
                var hour = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
                var minute = date.getMinutes();
                var crimeString = "There was a " + crimeData.DESC + " reported at " + crimeData.LOCATION + " at " + hour + ":" + minute;
                callback(crimeString);
            }
         })
    })
    .catch( function(error) {
        console.log("axios Error:" + error);
        callback("There was a problem getting the data.");
    })
}

getCrimeReport( function(crime) {
  console.log(crime)
});
