var AMQPMock			= require('./amqp-mock');
var RabbitmqStrategy 	= require('../lib/rabbitmq-strategy');
var AMQPConnectorMock   = require('./amqp-connector-mock');
var sinon 				= require('sinon');
var assert 				= require('chai').assert;
var Q 					= require('q');
var path 				= require('path');

describe('rabbitmq-strategy module test suite', function () {
	var options	 = require('konfig')({ path: path.resolve('./test/config')}).rabbitmq;

	it('# should send a message to broker', function (done) {

		var amqpMock = new AMQPMock();
		var connector = new AMQPConnectorMock(amqpMock, options);
		var strategy = new RabbitmqStrategy(connector, options);

		amqpMock.on('createdConn', function (event) {
			amqpMock._conn.on('createdChannel', function (event) {
				amqpMock._conn._ch.on('createConsume', function (event) {
					amqpMock._conn._ch.__send('test message');
				})
			})
		})


		strategy.on('data', function (msg) {
			assert.equal(msg, 'test message', 'receive message');
			done();
		})

		strategy.startConsuming();
	})

	it('# should send a acknowledge to broker', function (done) {

		var amqpMock = new AMQPMock();
		var connector = new AMQPConnectorMock(amqpMock, options);
		var strategy = new RabbitmqStrategy(connector, options);

		amqpMock.on('createdConn', function (event) {
			amqpMock._conn.on('createdChannel', function (event) {
				amqpMock._conn._ch.on('createConsume', function (event) {
					amqpMock._conn._ch.__send({_channelId : 0, content :'test message'});
				})

				amqpMock._conn._ch.on('ack', function (event) {
					done();
				})
			})
		})

		strategy.on('data', function (msg) {
			strategy.ack(msg);
		})

		strategy.startConsuming();
	})

	it('# should send a negative acknowledge to broker', function (done) {

		var amqpMock = new AMQPMock();
		var connector = new AMQPConnectorMock(amqpMock, options);
		var strategy = new RabbitmqStrategy(connector, options);

		amqpMock.on('createdConn', function (event) {
			amqpMock._conn.on('createdChannel', function (event) {
				amqpMock._conn._ch.on('createConsume', function (event) {
					amqpMock._conn._ch.__send({_channelId : 999, content :'test message'});
				})

				amqpMock._conn._ch.on('nack', function (event) {
					done();
				})
			})
		})

		strategy.on('data', function (msg) {
			strategy.nack(msg);
		})

		strategy.startConsuming();
	})
})