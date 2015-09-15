'use strict';

define([
	'underscore', 'esencia/view'
], function(_, ParentView) {
	var View = {
		template: _.template(document.getElementById('tmpl-todos-item').innerHTML),
		events: {
			'dblclick .js-item-title': 'onDblclick',
			'change .js-item-toggle': 'onToggleChange',
			'blur .js-item-input': 'onInputBlur',
			'keydown .js-item-input': 'onInputKeydown',
			'click .js-item-remove': 'onRemoveClick'
		}
	};

	View.initialize = function() {
		var model = this.models.todo;

		this.listenTo(model, 'change:title', function() {
			this.render({force: true});
		});

		this.listenTo(model, 'change:completed', function(model, completed) {
			this.$el[(completed ? 'add' : 'remove') + 'Class']('todos_item__completed');
			this.$toggle.prop('checked', completed);
		});
	};

	View.afterRender = function() {
		this.$input = this.$('.js-item-input');
		this.$toggle = this.$('.js-item-toggle');
	};

	View.getData = function() {
		return {todo: this.models.todo.toJSON()};
	};

	View.startEditing = function() {
		this.$el.addClass('todos_item__editing');
		this.$input.focus().select();
	};

	View.stopEditing = function(title) {
		if (title) {
			this.models.todo.set('title', title);
		}

		this.$el.removeClass('todos_item__editing');
	};

	View.onDblclick = function() {
		if (!this.$el.is('.todos_item__editing')) {
			this.startEditing();
		}
	};

	View.onInputBlur = function() {
		this.stopEditing(this.$input.val());
	};

	View.onInputKeydown = function(event) {
		if (event.which === 13) {
			var title = this.$input.val();
			if (title) {
				this.stopEditing(title);
			}
		} else if (event.which === 27) {
			this.$input.val(this.models.todo.get('title'));
			this.stopEditing();
		}
	};

	View.onRemoveClick = function() {
		this.models.todo.destroy();
	};

	View.onToggleChange = function() {
		var completed = this.$toggle.prop('checked');
		this.models.todo.set('completed', completed);
		this.trigger('toggle', this, completed);
	};

	return ParentView.extend(View);
});
