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
    it('should make a constructor', function () {
      var User = new Resourcify('http://localhost/api/users/:userId').create();
      expect(User.$$builder.url).toEqual('http://localhost/api/users/:userId');
    });
    it('should make an instance with passed values', function () {
      var User = new Resourcify('http://localhost/api/users/:userId').create();
      var u = new User({id: 123, name: 'Bob'});
      expect(u instanceof User).toBe(true);
      expect(u.id).toEqual(123);
    });
  });
});
