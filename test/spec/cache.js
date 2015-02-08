'use strict';

describe('Cache', function () {

  var Cache;
  beforeEach(module('resourcify'));
  beforeEach(inject(function (ResourcifyCache) {
    Cache = ResourcifyCache;
  }));

  it('should be able to create unique caches', function () {
    var c = Cache.createCache();
    var c2 = Cache.createCache();
    expect(c).not.toBe(c2);
  });

  it('should configure options correctly', function () {

  });

  it('should be able to add items to cache', function () {

  });

  it('should update added items if they already are in cache', function () {

  });

  it('should $invalidate lists when adding', function () {

  });
});
