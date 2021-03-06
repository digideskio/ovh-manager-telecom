angular.module('managerApp').controller('TelecomTelephonyAliasConfigurationTonesOldPabxCtrl', function (
  $q, $stateParams, $translate, $timeout,
  TelephonyMediator, Toast, voipServiceTask,
  OvhApiMe, OvhApiTelephony, OvhApiTelephonyEasyPabx, OvhApiTelephonyMiniPabx,
) {
  const self = this;
  let apiService;
  let attrs;

  self.loaders = {
    init: false,
    save: false,
  };

  self.tones = null;
  self.formOptions = null;
  self.formErrors = {};
  self.enums = {
    tones: [
      'None',
      'Custom sound',
    ],
  };

  /* ==============================
  =            HELPERS            =
  =============================== */

  function fetchTones() {
    return apiService.v6().getTones({
      billingAccount: $stateParams.billingAccount,
      serviceName: $stateParams.serviceName,
    }).$promise.catch((error) => {
      if (error.status === 404) {
        return {
          ringback: 'None',
          onHold: 'None',
          endCall: 'None',
        };
      }
      return $q.reject(error);
    });
  }

  function hasAttrChange(attr) {
    return !angular.equals(_.get(self.tones, attr), _.get(self.formOptions, attr));
  }

  self.checkValidSound = function (file, toneType) {
    // reset errors for tone type
    _.set(self.formErrors, toneType, {});

    // check for good format
    const validExtensions = ['wav', 'mp3', 'mp4', 'ogg', 'wma'];
    const fileName = file ? file.name : '';
    self.formErrors[toneType].format = !_.some(
      validExtensions,
      ext => _.endsWith(fileName.toLowerCase(), ext),
    );

    // check for file size
    self.formErrors[toneType].size = file.size > 10000000;
    return !self.formErrors[toneType].format && !self.formErrors[toneType].size;
  };

  self.isFormValid = function () {
    return _.some(attrs, tone => (hasAttrChange(tone) && self.formOptions[tone] !== 'Custom sound') || (self.formOptions[tone] === 'Custom sound' && hasAttrChange(tone) && self.formOptions[`${tone}Custom`]));
  };

  function uploadFile(toneType) {
    const file = _.get(self.formOptions, `${toneType}Custom`);

    // api does not handle space characters in filenames
    const name = (file.name || '').replace(/\s/g, '_');

    // first, upload document to get a file url
    return OvhApiMe.Document().v6().upload(name, file).then(doc => apiService.v6()
      .uploadTones({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }, {
        type: toneType,
        documentId: doc.id,
      }).$promise
      .then(result => voipServiceTask.startPolling(
        $stateParams.billingAccount,
        $stateParams.serviceName, result.taskId, {
          namespace: `soundUploadTask_${$stateParams.serviceName}`,
          interval: 1000,
          retryMaxAttempts: 0,
        },
      ).catch((err) => {
        // When the task does not exist anymore it is considered done (T_T)
        if (err.status === 404) {
          // add some delay to ensure we get the sound from api when refreshing
          return $timeout(() => $q.when(true), 2000);
        }
        return $q.reject(err);
      })));
  }

  /* -----  End of HELPERS  ------ */

  /* =============================
  =            EVENTS            =
  ============================== */

  self.onTonesFormSubmit = function () {
    const savePromises = [];
    const otherTypes = {};

    self.loaders.save = true;

    attrs.forEach((toneType) => {
      if (_.get(self.formOptions, toneType) === 'Custom sound' && self.formOptions[`${toneType}Custom`]) {
        savePromises.push(uploadFile(toneType));
      } else if (_.get(self.formOptions, toneType) !== 'Custom sound') {
        _.set(otherTypes, toneType, _.get(self.formOptions, toneType));
      }
    });

    // save other types (types without custom sound)
    if (!_.isEmpty(otherTypes)) {
      savePromises.push(apiService.v6().saveTones({
        billingAccount: $stateParams.billingAccount,
        serviceName: $stateParams.serviceName,
      }, otherTypes).$promise);
    }

    return $q.all(savePromises).then(() => {
      self.tones = angular.copy(_.pick(self.formOptions, attrs));
      Toast.success($translate.instant('telephony_alias_configuration_tones_old_pabx_save_success'));
      self.$onInit();
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_alias_configuration_tones_old_pabx_save_error'), _.get(error, 'data.message')].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loaders.save = false;
    });
  };

  self.onCancelBtnClick = function () {
    self.formOptions = angular.copy(self.tones);
  };

  /* -----  End of EVENTS  ------ */

  /* =====================================
  =            INITIALIZATION            =
  ====================================== */

  self.$onInit = function () {
    self.loaders.init = true;

    return TelephonyMediator.getGroup($stateParams.billingAccount).then((group) => {
      self.number = group.getNumber($stateParams.serviceName);
      apiService = self.number.feature.featureType === 'easyPabx' ? OvhApiTelephonyEasyPabx : OvhApiTelephonyMiniPabx;
      attrs = self.number.feature.featureType === 'easyPabx' ? ['ringback', 'endCall'] : ['ringback', 'onHold', 'endCall'];

      return fetchTones().then((result) => {
        self.tones = result;
        self.formOptions = angular.copy(self.tones);
      });
    }).catch((error) => {
      Toast.error([$translate.instant('telephony_alias_configuration_tones_old_pabx_load_error'), _.get(error, 'data.message')].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loaders.init = false;
    });
  };

  /* -----  End of INITIALIZATION  ------ */
});
