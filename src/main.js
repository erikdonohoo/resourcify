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
      bodyMethods = ['$save', '$update', '$delete', 'PUT', 'POST', 'DELETE', 'PATCH'];

  // Finds and replaces query params and path params
  function replaceParams (params, url) {
    var findParam = /[\/=](:\w*[a-zA-Z]\w*)/g, copiedPath = angular.copy(url);
  }
}

resourcificator.$inject = ['$http', '$q'];

resourcify.service('resourcify', resourcificator);
