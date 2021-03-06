angular.module('managerApp').controller('TelecomTelephonyLineClick2CallRemoveUserCtrl', function ($uibModalInstance, $q, $timeout, TelephonyGroupLineClick2CallUser, line, user) {
  const self = this;

  self.loading = {
    removeUser: false,
  };

  self.removed = false;

  self.userToDelete = new TelephonyGroupLineClick2CallUser({
    billingAccount: line.billingAccount,
    serviceName: line.serviceName,
  }, {
    login: user.login,
    id: user.id,
  });

  self.remove = function () {
    self.loading.removeUser = true;

    return $q.all([
      self.userToDelete.remove().then(() => true),
      $timeout(angular.noop, 1000),
    ]).then(() => {
      self.loading.removeUser = false;
      self.removed = true;

      return $timeout(self.close, 1500);
    }, error => self.cancel({
      type: 'API',
      msg: error,
    }));
  };

  self.cancel = function (message) {
    return $uibModalInstance.dismiss(message);
  };

  self.close = function () {
    return $uibModalInstance.close(true);
  };
});
