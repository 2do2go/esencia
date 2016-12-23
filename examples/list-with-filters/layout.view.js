'use strict';

define([
	'esencia', 'underscore', 'qs',
	'users.collection', 'posts.collection',
	'common/base.view', 'query.view', 'select.view', 'posts.view', 'preloader.view'
], function(
	Esencia, _, qs,
	UsersCollection, PostsCollection,
	BaseView, SearchView, SelectView, PostsView, PreloaderView
) {
	return BaseView.extend({
		template: 'layout',
		initialize: function() {
			var self = this;

			this.setView(new SearchView({
				data: {name: 'query'}
			}), '#query');

			this.setView(new SelectView({
				data: {
					items: {
						id: 'id',
						title: 'title',
						body: 'body'
					},
					name: 'sort'
				}
			}), '#sort');

			var usersWait = this.wait();
			this.collections.users = new UsersCollection();
			this.collections.users.fetch({success: function(collection) {
				self.setView(new SelectView({
					data: {
						items: _.object(collection.pluck('id'), collection.pluck('name')),
						name: 'user'
					}
				}), '#user');

				usersWait();
			}});

			this.collections.posts = new PostsCollection();
		},
		viewEvents: {
			'change #query,#user,#sort': 'onFiltersChange'
		},
		onFiltersChange: function() {
			var filters = {
				q: this.getView('#query').getValue(),
				userId: this.getView('#user').getValue(),
				_sort: this.getView('#sort').getValue()
			};

			Esencia.history.navigate('?' + qs.stringify(filters), {trigger: true});
		},
		_update: function(state) {
			var self = this;

			var query = _(qs.parse(state.data.query || '')).defaults({
				q: '',
				userId: this.collections.users.first().id,
				_sort: 'id',
				_expand: 'user'
			});

			this.getView('#query').update({
				data: {value: query.q}
			});

			this.getView('#user').update({
				data: {value: query.userId}
			});

			this.getView('#sort').update({
				data: {value: query._sort}
			});

			this.setView(new PreloaderView(), '#posts');

			var postsWait = this.wait();
			this.collections.posts.fetch({
				data: query,
				reset: true,
				success: function(collection) {
					self.setView(new PostsView({
						collection: collection
					}), '#posts');

					postsWait();
				}
			});
		}
	});
});
