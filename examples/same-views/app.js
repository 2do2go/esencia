'use strict';

require([
	'esencia', 'layout.view', 'common/base.view'
], function(Esencia, LayoutView, BaseView) {
	var router = new Esencia.Router({
		autoloadModules: false
	});

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
	});

	var ContentView = BaseView.extend({
		template: 'content'
	});

	router.route('first', {
		component: {
			parent: 'layout',
			container: '#first',
			View: ContentView
		}
	});

	router.route('second', {
		component: {
			parent: 'layout',
			container: '#second',
			View: ContentView
		}
	});

	if (!Esencia.history.start({pushState: false})) {
		Esencia.history.navigate('first', {replace: true, trigger: true});
	}
});
