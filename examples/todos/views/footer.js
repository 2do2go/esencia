'use strict';

define(['baseView'], function(ExamplesBaseView) {
	var View = {
		template: 'todos-footer',
		events: {
			'click #clear-completed': 'onClearCompletedClick'
		}
	};

	View.getTemplateData = function() {
		var collection = this.collections.todos;

		var completedTodos = collection.filter(function(model) {
			return model.get('completed');
		});

		return {
			left: collection.length - completedTodos.length,
			completed: completedTodos.length
		};
	};

	View.onClearCompletedClick = function() {
		this.trigger('clearCompleted');
	};

	return ExamplesBaseView.extend(View);
});
