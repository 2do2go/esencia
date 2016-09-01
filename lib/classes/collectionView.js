'use strict';

var View = require('./view');
var _ = require('underscore');

var CollectionView = {
	itemView: View,
	views: {
		return _.object(this.itemsContainer, )
	},
	collectionEvents: {
		'add': 'onCollectionAdd',
		'change': 'onCollectionChange',
		'remove': 'onCollectionRemove'
	}
};

CollectionView.onCollectionAdd = function(model) {
	this.appendView(new this.ItemView({model: model}), this.itemsContainer);
	this.render();
};

CollectionView.onCollectionChange = function(model, collection, options) {
	this.getView(this.itemsContainer, options.index);
};

CollectionView.onCollectionRemove = function(model, collection, options) {
	var view = this.getView(this.itemsContainer, options.index);
	view.remove();
};
