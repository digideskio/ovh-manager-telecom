angular.module("managerApp").config(function ($stateProvider) {
    "use strict";

    $stateProvider.state("telecom.telephony.line.calls.events", {
        url: "/events",
        views: {
            "@lineView": {
                templateUrl: "app/telecom/telephony/line/calls/events/telecom-telephony-line-calls-events.html",
                controller: "TelecomTelephonyLineCallsEventsCtrl",
                controllerAs: "EventsCtrl"
            }
        },
        translations: ["common"]
    });
});