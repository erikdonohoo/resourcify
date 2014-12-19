'use strict';

// This is just an example, you can delete
describe('Service: Resourcify -', function () {

  beforeEach(module('resourcify'));

  var Resourcify;

  // Init
  beforeEach(inject(function (_Resourcify_) {
    Resourcify = _Resourcify_;
  }));

  describe('constructor', function () {
    var $timeout, $q;
    beforeEach(inject(function (_$timeout_, _$q_) {
      $timeout = _$timeout_;
      $q = _$q_;
    }));

    it('should make an instance with passed values', function () {
      var User = new Resourcify('User', 'http://localhost/api/users/:userId').create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u instanceof User).toBe(true);
      expect(u.id).toEqual(123);
    });
    it('should use a passed function to run during construction', function () {
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
      UserBuilder = new Resourcify('User', 'http://localhost/api/users/:userId/boats', {
        constructor: function () {
          this.num = 1;
        }
      });
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

  describe('request', function () {
    var User, $http;

    beforeEach(inject(function (_$httpBackend_) {
      $http = _$httpBackend_;
    }));
    beforeEach(function () {
      User = new Resourcify('User', 'http://localhost/api/v1/users/:userId/things/:thingId')
            .request({method: 'GET', name: 'query', isArray: true})
            .request({method: 'POST', name: '$save', isInstance: true})
            .request({method: 'DELETE', name: '$delete', isInstance: true})
            .create();
    });
    afterEach(function () {
      $http.verifyNoOutstandingExpectation();
    });

    it('should fetch stuff', function () {
      $http.expectGET('http://localhost/api/v1/users?total=5')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var users = User.query({total: 5});
      expect(users.length).toBe(0);
      $http.flush();
      expect(users.length).toBe(2);
      expect(users[0] instanceof User).toBe(true);
    });

    it('should save stuff', function () {
      $http.expectPOST('http://localhost/api/v1/users')
      .respond({id: 123});
      var user = new User({name: 'bob', friends: 3});
      user.$save();
      $http.flush();
      expect(user.id).toBe(123);
      expect(user.name).toBe('bob');
    });

    it('should allow passing http config to request construction', function () {
      var Comment = new Resourcify('Comment', 'http://localhost/comments/:id')
        .request({method: 'GET', name: 'get', config: {
          headers: {
            Accept: 'application/xml'
          }
        }}).create();

      $http.expectGET('http://localhost/comments/1', {
        Accept: 'application/xml'
      }).respond({id: 1, text: 'cool'});

      Comment.get({id: 1});
      $http.flush();
    });

    it('should be able to pass config to class', function () {
      console.log('comment');
      var Comment = new Resourcify('Comment', 'http://localhost/comments/:id', {
        httpConfig: {
          headers: {
            Accept: 'application/xml'
          }
        }
      }).request({method: 'GET', name: 'get'})
      .request({method: 'POST', name: 'save', isInstance: true, config: {
        headers: {
          'Content-Type': 'application/xml'
        }
      }}).create();

      $http.expectGET('http://localhost/comments/1', {
        Accept: 'application/xml'
      }).respond({id: 1, text: 'cool'});
      var c = Comment.get({id: 1});
      $http.flush();

      c.text = 'coolio';
      $http.expectPOST('http://localhost/comments/1', {
        id: 1,
        text: 'coolio'
      }, {
        Accept: 'application/xml',
        'Content-Type': 'application/xml'
      }).respond({});
      c.save();
      $http.flush();
    });

    it('should return promises when set', function () {
      User = new Resourcify('User', 'http://localhost/api/v1/users/:userId/things/:thingId', {
        usePromise: true
      })
      .request({method: 'GET', name: 'query', isArray: true})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'DELETE', name: '$delete', isInstance: true})
      .create();

      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var prom = User.query();
      $http.flush();
      expect(prom.then).toBeDefined();
      expect(typeof prom.then).toBe('function');
      prom.then(function (users) {
        expect(users.length).toBe(2);
      });
    });
  });

  describe('cache', function () {
    var User, $http, $q;
    beforeEach(inject(function (_$httpBackend_, _$q_) {
      $http = _$httpBackend_;
      $q = _$q_;
    }));
    beforeEach(function () {
      User = new Resourcify('User', 'http://localhost/api/v1/users/:id', {cache: {key: 'id'}})
      .request({method: 'GET', name: 'query', isArray: true})
      .request({method: 'GET', name: 'get'})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'DELETE', name: '$delete', isInstance: true})
      .request({method: 'GET', name: '$get', isInstance: true})
      .request({method: 'GET', name: 'queryInvalid', isArray: true, invalidateListModels: true})
      .create();
    });
    afterEach(function () {
      $http.verifyNoOutstandingExpectation();
    });

    it('should use same array reference for multiple calls', function () {
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var users = User.query();
      $http.flush();
      var users2 = User.query();
      $q.all([users2, users]).then(function (list) {
        expect(list[0]).toBe(list[1]);
      });
    });

    it('should not request when item is cached from query call', function () {
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var users = User.query();
      $http.flush();
      users.then(function (list) {
        var user1prom = list[0].$get();
        user1prom.then(function (item) {
          expect(item).toBe(list[0]);
          var user = User.get({id: 123});
          user.then(function (u) {
            expect(u).toBe(item);
          });
        });
      });
    });

    it('should be able to force a request and still keep correct references', function () {
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var users = User.query();
      $http.flush();
      $http.expectGET('http://localhost/api/v1/users/123')
      .respond({id: 123, name: 'joe', friend: true});
      var user = User.get.force({id: 123});
      $http.flush();
      $q.all([user, users]).then(function (list) {
        expect(list[0]).toBe(list[1][0]);
      });
    });

    it('should requery after a save', function () {
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      User.query();
      $http.flush();
      var user = new User({name: 'sally'});
      $http.expectPOST('http://localhost/api/v1/users')
      .respond({id: 125, name: 'sally'});
      user.$save();
      $http.flush();
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}, {id: 125, name: 'sally'}]);
      User.query();
      $http.flush();
    });

    it('should allow a call to an invalidated model with invalidateListModels flag set', function () {
      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      User.queryInvalid();
      $http.flush();
      $http.expectGET('http://localhost/api/v1/users/123')
      .respond({id: 123, name: 'bob', friend: true, team: 'blue'});
      var userPromise = User.get({id: 123});
      userPromise.then(function (detailedUser) {
        expect(detailedUser.friend).toBe(true);
      });
      $http.flush();
    });

    it('should change objects across references', function () {
      $http.expectGET('http://localhost/api/v1/users/123').respond({
        id: 123,
        name: 'bob',
        friend: true,
        friends: [{
          id: 124
        }, {
          id: 125
        }]
      });
      var prom = User.get({id: 123});
      $http.flush();
      var prom2 = User.get({id: 123});
      $q.all({
        user1: prom,
        user2: prom2
      }).then(function (users) {
        users.user2.goo = 'foo';
        expect(users.user2.goo).toEqual(users.user1.goo);
      });
    });
  });

  describe('nested resource', function () {
    var UserBuilder, $http, $q;
    beforeEach(inject(function (_$httpBackend_, _$q_) {
      $http = _$httpBackend_;
      $q = _$q_;
    }));
    beforeEach(function () {
      UserBuilder = new Resourcify('User', 'http://localhost/api/v1/users/:id')
      .request({method: 'GET', name: 'query', isArray: true})
      .request({method: 'GET', name: 'get'})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'DELETE', name: '$delete', isInstance: true})
      .request({method: 'GET', name: '$get', isInstance: true})
      .request({method: 'GET', name: 'queryInvalid', isArray: true, invalidateListModels: true});
    });

    it('should allow nesting resources', function () {
      var Tag = new Resourcify('Tag', 'http://localhost/api/v1/users/:userId/comments/:commentId/tags/:id')
      .request({method: 'GET', name: 'query', isArray:true})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'PUT', name: '$update', isInstance: true})
      .create();

      var Comment = new Resourcify('Comment', 'http://localhost/api/v1/users/:userId/comments/:id')
      .request({method: 'GET', name: 'query', isArray:true})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'PUT', name: '$update', isInstance: true})
      .method('addBro', function () {
        this.text += ' bro';
      }).subResource(Tag, {commentId: 'id@1', userId: 'id@2'}).create();

      var User = UserBuilder.subResource(Comment, {userId: 'id'}).create();

      $http.expectGET('http://localhost/api/v1/users')
      .respond([{id: 123, name: 'bob'}, {id: 124, name: 'sue'}]);
      var users = User.query();
      $http.flush();
      var u = users[0];
      $http.expectGET('http://localhost/api/v1/users/123/comments')
      .respond([{id: 1, text: 'hey'}, {id: 2, text: 'yo'}]);
      u.comments = u.Comment.query();
      $http.flush();
      var newU = new u.Comment({text: 'bro'});
      $http.expectPOST('http://localhost/api/v1/users/123/comments').respond({id: 3, text: 'bro'});
      newU.$save();
      $http.flush();
      var c = u.comments[0];
      expect(c instanceof Comment).toBe(true);
      c.addBro();
      expect(c.text).toBe('hey bro');
      $http.expectPUT('http://localhost/api/v1/users/123/comments/1').respond({});
      c.$update();
      $http.flush();
      $http.expectGET('http://localhost/api/v1/users/123/comments/1/tags').respond([{id: 111, tag: 'yo'}]);
      c.tags = c.Tag.query();
      $http.flush();
      $http.expectPUT('http://localhost/api/v1/users/123/comments/1/tags/111').respond({});
      var t = c.tags[0];
      t.tag += ' bro';
      t.$update();
      $http.flush();

      $http.verifyNoOutstandingExpectation();
    });

    it('should allow nesting without renaming params', function () {
      var Comment = new Resourcify('Comment', 'http://localhost/api/v1/users/:userId/comments/:commentId')
      .request({method: 'GET', name: 'query', isArray:true})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'PUT', name: '$update', isInstance: true})
      .method('addBro', function () {
        this.text += ' bro';
      }).create();

      var User = new Resourcify('User', 'http://localhost/api/v1/users/:userId')
      .request({method: 'GET', name: 'query', isArray: true})
      .request({method: 'GET', name: 'get'})
      .request({method: 'POST', name: '$save', isInstance: true})
      .request({method: 'DELETE', name: '$delete', isInstance: true})
      .request({method: 'GET', name: '$get', isInstance: true})
      .request({method: 'GET', name: 'queryInvalid', isArray: true, invalidateListModels: true})
      .subResource(Comment)
      .create();

      $http.expectGET('http://localhost/api/v1/users')
      .respond([{userId: 123, name: 'bob'}, {userId: 124, name: 'sue'}]);
      var users = User.query();
      $http.flush();

      var user = users[0];
      $http.expectGET('http://localhost/api/v1/users/123/comments')
      .respond([{commentId: 1, text: 'hey'}, {commentId: 2, text: 'yo'}]);
      user.comments = user.Comment.query();
      $http.flush();

      var comment = user.comments[0];
      comment.text += ' bro';
      $http.expectPUT('http://localhost/api/v1/users/123/comments/1').respond({});
      comment.$update();
      $http.flush();

      // Make sure reference is used rather than instantiated value when filling params
      var u = new User();
      var c = new u.Comment();
      u.userId = 22;
      c.text = 'bob';
      $http.expectPOST('http://localhost/api/v1/users/22/comments').respond({});
      c.$save();

      $http.verifyNoOutstandingExpectation();
    });
  });
});
