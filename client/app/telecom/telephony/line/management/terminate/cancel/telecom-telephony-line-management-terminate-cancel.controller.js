angular.module('managerApp').controller('TelecomTelephonyLineTerminateCancelCtrl', function ($stateParams, $state, TelephonyMediator, OvhApiTelephony, Toast, $translate, $filter, $q) {
  const self = this;

  self.loading = {
    init: true,
    cancelTerminate: false,
  };

  self.taskDetails = {};

  self.cancelTerminate = function () {
    self.loading.cancelTerminate = true;
    if (self.taskDetails.executionDate) {
      return OvhApiTelephony.Service().v6().cancelTermination({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }, null).$promise.then(() => {
        Toast.success($translate.instant('telephony_group_line_cancel_terminating_ok'));
        $state.go('^');
      }).catch(() => {
        Toast.error($translate.instant('telephony_group_line_cancel_terminating_ko'));
      }).finally(() => {
        self.loading.cancelTerminate = false;
      });
    }
    return $q.when(null);
  };

  /*= =====================================
    =            INITIALIZATION            =
    ====================================== */

  function init() {
    self.loading.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.line = group.getLine($stateParams.serviceName);
    }).then(() => OvhApiTelephony.Service().OfferTask().v6().query({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
      action: 'termination',
      status: 'todo',
    }).$promise.then((tasks) => {
      if (tasks.length === 0) {
        return $state.go('^');
      }

      self.taskDetails = {};

      return OvhApiTelephony.Service().OfferTask().v6().get({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
        action: 'termination',
        status: 'todo',
        taskId: tasks[0],
      }).$promise.then((taskDetails) => {
        _.set(taskDetails, 'executionDate', $filter('date')(taskDetails.executionDate, 'shortDate'));
        self.taskDetails = taskDetails;
        return self.taskDetails;
      });
    }).catch(() => $state.go('^'))).catch((error) => {
      Toast.error($translate.instant('telephony_group_line_terminating_ko', { error: error.data.message }));
    })
      .finally(() => {
        self.loading.init = false;
      });
  }

  /* -----  End of INITIALIZATION  ------*/

  init();
});
