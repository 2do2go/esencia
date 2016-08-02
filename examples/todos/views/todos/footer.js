'use strict';

define([
	'underscore', 'esencia'
], function(_, esencia) {
	var View = {
		template: _.template(document.getElementById('tmpl-todos-footer').innerHTML),
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
