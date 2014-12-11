'use strict';

var cdnjsPath = 'http://cdnjs.cloudflare.com/ajax/libs/';

require.config({
	baseUrl: '.',
	paths: {
		jquery: cdnjsPath + 'jquery/1.11.1/jquery.min',
		backbone: cdnjsPath + 'backbone.js/1.0.0/backbone-min',
		underscore: cdnjsPath + 'underscore.js/1.5.2/underscore-min',
		esencia: '../../lib'
	},
	shim: {
		backbone: ['underscore', 'jquery'],
		underscore: {exports: '_'}
	}
});
