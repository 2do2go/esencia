'use strict';

define(['esencia'], function(Esencia) {
	var Collection = {
		url: 'http://jsonplaceholder.typicode.com/users'
	};

	return Esencia.Collection.extend(Collection);
});
