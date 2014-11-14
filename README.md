# Angular Module Template

Hi! And thanks for choosing to build a module!

### Getting Started
1. Clone the repo `git clone git@gitlab.mtc.byu.edu:templates/ng-module-template.git`
2. Rename the folder from `ng-module-template` to whatever you want to name the module
3. Change the `name` property in `package.json` and `bower.json` to match your folder name
4. Run `rm -rf .git/` to prepare a new git repo
5. Change the name of the module in `src/main.js` to whatever you want
6. Delete the example files in `src` and `test/spec` or use them as a reference
7. Run `git init` to start a new git repo, and then push it to gitlab somewhere

### Adding Code

Once you have finished setting up, you can add services, directives or whatever
to your hearts delight.  In the `src` folder you can create whatever structure you
want but it is recommended you match the structure in the `test/spec` folder
for creating your tests.

Services/Factories/Directives/Filters etc should be of this form in their own
file:

```javascript
angular.module('yourModule')
.filter('myFilter', ['someDependency', function (someDependency) {
	// Do stuff
	return filter;
}])
```

### Testing
As you add dependencies to your `bower.json` you will need to include any
required files in the `files` list in `karma.conf.js`:

```javascript
...
files: [
	'bower_components/angular/angular.js',
	'bower_components/angular-mocks/angular-mocks.js',
	'src/**/*.js',
	'test/mock/**/*.js',
	'test/spec/**/*.js'
],
...
```
This should automatically pull in any files you create in the `test/spec` folder
or your `src` folder, but it won't automatically pull in things you depend
on from bower.  You can add more as you see here.

Make sure when your test files import the module, they import the newly named
module you created in **Getting Started**

```javascript
...
beforeEach(module('ng-module-template'));
...
```

To run your tests, just run `grunt test`.  It will also jshint your code, both
in the `test/spec` directory and `src`

### Building
When you are ready to build, just run `grunt`.  This will re-test your code and  create both a
minified file and a normal file with all your files concatenated.  Use the
concatenated file as your `main` in `bower.json`.  You have to make sure
this is set before you commit and push, otherwise when users depend on your
module they won't have the advantage of having it automatically add to their
`index.html`.

### Versioning
If you are following [angular's commit conventions](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#-git-commit-guidelines) then you will be able to automatically generate a CHANGELOG.md file for your repo.  It will use all commits from the last tag up to this point and add a new entry.  Your flow could be something like this:

1. Work and make many commits following conventions.  Be sure to run `grunt` before committing your work so you can generate the compiled files.
2. Run `grunt bump` in some way to update your version
3. Run `grunt changelog` to generate a list of changes since the last tag
4. Commit the changes as a `chore(release): vx.x.x`
5. `git tag vx.x.x`
6. And finally, `git push` and `git push --tags`

## Notes
If you have any issues or questions please fork or comment!
