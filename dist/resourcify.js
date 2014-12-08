(function (angular, undefined) {

'use strict';

angular.module('resourcify', []);

function ResourcifyCache() {

  function Cache (options) {
    this.$cache = {};
    this.$options = options;
    this.$lists = {};
  }

  Cache.prototype.add = function (item, postCall) {
    // If cache contains item, update it
    // If cache doesn't contain item, add it
    // and reset query
    var key = this.getKey(item);
    var cache = this.$cache;
    for (var i = 0; i < key.length - 1; i++) {
      if (!cache[key[i]]) cache[key[i]] = {};
      cache = cache[key[i]];
    }

    if (!cache[key[key.length - 1]]) {
      if (postCall) {
        angular.forEach(this.$lists, function (val) {
          val.$$invalid = true;
        });
      }
      var that = this;
      // Self-removing function from cache
      item.$clearCache = function () {
        that.remove(that.getKey(this));
      }.bind(item);
      return cache[key[key.length - 1]] = item;
    } else {
      angular.extend(cache[key[key.length - 1]], item);
      return cache[key[key.length - 1]];
    }
  };

  Cache.prototype.getKey = function (obj) {
    var key = [];
    var keyConfig = angular.isArray(this.$options.key) ? this.$options.key : [this.$options.key];
    keyConfig.forEach(function (keyPiece) {
      key.push(obj[keyPiece]);
    });
    return key;
  };

  Cache.prototype.remove = function (key) {
    if (!angular.isArray(key)) {
      key = [key];
    }
    var cache = this.$cache;
    for (var i = 0; i < key.length - 1; i++) {
      cache = cache[key[i]];
    }
    // TODO May need to consider what to do with arrays that refence this item that is being removed
    delete cache[key[key.length - 1]];
  };

  Cache.prototype.clear = function () {
    this.$cache = {};
    this.$lists = {};
  };

  Cache.prototype.get = function (key) {
    if (!angular.isArray(key)) {
      key = [key];
    }
    var cache = this.$cache;
    for (var i = 0; i < key.length - 1; i++) {
      cache = cache[key[i]];
    }
    return cache[key[key.length - 1]];
  };

  Cache.prototype.getList = function (key) {
    return this.$lists[key] ? this.$lists[key] : null;
  };

  Cache.prototype.addList = function (key, list) {
    if (!this.$lists[key]) {
      console.log('first');
      this.$lists[key] = list;
      angular.forEach(list, function (item) {
        this.add(item);
      }.bind(this));
    } else {
      console.log('merge');
      // Merge lists, add new values to cache
      angular.forEach(list, function (newItem) {
        var match = false;
        newItem = this.add(newItem);
        angular.forEach(this.$lists[key], function (item) {
          if (newItem === item) {
            match = true;
          }
        }.bind(this));
        if (!match) {
          this.$lists[key].push(newItem);
        }
      }.bind(this));
    }
    return this.$lists[key];
  };

  return {
    createCache: function (options) {
      return new Cache(options);
    }
  };
}

angular.module('resourcify').factory('ResourcifyCache', ResourcifyCache);

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

  function generateRequest (config) {
    return function request(params, success, err) {
      var value = (this instanceof config.$Const) ? this : (config.isArray ? [] : new config.$Const({}));
      var cache = config.$Const.$$builder.cache;
      config.$Const.pending = config.$Const.pending || [];

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
          var cValue = cache.get(cache.getKey(angular.extend({}, params, value)));
          if (cValue) {
            value = cValue;
          } else {
            // Add value to cache
            firstTime = true;
          }
        } else if (config.$Const.$$builder.$path) {
          var lValue = cache.getList(utils.replaceParams(params, config.$Const.$$builder.$path, value));
          if (lValue) {
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
          var url = utils.replaceParams(params, path, value);

          var httpConfig = {
            url: url,
            method: config.method
          };

          // See if someone beat it to the punch
          if (cache) {
            if (config.isArray) {
              if (!cache.getList(url)) {
                value = cache.addList(url, value);
              } else {
                value = cache.getList(url);
                console.log('leaving');
                return;
              }
            } else if (cache.get(cache.getKey(angular.extend({}, params, value)))) {
              value = cache.get(cache.getKey(angular.extend({}, params, value)));
              return;
            }
          }

          httpConfig.data = /^(POST|PUT|PATCH|DELETE)$/i.test(config.method) ? value : undefined;
          $http(httpConfig).then(function ok(response) {
            if ((config.isArray && !angular.isArray(response.data)) || (!config.isArray && angular.isArray(response.data))) {
              throw new Error('Saw array or object when expecting the opposite when making ' + config.method +
              ' call to ' + url);
            }

            // Build item and handle cache
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
              value.$$invalid = false;
            }

            value.$resolved = true;
            value.$url = url;
            success(value);
            config.$defer.resolve(value);

          }, function rejection(issue) {
            err(issue);
            config.$defer.reject(issue);
          });
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

      return value;
    };
  }

  return Resourcify;
}

resourcificator.$inject = ['$http', '$q', 'resourcifyUtils', 'ResourcifyCache', '$timeout'];

angular.module('resourcify').service('Resourcify', resourcificator);

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
