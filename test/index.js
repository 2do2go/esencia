'use strict';

require.config({
	paths: {
		jquery: '../node_modules/jquery/dist/jquery.min',
		backbone: '../node_modules/backbone/backbone-min',
		underscore: '../node_modules/underscore/underscore-min',
		chai: '../node_modules/chai/chai',
		esencia: '../dist/esencia'
	}
});

define(function() {
	if (window.initMochaPhantomJS) window.initMochaPhantomJS();

	mocha.ui('bdd');
	mocha.reporter('html');

	require(['view', 'componentsManager'], function() {
		mocha.run();
	});
});
