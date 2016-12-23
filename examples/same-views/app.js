'use strict';

require([
	'esencia', 'layout.view', 'content.view'
], function(Esencia, LayoutView, ContentView) {
	var router = new Esencia.Router();

	router.component({
		name: 'layout',
		container: '#app',
		View: LayoutView
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
