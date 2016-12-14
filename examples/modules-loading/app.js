'use strict';

require([
	'esencia', 'layout.view'
], function(Esencia, LayoutView) {
	var router = new Esencia.Router({
		modulesPath: './'
	});

	router.component({
		name: 'layout',
		View: LayoutView,
		container: '#app'
	});

	router.route('(/)', function() {
		Esencia.history.navigate('first', {replace: true, trigger: true});
	});

	Esencia.history.start({pushState: false});
});
