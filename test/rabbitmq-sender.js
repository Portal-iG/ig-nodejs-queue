var AMQPMock            = require('./amqp-mock');
var AMQPConnectorMock   = require('./amqp-connector-mock');
var RabbitmqSender      = require('../lib/rabbitmq-sender');
var sinon               = require('sinon');
var assert              = require('chai').assert;
var path                = require('path');
var options             = require('konfig')({ path: path.resolve('./test/config')}).rabbitmq;

describe('rabbitmq-sender module test suite', function () {

	var message = 'test message';
	

	it('# should send a message to broker', function (done) {

		var amqpMock = new AMQPMock();
		var connector = new AMQPConnectorMock(amqpMock, options);
		var sender = new RabbitmqSender(connector, options);

		sinon.stub(sender, 'send', function () {
			return true;
		})

		connector.on('ready', function () {
			var isSent = sender.send(message);
			assert.ok(isSent, 'sent the message');
			done();
		})
	})

	it('# should send a message and return false', function (done) {

		var amqpMock = new AMQPMock();
		var connector = new AMQPConnectorMock(amqpMock, options);
		var sender = new RabbitmqSender(connector, options);

		sinon.stub(sender, 'send', function () {
			return false;
		})

		connector.on('ready', function () {
			var isSent = sender.send(message);
			assert.notOk(isSent, 'didnt send the message');
			done();
		})
	})
})