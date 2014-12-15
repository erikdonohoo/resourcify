# Resourcify
Resourcify lets you have rich data models in your angular project that rock!  You can get rid of those long controllers with code that manipulates your models and move it where it belongs, into your models themselves!  It even includes smart caching that you can turn on to optimize your network requests.

## 1. Create a Builder
Resourcify lets you make a `ResourcifyBuilder` that you can add all kinds of goodies onto for your backend requests and any other model manipulation you want to perform.  Creating a new builder is as simple as this:

`var UserBuilder = new Resourcify(name, url, config)`

### name
Type: `string`

The name of the model you are making.  So for our example, lets say `User`.  **Requred**

### url
Type: `string` `promise`

The formatted string that will be used for any requests you add to the builder.  If you need to some async process to occur before you can determine what your `url` needs to be, you can pass a promise that will resolved with the `url`.

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

Your `config` object can contain the following properties

#### constructor
Type: `function`

When a new instance of your model is created (either from a `new` call or internally by Resourcify itself) you can run some custom setup code for your model.  The `this` value in your `constructor` function will be the instance of the model, so you can check for the existence of values or whatever else you want to do.  When Resourcify receives a response for a GET request and is expecting an object, it will call `new` with the response received from the server as the paremeter and use `angular.extend` to add all the properties to the model.

#### cache
Type: `object`

To use the cache and configure it, please read jump down to the [documentation](#using-the-cache)

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
Default: `false`

If this request is meant to be called from an instance of your model rather than from the class level, you need to set this to `true`.  For example, you have built up a model and want to save it to the server with a `POST` request, you could make a `POST` type request and set `isInstance` to true.

#### isArray
Type: `boolean`  
Default: `false`

If your request returns an array instead of an object, set this to `true` so Resourcify knows and can construct an array response instead.  This can be useful for requests that are run on the class level to return a list of instances.

#### url
Type: `string` `promise`  
Default: `null`

If you need a slightly different url for this request than the one you set globally on the builder, you can set a url per request.  You can either supply the url as a `string` or a `promise` that resolves with the correct url.

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

#### key
#### id
#### saveMethod
