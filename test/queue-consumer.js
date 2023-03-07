var sinon 				= require('sinon');
var assert 				= require('chai').assert;
var path                = require('path');
var QueueConsumer 		= require('../lib/queue-consumer');
var StrategyMock        = require('./strategy-mock');
var WorkerPoolMock      = require('./worker-pool-mock');
var RabbitmqSenderMock  = require('./rabbitmq-sender-mock');

describe('queue-consume module test suite', function () {

	it('# shoud handle the result without error', function (done) {

		var message = 'test message';
		var strategyMock = new StrategyMock();
		var workerPoolMock = new WorkerPoolMock();
		var queueConsumer = new QueueConsumer(strategyMock, workerPoolMock);
		
		sinon.stub(queueConsumer._consumerStrategy, 'ack', function(msg) {
			assert.equal(msg.toString(), message, 'processed message');
			done();
		})

		strategyMock.push(message);
		
	})

	it('# shoud handle the result with error', function (done) {

		var message = 'test failed to process message';

		var strategyMock = new StrategyMock();
		var workerPoolMock = new WorkerPoolMock();
		var queueConsumer = new QueueConsumer(strategyMock, workerPoolMock);
		
		sinon.stub(queueConsumer._consumerStrategy, 'nack', function(msg) {
			assert.equal(msg.toString(), message, 'processed message with error');
			done();
		})

		sinon.stub(workerPoolMock, 'process', function (msg, callback) {
			callback('Failed to process message');
		})

		strategyMock.push(message);
		
	})

	it('# shoud handle the result to return', function (done) {

		var message = 'test message to return';
		
		var strategyMock = new StrategyMock();
		var workerPoolMock = new WorkerPoolMock();
		var queueConsumer = new QueueConsumer(strategyMock, workerPoolMock);
		
		sinon.stub(queueConsumer._consumerStrategy, 'nack', function(msg) {
			assert.equal(msg.toString(), message, 'processed message and return message');
			done();
		})

		sinon.stub(workerPoolMock, 'process', function (msg, callback) {
			callback(null, { $return : true });
		})

		strategyMock.push(message);
	})

	it('# shoud handle the update result', function (done) {

		var message = 'test message to update';
		
		var strategyMock = new StrategyMock();
		var workerPoolMock = new WorkerPoolMock();
		var senderMock = new RabbitmqSenderMock()
		var queueConsumer = new QueueConsumer(strategyMock, workerPoolMock, senderMock);
		
		sinon.stub(queueConsumer._consumerStrategy, 'nack', function(msg) {
			assert.equal(msg.toString(), message, 'processed message and update message');
			done();
		})

		sinon.stub(queueConsumer._workerPool, 'process', function (msg, callback) {
			callback('Failed to process message', { update : true });
		})

		strategyMock.push(message);
	})
})