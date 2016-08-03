'use strict';

define(['underscore'], function(_) {
	return function(name) {
		var el = document.getElementById('tmpl-' + name);
		if (!el) throw new Error('Template "' + name + '" is not found');
		return _.template(el.innerHTML);
	};
});
