# Stuff to do

### Caching

How do we want to handle caching?  Do we want to handle it internally?

- [ ] For each type of object, a cache should be kept where there exists only one instance of the object in memory at any one time
- [ ] Updates (PUT) will update that model in the cache
- [ ] Saves (POST) will add this model to the cache
- [ ] Should be able to set a time to have the cache expire both per Constructor made for resourcify, but maybe even per model
- [ ] Mostly it needs to be easy to clear a cache
- [ ] Should not be required and should be built into a separate module
- [ ] Requests to the same resource should keep track of which models they should get back in a separate list.  There should be one overall list of all models encountered, and then different GET's to slightly different URLs with different Query Params can just maintain a list of pointers to which models they should contain.

*Questions*

* If we are keeping track of which objects queries with specific parameters should expect, and then we post a new one, how do we know which subsequent GET should expect to have that model included?

### Before/After functions

The idea behind these is that you can call a function before or after a request function runs.  This would allow you to modify the request both at configuration time or even at runtime.  Should use interceptors for most of the functionality somehow.

### Other ideas

- [ ] Allow runtime configuration and patching of these resources after instantiation.
- [ ] Allow configuring of what "id" property is on a saved object
