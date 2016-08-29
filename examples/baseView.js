'use strict';

define(['esencia', 'underscore'], function(Esencia, _) {
	var View = {};

	View.renderTemplate = function(template, data) {
		var templateEl = document.getElementById('tmpl-' + template);
		if (!templateEl) throw new Error('Template "' + template + '" is not found');
		return _.template(templateEl.innerHTML)(data);
	};

	return Esencia.View.extend(View);
});
