'use strict';

define(['common/base.view'], function(BaseView) {
	var View = {
		template: 'todos-item',
		events: {
			'keydown .js-item-input': 'onInputKeydown',
			'dblclick .js-item-title': 'startEditing',
			'blur .js-item-input': 'stopEditing',
			'change .js-item-toggle': 'toggleCompleted',
			'click .js-item-remove': 'destroyModel'
		},
		ui: {
			input: '.js-item-input',
			toggle: '.js-item-toggle'
		}
	};

	View.getTemplateData = function() {
		return {todo: this.model.toJSON()};
	};

	View.afterAttach = function() {
		if (this.model.get('editing')) this.$ui.input.focus().select();
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

	View.startEditing = function() {
		this.model.set('editing', true);
	};

	View.stopEditing = function() {
		this.model.unset('editing');
	};

	View.toggleCompleted = function() {
		this.model.set('completed', this.$ui.toggle.prop('checked'));
	};

	View.destroyModel = function() {
		this.model.destroy();
	};

	return BaseView.extend(View);
});
