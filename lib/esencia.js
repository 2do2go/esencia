'use strict';

var backbone = require('backbone');
var _ = require('underscore');
var Router = require('./classes/router');
var Collection = require('./classes/collection');
var Model = require('./classes/model');
var View = require('./classes/view');
var ComponentsManager = require('./classes/componentsManager');
var componentsManager = require('./utils/componentsManager');
var extend = require('./utils/extend');

var Esencia = exports;

// Allow the `Esencia` object to serve as a global event bus, for folks who
// want global "pubsub" in a convenient place.
_.extend(Esencia, backbone.Events);

// Export some Backbone fields
var backboneFields = ['Events', 'History', 'history'];
_.extend(Esencia, _.pick(backbone, backboneFields));

// Export all Esencia classes
_.extend(Esencia, {
	Router: Router,
	Collection: Collection,
	Model: Model,
	View: View,
	ComponentsManager: ComponentsManager
});

// Export the default Esencia.componentsManager
Esencia.componentsManager = componentsManager;

// Export extend helper for subclassing
Esencia.extend = extend;
