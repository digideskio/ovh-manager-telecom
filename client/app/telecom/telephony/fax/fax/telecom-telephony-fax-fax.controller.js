angular.module("managerApp").controller("TelecomTelephonyFaxFaxCtrl", function ($q, $stateParams, $translate, TelecomMediator, TelephonyMediator, Toast) {
    "use strict";

    var self = this;

    self.loading = {
        init: false
    };

    self.fax = null;
    self.actions = null;

    /* =====================================
    =            INITIALIZATION            =
    ====================================== */

    function initActions () {
        var actions = [{
            name: "line_fax_password",
            sref: "telecom.telephony.fax.fax.password",
            text: $translate.instant("telephony_fax_fax_action_password")
        }, {
            name: "line_fax_options",
            sref: "telecom.telephony.fax.fax.settings",
            text: $translate.instant("telephony_fax_fax_action_options")
        }, {
            name: "line_fax_white_label_domains",
            sref: "telecom.telephony.fax.fax.customDomains",
            text: $translate.instant("telephony_fax_fax_action_white_label_domains"),
            disabled: !TelecomMediator.isVip
        }, {
            name: "line_fax_filtering",
            url: TelephonyMediator.getV6ToV4RedirectionUrl("line.line_fax_filtering"),
            text: $translate.instant("telephony_fax_fax_action_filtering")
        }, {
            name: "line_fax_campaign_management",
            sref: "telecom.telephony.fax.fax.campaigns",
            text: $translate.instant("telephony_fax_fax_action_campaign_management")
        }, {
            name: "line_convert_to_ecofax_pro",
            sref: "telecom.telephony.fax.fax.convertToVoicefax",
            text: $translate.instant("telephony_fax_fax_action_convert_to_voicefax")
        }];

        self.actions = actions;
    }

    self.$onInit = function () {
        self.loading.init = true;

        return TelephonyMediator.getGroup($stateParams.billingAccount).then(function (group) {
            self.fax = group.getFax($stateParams.serviceName);
            initActions();
        }).catch(function (error) {
            Toast.error([$translate.instant("telephony_fax_loading_error"), _.get(error, "data.message", "")].join(" "));
            return $q.reject(error);
        }).finally(function () {
            self.loading.init = false;
        });
    };

    /* -----  End of INITIALIZATION  ------ */

});
