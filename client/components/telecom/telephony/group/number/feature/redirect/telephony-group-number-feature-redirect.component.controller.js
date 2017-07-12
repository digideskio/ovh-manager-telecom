angular.module("managerApp").controller("TelephonyNumberRedirectCtrl", function ($q, $translate, TelephonyMediator, voipServiceTask, Toast) {
    "use strict";

    var self = this;
    var selectedService = null;

    self.group = null;
    self.destinationService = null;
    self.availableServices = null;

    self.displayHelpers = {
        currentGroupServiceCount: null,
        hasOtherGroups: false,
        availableTypes: undefined,
        hiddenGroups: [],
        serviceChoicePopoverOptions: {
            popoverTrigger: "none",
            popoverPlacement: "auto right",
            popoverClass: "pretty-popover telephony-service-choice-popover",
            popoverAppendToBody: true,
            popoverIsOpen: false
        }
    };

    /*= ==============================
    =            HELPERS            =
    ===============================*/

    /**
     *  Get the connection ids
     */
    self.getConnectionIds = function (idPrefix) {
        var connectionIds = [];

        if (selectedService) {
            connectionIds.push("redirectTo-radio-all");
        }

        return connectionIds.concat(_.map(self.availableServices, function (service) {
            return idPrefix + service.serviceName;
        }));
    };

    /**
     *  Get the destination service
     */
    function getDestinationService (destinationServiceNameParam) {
        var destinationServiceName = destinationServiceNameParam;

        if (!destinationServiceName) {
            destinationServiceName = self.numberCtrl.number.feature.destination;
        }

        var serviceFromCurrentGroup = destinationServiceName ? self.group.getService(destinationServiceName) : null;
        return serviceFromCurrentGroup || TelephonyMediator.findService(destinationServiceName);
    }

    function getNumberList () {
        return self.numberCtrl.number.feature.featureType === "ddi" ? [] : _.filter(self.group.numbers, function (number) {
            return number.serviceName !== self.numberCtrl.number.serviceName;
        });
    }

    function refreshAvailableServices () {
        self.availableServices = [];

        // set service of current group
        if (self.displayHelpers.currentGroupServiceCount <= 4) {
            self.availableServices = getNumberList().concat(self.group.lines, self.group.fax);
        }

        // manage selected service
        selectedService = getDestinationService();
        if (selectedService && !_.find(self.availableServices, { serviceName: selectedService.serviceName })) {
            self.availableServices.push(selectedService);
        }

        return self.availableServices;
    }

    /**
     *  Set the save feature for parent component
     */
    function saveFeature () {
        return self.numberCtrl.number.feature.save().then(function (task) {
            // start polling to be sure that feature is totally saved
            return voipServiceTask.startPolling(self.numberCtrl.number.billingAccount, self.numberCtrl.number.serviceName, task.taskId, {
                namespace: "numberRedirectTask_" + self.numberCtrl.number.serviceName,
                interval: 1000,
                retryMaxAttempts: 0
            }).then(function () {
                // number feature is save - stop its edition
                self.numberCtrl.number.stopEdition(false, true);
            }, function (error) {
                if (error.status === 404) {
                    // consider number feature as saved - stop its edition
                    self.numberCtrl.number.stopEdition(false, true);
                    return $q.when(true);
                }
                return $q.reject(error);

            });
        }).catch(function (error) {
            Toast.error([$translate.instant("telephony_number_feature_redirect_save_error"), (error.data && error.data.message) || ""].join(" "));
            return $q.reject(error);
        }).finally(function () {
            self.numberCtrl.loading.save = false;
        });
    }

    /* -----  End of HELPERS  ------*/

    /*= =============================
    =            EVENTS            =
    ==============================*/

    self.onDestinationChange = function () {
        var isPending = self.numberCtrl.number.feature.destination === "pending";
        self.displayHelpers.serviceChoicePopoverOptions.popoverIsOpen = isPending;
    };

    self.onFeatureStartEdit = function () {
        if (!self.numberCtrl.number.feature.destination && self.displayHelpers.hasOtherGroups && self.displayHelpers.currentGroupServiceCount > 4) {
            self.displayHelpers.serviceChoicePopoverOptions.popoverIsOpen = true;
            self.numberCtrl.number.feature.destination = "pending";
        }

        return refreshAvailableServices();
    };

    self.onFeatureStopEdit = function () {
        self.destinationService = getDestinationService();
    };

    self.manageCancelChoice = function () {
        self.numberCtrl.number.feature.destination = selectedService ? selectedService.serviceName : self.numberCtrl.number.feature.stopEdition(true).startEdition().destination;
        return refreshAvailableServices();
    };

    self.manageValidateChoice = function (service) {
        self.numberCtrl.number.feature.destination = service.serviceName;
        return self.numberCtrl.saveNumber();
    };

    /* -----  End of EVENTS  ------*/

    /*= =====================================
    =            INITIALIZATION            =
    ======================================*/

    /**
     *  Component initialization
     */
    self.$onInit = function () {
        self.numberCtrl.loading.feature = true;

        // set save feature function
        self.numberCtrl.saveFeature = saveFeature;

        // load resource needed for redirect
        return TelephonyMediator.getGroup(self.numberCtrl.number.billingAccount).then(function (group) {
            self.group = group;

            return TelephonyMediator.getAll().then(function () {
                var numberList = getNumberList();

                self.displayHelpers.currentGroupServiceCount = numberList.length + self.group.lines.length + self.group.fax.length;

                // set display helpers
                self.displayHelpers.hasOtherGroups = _.keys(TelephonyMediator.groups).length > 1;
                self.displayHelpers.availableTypes = self.numberCtrl.number.feature.featureType === "ddi" ? ["trunk", "sip"] : undefined;
                if (self.displayHelpers.hasOtherGroups && self.displayHelpers.currentGroupServiceCount <= 4) {
                    self.displayHelpers.hiddenGroups.push(self.numberCtrl.number.billingAccount);
                }
            });
        }).finally(function () {
            self.numberCtrl.loading.feature = false;
        });
    };

    self.$onDestroy = function () {
        // stop edition of the feature
        self.numberCtrl.number.feature.stopEdition(true);

        // stop task polling
        voipServiceTask.stopPolling("numberRedirectTask_" + self.numberCtrl.number.serviceName);
    };

    /* -----  End of INITIALIZATION  ------*/

});