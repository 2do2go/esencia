# Esencia

JavaScript framework based on Backbone.js. Extends Backbone router, controller, view and collections. Add some features, e.g.:

* router features
* controller
* grouping controllers in modules
* components (nested views) 
* debuggermmmp
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

	*String*, default: `'/'`

	Root url for router.

* `modulesPath`

	*String*, default: `'modules/'`

	Path for folder with your modules.

* `defaultModuleName`

	*String*, default: `'main'`

	Name for module that will loaded if Esencia cannot extract module name from url. Usualy `defaultModuleName` is a name of module for controller that provide functionality of router root url.

* `pushState`

	*Boolean*, default: `false`

	Define if router will use pushstate to manage browser navigation history.

* `autoloadModules`

	*Boolean*, default: `true`

	If `true` than Esencia will automaticaly try to load module to get controller for current url.

* `namedParameters`

	*Boolean*, default: `false`

	...

* `debug`

	...

* `config`

	*Object*, default: `{}`

	...

* `onModuleError`

	*function*

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
});
```


### Router.controller(controller, options)

`Router.controller` method add controller to current router to provide functionality of url that specified in controller. `Router.controller` have two arguments:

* `controller`

	Instance of controller that will be added to router

* `options`

	*Object*, default: `{}`

	Hash of options. There are following options:

	* `process`

		*Boolean*, default: `false`

		Process controller in force mode (without matching url).

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

	*Boolean*, default: `false`

	If `true` than router will navigate to `nowhereUrl` (`'___'`) before navigate to `fragment`. This trick is using to go to the selected fragment even if it equal to current and to rerender all views that was changed (by default only view of current controller will be rerendered).

* `qs`

	*Object*

	Query string hash that will be stringified and added to `fragment` using `toFragment` from `backbone.queryparams`.

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

Controller in Esencia is using for preparing data and build chain of views in depends of url. Controller have multiple stage workflow. By default when controller is processed in case of url matching there are next stages:

`prepare` -> `view` -> `render`

If controller is already prepared and contorller's view is attached than processing of controller has only one stage:

`renderOnly`


### Controller.contructor(options)

`Controller.contructor` have only one argument - hash of options. There are following options:

* `url`

	*String*

	Url or url regex which functionality will be provided by this instance of Esencia `Controller`.

* `name`

	*String*

	Name of the controller. Must be unique.

* `parentName`

	*String*

	Name of parent controller in chain of controllers.

* `models`

	*Object*, default: `{}`

	Hash of Backbone model instances for storing data and using in views.

* `collections`

	*Object*, default: `{}`

	Hash of Esencia collection instances for storing data and using in views.

* `viewOptions`

	*Object*, default: `{}`

	Hash of default options that will be applied to context of current controller view.

* `defaultUrlParams`

	*Object*, default: `{}`

	Hash of default url params that will be applied when Router navigating to url of this controller.

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

`Controller.prepare` usualy using to fetch collections and models data. `Controller.prepare` implementing `prepare` stage of controller processing. Argument `callback` is a function that must be called after end of all preparing operations.

**Note:** `callback` must be called even if prepare operations are syncronous.

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


## View

Esencia `View` extends Backbone `View` and add methods to manage nested views and handle render event.

Esencia `View` instances have following attributes:

* `models`

	*Object*

	Hash of data models that was created and fetched in `Controller.prepare` or passed to `options` argument of `View.constructor`.

* `collections`

	*Object*

	Hash of data collections that was created and fetched in `Controller.prepare` or passed to `options` argument of `View.constructor`.

* `data`

	*Object*, default `{}`

	Inner view data that will be passed to template render function.

* `views`

	*Object*

	Every View instance has `this.views` hash that contains all nested views. Every `this.views` key is selector of element to which attached views, value is array of views.

	**Note:** Hereinafter will call value of every `this.views` item *views group*.

* `events`

	*Object*, default: `{}`

	Hash of view events that described in [Backbone documentation](http://backbonejs.org/#View-events).

* `viewsEvents`

	*Object*, default: `{}`

	Analog of `views.events` to handle nested views events. Selector in `this.viewsEvents` must to be the same as selector of views group which event you need to handle.

* `urlParams`

	*Object*

	Current `urlParams` from `Router`.

* `templateHelpers`

	*Object*, default: `{}`

	`View.templateHelpers` is hash of helper functions or data that will be used in templates. When template is rendering `View.templateHelpers` extends by `this.data` of rendering view.



### View.constructor(options)

There are following options:

* `el`

	*element*

	If `el` is not present in `options` hash than `this.noel` will be setted to `true`. Usualy you don't need to pass 

* `data`
	
	*Object*, default: `{}`

	Data that will be setted to `this.data` and than passed to template render function.

* `models`, `collections`

	*Object*

	Value of this options will be setted to `this.models` and `this.collections` of created view respectively.

#### View.constructor example
```javascript
define('exampleView', [
	'underscore', 'esencia/view'
], function(_, BasicView) {
	var View = {
		template: _.template('<div class="actionButton"> <%= title %> </div>'),
		events: {
			'click .actionButton': 'onActionButtonClick'
		}
	};

	View.onActionButtonClick = function(event) {
		// some code for handle action
	};

	View.getData = function() {
		return {
			title: 'Button'
		}
	};

	return BasicView.extend(View);
});

define('exampleController', [
	'esencia/controller', `exampleView`
], function(BasicController, ExampleView) {
	var Controller = {
		url: '',
		view: ExampleView
	}

	return BasicController.extend(Controller);
});

```


### View.initialize()

`View.initialize` is usualy using for set nested views.

By default `View.initialize` is empty.


### View.render(options)

There are following options:

* force

	*Boolean*, default: `false`

	Will rerender views if `true` and view data was changed (see `View.isUnchanged`).


### View.afterRender()

`View.afterRender` is usualy using for set jQuery components and some other actions that must to be executed exactly after render view template.

By default `View.afterRender` is empty.


### View.beforeDetach()

`View.beforeDetach` is usualy using for make some actions before view will be detached from DOM.

By default `View.beforeDetach` is empty.


### View.getData()

`View.getData` is using for set data to template. `View.getData` return hash that will be extended with `templateHelpers` (see `View.templateHelpers`) and than will be used in render function.

By default `View.getData` return `this.data`. You can set you value to `this.data` by calling `View.setData(data)` (see `View.setData`).


### View.setData(data)

`View.setData` using for two purposes:

* you may specify this method in current view and this method will be called during rerender to set actual data to nested views.

* also you may call this method on nested view object to set data directly to it

If you want to set data to nested views you must specify `View.setData` in current view with a function that will getting nested views (see `View.getView') and call their `View.setData` methods with hash of actual data. `View.setData` will be calling every time when current view will rendering (even if it will not be rerendered because `force` is `false` and `isUnchanged` is `true`).

By default if `View.setData` will be called without arguments it will do nothig. And if it will be called with `data` argument it will set `data` to `this.data`.

#### View.setData example
```javascript
define('exampleNestedView', [
	'underscore', 'esencia/view'
], function(_, BasicView) {

	var View = {
		template: _.template('<div><%= title %></div>'),
	};

	return BasicView.extend(View);
});

define('exampleView', [
	'underscore', 'esencia/view', 'exampleNestedView'
], function(_, BasicView, ExampleNestedView) {
	var templateString = '<div id="nestedViewContainer"></div>';

	var View = {
		template: _.template(templateString),
	};

	View.initialize = function() {
		this.setView(new ExampleNestedView(), '#nestedViewContainer');
	};

	View.setData = function() {
		this.getView('#nestedViewContainer').setData({
			// data for nested view will be setted every time
			// when current view rendering
			title: 'Title'
		});
	};

	return BasicView.extend(View);
});

define('exampleController', [
	'esencia/controller', `exampleView`
], function(BasicController, ExampleView) {
	var Controller = {
		url: '',
		view: ExampleView
	}

	return BasicController.extend(Controller);
});
```


### View.isUnchanged(data)

When view rerendering than all nested views can be rerendered too. `View.isUnchanged` is using for define if you need rerender view. Usualy `View.isUnchanged` return result of comparision of view data and data from function arguments. If they are different than data was changed, `View.isUnchanged` return `false` and view will be rerendered.

By default `View.isUnchanged` return `true`. It means that view will not be rerendered in case of parent view called its `render` method.

**Note:** also you can use `View.render({force: true})` to rerender current and all nested views independent from they `View.isUnchanged` results.


### Manage nested views

This methods is using for get, set and remove nested views. Their have all or several of following arguments:

* `views`
	
	*Esencia.View instance or Array of Esencia.View instances*

	View or views to set.

* `selector`

	*String*

	Selector to find DOM element for attach views. It may be any jQuery selector but *id* is recommended.

* `index`

	*Number*

	Index of view to replace. If index is passed it replace only one view with index in views group.


#### View.setView(views, selector, index)

*Alias:* View.setViews(views, selector, index)

`View.setView` is using for creating nested views. Nested views will be inserted in existent `selector` views gropup or create new.


#### View.appendView(views, selector)

*Alias:* View.appendViews(views, selector)

Append `views` to `selector` views group. `View.appendView` is alias for `View.insertView` without `index` argument.


#### View.prependView(views, selector)

*Alias:* View.prependViews(views, selector)

Prepend `views` to `selector` views group.


#### View.insertView(views, selector, index)

*Alias:* View.insertViews(views, selector, index)

`View.insertView` insert `views` to specified `index` of views group. If index is not passed views will `View.insertView` append to end of views group. If there are no views on `selector` `View.insertView` will just set `views` no matter what value `index` is.


#### View.removeView(views, selector, index)

*Alias:* View.removeViews(views, selector, index)

Remove view or views from views group by index or views instances list.

Usage:

* `View.removeView(selector, index)`

	Will remove `index` view from `selector` views group.

* `View.removeView(views, selector)`

	Will remove all instances from `views` Array that are present in views group of `selector`. 

**Note:** by default `View.removeView` don't remove views from DOM. If you want to remove views form DOM you may:

* use `View.remove()`

* rerender parent view with `{force: true}`. This way is not recomended because it may cause performance problems.


#### View.remove()

`View.remove` remove view from DOM.


#### View.getView(selector, index)

`View.getView` return first or `index` view from `selector` views group or `null` if there are no views attached to `selector` element.


#### View.getViews(selector)

`View.getViews` return views group of `selector` or `null` if there are no views attached to `selector` element.


#### View.getClosestView()

`View.getClosestView` return view that attached to closest element with class `.view-attached`.


#### Manage nested views example

See manage nested views example in [`examples/todos`](examples/todos)



## Collection

Esencia `Collection` extends Backbone `Collection` - override `Collection.sync` method and add `Collection.exec`.

### Collection.exec()

Exec custom non-REST method on collection. It trigger `exec:[method]` event after success collection sync.

#### Collection.exec example
```javascript
define('userView', [
	'underscore', 'esencia/view'
], function(_, BasicView) {
	var templateString = '<ul><% _.each(users, function(user) { %>' +
		'<li class="resetPasswordButton" data-id="<%= user.id %>">' +
		'Reset <%= user.name %> password' +
		'</li>' +
		'<% }) %></ul>';

	var View = {
		template: _.template(templateString),
		events: {
			'click .resetPasswordButton': 'onPasswordReset'
		}
	};

	View.onPasswordReset = function(event) {
		var id = this.$(event.currentTarget).data('id');
		this.collections.users.exec('resetpassword', {
			data: {
				id: id
			},
			success: function() {
				// handle success password reset
			}
		});
	};

	View.getData = function() {
		return {
			users: this.collections.users.toJSON()
		}
	};

	return BasicView.extend(View);
});

```



## License

MIT