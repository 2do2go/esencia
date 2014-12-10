'use strict';

require.config({
	baseUrl: '.',
	paths: {
		jquery: 'http://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min',
		backbone: 'http://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.0.0/backbone-min',
		underscore: 'http://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min',
		chai: 'http://cdnjs.cloudflare.com/ajax/libs/chai/1.10.0/chai.min',
		esencia: '../lib'
	},
	shim: {
		backbone: ['underscore', 'jquery'],
		underscore: {exports: '_'}
	}
});
