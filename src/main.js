'use strict';

var resourcify = angular.module('resourcify', []);

function resourcifyUtils ($log) {

  // Strip off any query params, and put them in a params object
  function objectifyQueryParams (url) {
    var params = {}, query = url.substring(url.indexOf('?'));
    $log.debug(query);
    return params;
  }

  // Finds and replaces query params and path params
  function replaceParams (params, url) {
    var findParam = /[\/=](:\w*[a-zA-Z]\w*)/g, copiedPath = angular.copy(url);
    params = angular.extend({}, params, objectifyQueryParams(copiedPath));
    $log.debug(findParam, url, params);
    return copiedPath;
  }

  return {
    objectifyQueryParams: objectifyQueryParams,
    replaceParams: replaceParams
  };
}

resourcifyUtils.$inject = ['$log'];

resourcify.factory('resourcifyUtils', resourcifyUtils);

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

resourcify.service('resourcify', resourcificator);
