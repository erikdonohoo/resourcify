'use strict';

// This is just an example, you can delete
describe('Service: ResourceUtils', function () {

  beforeEach(module('resourcify'));

  var replaceParams, objectify;

  // Init
  beforeEach(inject(function(_resourcifyUtils_){
    replaceParams = _resourcifyUtils_.replaceParams;
    objectify = _resourcifyUtils_.objectifyQueryParams;
  }));

  describe('objectifyQueryParams', function () {

    it('should turn query params into object', function () {
      expect(objectify('http://blah.com/stuff?who=me&you=me')).toEqual({
        'who': 'me',
        'you': 'me'
      });
    });

    it('should return {} with no query params', function () {
      expect(objectify('http://localhost:8080/my/friend/bob')).toEqual({});
      expect(objectify('http://localhost/dude?')).toEqual({});
    });

    it('should handle variable parameters in query', function () {
      expect(objectify('http://blah.com?bro=:me&dude=:you&so=what'))
      .toEqual({
        'bro': ':me',
        'dude': ':you',
        'so': 'what'
      });
    });
  });

  describe('replaceParams', function () {

    it('should handle a url with no matching needed', function () {
      expect(replaceParams({}, 'http://localhost/api/v1/go', {}))
      .toEqual('http://localhost/api/v1/go');
    });

    it('should handle a value supplied with passed params', function () {
      expect(replaceParams({key: 'value'}, 'http://localhost/api/:key', {}))
      .toEqual('http://localhost/api/value');
    });

    it('should handle a missing body', function () {
      expect(replaceParams({key: 'value'}, 'http://localhost/api/:key'))
      .toEqual('http://localhost/api/value');
    });

    it('should prefer a passed param to one on the body', function () {
      expect(replaceParams({key: 'value'}, 'http://localhost/api/:key', {key: 'value2'}))
      .toEqual('http://localhost/api/value');
    });

    it('should preserve supplied query params', function () {
      expect(replaceParams({key: 'value'}, 'http://localhost/api/:key?dude=dude'))
      .toEqual('http://localhost/api/value?dude=dude');
    });

    it('should strip query params that have no supplied value from object', function () {
      expect(replaceParams({}, 'http://localhost/api?query=:friend&query2=:amigo', {amigo: 'bob'}))
      .toEqual('http://localhost/api?query2=bob');
    });

    it('should strip query params that have no supplied value from params', function () {
      expect(replaceParams({amigo: 'bob'}, 'http://localhost/api?query=:friend&query2=:amigo'))
      .toEqual('http://localhost/api?query2=bob');
    });

    it('should handle a mix of supplied and variable query params', function () {
      expect(replaceParams({amigo: 'bob'}, 'http://localhost/api?query=:friend&query2=bro&query3=:amigo'))
      .toEqual('http://localhost/api?query2=bro&query3=bob');
    });

    it('should prefer passed params when filling query parameters', function () {
      expect(replaceParams({one: '1'}, 'http://localhost/api?query=:one&friend=steve', {one: '2'}))
      .toEqual('http://localhost/api?query=1&friend=steve');
    });

    it('should handle multiple parameters', function () {
      expect(replaceParams({}, 'http://localhost/api/:version/thing/:thingId/bob', {version: 'v1', thingId: '123', action: 'post'}))
      .toEqual('http://localhost/api/v1/thing/123/bob');
    });

    it('should handle multiple parameters while ending with a param', function () {
      expect(replaceParams({}, 'http://localhost/api/:version/thing/:thingId/bob/:action', {version: 'v1', thingId: '123', action: 'post'}))
      .toEqual('http://localhost/api/v1/thing/123/bob/post');
    });

    it('should not use body values as query parameters if no match is found', function () {
      expect(replaceParams({}, 'http://localhost/api/:version', {version: 'v1', thingId: '123', action: 'post'}))
      .toEqual('http://localhost/api/v1');
    });
  });
});
