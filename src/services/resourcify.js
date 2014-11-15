'use strict';

function resourcificator ($http, $q) {

  var $resourcifyErr = angular.$$minErr('resourcify');
  console.log($http, $q, $resourcifyErr);

  function Resourcify (url, $cache) {
    this.url = url;
    this.$cache = $cache;
    var that = this;

    // Make constructor
    this.Constructor = function (data) {
      angular.extend(this, data);
      this.$$builder = that;
    };

    return this;
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
    this.Constructor.prototype[name] = fn;
    return this;
  };

  Resourcify.prototype.request = function (config) {
    addRequest(config, this.Constructor);
    return this;
  };

  Resourcify.prototype.create = function () {
    return this.Constructor;
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
    return new Resourcify('User', (prom || string), $cache)
    .before(['get'], someFn) // someFn is passed instance of this (for instance methods)
    .after(['get'], someFn)
    .method('stringName', someFn) // Adds a instance method
    .request({method, name, isArray, isInstance}) // Adds a custom request
    .create(); // This last call returns the Constructor that has been built

    // How to handle nesting (Maybe it comes later)

}]);

*/
