'use strict';

define(['base.view'], function(BaseView) {
	var View = {
		template: 'todos-footer',
		triggers: {
			'click #clear-completed': 'clearCompleted'
		}
	};

	return BaseView.extend(View);
});
