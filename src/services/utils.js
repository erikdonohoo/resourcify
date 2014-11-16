'use strict';

// Strip off any query params, and put them in a params object
function objectifyQueryParams (url) {
  var params = {}, query = url.substring(url.indexOf('?'));
  if (query !== url) {
    query.replace(
        new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
        function($0, $1, $2, $3) { params[$1] = $3; }
    );
  }
  return params;
}

function resourcifyUtils () {

  // Finds and replaces query params and path params
  function replaceParams (params, url, object) {
    var findParam = /[\/=](:\w*[a-zA-Z]\w*)/, copiedPath = angular.copy(url), match, cut = '__|cut|__';
    object = object || {};

    // Pull off query
    var qParams = objectifyQueryParams(copiedPath), finalParams = {};
    if (copiedPath.indexOf('?') !== -1) {
      copiedPath = copiedPath.substring(0, copiedPath.indexOf('?'));
    }

    // Fill in missing values in query params
    angular.forEach(qParams, function (value, key) {
      var pseudoKey = value.substring(1);
      if (value.charAt(0) === ':' && (params[pseudoKey] || object[pseudoKey])) {
        finalParams[key] = params[pseudoKey] || object[pseudoKey];
        delete params[pseudoKey]; // Don't re-use param as query param if it filled one
      } else if (value.charAt(0) !== ':') {
        finalParams[key] = value;
      }
    });

    // Replace pieces in path
    while ((match = findParam.exec(copiedPath))) {
      var regexVal = match[1], key = match[1].substring(1);
      copiedPath = copiedPath.replace(regexVal, params[key] || object[key] || cut);
      if (params[key]) {
        delete params[key];
      } else if (copiedPath.indexOf('/' + cut) !== -1) {
        copiedPath = copiedPath.substring(0, copiedPath.indexOf('/' + cut));
        break;
      }
    }

    // Add on remaining query params
    params = angular.extend({}, finalParams, params);
    var stringParams = [];
    angular.forEach(params, function (value, key) {
      stringParams.push(key + '=' + value);
    });
    copiedPath += ((stringParams.length) ? '?' : '') + stringParams.join('&');

    return copiedPath;
  }

  return {
    replaceParams: replaceParams
  };
}

angular.module('resourcify').factory('resourcifyUtils', resourcifyUtils);
