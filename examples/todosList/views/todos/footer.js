'use strict';

define([
	'esencia', 'utils/template'
], function(esencia, template) {
	var View = {
		template: template('todos-footer'),
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

	return esencia.View.extend(View);
});
