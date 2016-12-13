'use strict';

define(['esencia'], function(Esencia) {
	var Collection = {};

	Collection.toggle = function(completed) {
		this.each(function(model) {
			model.set('completed', completed);
		});
	};

	Collection.isCompleted = function() {
		return this.every(function(model) {
			return model.get('completed');
		});
	};

	Collection.getCompleted = function() {
		return this.filter(function(model) {
			return model.get('completed');
		});
	};

	return Esencia.Collection.extend(Collection);
});
