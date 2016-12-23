'use strict';

define([
	'underscore', 'common/base.view'
], function(_, BaseView) {
	return BaseView.extend({
		template: 'select',
		events: {
			'change': 'onChange'
		},
		initialize: function() {
			_(this.data).defaults({
				value: _(this.data.items).keys()[0]
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
