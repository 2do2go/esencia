'use strict';

require(['esencia', './layout.view'], function(Esencia, LayoutView) {
	Esencia.componentsManager.add({
		parent: null,
		View: LayoutView,
		process: true
	});
});
