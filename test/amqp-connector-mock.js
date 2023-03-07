var util 			= require('util')
var EventEmitter 	= require('events').EventEmitter;
var Q 				= require('q');

function AMQPConnectorMock (amqp, options) {
	EventEmitter.apply(this, arguments);
	this._amqp = amqp;
}

//Inherit the prototype methods from EventsEmitter to AMQPConnector
util.inherits(AMQPConnectorMock, EventEmitter);

AMQPConnectorMock.prototype.createConnect = function () {
	var self = this;

	self._amqp.connect().then(function (conn) {
		self._conn = conn;
		self._createChannel();
	})
}

AMQPConnectorMock.prototype._createChannel = function () {
	var self = this;

	self._amqp._conn.createChannel().then(function (ch) {
		self._channel = ch;
		self.emit('ready');	
	})
}

AMQPConnectorMock.prototype._handleConnectionError = function () {}

module.exports = AMQPConnectorMock;