# Esencia

JavaScript framework based on Backbone.js. Extends Backbone router, controller, view and collections. Add some features, e.g.:

* grouping controllers in modules
* define controller workflow
* add defaultUrlParams to controller
* etc.

Work in progress...


## Modules
To automate search of needed controller router in Esencia load module - usualy group of controllers that provide functionality of logicaly related routs. For example, if you have routes `/users`, `/users/:id`, `/users/:id/edit`, etc. to provide work with user accounts in your app, than you need to create module `users` to load all controllers for described urls. Name of module must be the same as first url component after router root.

### Module example
```javascript
define([
	'controllers/users/list',
	'controllers/users/view',
	'controllers/users/edit'
], function(
	UsersListController,
	UsersViewController,
	UsersEditController
) {
	// module must return function that will add controllers to router
	return function(router) {
		router.controller(new UsersListController());
		router.controller(new UsersViewController());
		router.controller(new UsersEditController());
	};
});
```


## Router
### Router.constructor(options)
Router constructor have one argument - hash of options. There are following options:

* `root`

	default: `'/'`

	root url for router.

* `modulesPath`

	default: `'modules/'`

	path for folder with your modules.

* `defaultModuleName`

	default: `'main'`

	name for module that will loaded if Esencia cannot extract module name from url. Usualy `defaultModuleName` is a name of module for controller that provide functionality of router root url.

* `pushState`

	default: `false`

	define if router will use pushstate to manage browser navigation history.

* `namedParameters`

	default: `false`


* `autoloadModules`

	default: `true`

	if `true` than Esencia will automaticaly try to load module to get controller for current url.

* `debug`

	...

* `config`

	default: `{}`

	...

* `onModuleError`

	RequireJS `define` error callback to provide error handling of loading modules. Details in [RequireJS documentation](http://requirejs.org/docs/api.html#errbacks)

#### Router.constructor example
```javascript
require([
	'esencia/router'
], function(
	Router
) {
	var router = new Router({
		root: '/app',
		modulesPath: 'modules/',
		pushState: true,
		defaultModuleName: 'main',
		namedParameters: true,
		autoloadModules: true,
		onModuleError: function(err) {
			// error handling - maybe notification, navigate to error page
			// or something else
		}
	});
```


### Router.controller(controller, options)

`Router.controller` method add controller to current router to provide functionality of url that specified in controller. `Router.controller` have two arguments:

* `controller`

	instance of controller that will be added to router

* `options`

	default: `{}`

	Optional argument ...

#### Router.controller example
```javascript
require([
	'esencia/router',
	'controllers/layout'
], function(
	Router, layoutController
) {
	var router = new Router({
		root: '/app',
		pushState: true,
		namedParameters: true,
		autoloadModules: false
	});

	router.controller(new layoutController());

	router.start();
});
```


### Router.controllers(controllers)

`Router.controllers` receiving in arguments array of controllers to run `Router.controller` for each of them.

**Note:** `Router.controllers` do not pass options when add controllers to router.


### Router.start()

`Router.start` method using for starting routes handling.


### Router.navigate(fragment, options)

`Router.navigate` using for correct navigating between application urls. First argument is `fragment` - destination url (`root` part will be removed if `fragment` starts with `root`). Second argument is hash of options. There are following options:

* `force`

	default: `false`

	if `true` than router will navigate to `nowhereUrl` (`___`) before navigate to `fragment`. This trick is using to go to the selected fragment even if it equal to current and to rerender all views that was changed (by default only view of current controller will be rerendered).

* `qs`

	query string object that will be stringified and added to `fragment` using `toFragment` from `backbone.queryparams`.

Also `options` can include `trigger` (default: `true`) and `replace` (default: `false`) that described in [Backbone documentation](http://backbonejs.org/#Router-navigate)

#### Router.navigate example
```javascript
router.navigate('/users', {
	force: true,
	qs: {
		search: 'username'
	}
});
// router will navigate to '/app/users?search=username' if router.root === '/app'
```


## Controller

Controller in Esencia is using for preparing data and build chain of views in depends of url. 

### Controller.contructor(options)

`Controller.contructor` have only one argument - hash of options. There are following options:

* name

* parentName

* models

* collections

* viewOptions

* defaultUrlParams

#### Controller.contructor example
```javascript
define([
	'esencia/controller',
	'views/users'
], function(ParentController, View) {
	var Controller = {
		name: 'users',

		// layout controller was created before
		parentName: 'layout',

		View: View
	};

	// other operations with controller

	// Controller hash must be extended with Esencia controller
	return ParentController.extend(Controller);
});
```


### Controller.prepare(callback)

`Controller.prepare` using to fetch collections and models data. `callback` must be called after end of all preparing operations (is nescesary for sync operation? ... ).

#### Controller.prepare example
```javascript
define([
	'esencia/controller',
	'views/users',
	'collections/users'
], function(ParentController, View, UsersCollection) {
	// some code for create controller

	Controller.prepare = function(callback) {
		this.collections = {
			users: new UsersCollection()
		};

		this.collections.users.fetch({
			success: callback
		});
	};

	return ParentController.extend(Controller);
});
```





To be continued...


## License

MIT