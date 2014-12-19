'use strict';

// Strip off any query params, and put them in a params object
function objectifyQueryParams (url) {
  var params = {}, query = url.substring(url.indexOf('?'));
  if (query !== url) {
    query.replace(
        new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
        function ($0, $1, $2, $3) { params[$1] = $3; }
    );
  }
  return params;
}

/* Extends the destination object `dst` by copying all of the properties from the `src` object(s)
* to `dst`. You can specify multiple `src` objects.
* @param   {Boolean} deep If true, the merge becomes recursive (optional aka deep copy)
* @param   {Object}  dst  Destination object.
* @param   {Object}  src  Source object(s).
* @returns {Object}       Reference to `dst`.
*
* angular.extend(object, object2) // shallow copy
* angular.extend(true, object, object2) // deep copy
*/
function extendDeep(dst) {
  angular.forEach(arguments, function (obj) {
    if (obj !== dst) {
      angular.forEach(obj, function (value, key) {
        if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
          extendDeep(dst[key], value);
        } else {
          dst[key] = value;
        }
      });
    }
  });
  return dst;
}

function resourcifyUtils () {

  // Finds and replaces query params and path params
  function replaceParams (params, url, object, parentParams) {
    var findParam = /[\/=.](:\w*[a-zA-Z]\w*)/, copiedPath = angular.copy(url),
    match, cut = '__|cut|__', copiedParams = angular.copy(params);
    object = object || {};
    parentParams = parentParams || {};

    // Pull off query
    var qParams = objectifyQueryParams(copiedPath), finalParams = {};
    if (copiedPath.indexOf('?') !== -1) {
      copiedPath = copiedPath.substring(0, copiedPath.indexOf('?'));
    }

    // Fill in missing values in query params
    angular.forEach(qParams, function (value, key) {
      var pseudoKey = value.substring(1);
      if (value.charAt(0) === ':' && (copiedParams[pseudoKey] || object[pseudoKey] || parentParams[pseudoKey])) {
        finalParams[key] = copiedParams[pseudoKey] || object[pseudoKey] || parentParams[pseudoKey];
        delete copiedParams[pseudoKey]; // Don't re-use param as query param if it filled one
      } else if (value.charAt(0) !== ':') {
        finalParams[key] = value;
      }
    });

    // Replace pieces in path
    while ((match = findParam.exec(copiedPath))) {
      var regexVal = match[1], key = match[1].substring(1);
      copiedPath = copiedPath.replace(regexVal, copiedParams[key] || object[key] || parentParams[key] || cut);
      if (copiedParams[key]) {
        delete copiedParams[key];
      } else if (copiedPath.indexOf('/' + cut) !== -1) {
        copiedPath = copiedPath.substring(0, copiedPath.indexOf('/' + cut));
        break;
      }
    }

    // Add on remaining query params
    copiedParams = angular.extend({}, finalParams, copiedParams);
    var stringParams = [];
    angular.forEach(copiedParams, function (value, key) {
      stringParams.push(key + '=' + value);
    });
    copiedPath += ((stringParams.length) ? '?' : '') + stringParams.join('&');

    return copiedPath;
  }

  return {
    replaceParams: replaceParams,
    extendDeep: extendDeep
  };
}

angular.module('resourcify').factory('resourcifyUtils', resourcifyUtils);
