'use strict';

define(['common/base.view'], function(BaseView) {
	return BaseView.extend({
		template: 'posts',
		getTemplateData: function() {
			return {posts: this.collection.toJSON()};
		}
	});
});
