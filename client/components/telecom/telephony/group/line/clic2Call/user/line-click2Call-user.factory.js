angular.module('managerApp').factory('TelephonyGroupLineClick2CallUser', ($q, OvhApiTelephony) => {
  const mandatoriesPhoneOptions = [
    'billingAccount',
    'serviceName',
  ];
  let mandatoryNb;

  /*= ==================================
        =            CONSTRUCTOR            =
        =================================== */

  function TelephonyGroupLineClick2CallUser(mandatoryOptions, phoneOptionsParam) {
    let phoneOptions = phoneOptionsParam;

    mandatoryNb = mandatoriesPhoneOptions.length;
    if (!mandatoryOptions) {
      throw new Error('mandatory options must be specified when creating a new TelephonyGroupLineClick2CallUser');
    } else {
      for (mandatoryNb; mandatoryNb--;) { // eslint-disable-line
        if (!mandatoryOptions[mandatoriesPhoneOptions[mandatoryNb]]) {
          // check mandatory attributes
          throw new Error(`${mandatoriesPhoneOptions[mandatoryNb]} option must be specified when creating a new TelephonyGroupLineClick2CallUser`);
        } else {
          // set mandatory attributes
          this[mandatoriesPhoneOptions[mandatoryNb]] = mandatoryOptions[
            mandatoriesPhoneOptions[mandatoryNb]];
        }
      }
    }

    if (!phoneOptions) {
      phoneOptions = {};
    }

    this.setInfos(phoneOptions);
  }

  /* -----  End of CONSTRUCTOR  ------*/

  /*= ========================================
        =            PROTOTYPE METHODS            =
        ========================================= */

  TelephonyGroupLineClick2CallUser.prototype.setInfos = function (options) {
    const self = this;
    angular.forEach(_.keys(options), (optionKey) => {
      self[optionKey] = options[optionKey];
    });

    return self;
  };

  TelephonyGroupLineClick2CallUser.prototype.getUser = function () {
    const self = this;
    return OvhApiTelephony.Line().Click2Call().User().v6()
      .get({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
        id: self.id,
      }).$promise.then(phoneOptions => phoneOptions, error => $q.reject(error));
  };

  TelephonyGroupLineClick2CallUser.prototype.call = function (calledNumber) {
    const self = this;

    return OvhApiTelephony.Line().Click2Call().User().v6()
      .click2Call({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
      }, {
        calledNumber,
      }).$promise.then(voidResponse => voidResponse, error => $q.reject(error));
  };

  TelephonyGroupLineClick2CallUser.prototype.add = function (userOptionsParam) {
    const self = this;
    let userOptions = userOptionsParam;

    if (!userOptions) {
      userOptions = {
        login: self.login,
        password: self.password,
      };
    }

    return OvhApiTelephony.Line().Click2Call().User().v6()
      .post({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
      }, userOptions).$promise.then(voidResponse => voidResponse, (error) => {
        const message = error.data && error.data.message;
        return $q.reject(message);
      });
  };

  TelephonyGroupLineClick2CallUser.prototype.remove = function (userOptionsParam) {
    const self = this;
    let userOptions = userOptionsParam;

    if (!userOptions) {
      userOptions = {
        id: self.id,
      };
    }

    return OvhApiTelephony.Line().Click2Call().User().v6()
      .delete({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
        id: userOptions.id,
      }).$promise.then(voidResponse => voidResponse, (error) => {
        const message = error.data && error.data.message;
        return $q.reject(message);
      });
  };

  TelephonyGroupLineClick2CallUser.prototype.changePassword = function (password) {
    const self = this;

    return OvhApiTelephony.Line().Click2Call().User().v6()
      .changePassword({
        billingAccount: self.billingAccount,
        serviceName: self.serviceName,
        id: self.id,
      }, {
        password,
      }).$promise.then(voidResponse => voidResponse, (error) => {
        const message = error.data && error.data.message;
        return $q.reject(message);
      });
  };

  return TelephonyGroupLineClick2CallUser;
});
