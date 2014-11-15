'use strict';

function resourcificator ($http, $q) {

  var $resourcifyErr = angular.$$minErr('resourcify');
  console.log($http, $q, $resourcifyErr);

  function Resourcify (url, config) {
    this.url = url;
    this.config = config || {};
    var that = this;

    // Make constructor
    function Constructor (data) {
      angular.extend(this, data);
      (that.config.constructor || angular.noop).bind(this)(data);
    }

    Constructor.$$builder = this;

    this.ResourceConstructor = Constructor;
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
    return new Resourcify((prom || string), $cache, constructor)
    .before(['get'], someFn) // someFn is passed instance of this (for instance methods)
    .after(['get'], someFn)
    .method('stringName', someFn) // Adds a instance method
    .request({method, name, isArray, isInstance}) // Adds a custom request
    .create(); // This last call returns the Constructor that has been built

    // How to handle nesting (Maybe it comes later)

}]);

*/
