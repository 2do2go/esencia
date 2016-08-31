'use strict';

define(['base.view'], function(BaseView) {
	var View = {
		template: 'todos-item',
		events: {
			'dblclick .js-item-title': 'onDblClick',
			'change .js-item-toggle': 'onToggleChange',
			'blur .js-item-input': 'stopEditing',
			'keydown .js-item-input': 'onInputKeydown',
			'click .js-item-remove': 'onRemoveClick',
		},
		modelEvents: {
			'remove': 'remove',
			'change': 'onTodoChange'
		},
		ui: {
			input: '.js-item-input',
			toggle: '.js-item-toggle'
		}
	};

	View.getTemplateData = function() {
		return {todo: this.model.toJSON()};
	};

	View.stopEditing = function() {
		this.model.unset('editing');
	};

	View.onDblClick = function() {
		if (this.model.get('editing')) return;
		this.model.set('editing', true);
	};

	View.onInputKeydown = function(event) {
		if (event.which === 13) {
			var title = this.$ui.input.val();
			if (title) {
				this.model.set('title', title, {silent: true});
				this.stopEditing();
			}
		} else if (event.which === 27) {
			this.stopEditing();
		}
	};

	View.onRemoveClick = function() {
		this.model.destroy();
	};

	View.onToggleChange = function() {
		this.model.set('completed', this.$ui.toggle.prop('checked'));
	};

	View.onTodoChange = function() {
		this.render({force: true});
		if (this.model.get('editing')) this.$ui.input.focus().select();
	};

	return BaseView.extend(View);
});
