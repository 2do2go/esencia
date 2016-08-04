'use strict';

require.config({
	baseUrl: '.',
	paths: {
		jquery: '../../node_modules/jquery/dist/jquery.min',
		backbone: '../../node_modules/backbone/backbone-min',
		underscore: '../../node_modules/underscore/underscore-min',
		esencia: '../../lib'
	},
	shim: {
		backbone: ['underscore', 'jquery']
	}
});
