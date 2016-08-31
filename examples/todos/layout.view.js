'use strict';

define([
	'underscore', 'base.view', './todos.collection', './todo.view', './footer.view'
], function(_, BaseView, TodosCollection, TodoView, FooterView) {
	var View = {
		el: '#todos-app',
		collection: TodosCollection,
		events: {
			'keydown #new-todo-title': 'onNewTodoTitleKeydown',
			'change #toggle-all': 'onToggleAllChange',
		},
		viewEvents: {
			'clearCompleted #footer': 'clearCompleted'
		},
		collectionEvents: {
			'add': 'onTodosAdd',
			'update': 'onTodosUpdate',
			'change:completed': 'onTodosUpdate'
		},
		ui: {
			newTodoTitle: '#new-todo-title',
			toggleAll: '#toggle-all',
			todosWrap: '#todos-wrap'
		}
	};

	View.onNewTodoTitleKeydown = function(event) {
		var title = this.$ui.newTodoTitle.val();
		if (event.which === 13 && title) {
			this.collection.add({
				title: title,
				completed: false
			});

			this.$ui.newTodoTitle.val('');
		}
	};

	View.clearCompleted = function() {
		this.collection.remove(this.collection.getCompleted());
	};

	View.onToggleAllChange = function() {
		this.collection.toggle(this.$ui.toggleAll.prop('checked'));
	};

	View.onTodosAdd = function(model) {
		this.appendView(new TodoView({model: model}), '#todos');
		this.render({include: '#todos'});
	};

	View.onTodosUpdate = function() {
		if (this.collection.length) {
			this.$ui.todosWrap.show();
			this.$ui.toggleAll.prop('checked', this.collection.isCompleted());

			this.setView(new FooterView({
				data: {
					totalCount: this.collection.length,
					completedCount: this.collection.getCompleted().length
				}
			}), '#footer');

			this.render({include: '#footer'});
		} else {
			this.$ui.todosWrap.hide();

			var footerView = this.getView('#footer');
			if (footerView) footerView.remove();
		}
	};

	return BaseView.extend(View);
});
