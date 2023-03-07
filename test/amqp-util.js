var AMQPMock 			= require('./amqp-mock');
var sinon 				= require('sinon');
var assert 				= require('chai').assert;
var AMQPUtil 		    = require('../lib/amqp-util');
var path              	= require('path');

describe('amqplib-util module test suite', function () {
	
	var options = require('konfig')({ path: path.resolve('./test/config')}).rabbitmq;

	it('# should configure the exchanges', function (done) {
		var amqpMock = new AMQPMock();
		var amqpUtil = new AMQPUtil(amqpMock, options);

		amqpUtil.configureExchange(function (err) {
			assert.isUndefined(err);
			done();
		})
	})
})