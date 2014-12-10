'use strict';

define([
	'underscore', 'esencia/view', 'views/todos/item', 'views/todos/footer'
], function(_, ParentView, TodosItemView, TodosFooterView) {
	var View = {
		el: '#content',
		template: _.template(document.getElementById('tmpl-todos').innerHTML),
		events: {
			'keydown #new-todo-title': 'onNewTodoTitleKeydown',
			'change #toggle-all': 'onToggleAllChange'
		},
		viewsEvents: {
			'clearCompleted #todos-footer': 'onClearCompleted',
			'toggle #todos': 'onTodoToggle'
		}
	};

	function log(str) {
		if (window.console && window.console.log) {
			console.log('[DEBUG] ' + str);
		}
	}

	View.initialize = function() {
		var self = this;

		this.updateList();

		this.updateFooter();

		var collection = this.collections.todos;

		this.listenTo(collection, 'add', function(model) {
			log('Add item | title: ' + model.get('title'));

			this.appendTodoView(model);

			this.updateFooter();

			this.render();

			this.updateWrapStyles();
		});

		this.listenTo(collection, 'remove', function(model, collection, options) {
			log('Remove item | index: ' + options.index);

			this.updateWrapStyles();

			var view = this.getView('#todos', options.index);
			this.removeTodoView(view);

			this.updateFooter();

			this.render();
		});
	};

	View.getData = function() {
		return {todosCount: this.collections.todos.length};
	};

	View.afterRender = function() {
		this.$newTodoTitle = this.$('#new-todo-title');
		this.$toggleAll = this.$('#toggle-all');
		this.$todosWrap = this.$('#todos-wrap');
	};

	View.appendTodoView = function(model) {
		this.appendView(new TodosItemView({
			models: {todo: model}
		}), '#todos');
	};

	View.removeTodoView = function(view) {
		this.removeView(view, '#todos');
		view.remove();
	};

	View.updateWrapStyles = function() {
		if (this.collections.todos.length) {
			this.$todosWrap.show();
		} else {
			this.$toggleAll.prop('checked', false);
			this.$todosWrap.hide();
		}
	}

	View.updateList = function() {
		log(
			'Update list' +
			' | removed count: ' + this.getViews('#todos').length +
			' | append count: ' + this.collections.todos.length
		);

		var self = this;

		_(this.getViews('#todos')).each(function(view) {
			self.removeTodoView(view);
		});

		this.collections.todos.each(function(model) {
			self.appendTodoView(model);
		});
	};

	View.updateFooter = function() {
		log(
			'Update footer' +
			' | ' + (this.collections.todos.length ? 'show' : 'hide') +
			' | items count: ' + this.collections.todos.length
		);

		if (this.collections.todos.length) {
			this.setView(new TodosFooterView({
				collections: this.collections
			}), '#todos-footer');
		} else {
			var view = this.getView('#todos-footer');
			if (view) {
				this.removeView(view, '#todos-footer');
				view.remove();
			}
		}
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
			log('Clear completed | completed count: ' + completedTodos.length);

			self.updateWrapStyles();
			self.updateList();
			self.updateFooter();
			self.render();
		});

		_(completedTodos).each(function(model) {
			model.destroy({
				silent: true,
				success: destroyCallback
			});
		});
	};

	View.onTodoToggle = function(view, completed) {
		log(
			'Toggle item' +
			' | index: ' + view.$el.index() +
			' | completed: ' + completed
		);

		this.updateFooter();
		this.render();

		var allCompleted = this.collections.todos.every(function(model) {
			return model.get('completed');
		});
		this.$toggleAll.prop('checked', allCompleted);
	};

	View.onToggleAllChange = function() {
		log('Toggle all | completed: ' + this.$toggleAll.prop('checked'));

		var completed = this.$toggleAll.prop('checked');
		this.collections.todos.each(function(model) {
			model.set('completed', completed);
		});

		this.updateFooter();
		this.render();
	};

	return ParentView.extend(View);
});
