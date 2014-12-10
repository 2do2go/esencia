'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		template: _.template(document.getElementById('tmpl-todos-footer').innerHTML),
		events: {
			'click #clear-completed': 'onClearCompletedClick'
		}
	};

	View.getData = function() {
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

	return ParentView.extend(View);
});
