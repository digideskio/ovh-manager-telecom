angular.module('managerApp').config(($stateProvider) => {
  $stateProvider.state('telecom.orders', {
    url: '/orders',
    views: {
      'telecomView@telecom': {
        templateUrl: 'app/telecom/orders/telecom-orders-main.view.html',
      },
      'ordersView@telecom.orders': {
        templateUrl: 'app/telecom/orders/telecom-orders.html',
        controller: 'TelecomOrdersCtrl',
        controllerAs: 'OrdersCtrl',
      },
    },
    translations: ['.', '../pack/common'],
    resolve: {
      $title(translations, $translate) {
        return $translate('telecom_order_page_title');
      },
    },
  });
});
