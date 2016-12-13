'use strict';

define([
	'esencia', 'common/utils', 'todos.collection', 'todo.view', 'footer.view'
], function(Esencia, utils, TodosCollection, TodoView, FooterView) {
	var View = {
		el: '#todos-app',
		collection: TodosCollection,
		ItemView: TodoView,
		itemsContainer: '#todos',
		events: {
			'keydown #new-todo-title': 'onNewTodoTitleKeydown',
			'change #toggle-all': 'toggleCompleted',
		},
		viewEvents: {
			'clearCompleted #footer': 'clearCompleted'
		},
		collectionEvents: {
			'update': 'updateTodos',
			'change:completed': 'updateTodos'
		},
		ui: {
			newTodoTitle: '#new-todo-title',
			toggleAll: '#toggle-all',
			todosWrap: '#todos-wrap'
		}
	};

	View.renderTemplate = function(template, data) {
		return utils.render(template, data);
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

	View.toggleCompleted = function() {
		this.collection.toggle(this.$ui.toggleAll.prop('checked'));
	};

	View.updateTodos = function() {
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

	return Esencia.CollectionView.extend(View);
});
