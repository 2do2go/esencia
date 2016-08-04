'use strict';

define([
	'backbone', 'esencia', 'utils/template', './menu'
], function(backbone, esencia, template, MenuView) {
	var View = {
		template: template('layout'),
		events: {
			views: {
				'change #menu': 'onMenuChange'
			}
		}
	};

	View.initialize = function() {
		this.setView(new MenuView({
			data: {selected: 'categories'}
		}), '#menu');
	};

	View.onMenuChange = function(value) {
		this.getView('#menu').setData({selected: value});
		backbone.trigger('processComponent', value);
	};

	return esencia.View.extend(View);
});
