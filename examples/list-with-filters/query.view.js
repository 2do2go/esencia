'use strict';

define([
	'underscore', 'common/base.view'
], function(_, BaseView) {
	return BaseView.extend({
		template: 'query',
		events: {
			'change': 'onChange'
		},
		initialize: function() {
			_(this.data).defaults({
				value: ''
			});
		},
		onChange: function() {
			this.updateState({
				data: {value: this.$el.val()}
			});

			this.trigger('change', this.getValue());
		},
		getValue: function() {
			return this.data.value;
		},
		getTemplateData: function() {
			return this.data;
		}
	});
});
