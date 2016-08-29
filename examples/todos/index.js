'use strict';

require(['esencia', './views/layout'], function(Esencia, LayoutView) {
	Esencia.componentsManager.add({
		parent: null,
		View: LayoutView,
		process: true
	});
});
