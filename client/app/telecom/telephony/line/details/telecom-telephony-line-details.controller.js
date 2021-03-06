angular.module('managerApp').controller('TelecomTelephonyLineDetailsCtrl', class TelecomTelephonyLineDetailsCtrl {
  constructor($q, $stateParams, currentLine, NumberPlans, TelephonyMediator) {
    this.$q = $q;
    this.billingAccount = $stateParams.billingAccount;
    this.serviceName = $stateParams.serviceName;
    this.currentLine = currentLine;
    this.NumberPlans = NumberPlans;
    this.TelephonyMediator = TelephonyMediator;
  }

  $onInit() {
    this.loading = true;
    this.lastRegistration = null;

    this.TelephonyMediator.getGroup(this.billingAccount).then((group) => {
      this.group = group;
      this.line = _.merge(this.group.getLine(this.serviceName), this.currentLine || {});
      this.line.getPublicOffer.description = this.line.getPublicOffer.description.replace('The Public Reference has an error', '-');
      this.plan = this.NumberPlans.getPlanByNumber(this.line);

      return this.$q.all({
        phone: this.line.getPhone(),
        options: this.line.getOptions(),
        ips: this.line.getIps(),
        lastRegistrations: this.line.getLastRegistrations(),
      }).then(() => {
        if (_.isArray(this.line.lastRegistrations) && this.line.lastRegistrations.length) {
          this.lastRegistration = _.chain(this.line.lastRegistrations)
            .sortBy(this.line.lastRegistrations, reg => new Date(reg.datetime)).first().value();
        }

        if (_.some(_.words(this.line.offers), offer => _.includes(['sipfax', 'priceplan', 'trunk'], offer))) {
          this.hasSimultaneousCallsOption = true;
          this.isTrunkRates = _.some(this.line.offers, offer => _.startsWith(offer, 'voip.main.offer.fr.trunk.rates'));
        }
      });
    }).finally(() => {
      this.loading = false;
    });
  }
});
