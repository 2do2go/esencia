'use strict';

define(['esencia', 'common/utils'], function(Esencia, utils) {
	return Esencia.View.extend({
		_renderTemplate: function(template, data) {
			return utils.render(template, data);
		}
	});
});
