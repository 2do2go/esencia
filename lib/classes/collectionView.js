'use strict';

var View = require('./view');
var _ = require('underscore');

var CollectionView = {};

var collectionEvents = {
	add: '_onCollectionAdd',
	change: '_onCollectionChange',
	remove: '_onCollectionRemove'
};

CollectionView._prepareViews = function() {
	View.prototype._prepareViews.call(this);

	var self = this;
	this.views[this.itemsContainer] = this.collection.map(function(model) {
		return new self.ItemView({model: model});
	});
};

CollectionView._prepareEntityEvents = function() {
	View.prototype._prepareEntityEvents.call(this);

	this._addEntityEvents('collections', collectionEvents);
};

CollectionView._onCollectionAdd = function(model) {
	var index = _.indexOf(this.collection.models, model);
	this.addView(
		new this.ItemView({model: model}),
		this.itemsContainer,
		{at: index}
	);
	this.render({include: this.itemsContainer});
};

CollectionView._onCollectionChange = function(model) {
	var index = _.indexOf(this.collection.models, model);
	var view = this.getView(this.itemsContainer, index);
	view.render();
};

CollectionView._onCollectionRemove = function(model, collection, options) {
	var view = this.getView(this.itemsContainer, options.index);
	view.remove();
};

module.exports = View.extend(CollectionView);
