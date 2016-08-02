'use strict';

define([
	'underscore',
	'esencia',
	'views/todos/item',
	'views/todos/footer'
], function(
	_,
	esencia,
	TodosItemView,
	TodosFooterView
) {
	var View = {
		template: _.template(document.getElementById('tmpl-todos').innerHTML),
		events: {
			'keydown #new-todo-title': 'onNewTodoTitleKeydown',
			'change #toggle-all': 'onToggleAllChange',

			views: {
				'clearCompleted #todos-footer': 'onClearCompleted',
				'toggle #todos': 'onTodoToggle'
			},

			collections: {
				'add todos': 'onTodosAdd',
				'remove todos': 'onTodosRemove'
			}
		}
	};

	View.initialize = function() {
		this.collections = {todos: new esencia.Collection()};
		this.updateList();
		this.updateFooter();
	};

	View.getTemplateData = function() {
		return {todosCount: this.collections.todos.length};
	};

	View.afterAttach = function() {
		this.$newTodoTitle = this.$('#new-todo-title');
		this.$toggleAll = this.$('#toggle-all');
		this.$todosWrap = this.$('#todos-wrap');
	};

	View.appendTodoView = function(model) {
		this.appendView(new TodosItemView({
			models: {todo: model}
		}), '#todos');
	};

	View.updateWrapStyles = function() {
		if (this.collections.todos.length) {
			this.$todosWrap.show();
		} else {
			this.$toggleAll.prop('checked', false);
			this.$todosWrap.hide();
		}
	};

	View.updateList = function() {
		var self = this;
		_(this.getViews('#todos')).each(function(view) {
			view.remove();
		});
		this.collections.todos.each(function(model) {
			self.appendTodoView(model);
		});
	};

	View.updateFooter = function() {
		if (this.collections.todos.length) {
			this.setView(new TodosFooterView({
				collections: this.collections
			}), '#todos-footer');
		} else {
			var footerView = this.getView('#todos-footer');
			if (footerView) {
				footerView.remove();
			}
		}

		return this;
	};

	View.onNewTodoTitleKeydown = function(event) {
		var title = this.$newTodoTitle.val();
		if (event.which === 13 && title) {
			this.collections.todos.add({
				title: title,
				completed: false
			});

			this.$newTodoTitle.val('');
			this.$toggleAll.prop('checked', false);
		}
	};

	View.onClearCompleted = function() {
		var self = this;
		var collection = this.collections.todos;

		var completedTodos = collection.filter(function(model) {
			return model.get('completed');
		});

		var destroyCallback = _.after(completedTodos.length, function() {
			self.updateWrapStyles();
			self.updateList();
			self.updateFooter().render();
		});

		_(completedTodos).each(function(model) {
			model.destroy({
				silent: true,
				success: destroyCallback
			});
		});
	};

	View.onTodoToggle = function() {
		this.updateFooter().render();
		var allCompleted = this.collections.todos.every(function(model) {
			return model.get('completed');
		});
		this.$toggleAll.prop('checked', allCompleted);
	};

	View.onToggleAllChange = function() {
		var completed = this.$toggleAll.prop('checked');
		this.collections.todos.each(function(model) {
			model.set('completed', completed);
		});
		this.updateFooter().render();
	};

	View.onTodosAdd = function(model) {
		this.appendTodoView(model);
		this.updateFooter().render();
		this.updateWrapStyles();
	};

	View.onTodosRemove = function() {
		this.updateWrapStyles();
		this.updateFooter().render();
	};

	return esencia.View.extend(View);
});
