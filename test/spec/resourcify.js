'use strict';

// This is just an example, you can delete
describe('Service: Resourcify', function () {

  beforeEach(module('resourcify'));

  var Resourcify;

  // Init
  beforeEach(inject(function(_Resourcify_){
    Resourcify = _Resourcify_;
  }));

  describe('- Constructor', function () {
    var $timeout, $q;
    beforeEach(inject(function(_$timeout_, _$q_){
      $timeout = _$timeout_;
      $q = _$q_;
    }));

    it('should make an instance with passed values', function () {
      var User = new Resourcify('http://localhost/api/users/:userId').create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u instanceof User).toBe(true);
      expect(u.id).toEqual(123);
    });
    it('should use a passed function to run during construction', function() {
      var User = new Resourcify('http://localhost/api/users/:userId', {
        constructor: function () {
          this.salutation = 'Hello, ' + this.name;
        }
      }).create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u.salutation).toEqual('Hello, Bob');
    });
    it('should turn the url into a promise', function () {
      var User = new Resourcify('http://localhost/api/users/:userId').create();
      expect(User.$$builder.url.then).toBeDefined();
      User.$$builder.url.then(function (url) {
        expect(url).toBe('http://localhost/api/users/:userId');
      });
      var defer = $q.defer();
      $timeout(function () { defer.resolve('http://localhost'); }, 100);
      defer.promise.then(function (url) {
        expect(url).toBe('http://localhost');
      });
      $timeout.flush();
    });
  });
});
