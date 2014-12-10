'use strict';

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
