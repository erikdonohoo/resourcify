'use strict';

describe('Service: ResourceUtils', function () {

  beforeEach(module('resourcify'));

  var replaceParams;

  // Init
  beforeEach(inject(function (_resourcifyUtils_) {
    replaceParams = _resourcifyUtils_.replaceParams;
  }));

  describe('objectifyQueryParams', function () {
    /* global objectifyQueryParams: false */
    it('should turn query params into object', function () {
      expect(objectifyQueryParams('http://blah.com/stuff?who=me&you=me')).toEqual({
        who: 'me',
        you: 'me'
      });
    });

    it('should return {} with no query params', function () {
      expect(objectifyQueryParams('http://localhost:8080/my/friend/bob')).toEqual({});
      expect(objectifyQueryParams('http://localhost/dude?')).toEqual({});
    });

    it('should handle variable parameters in query', function () {
      expect(objectifyQueryParams('http://blah.com?bro=:me&dude=:you&so=what'))
      .toEqual({
        bro: ':me',
        dude: ':you',
        so: 'what'
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

    it('should ignore ports', function () {
      expect(replaceParams({id: 123}, 'http://localhost:8080/api/friend/:id'))
      .toEqual('http://localhost:8080/api/friend/123');
    });

    it('should handle extensions', function () {
      expect(replaceParams({bob: 'dude', ext: 'json'}, 'http://localhost:8080/api/friend/:bob/man.:ext'))
      .toEqual('http://localhost:8080/api/friend/dude/man.json');
    });

    it('should handle complex urls', function () {
      expect(replaceParams({bob: 'dude', id: 123, ext: 'pdf'},
      'http://127.0.0.1:8085/api/v1/:bob/:id/grab.:ext?yes=no&thing=:thing'))
      .toEqual('http://127.0.0.1:8085/api/v1/dude/123/grab.pdf?yes=no');
    });

    it('should keep query params when url collapses', function () {
      expect(replaceParams({bob: 'dude', thing: 'thang'},
      'http://127.0.0.1:8085/api/v1/:bob/:id/grab.:ext?yes=no&thing=:thing', {ext: 'pdf'}))
      .toEqual('http://127.0.0.1:8085/api/v1/dude?yes=no&thing=thang');
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
