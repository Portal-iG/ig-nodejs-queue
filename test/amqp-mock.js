var util 			= require('util')
var EventEmitter 	= require('events').EventEmitter;
var Q 				= require('q');

function AMQPMock () {
	EventEmitter.apply(this, arguments);
}

util.inherits(AMQPMock, EventEmitter);

AMQPMock.prototype.connect = function () {
	this._conn = new ConnMock();
	this.emit('createdConn', {_conn : this._conn})
	return Q(this._conn);
}

function ConnMock () {
	EventEmitter.apply(this, arguments);
}

util.inherits(ConnMock, EventEmitter);

ConnMock.prototype.__forceDisconnect = function () {
	this.emit('error');
}

ConnMock.prototype.createChannel = function() {
	this._ch = new ChannelMock()
	this.emit('createdChannel', {_channel : this._ch})
	return Q(this._ch)
};

ConnMock.prototype.close = function () {

}

function ChannelMock () {
	EventEmitter.apply(this, arguments);
}

util.inherits(ChannelMock, EventEmitter);

ChannelMock.prototype.assertExchange = function () { return Q() }
ChannelMock.prototype.assertQueue = function () { return Q()}
ChannelMock.prototype.bindQueue = function () { return Q()}
ChannelMock.prototype.checkExchange = function (exchange) { return Q()}
ChannelMock.prototype.checkQueue = function (queue) { return Q()}

ChannelMock.prototype.publish = function (exchange, routingKey, message, options) {
	this.emit('publish', { message : message});
	return Q();
}


ChannelMock.prototype.prefetch = function () { return Q() }
ChannelMock.prototype.consume = function (queue, handlerFn) {
	this._handlerFn = handlerFn;
	this.emit('createConsume');
	return Q();
}
ChannelMock.prototype.__send = function (msg) {
	this._handlerFn(msg);
}

ChannelMock.prototype.close = function () { return Q() }

ChannelMock.prototype.ack = function (msg) {
	this.emit('ack');
}

ChannelMock.prototype.nack = function (msg, allUpTo, requeue) { this.emit('nack') }

module.exports = AMQPMock;