'use strict';

define(['underscore'], function(_) {
	var utils = {};

	utils.render = function(template, data) {
		var templateEl = document.getElementById('tmpl-' + template);
		if (!templateEl) throw new Error('Template "' + template + '" is not found');
		return _.template(templateEl.innerHTML)(data);
	};

	return utils;
});
