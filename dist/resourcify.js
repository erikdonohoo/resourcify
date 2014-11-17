(function (angular, undefined) {

'use strict';

angular.module('resourcify', []);

/* jshint evil: true */
// We need this function to allow users to name the constructors we are making
function renameFunction (name, fn) {
  return (new Function('return function (call) { return function ' + name +
    ' () { return call(this, arguments) }; };')())(Function.apply.bind(fn));
}
/* jshint evil: false */

function resourcificator ($http, $q) {

  var $resourcifyErr = angular.$$minErr('Resourcify');
  console.log($http);

  function Resourcify (name, url, config) {

    if (!name || !url) {
      throw $resourcifyErr('badargs', 'Must supply a name and a url when constructing');
    }

    this.url = $q.when(url);
    this.name = name;
    this.config = config || {};
    var that = this;

    // Make constructor
    this.ResourceConstructor = renameFunction(this.name, function (data) {
      angular.extend(this, data);
      (that.config.constructor || angular.noop).bind(this)(data);
    });
    this.ResourceConstructor.$$builder = this;
  }

  // Add before after functions
  var beforeAfter = function (when) {
    return function (fn) {
      console.log(when, fn);
    }.bind(this);
  };

  Resourcify.prototype.before = function (methods, fn) {
    beforeAfter('before').bind(this)(methods, fn);
    return this;
  };

  Resourcify.prototype.after = function (methods, fn) {
    beforeAfter('after').bind(this)(methods, fn);
    return this;
  };

  Resourcify.prototype.method = function (name, fn) {
    this.ResourceConstructor.prototype[name] = fn;
    return this;
  };

  Resourcify.prototype.request = function (config) {
    addRequest(config, this.ResourceConstructor);
    return this;
  };

  Resourcify.prototype.create = function () {
    return this.ResourceConstructor;
  };

  function addRequest (config, Constructor) {
    console.log(config, Constructor);
  }

  return Resourcify;
}

resourcificator.$inject = ['$http', '$q'];

angular.module('resourcify').service('Resourcify', resourcificator);

/*

Playing with ideas for API

angular.module('resourcify').service('User', ['Resourcify', function (Resourcify) {

    // Use chaning
    return new Resourcify(name, (prom || string) url, config{$cache, constructor})
    .before(['get'], someFn) // someFn is passed instance of this (for instance methods)
    .after(['get'], someFn)
    .method('stringName', someFn) // Adds a instance method
    .request({method, name, isArray, isInstance}) // Adds a custom request
    .create(); // This last call returns the Constructor that has been built

    // How to handle nesting (Maybe it comes later)

}]);

*/

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

})(angular);
