'use strict';

describe('Cache', function () {

  var Cache;
  beforeEach(module('resourcify'));
  beforeEach(inject(function (ResourcifyCache) {
    Cache = ResourcifyCache;
  }));

  function Item(item) {
    angular.extend(this, item);
  }

  it('should be able to create unique caches', function () {
    var c = Cache.createCache();
    var c2 = Cache.createCache();
    expect(c).not.toBe(c2);
  });

  it('should configure options correctly', function () {
    var cache = Cache.createCache();
    expect(cache.$options.id).toBe('id');
    expect(cache.$options.saveMethod).toBe('POST');
    expect(cache.$options.key).toEqual(['id']);
    cache = Cache.createCache({});
    expect(cache.$options.id).toBe('id');
    expect(cache.$options.saveMethod).toBe('POST');
    expect(cache.$options.key).toEqual(['id']);
    cache = Cache.createCache({
      id: 'blah',
      saveMethod: 'PUT',
      key: ['blah']
    });
    expect(cache.$options.id).toBe('blah');
    expect(cache.$options.saveMethod).toBe('PUT');
    expect(cache.$options.key).toEqual(['blah']);
  });

  it('should be able to add items to cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.$cache['1']).toBe(i);
  });

  it('should be able to retrieve items from the cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.get('1')).toBe(i);
    expect(cache.get(['1'])).toBe(i);
    cache = Cache.createCache({
      key: ['id', 'other']
    });
    i = new Item({id: '1', other: '2'});
    cache.add(i);
    expect(cache.get(['1', '2'])).toBe(i);
  });

  it('should correctly calculate key for items', function () {
    var cache = Cache.createCache({
      key: ['id', 'other']
    });
    var i = new Item({id: '1', other: '2'});
    expect(cache.getKey(i)).toEqual(['1', '2']);
    cache = Cache.createCache();
    i = new Item({id: '3'});
    expect(cache.getKey(i)).toEqual(['3']);
  });

  it('should add items with multi-keys correctly', function () {
    var cache = Cache.createCache({
      key: ['id', 'other']
    });
    var i = new Item({id: '1', other: '2'});
    cache.add(i);
    expect(cache.$cache['1']['2']).toBe(i);
    i = new Item({id: '1', other: '3'});
    cache.add(i);
    expect(cache.get(['1', '3'])).toBe(i);
  });

  it('should allow items to remove themselves from the cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.$cache['1']).toBe(i);
    i.$clearCache();
    expect(cache.$cache['1']).toBeUndefined();
  });

  it('should be able to remove items from the cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.$cache['1']).toBe(i);
    cache.remove('1');
    expect(cache.$cache['1']).toBeUndefined();
    cache = Cache.createCache({
      key: ['id', 'other']
    });
    i = new Item({id: '1', other: '2'});
    cache.add(i);
    expect(cache.get(['1', '2'])).toBe(i);
    cache.remove(['1', '2']);
    expect(cache.get(['1', '2'])).toBeUndefined();
  });

  it('should be able to clear the cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.$cache['1']).toBe(i);
    cache.clear();
    expect(cache.$cache['1']).toBeUndefined();
  });

  it('should update added items if they already are in cache', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    cache.add(i);
    expect(cache.$cache['1']).toBe(i);
    i.stuff = 3;
    cache.add(i);
    expect(cache.get('1')).toBe(i);
  });

  it('should be able to add lists of items', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    var i2 = new Item({id: '2'});
    var list = [i, i2];
    list.key = 'http://localhost/1/stuff?thing';
    list = cache.addList(list.key, list);
    expect(cache.get('1')).toBe(i);
    expect(cache.get('2')).toBe(i2);
  });

  it('should merge lists when items found in one are found in a pre-existing one', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    var i2 = new Item({id: '2'});
    var list = [i, i2];
    list.key = 'http://localhost/1/stuff?thing';
    list = cache.addList(list.key, list);
    expect(cache.get('1')).toBe(i);
    expect(cache.get('2')).toBe(i2);
    var i3 = new Item({id: '3'});
    var i4 = new Item({id: '1', other: true});
    var list2 = [i3, i4];
    list2.key = 'http://other.thing';
    list2 = cache.addList(list2.key, list2);
    expect(cache.get('1')).toBe(i);
    expect(cache.get('2')).toBe(i2);
    expect(cache.get('3')).toBe(i3);
    expect(cache.get('1').other).toBe(true);
    expect(list2[1]).toBe(list[0]);
  });

  it('should remove items from lists correclty when they are removed in general', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    var i2 = new Item({id: '2'});
    var i3 = new Item({id: '3'});
    var list = [i, i2];
    var list2 = [i2, i3];
    list.key = 'http://localhost/1/stuff?thing';
    list2.key = 'http://blah';
    list = cache.addList(list.key, list);
    list2 = cache.addList(list2.key, list2);
    expect(list.length).toBe(2);
    expect(list2.length).toBe(2);
    cache.remove('1');
    expect(list.length).toBe(1);
    expect(list2.length).toBe(2);
  });

  it('should $invalidate lists when adding', function () {
    var cache = Cache.createCache();
    var i = new Item({id: '1'});
    var i2 = new Item({id: '2'});
    var list = [i, i2];
    list.key = 'http://localhost/1/stuff?thing';
    list = cache.addList(list.key, list);
    var i3 = new Item({id: '3'});
    cache.add(i3, true);
    expect(cache.$lists['http://localhost/1/stuff?thing'].$invalid).toBe(true);
  });
});
