'use strict';

var resourcify = angular.module('resourcify', []);

function resourcificator ($http, $q) {

  var $resourcifyError = angular.$$minErr('resourcify'),
      requestOptions = ['query', 'get', '$get', '$save', '$update', '$delete'],
      requestMethods = {
        'query': 'GET',
        'get': 'GET',
        '$get': 'GET',
        '$save': 'POST',
        '$update': 'PUT',
        '$delete': 'DELETE'
      },
      validMethods = ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'],
      bodyMethods = ['$save', '$update', '$delete', 'PUT', 'POST', 'DELETE', 'PATCH'];

  function validMethod (method) {
    if (!~validMethods.indexOf(method)) {
      throw $resourcifyError('requesttype', '"@{0}" is not a valid request method.', method);
    }
    return method;
  }

  function replaceParams (params, url) {
    
  }
}

resourcificator.$inject = ['$http', '$q'];

resourcify.service('resourcify', resourcificator);
