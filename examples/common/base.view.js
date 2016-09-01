'use strict';

define(['esencia', 'common/utils'], function(Esencia, utils) {
	var View = {};

	View.renderTemplate = function(template, data) {
		return utils.render(template, data);
	};

	return Esencia.View.extend(View);
});
