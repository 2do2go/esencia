'use strict';

define(['view'], function() {
	if (window.mochaPhantomJS) {
		mochaPhantomJS.run();
	} else {
		mocha.run();
	}
});
