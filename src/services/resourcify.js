'use strict';

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

function cloneConstructor (ToClone) {

  function Clone() {
    ToClone.apply(this, arguments);
  }

  Clone.prototype = new ToClone();

  for (var key in ToClone) {
    if (ToClone.hasOwnProperty(key)) {
      Clone[key] = angular.copy(ToClone[key]);
    }
  }

  return Clone;
}

function makeParams(method, args) {

  // Set params, ripped from angular's $resource
  /* jshint -W086 */ /* (purposefully fall through case statements) */
  var obj = {}, e = args[3], p = args[0], b = args[1], s = args[2];
  obj.error = obj.success = angular.noop;
  obj.params = obj.body = {};
  switch (args.length) {
    case 4:
      obj.error = e;
      obj.success = s;
      // fallthrough
    case 3:
    case 2:
      if (angular.isFunction(b)) {
        if (angular.isFunction(p)) {
          obj.success = p;
          obj.error = b;
          break;
        }

        obj.success = b;
        obj.error = s || angular.noop;
        // fallthrough
      } else {
        obj.params = p;
        obj.body = b;
        obj.success = s || angular.noop;
        break;
      }
    case 1:
      if (angular.isFunction(p)) {
        obj.success = p;
      } else if (/^(POST|PUT|PATCH)$/i.test(method)) {
        obj.body = p;
      } else {
        obj.params = p;
      }
      break;
    case 0: break;
    default:
      throw new Error('Expected up to 4 arguments [params, data, success, error], got ' +
      args.length + ' args');
  }
  /* jshint +W086 */ /* (purposefully fall through case statements) */

  return obj;
}

function resourcificator ($http, $q, utils, Cache) {

  function Resourcify (name, url, config) {

    if (!name || !url) {
      throw new Error('Must supply a name and a url when constructing');
    }

    this.url = $q.when(url);
    this.name = name;
    this.config = config || {};

    // Set defaults
    this.config.idProp = this.config.idProp || 'id';
    this.config.usePromise = (this.config.usePromise != null) ?
      this.config.usePromise :
      this.config.cache ?
        true :
        false;

    this.config.httpConfig = this.config.httpConfig || {};
    this.subs = [];
    var that = this;

    // Make constructor
    this.$$ResourceConstructor = renameFunction(this.name, function (data) {
      angular.extend(this, data || {});

      /* Add parentItem to sub constructors

      // Make a copy of each sub constructor with a
      // prototype that points at the object it is attached to
      // as well as the prototype of the original constructor
      // so that when new is called on it, it has all the instance functions
      // as well as it will be an instanceof the original constructor
      */

      angular.forEach(that.subs, function (l) {
        var con = l[0], map = l[1];
        var name = functionName(con);
        var clone = cloneConstructor(con);
        clone.prototype.$paramMap = map;
        clone.prototype.$parentItem = this;
        this[name] = clone;
      }, this);

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
    config.isInstance = (config.isInstance == null) ? true : config.isInstance;
    config.config = config.config || {};

    // No before/after on class level
    if (config.isInstance === false && (config.before || config.after)) {
      throw new Error('Before/After functions not supported on Class level requests');
    }

    if (config.isInstance) {
      Constructor.prototype[config.name] = generateRequest(config);
      Constructor.prototype[config.name].withConfig = function () {
        utils.extendDeep(config.config, arguments[0]);
        return generateRequest(config).apply(this, [].slice.call(arguments, 1));
      };

      if (config.$Const.$$builder.cache) {
        Constructor.prototype[config.name].force = generateRequest(angular.extend({$force: true}, config));
        Constructor.prototype[config.name].force.withConfig = function () {
          utils.extendDeep(config.config, arguments[0]);
          return generateRequest(angular.extend({$force: true}, config)).apply(this, [].slice.call(arguments, 1));
        };
      }
    } else {
      Constructor[config.name] = generateRequest(config);
      Constructor[config.name].withConfig = function () {
        utils.extendDeep(config.config, arguments[0]);
        return generateRequest(config).apply(this, [].slice.call(arguments, 1));
      };

      if (config.$Const.$$builder.cache) {
        Constructor[config.name].force = generateRequest(angular.extend({$force: true}, config));
        Constructor[config.name].force.withConfig = function () {
          utils.extendDeep(config.config, arguments[0]);
          return generateRequest(angular.extend({$force: true}, config)).apply(this, [].slice.call(arguments, 1));
        };
      }
    }
  }

  function doRequest (url, value, config, success, error, Maybe) {

    var cacheDefer;

    function resolve() {
      value.$resolved = true;
      value.$url = url;
      success(value);
      value.$$defer.resolve(value);
      if (cacheDefer) cacheDefer.resolve(value);
    }

    var httpConfig = {
      url: url,
      method: config.method
    };

    // Check if what we are requesting is already in the cache
    // If so, make sure initial 'value' is from the cache, and get out of here
    var cache = config.$Const.$$builder.cache;
    if (cache && cache.isCacheable(config)) {
      if (!angular.isArray(value)) {
        var cValue = cache.get(cache.getKey(angular.extend(value.$$params, value)));
        if (cValue && !cValue.$invalid) {
          cacheDefer = value.$$defer;
          value = cValue;
          value.$promise.then(resolve);
          return;
        } else {
          // add to cache
          // TODO wont handle multi key
          if (!value[config.$Const.$$builder.config.idProp]) {
            if (value.$$params[config.$Const.$$builder.config.idProp]) {
              value[config.$Const.$$builder.config.idProp] = value.$$params[config.$Const.$$builder.config.idProp];
              value = cache.add(value);
            }
          } else {
            value = cache.add(value);
          }
        }
      } else {
        var lValue = cache.getList(url);
        if (lValue && !lValue.$invalid) {
          cacheDefer = value.$$defer;
          value = lValue;
          value.$promise.then(resolve);
          return;
        } else {
          // Add to cache
          value = cache.addList(url, value);
        }
      }
    }

    // Before fn
    (config.before || angular.noop).apply(value);

    // Strip $ from value for data
    var sendData = {};
    if (!angular.isArray(value) && config.method !== 'GET') {
      angular.forEach(value, function (v, key) {
        if (value.hasOwnProperty(key) && key.charAt(0) !== '$') {
          sendData[key] = v;
        }
      });
    }

    var classConfig = config.$Const.$$builder.config.httpConfig;
    httpConfig.data = /^(POST|PUT|PATCH|DELETE)$/i.test(config.method) ? sendData : undefined;
    $http(utils.extendDeep({}, classConfig, config.config || {}, httpConfig)).then(function ok(response) {
      var dataToUse = config.propName ? response.data[config.propName] : response.data;
      if ((config.isArray && !angular.isArray(dataToUse)) || (!config.isArray && angular.isArray(dataToUse))) {
        throw new Error('Saw array or object when expecting the opposite when making ' + config.method +
          ' call to ' + url);
      }

      // Build item and handle cache
      if (config.isArray) {
        angular.forEach(dataToUse, function (item) {
          var model = typeof item === 'object' ? (Maybe.prototype instanceof config.$Const ?
            new Maybe(item) : new config.$Const(item)) : {data: item};
          model.$invalid = (config.invalidateListModels && cache);
          if (cache && !config.noCache) {
            cache.addItemToList(value, model);
          } else {
            value.push(model);
          }
        });
      } else {

        value = (typeof dataToUse === 'object') ? angular.extend(value, dataToUse) : angular.extend(value, {data: dataToUse});

        // Check for Location header
        var location;
        if (location = response.headers('Location')) {
          value[config.$Const.$$builder.config.idProp] = location.substring(location.lastIndexOf('/') + 1);
        }

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

      // After fun
      (config.after || angular.noop).apply(value);

      resolve();

    }, function rejection(err) {
      error(err);
      value.$$defer.reject(err);
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

  function recurseParent (parent, pParams) {
    if (parent.$parentItem) {
      pParams = recurseParent(parent.$parentItem, pParams);
    }

    // Set the values in the params
    angular.forEach(parent, function (value, key) {
      if (parent.hasOwnProperty(key)) {
        pParams[key] = value;
      }
    });

    return pParams;
  }

  function generateRequest (config) {
    return function request() {
      var that = this;
      var cache = config.$Const.$$builder.cache;

      var args = makeParams(config.method, arguments);

      // Set value
      var value = (this instanceof config.$Const) ? this : (config.isArray ? [] :
        (this.prototype instanceof config.$Const) ? new this(args.body) : new config.$Const(args.body));

      // Is the requester a nested sub resource?
      // If so include parent properties
      var parentParams = {};
      if (this.$parentItem || (this.prototype && this.prototype.$parentItem)) {
        if (!this.$paramMap && (!this.prototype || !this.prototype.$paramMap)) {
          parentParams = recurseParent(this.$parentItem || this.prototype.$parentItem, parentParams);
        } else {
          args.params = buildSubResourceParams(this.$parentItem || this.prototype.$parentItem,
            args.params, this.$paramMap || this.prototype.$paramMap, 1);
        }
      }

      value.$$defer = $q.defer();
      value.$$params = args.params;
      value.$promise = value.$$defer.promise;
      value.$resolved = false;

      // Resolve path
      (config.url || config.$Const.$$builder.url).then(function resolved(path) {
        doRequest(utils.replaceParams(args.params, path, value, parentParams),
          value, config, args.success, args.error, that);
      }.bind(this), function rejected() {
        throw new Error('Could not resolve URL for ' + config.toString());
      });

      return (cache || config.$Const.$$builder.config.usePromise) ? value.$promise : value;
    };
  }

  return Resourcify;
}

resourcificator.$inject = ['$http', '$q', 'resourcifyUtils', 'ResourcifyCache'];

angular.module('resourcify').service('Resourcify', resourcificator);
