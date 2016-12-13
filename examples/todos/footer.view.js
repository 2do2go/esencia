'use strict';

define(['common/base.view'], function(BaseView) {
	var View = {
		template: 'todos-footer',
		triggers: {
			'click #clear-completed': 'clearCompleted'
		}
	};

	View.getTemplateData = function() {
		return this.data;
	};

	return BaseView.extend(View);
});
