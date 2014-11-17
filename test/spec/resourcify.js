'use strict';

// This is just an example, you can delete
describe('Service: Resourcify -', function () {

  beforeEach(module('resourcify'));

  var Resourcify;

  // Init
  beforeEach(inject(function(_Resourcify_){
    Resourcify = _Resourcify_;
  }));

  describe('constructor', function () {
    var $timeout, $q;
    beforeEach(inject(function(_$timeout_, _$q_){
      $timeout = _$timeout_;
      $q = _$q_;
    }));

    it('should make an instance with passed values', function () {
      var User = new Resourcify('User', 'http://localhost/api/users/:userId').create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u instanceof User).toBe(true);
      expect(u.id).toEqual(123);
    });
    it('should use a passed function to run during construction', function() {
      var User = new Resourcify('User', 'http://localhost/api/users/:userId', {
        constructor: function () {
          this.salutation = 'Hello, ' + this.name;
        }
      }).create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u.salutation).toEqual('Hello, Bob');
    });
    it('should turn the url into a promise', function () {
      var User = new Resourcify('User', 'http://localhost/api/users/:userId').create();
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
    it('should name constructor properly', function () {
      var User = new Resourcify('User', 'http://localhost/api/users/:userId').create();
      expect(User.name).toBe('User');
    });
    it('should error when not constructed correctly', function () {

      function exceptionWrapper() {
        new Resourcify().create();
      }

      function exceptionWrapper2() {
        new Resourcify('User').create();
      }

      expect(exceptionWrapper).toThrow();
      expect(exceptionWrapper2).toThrow();
    });
  });

  describe('method', function () {
    var UserBuilder;
    beforeEach(function () {
      UserBuilder = new Resourcify('User', 'http://localhost/api/users/:userId/boats', {constructor: function () {
        this.num = 1;
      }});
    });

    it('should allow adding custom methods', function () {
      var User = UserBuilder.method('add', function () {
        this.num++;
      }).create();
      var u = new User({id: 123});
      expect(u.num).toBe(1);
      u.add();
      expect(u.num).toBe(2);
    });
    it('should share "this" context between methods', function () {
      var User = UserBuilder.method('foo', function () {
        this.v = 'bar';
      }).method('bar', function () {
        if (this.v === 'bar') {
          this.v = 'foo';
        }
      }).create();
      var u = new User({id: 123});
      expect(u.v).toBeUndefined();
      u.bar();
      expect(u.v).toBeUndefined();
      u.foo();
      expect(u.v).toBe('bar');
      u.bar();
      expect(u.v).toBe('foo');
    });
  });
});
