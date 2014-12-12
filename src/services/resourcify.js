'use strict';

/* jshint evil: true */
// We need this function to allow users to name the constructors we are making
function renameFunction (name, fn) {
  return (new Function('return function (call) { return function ' + name +
    ' () { return call(this, arguments) }; };')())(Function.apply.bind(fn));
}
/* jshint evil: false */

function resourcificator ($http, $q, utils, Cache, $timeout) {

  function Resourcify (name, url, config) {

    if (!name || !url) {
      throw new Error('Must supply a name and a url when constructing');
    }

    this.url = $q.when(url);
    this.name = name;
    this.config = config || {};
    var that = this;

    // Make constructor
    this.$$ResourceConstructor = renameFunction(this.name, function (data) {
      angular.extend(this, data);
      (that.config.constructor || angular.noop).bind(this)(data);
    });
    this.$$ResourceConstructor.$$builder = this;

    if (this.config.cache) {
      this.cache = Cache.createCache(this.config.cache);
      this.$$ResourceConstructor.$clearCache = this.cache.clear;
    }
  }

  Resourcify.prototype.method = function (name, fn) {
    this.$$ResourceConstructor.prototype[name] = fn;
    return this;
  };

  Resourcify.prototype.request = function (config) {
    addRequest(config, this.$$ResourceConstructor);
    return this;
  };

  Resourcify.prototype.create = function () {
    return this.$$ResourceConstructor;
  };

  function addRequest (config, Constructor) {
    if (!config.method || !config.name) {
      throw new Error('Request config must contain a HTTP method and a name');
    }

    config.$Const = Constructor;

    if (config.isInstance) {
      Constructor.prototype[config.name] = generateRequest(config);
      if (config.$Const.$$builder.cache) {
        Constructor.prototype[config.name].force = generateRequest(angular.extend({$force: true}, config));
      }
    } else {
      Constructor[config.name] = generateRequest(config);
      if (config.$Const.$$builder.cache) {
        Constructor[config.name].force = generateRequest(angular.extend({$force: true}, config));
      }
    }
  }

  function doRequest (url, value, config, success, error) {
    var httpConfig = {
      url: url,
      method: config.method
    };

    httpConfig.data = /^(POST|PUT|PATCH|DELETE)$/i.test(config.method) ? value : undefined;
    $http(httpConfig).then(function ok(response) {
      if ((config.isArray && !angular.isArray(response.data)) || (!config.isArray && angular.isArray(response.data))) {
        throw new Error('Saw array or object when expecting the opposite when making ' + config.method +
          ' call to ' + url);
      }

      // Build item and handle cache
      var cache = config.$Const.$$builder.cache;
      if (config.isArray) {
        angular.forEach(response.data, function (item) {
          value.push(typeof item === 'object' ? new config.$Const(item) : item);
        });
        if (cache) {
          value = cache.addList(url, value);
        }
      } else {
        value = (typeof response.data === 'object') ? angular.extend(value, response.data) : response.data;
        if (cache) {
          value = cache.add(value, (config.method === 'POST' ? true : false));
        }
      }

      // We just updated the value, so cache is good now
      if (cache) {
        value.$invalid = false;
      }

      value.$resolved = true;
      value.$url = url;
      success(value);
      config.$defer.resolve(value);

    }, function rejection(err) {
      error(err);
      config.$defer.reject(err);
    });
  }

  function generateRequest (config) {
    return function request(params, success, err) {
      var value = (this instanceof config.$Const) ? this : (config.isArray ? [] : new config.$Const({}));
      var cache = config.$Const.$$builder.cache;

      if (angular.isFunction(params)) {
        err = success || angular.noop;
        success = params;
        params = {};
      } else {
        params = params || {};
        success = success || angular.noop;
        err = err || angular.noop;
      }

      config.$defer = $q.defer();
      value.$promise = config.$defer.promise;
      value.$resolved = false;

      // Check if what we are requesting is already in the cache
      // If so, make sure initial 'value' is from the cache
      var firstTime = false;
      if (cache) {
        if (!angular.isArray(value)) {
          var cValue = $q.when(cache.get(cache.getKey(angular.extend({}, params, value))));
          if (cValue) {
            cValue.$promise = value.$promise;
            value = cValue;
          } else {
            firstTime = true;
          }
        } else if (config.$Const.$$builder.$path) {
          var lValue = $q.when(cache.getList(utils.replaceParams(params, config.$Const.$$builder.$path, value)));
          if (lValue) {
            lValue.$promise = value.$promise;
            value = lValue;
          }
        } else {
          firstTime = true;
        }
      }

      // Resolve path
      // TODO Could be a concurrency issue here when 2 calls happen at same time before one completes
      // There will be 2 'value' values and only one can be used in the end
      if ((cache && (value.$$invalid || firstTime)) || !cache || config.$force) {
        config.$Const.$$builder.url.then(function resolved(path) {
          config.$Const.$$builder.$path = config.$Const.$$builder.$path || path;
          doRequest(utils.replaceParams(params, path, value), value, config, success, err);
        }, function rejected() {
          throw new Error('Could not resolve URL for ' + config);
        });
      } else {
        $timeout(function () {
          value.$resolved = true;
          success(value);
          config.$defer.resolve(value);
        });
      }

      return cache ? value.$promise : value;
    };
  }

  return Resourcify;
}

resourcificator.$inject = ['$http', '$q', 'resourcifyUtils', 'ResourcifyCache', '$timeout'];

angular.module('resourcify').service('Resourcify', resourcificator);
