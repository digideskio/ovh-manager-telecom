angular.module('managerApp').controller('OverTheBoxDetailsCtrl', function ($scope, $rootScope, $filter, $translate, $q, $stateParams, XDSL, OVER_THE_BOX, OVERTHEBOX_DETAILS, OvhApiOverTheBox, OverTheBoxGraphService, Toast, ChartjsFactory) {
  const self = this;

  /**
   * Callback used to display Y scale
   * @param {String} label Current scale label
   * @param {Number} index Index of the current scale label
   * @param  {Array} all   All scale labels
   * @return {String} Label
   */
  const humanizeAxisDisplay = function (label, index, all) {
    const interval = Math.round(all.length / 4);
    if (index === all.length - 1 || index % interval === 0) {
      return $filter('unit-humanize')(label, 'generic', 1);
    }
    return '';
  };

  /**
   * Define the display string for a bitrate
   * @param {Number} bitrate Bitrate in bits per seconds
   * @return {String}
   */
  const displayBitrate = function (bitrate) {
    return $filter('unit-humanize')(bitrate, 'bit', 1);
  };

  /**
   * GetAvailable remote actions
   * @returns {Promise}
   */
  function getAvailableAction() {
    self.availableAction = {};
    return OvhApiOverTheBox.v6().getAvailableActions({
      serviceName: $stateParams.serviceName,
    }).$promise.then((actions) => {
      actions.forEach((action) => {
        self.availableAction[action.name] = true;
      });
    });
  }

  /**
   * Compute current max
   * @param series
   * @returns {{max: number, current: number, rateMbps: number, rateUnit: string}}
   */
  function computeSpeed(series) {
    let max = 0;
    let currentMax = 0;
    let rateUnit = 'Mbps';
    let rate = 0;
    if (_.isArray(series) && series.length && series[0].dps) {
      Object.keys(series[0].dps).forEach((timeStmp) => {
        currentMax = 0;
        for (let i = 0; i < series.length; i += 1) {
          currentMax += series[i].dps[timeStmp];
        }
        max = max > currentMax ? max : currentMax;
      });
      rate = Math.round(currentMax / 104857.6) / 10;
      if (!rate) {
        rate = Math.round(currentMax / 102.4) / 10;
        rateUnit = 'Kbps';
      }
    }

    return {
      max,
      current: currentMax,
      display: {
        value: rate,
        unit: rateUnit,
      },
    };
  }

  function makeGraphPositive(graph) {
    _.forEach(Object.keys(graph.dps), (key) => {
      graph.dps[key] = graph.dps[key] < 0 ? 0 : graph.dps[key]; // eslint-disable-line
    });
  }

  /**
    * Load graph data
    */
  function getGraphData() {
    if (!$scope.OverTheBox.service) {
      return;
    }

    self.loaders.graph = true;
    $q.all([
      OverTheBoxGraphService.getGraphData({
        service: $scope.OverTheBox.service,
        downSample: OVER_THE_BOX.statistics.sampleRate,
        direction: 'in',
      }),
      OverTheBoxGraphService.getGraphData({
        service: $scope.OverTheBox.service,
        downSample: OVER_THE_BOX.statistics.sampleRate,
        direction: 'out',
      }),
    ]).then((data) => {
      const inData = data[0] && data[0].data ? data[0].data : [];
      const outData = data[1] && data[1].data ? data[1].data : [];

      const filteredDown = inData
        .filter(d => self.kpiInterfaces.indexOf(d.tags.iface) > -1);

      _.forEach(filteredDown, makeGraphPositive);
      self.download = computeSpeed(filteredDown);

      const filteredUp = outData
        .filter(d => self.kpiInterfaces.indexOf(d.tags.iface) > -1);
      _.forEach(filteredUp, makeGraphPositive);
      self.upload = computeSpeed(filteredUp);

      // Download chart
      self.chartDown = new ChartjsFactory(angular.copy(OVERTHEBOX_DETAILS.chart));
      self.chartDown.setYLabel($translate.instant('overTheBox_statistics_bits_per_sec_legend'));
      self.chartDown.setAxisOptions('yAxes', {
        ticks: {
          callback: humanizeAxisDisplay,
        },
      });
      self.chartDown.setTooltipCallback(
        'label',
        item => displayBitrate(item.yLabel),
      );

      const downSeries = _.chain(filteredDown)
        .map(d => ({
          name: d.tags.iface,
          data: Object.keys(d.dps).map(key => ({
            x: key * 1000,
            y: d.dps[key] * 8,
          })),
        }))
        .sortByOrder(['name'], ['asc'])
        .value();

      _.forEach(downSeries, (serie) => {
        self.chartDown.addSerie(
          serie.name,
          serie.data,
          {
            dataset: {
              fill: true,
              borderWidth: 1,
            },
          },
        );
      });
      if (!downSeries.length) {
        self.chartDown.options.scales.xAxes = [];
      }

      // Upload chart
      self.chartUp = new ChartjsFactory(angular.copy(OVERTHEBOX_DETAILS.chart));
      self.chartUp.setYLabel($translate.instant('overTheBox_statistics_bits_per_sec_legend'));
      self.chartUp.setAxisOptions('yAxes', {
        ticks: {
          callback: humanizeAxisDisplay,
        },
      });
      self.chartUp.setTooltipCallback(
        'label',
        item => displayBitrate(item.yLabel),
      );

      const upSeries = _.chain(filteredUp)
        .map(d => ({
          name: d.tags.iface,
          data: Object.keys(d.dps).map(key => ({
            x: key * 1000,
            y: d.dps[key] * 8,
          })),
        }))
        .sortByOrder(['name'], ['asc'])
        .value();

      _.forEach(upSeries, (serie) => {
        self.chartUp.addSerie(
          serie.name,
          serie.data,
          {
            dataset: {
              fill: true,
              borderWidth: 1,
            },
          },
        );
      });
      if (!upSeries.length) {
        self.chartUp.options.scales.xAxes = [];
      }
    }).catch((err) => {
      Toast.error($translate.instant('overthebox_traffic_error'));
      $q.reject(err);
    }).finally(() => {
      self.loaders.graph = false;
    });
  }

  function init() {
    self.loaders = {
      init: true,
      checking: false,
      device: false,
      graph: false,
    };

    self.error = {
      checking: null,
      noDeviceLinked: false,
    };

    self.nameEditable = false;

    self.service = null;
    self.deviceIds = [];
    self.allDevices = [];
    self.device = null;

    $q.all([
      self.getServiceInfos(),
      self.checkDevices(),
      self.getDevice(),
      self.getTasks(),
      OvhApiOverTheBox.v6().get({
        serviceName: $stateParams.serviceName,
      }).$promise.then((otb) => {
        self.nameEditable = otb.status === 'active';
        return otb;
      }),
    ]).finally(() => {
      if (self.allDevices.length === 1 && !self.device) {
        self.deviceIdToLink = self.allDevices[0].deviceId;
      }
      self.loaders.init = false;
      getGraphData();
    });
    getAvailableAction();
  }

  /**
   * Launch remote action to the NUC
   * @param {String} actionName Action to launch
   * @returns {Promise}
   */
  self.LaunchAction = function (actionName) {
    self.availableAction = {};
    return OvhApiOverTheBox.v6().launchAction({
      serviceName: $stateParams.serviceName,
    }, {
      name: actionName,
    }).$promise.then((data) => {
      Toast.success($translate.instant('overTheBox_action_launch_success'));
      return data;
    }).catch((err) => {
      Toast.error($translate.instant('overTheBox_action_launch_error'));
      return $q.reject(err);
    }).finally(() => {
      getAvailableAction();
    });
  };

  /**
   * Load Service info
   */
  self.getServiceInfos = function () {
    self.loaders.infos = true;
    return OvhApiOverTheBox.v6()
      .getServiceInfos({ serviceName: $stateParams.serviceName }).$promise
      .then((serviceInfos) => {
        self.serviceInfos = serviceInfos;
        if (self.serviceInfos && self.serviceInfos.renew) {
          self.serviceInfos.renew.undoDeleteAtExpiration = self
            .serviceInfos.renew.deleteAtExpiration;
        }
        return serviceInfos;
      }).catch((error) => {
        self.error.tasks = error.data;
        Toast.error([$translate.instant('an_error_occured'), error.data.message].join(' '));
        return $q.reject(error);
      }).finally(() => {
        self.loaders.infos = false;
      });
  };

  /**
   * Load Tasks
   */
  self.getTasks = function () {
    self.loaders.tasks = true;
    return OvhApiOverTheBox.v6().getTasks({
      serviceName: $stateParams.serviceName,
    }).$promise.then((tasks) => {
      self.tasks = tasks;
      return tasks;
    }).catch((error) => {
      self.error.tasks = error.data;
      Toast.error([$translate.instant('an_error_occured'), error.data.message].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loaders.tasks = false;
    });
  };

  /**
   * Check devices
   */
  self.checkDevices = function () {
    self.loaders.checking = true;
    return OvhApiOverTheBox.v6().checkDevices().$promise.then((devices) => {
      self.allDevices = devices;
      self.deviceIds = devices.map(device => device.deviceId);
      return self.deviceIds;
    }).catch((error) => {
      self.error.checking = error.data;
      Toast.error([$translate.instant('an_error_occured'), error.data.message].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loaders.checking = false;
    });
  };

  /**
   * Get connected devices
   */
  self.getDevice = function () {
    self.loaders.device = true;
    return OvhApiOverTheBox.v6().getDevice({
      serviceName: $stateParams.serviceName,
    }).$promise.then((devices) => {
      self.device = devices;
      self.kpiInterfaces = devices.networkInterfaces
        .filter(netInterface => netInterface.gateway != null)
        .map(netInterface => (netInterface.device ? netInterface.device : netInterface.name));
      return devices;
    }).catch((error) => {
      if (error.status === 404) {
        self.error.noDeviceLinked = true;
      }
      return $q.reject(error);
    }).finally(() => {
      self.loaders.device = false;
    });
  };

  /**
   * Link a device
   * @param {Object} device Device to link
   */
  self.linkDevice = function (device) {
    self.loaders.device = true;
    return OvhApiOverTheBox.v6().linkDevice({
      serviceName: $stateParams.serviceName,
    }, {
      deviceId: device.deviceId,
    }).$promise.then(() => {
      self.device = device;
      Toast.success($translate.instant('overTheBox_link_device_success'));
      return device;
    }).catch((error) => {
      Toast.error([$translate.instant('an_error_occured'), error.data.message].join(' '));
      return $q.reject(error);
    }).finally(() => {
      self.loaders.device = false;
    });
  };

  /**
   * check if Service can be resiliated
   * @return {Boolean}
   */
  self.canResiliate = function () {
    if (!this.serviceInfos || !this.serviceInfos.renew) {
      return false;
    }
    return !this.serviceInfos.renew.deleteAtExpiration
      && !this.serviceInfos.undoDeleteAtExpiration
      && this.serviceInfos.canDeleteAtExpiration;
  };

  /**
   * Check if an on-going resiliation can be cancelled
   * @return {Boolean}
   */
  self.canCancelResiliation = function () {
    if (self.canResiliate()) {
      return false;
    }
    if (!this.serviceInfos || !this.serviceInfos.renew) {
      return false;
    }
    return this.serviceInfos.renew.deleteAtExpiration && !this.serviceInfos.undoDeleteAtExpiration;
  };

  /**
   * Resiliate the current service
   * @return {Promise}
   */
  self.resiliate = function () {
    self.loaders.resiliating = true;
    return OvhApiOverTheBox.v6().deleteAtExpiration({
      serviceName: $stateParams.serviceName,
    }, null).$promise.then(self.getServiceInfos).then((data) => {
      Toast.success($translate.instant(
        'overTheBox_resiliation_success',
        {
          service: $scope.OverTheBox.service.customerDescription
            || $scope.OverTheBox.service.serviceName,
          date: moment(self.serviceInfos.expiration).format('DD/MM/YYYY'),
        },
      ));
      return data;
    }).catch((err) => {
      Toast.error($translate.instant(
        'overTheBox_resiliation_error',
        {
          service: $scope.OverTheBox.service.customerDescription
            || $scope.OverTheBox.service.serviceName,
        },
      ));
      return $q.reject(err);
    }).finally(() => {
      self.loaders.resiliating = false;
    });
  };

  /**
   * Cancel the résiliation of the current service
   * @return {Promise}
   */
  self.cancelResiliation = function () {
    self.loaders.cancellingResiliation = true;
    return OvhApiOverTheBox.v6().keepAtExpiration({
      serviceName: $stateParams.serviceName,
    }, null).$promise.then(self.getServiceInfos).then((data) => {
      Toast.success($translate.instant(
        'overTheBox_cancel_resiliation_success',
        {
          service: $scope.OverTheBox.service.customerDescription
            || $scope.OverTheBox.service.serviceName,
        },
      ));
      return data;
    }).catch((err) => {
      Toast.error($translate.instant(
        'overTheBox_resiliation_cancel_error',
        {
          service: $scope.OverTheBox.service.customerDescription
            || $scope.OverTheBox.service.serviceName,
        },
      ));
      return $q.reject(err);
    }).finally(() => {
      self.loaders.cancellingResiliation = false;
    });
  };

  init();
});
