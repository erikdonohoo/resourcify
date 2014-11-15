'use strict';

// This is just an example, you can delete
describe('Service: Resourcify', function () {

  beforeEach(module('resourcify'));

  var Resourcify;

  // Init
  beforeEach(inject(function(_Resourcify_){
    Resourcify = _Resourcify_;
  }));

  describe('Make Constructor', function () {
    it('should make a constructor', function () {
      var User = new Resourcify('http://localhost/api/users/:userId').create();
      console.log('User', User);
      expect(User.$$builder.url).toEqual('http://localhost/api/users/:userId');
    });
  });
});
