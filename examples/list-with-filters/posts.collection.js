'use strict';

define(['esencia'], function(Esencia) {
	var Collection = {
		url: 'http://jsonplaceholder.typicode.com/posts'
	};

	return Esencia.Collection.extend(Collection);
});
