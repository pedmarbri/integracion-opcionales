'use strict';

var worker = require('./index');

var event = {};
var context = {};
var callback = console.log;

worker.handler(event, context, callback);