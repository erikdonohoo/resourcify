'use strict';

function resourcificator ($http, $q, $log) {

  var $resourcifyErr = angular.$$minErr('resourcify'),
  requestOptions = ['query', 'get', '$get', '$save', '$update', '$delete'],
  requestMethods = {
    'query': 'GET',
    'get': 'GET',
    '$get': 'GET',
    '$save': 'POST',
    '$update': 'PUT',
    '$delete': 'DELETE'
  },
  bodyMethods = ['$save', '$update', '$delete', 'PUT', 'POST', 'DELETE', 'PATCH'];

  $log.debug(requestOptions, requestMethods, bodyMethods, $resourcifyErr);
}

resourcificator.$inject = ['$http', '$q', '$log'];

angular.module('resourcify').service('resourcify', resourcificator);
