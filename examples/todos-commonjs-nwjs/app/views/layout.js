'use strict';

var _ = require('underscore'),
	ParentView = require('../../../../esencia').View;


var View = {
	el: '#app',
	template: _.template(document.getElementById('tmpl-layout').innerHTML)
};

module.exports = ParentView.extend(View);

