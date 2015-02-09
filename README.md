# Resourcify

[![build-status](https://api.travis-ci.org/erikdonohoo/resourcify.svg)](https://travis-ci.org/erikdonohoo/resourcify)
[![Code Climate](https://codeclimate.com/github/erikdonohoo/resourcify/badges/gpa.svg)](https://codeclimate.com/github/erikdonohoo/resourcify)
[![Test Coverage](https://codeclimate.com/github/erikdonohoo/resourcify/badges/coverage.svg)](https://codeclimate.com/github/erikdonohoo/resourcify)

Resourcify lets you have rich data models in your angular project that rock!  You can get rid of those long controllers with code that manipulates your models and move it where it belongs, into your models themselves!  It even includes smart caching that you can turn on to optimize your network requests.

1. [Create a Builder](#1-create-a-builder)
2. [Build Requests](#2-build-requests)
3. [Add Instance Methods](#3-add-instance-methods)
4. [Create the Resource](#4-create-the-resource)
5. [Using Your Model](#5-using-your-model)

**Other Documentation**
* [Using the Cache](#using-the-cache)
* [Nesting Resources](#nesting-resources)

## Installation

Use bower: `bower install --save resourcify`

Then add to your module as a dependency

```javascript
angular.module('myMod', ['resourcify']);
```

## 1. Create a Builder
Resourcify lets you make a `ResourcifyBuilder` that you can add all kinds of goodies onto for your backend requests and any other model manipulation you want to perform.  Creating a new builder is as simple as this:

```javascript
angular.module('myModule').service('Data', [
  'Resourcify',
function (Resourcify) {
  var UserBuilder = new Resourcify(name, url, config);
}]);
```

### name
Type: `string`

The name of the model you are making.  So for our example, lets say `User`.  **Requred**

### url
Type: `string` `promise`

The formatted string that will be used for any requests you add to the builder.  If you need some async process to occur before you can determine what your `url` needs to be, you can pass a promise that will resolved with the `url`.

The `url` should look like the string that angular's [$resource](https://docs.angularjs.org/api/ngResource/service/$resource#usage) expects for the url.

Here is an example:

`http://127.0.0.1:8085/api/v1/:bob/:id/grab.:ext?yes=no&thing=:thing`

All property names prefixed with `:` excepting your port (if you used one) will be replaced with values coming from the instance calling a request, or from supplied parameters for the request.

In this example, we will look for a property `bob` coming from passed query parameters or the model value itself (if this request has `isInstance` set to `true`).  If `bob` isn't found, then the `url` will collapse to:

`http://127.0.0.1:8085/api/v1?yes=no`

Query parameters that are defined with values in the url will always stay.  Any query params where the value is either not supplied, or can't be found on the model will be removed from the request.

**Note**

> Values passed as query params vs values that are on the model are more aggressively added as query params.  For example, with our same url, if we supplied `{bob: 'dude', ext: 'pdf'}` as query parameters and `thing` and `id` could not be found on the model, the url would end up being:

> `http://127.0.0.1:8085/api/v1/dude?yes=no&ext=pdf`

> Even though `ext` was a part of the `url` path, because `id` wasn't supplied the path collapsed down to that point, and any remaning query params passed that can't be found as replacements in the url, are added as additional query params on the resulting path.  Be aware of how urls are collapsed.  They can be very powerful but you must understand them.

### config
Type: `object`

Your `config` object can contain the following properties

#### idProp
Type: `string`  
Default: `id`

If your API responds with a Location header after a request is saved, the final piece of this url (after the last slash) is set as the `id` of your model.  You can set what property to use as your `id` with this configuration property
#### constructor
Type: `function`

When a new instance of your model is created (either from a `new` call or internally by Resourcify itself) you can run some custom setup code for your model.  The `this` value in your `constructor` function will be the instance of the model, so you can check for the existence of values or whatever else you want to do.  When Resourcify receives a response for a GET request and is expecting an object, it will call `new` with the response received from the server as the paremeter and use `angular.extend` to add all the properties to the model.

#### cache
Type: `object`

To use the cache and configure it, please read jump down to the [documentation](#using-the-cache)

#### usePromise
Type: `boolean`  
Default: `true` if using cache, `false` if not

When making requests with your resource and with the cache disabled, you can elect to either have your requests return an `object` that will eventually magically fill in with the response values from the server (a la angular's $resource), or a `promise` that will resolve with the requested value.  When using the cache, promises are *ALWAYS* returned.  This cannot be changed due to the nature of caching and dealing with asynchronous requests that need to be cached.

---

Now that you have your builder, you can use chaining and add on requests or methods until you have just the functionality you want for your model.

```javascript
UserBuilder
.request(/* config */)
.method(/* name, config */)
.request(/* config */)
```

## 2. Build Requests
You can configure any type of request using any valid HTTP Method for your Resourcify model.  To add a request, with the builder in hand, use the following format:

`Builder.request(config)`

Your `config` object can contain the following properties for each request

#### name
Type: `string`

The name of the request. **Required**

#### method
Type: `string`

The `http` method of the request.  For `PUT`, `POST`, and `PATCH` the value of the model will be sent as the request body.  **Required**

#### isInstance
Type: `boolean`  
Default: `true`

If this request is meant to be called from the constructor of your model rather than from the instance, you need to set this to `false`.

#### isArray
Type: `boolean`  
Default: `false`

If your request returns an array instead of an object, set this to `true` so Resourcify knows and can construct an array response instead.  This can be useful for requests that are run on the class level to return a list of instances.  It is assumed the array contains objects that should be turned into models.

#### propName
Type: `string`  
Default: `undefined`

If you receive metadata with each request, and the desired data is on some property of the response, you can tell the request which property to use for your data.  If that property is an array, you will still need to set `isArray` to `true` even though the actual response contained an object.

#### url
Type: `string` `promise`  
Default: `null`

If you need a slightly different url for this request than the one you set globally on the builder, you can set a url per request.  You can either supply the url as a `string` or a `promise` that resolves with the correct url.

#### before
Type: `function`

A function to run before the request is made.  The `this` context of the function will be the model you are dealing with (either the Constructed value or the array of values depending on `isArray`).  You can manipulate data before it is sent to the server or run some other logic.

#### after
Type: `function`

A function to run after a request has completed successfully but before any registered callback or resolve occurs.  If you need to do any post request processing you can do so here.

#### invalidateListModels
Type: `boolean`  
Default: `false`

This option is to be used in conjunction with a `ResourceBuilder` that is using a cache and *ONLY* when `isArray` is `true`.  Setting this option to `true` allows GET requests to individual values that were cached from making the request being built.  Sometimes an API may return smaller optimized objects when retrieved in a list.  Normally a subsequent GET to one of those individual values would just pull it out of the cache.  This option allows any objects retrieved with this request method to be invalidated immediately, so a future GET request for the individual value will still hit the server.

## 3. Add Instance Methods
With an instance of your model, you may need to do some manipulation at times, or you may just want to extrapolate some code away into your models.  You can build a custom `method` to do that:

`Builder.method(name, action)`

#### name
Type: `string`

The name of the method that will appear on the model's prototype.  **Required**

#### action
Type: `function`

The function to call when your action is triggered.  This function will be bound the the model's `this` property to access any values or other methods you expect to be there.


## 4. Create the Resource
When you are done with the builder, you need to create the resource.

`var MyModel = Builder.create()`

## 5. Using Your Model
Once you have created the resource, you can make an angular service out of it and BOOM, ready to use.

```javascript
angular.module('myModule').service('User', [
  'Resourcify',
function (Resourcify) {
  var UserBuilder = new Resourcify('User', ...);
  // Add some requests, methods, etc.
  return UserBuilder.create();
}]);
```

Now I can inject my `User` service anywhere I want

```javascript
// Inside some ctrl or directive...
$scope.newUser = new User();

// Put newUser in a form, and fill in some fields and then on submit...
$scope.newUser.save();

// Or get a list of users to show
$scope.users = User.query();

// Or if you are using cache
User.query().then(function putUsersOnScope(users) {
  $scope.users = users;
});
```
## Using the Cache
If your app is resource hungry and you want to cut down on the requests being made, you can use the cache built into Resourcify to be more intelligent about when to make requests for resources.

To configure and setup the cache, use the `cache` property when you create your Builder.  In the 3rd parameter `config` object, add another property `cache`.  This should be an object with the following options.

#### key
Type: `string` `array [string]`  
Default: `['id']`

This is the property or properties on your instances that can be used to uniquely identify your objects.  If your objects have an `id` property that is used to uniquely identify them from your server, then set `key` to the string `id`.  If you need ot use multiple properties to uniquely identify it, set `key` to an array of strings that represent the property names to use.

#### id
Type: `string`  
Default: `'id'`

If your server returns `null` on successful PUT or POST requests that create new resources and instead returns the `Location` header, you can set the `id` property to be the value on your objects that should represent your id (if you have one).  As long as your server sends the `Access-Control-Expose-Headers` header with the value `Location`, then Resourcify will pull the end of this url off and set the `id` property on the object that was just saved.

#### saveMethod
Type: `string`  
Default: `'POST'`

If you create new resources with requests of a different method, then you can change that here.  This way the cache knows when to invalidate certain things as new things are added to the server.

### Getting Around the Cache
Sometimes you need to clear the cache.  Sometimes you want to make a request and have it go through even though you have a value cached.  There are a few ways to do this.

#### Force Request
For every `request` you build, when you are using the cache there is an extra request created to 'force' a request.  If you created a request called `query` and you want to bypass the cache and force an $http request to the server, you can call `Model.query.force` and use it the same as the normal `Model.query`.

#### Clear Cache
Each Resourcify model keeps track of every object and list that has been retrieved using its request methods.  For every unique object you have retrieved from the server or saved to the server, there exists only one copy of it ever in memory.  If you use a request to get a specific instance of a model on one page, and do that again on another page, you can be sure they are indeed the same object.  If you want to clear the cache for a specific object, you can call the function `$clearCache` that has been added on to it by Resourcify.  If you want to invalidate *ALL* objects for a specific model and all query requests with any combination of query params, you can call `$clearCache` from the Model constructor itself.

```javascript
// Some instance of a user
user.$clearCache();

// This request will get to the server
user.$get();

// Let's clear cache of all users anywhere in our app
User.$clearCache();
```

## Nesting Resources
If you have resources that use nested URLs, you can save time by nesting resources.

Say you have these two Resourcify Objects:

```javascript
var User = new Resourcify('User', 'http://localhost/api/users/:userId')
  .request({method: 'GET', name: 'query', isArray: true})
  .create();

var Comment = new Resourcify('Comment', 'http://localhost/api/users/:userId/comments/:commentId')
  .request({method: 'GET', name: 'query', isArray: true})
  .create();
```

The URL for `Comment` is dependent on `User`.  Or in other words, Users have comments and can create/modify them using their own namespace.  Let's nest the `Comment` resource under `User` so that we can more easily create and find comments for a given user.

```javascript
var Comment = new Resourcify('Comment', 'http://localhost/api/users/:userId/comments/:commentId')
  .request({method: 'GET', name: 'query', isArray: true})
  .request({method: 'POST', name: '$save', isInstance: true})
  .create();

var User = new Resourcify('User', 'http://localhost/api/users/:userId')
  .request({method: 'GET', name: 'query', isArray: true})
  .subResource(Comment)
  .create();
```

### Create Nested Objects
Now when you make a new instance of `User`, it will have a unique reference to the `Comment` constructor on it.  For example.

```javascript
var user = new User({
  userId: 123,
  name: 'Bob'
});

// This user can now create new Comments that are tied to it

var comment = new user.Comment();

// You can add some properties to it...
comment.text = 'Yo bro';
comment.tags = ['fun', 'exciting', 'wow'];

// And then when you save it, it will use the user object that
// created it to fill in the `userId` property

comment.$save(); // POST to http://localhost/api/users/123/comments
```
### Collisions in Property Names
If your objects all use the property `id` as the unique identifier, you can tell Resourcify how to map the nested objects parameters

```javascript
// With url for Comment as http://localhost/api/users/:userId/comments/:id

var User = new Resourcify('User', 'http://localhost/api/users/:id')
  .subResource(Comment, {userId: 'id'})
  .create();

// Here both Comment and User refer to themselves by `id`
// We tell the User resource that when making nested Comments
// to fill in the `userId` property on the Comment url with the
// `id` property on the User.
```

### Infinitely Nest
This also works if you nest multiple objects down at multiple depths.  If you do this with 3 or more layers however, you need to let Resourcify know at which layer should it use the given property from the parent to fill the desired attribute

Say we had a Tag resource on our comment
```javascript
var Tag = new Resourcify('Tag', 'http://localhost/api/users/:userId/comments/:commentId/tags/:id');

var Comment = new Resourcify('Comment', 'http://localhost/api/users/:userId/comments/:id')
  .request({method: 'GET', name: 'query', isArray: true})
  .request({method: 'POST', name: '$save', isInstance: true})
  .subResource(Tag, {userId: 'id@2', commentId: 'id@1'})
  .create();
```

You can use the `<propName>@<num>` syntax when you need to reference multiple properties with the same propName.  You just need to tell Resourcify at what depth to find it.  In our case use the `id` property 2 levels in (on the User) to find the userId and use the `id` property 1 level down (on the Comment) to find the `commentId`.
