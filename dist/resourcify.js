(function (angular, undefined) {

'use strict';

angular.module('resourcify', []);

function ResourcifyCache() {

  function Cache (options) {
    this.$cache = {};
    this.$options = angular.extend({
      id: 'id',
      saveMethod: 'POST',
      key: ['id']
    }, options);
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
          val.$invalid = true;
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
      this.$lists[key] = list;
      angular.forEach(list, function (item) {
        this.add(item);
      }.bind(this));
    } else {
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

function functionName (fun) {
  var ret = fun.toString();
  ret = ret.substr('function '.length);
  ret = ret.substr(0, ret.indexOf('('));
  return ret;
}

Function.prototype.clone = function () {

  var that = this;
  function Clone() {
    that.apply(this, arguments);
  }

  Clone.prototype = new this();

  for (var key in this) {
    if (this.hasOwnProperty(key)) {
      Clone[key] = angular.copy(this[key]);
    }
  }

  return Clone;
};

function resourcificator ($http, $q, utils, Cache) {

  function Resourcify (name, url, config) {

    if (!name || !url) {
      throw new Error('Must supply a name and a url when constructing');
    }

    this.url = $q.when(url);
    this.name = name;
    this.config = config || {};
    this.subs = [];
    var that = this;

    // Make constructor
    this.$$ResourceConstructor = renameFunction(this.name, function (data) {
      angular.extend(this, data || {});

      // Add parentItem to sub constructors
      angular.forEach(that.subs, function (l) {
        var con = l[0], map = l[1];
        var name = functionName(con);
        var clone = con.clone();
        clone.prototype.$paramMap = map;
        clone.prototype.$parentItem = this;
        this[name] = clone;
      }, this);

      // Add parentItem to this child if
      // this.$parentItem = ?;

      (that.config.constructor || angular.noop).bind(this)(data);
    });

    this.$$ResourceConstructor.$$builder = this;

    if (this.config.cache) {
      this.cache = Cache.createCache(angular.isObject(this.config.cache) ? this.config.cache : {});
      this.$$ResourceConstructor.$clearCache = this.cache.clear;
    }
  }

  Resourcify.prototype.subResource = function (Resource, map) {
    this.subs.push([Resource, map]);
    return this;
  };

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

    config.url = config.url ? $q.when(config.url) : null;
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

  function doRequest (url, value, config, success, error, Maybe) {

    function resolve() {
      value.$resolved = true;
      value.$url = url;
      success(value);
      config.$defer.resolve(value);
    }

    var httpConfig = {
      url: url,
      method: config.method
    };

    // Check if what we are requesting is already in the cache
    // If so, make sure initial 'value' is from the cache, and get out of here
    var cache = config.$Const.$$builder.cache;
    if (cache && !config.noCache && !config.$force) {
      if (!angular.isArray(value)) {
        var cValue = cache.get(cache.getKey(angular.extend(config.params, value)));
        if (cValue && !cValue.$invalid) {
          cValue.$promise = value.$promise;
          value = cValue;
          resolve();
          return;
        }
      } else {
        var lValue = cache.getList(url);
        if (lValue && !lValue.$invalid) {
          lValue.$promise = value.$promise;
          value = lValue;
          resolve();
          return;
        }
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
          var model = typeof item === 'object' ? (Maybe.prototype instanceof config.$Const ?
            new Maybe(item) : new config.$Const(item)) : {data: item};
          model.$invalid = (config.invalidateListModels && cache);
          value.push(model);
        });
        if (cache && !config.noCache) {
          value = cache.addList(url, value);
        }
      } else {
        value = (typeof response.data === 'object') ? angular.extend(value, response.data) : angular.extend(value, {data: response.data});
        if (cache && !config.noCache) {
          value = cache.add(value, (config.method === cache.$options.saveMethod));
        }
      }

      // We just updated the value, so cache is good now
      if (cache) {
        value.$invalid = false;
      }

      // Provide access to raw response
      value.$response = response;

      resolve();

    }, function rejection(err) {
      error(err);
      config.$defer.reject(err);
    });
  }

  function buildSubResourceParams (curObj, params, map, depth) {
    // As long as curObj has a $parentItem property, we will recurse
    // The lowest level object will always win
    var lowerParams = {};
    if (curObj.$parentItem) {
      lowerParams = buildSubResourceParams(curObj.$parentItem, params, map, depth + 1);
    }

    // Set the values in the params
    angular.forEach(map, function (value, key) {
      var v, d;
      if (value.indexOf('@') !== -1) {
        v = value.substr(0, value.indexOf('@'));
        d = parseInt(value.substr(value.indexOf('@') + 1));
      } else {
        v = value;
        d = 0;
      }
      if (d && d === depth && curObj[v]) {
        lowerParams[key] = curObj[v];
      } else if (d === 0 && curObj[v]) {
        lowerParams[key] = curObj[v];
      }
    });

    params = angular.extend(lowerParams, params);
    return params;
  }

  function generateRequest (config) {
    return function request(params, success, err) {
      var that = this;
      var value = (this instanceof config.$Const) ? this : (config.isArray ? [] :
        (this.prototype instanceof config.$Const) ? new this({}) : new config.$Const({}));
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

      // Is the requester a nested sub resource?
      // If so include parent properties
      if (this.$parentItem || (this.prototype && this.prototype.$parentItem)) {
        params = buildSubResourceParams(this.$parentItem || this.prototype.$parentItem,
          params, this.$paramMap || this.prototype.$paramMap, 1);
      }

      config.$defer = $q.defer();
      config.params = params;
      value.$promise = config.$defer.promise;
      value.$resolved = false;

      // Resolve path
      (config.url || config.$Const.$$builder.url).then(function resolved(path) {
        doRequest(utils.replaceParams(params, path, value), value, config, success, err, that);
      }, function rejected() {
        throw new Error('Could not resolve URL for ' + config.toString());
      });

      return (cache || config.$Const.$$builder.config.usePromise) ? value.$promise : value;
    };
  }

  return Resourcify;
}

resourcificator.$inject = ['$http', '$q', 'resourcifyUtils', 'ResourcifyCache'];

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
    var findParam = /[\/=.](:\w*[a-zA-Z]\w*)/, copiedPath = angular.copy(url),
    match, cut = '__|cut|__', copiedParams = angular.copy(params);
    object = object || {};

    // Pull off query
    var qParams = objectifyQueryParams(copiedPath), finalParams = {};
    if (copiedPath.indexOf('?') !== -1) {
      copiedPath = copiedPath.substring(0, copiedPath.indexOf('?'));
    }

    // Fill in missing values in query params
    angular.forEach(qParams, function (value, key) {
      var pseudoKey = value.substring(1);
      if (value.charAt(0) === ':' && (copiedParams[pseudoKey] || object[pseudoKey])) {
        finalParams[key] = copiedParams[pseudoKey] || object[pseudoKey];
        delete copiedParams[pseudoKey]; // Don't re-use param as query param if it filled one
      } else if (value.charAt(0) !== ':') {
        finalParams[key] = value;
      }
    });

    // Replace pieces in path
    while ((match = findParam.exec(copiedPath))) {
      var regexVal = match[1], key = match[1].substring(1);
      copiedPath = copiedPath.replace(regexVal, copiedParams[key] || object[key] || cut);
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
    replaceParams: replaceParams
  };
}

angular.module('resourcify').factory('resourcifyUtils', resourcifyUtils);

})(angular);
