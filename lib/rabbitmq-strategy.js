var logger          = require('./log');
var util            = require('util');
var Readable        = require('stream').Readable;
var AMQPconnector   = require('./amqp-connector');

//Inherit the prototype methods from Readable to RabbitStrategy
util.inherits(RabbitStrategy, Readable);

/**
 * @class RabbitStrategy
 *
 * Agent (RabbitMQ) which listens for new messages arriving at a queue, 
 * and push to a stream (Readable).
 *
 * @constructor
 * @param {options}  options - Supplied options to consumer.
 *
 * @author Diego Hakamada
 */

function RabbitStrategy (amqpConnector, options) {
	if (!(this instanceof RabbitStrategy))
			return new RabbitStrategy(amqpConnector, options);

	Readable.call(this, { objectMode : true });

	this._asked	= false;
	this._currentChannelId = -1;
	this._options = RabbitStrategy.normalizeOptions(options);
	this._connector = amqpConnector;
	this._setupListenners();
}

/**
 * Fills the optional consumer parameters with default values.
 * 		
 * @param  {object}  options - Supplied options.
 * @return {object}            A complete options object
 */

RabbitStrategy.normalizeOptions = function (options) {
	var opts = options || {};
	return opts;
}

RabbitStrategy.prototype._setupListenners = function () {
	var self = this;

	self._connector.on('ready', function () {
		self._currentChannelId++;
		self._receiving();
	})
}

/**
 * Start connection with AMQP, after that consuming the queue.
 * 		
 * @param  {Function}  handleMessageResult - function responsible to handle message result.
 * @return {void}
 */

RabbitStrategy.prototype.startConsuming = function () {
	var self = this;
	self._connector.createConnect();
}


/**
 * Enter state to receiving.
 * 		
 * @param  {void}
 * @return {void}
 */

RabbitStrategy.prototype._receiving = function () {
	var self = this;

	logger.info('RabbitStrategy[receiving] - Resuming queue consuming...');

    return self._connector._channel.consume(self._options.amqp.mainExchange.queue.name, handleMessage);

	function handleMessage (msg) {
		if(msg) {
			logger.info('RabbitStrategy[receiving] - Receive new message:', (msg && msg.content) ? msg.content.toString() : msg);
			self._asked = false;
			msg._channelId = self._currentChannelId;
			self.push(msg);
		}
	}
}

/**
 * Method implemented of Stream.
 * 		
 * @param  {void}
 * @return {void}
 */

RabbitStrategy.prototype._read = function () {
	this._asked = true;
}

/**
 * Delete mensage from the queue.
 * 		
 * @param {object}      msg - Message to delete.
 * @param  {Function}   callback - Callback.
 * @return {void} 
 */

RabbitStrategy.prototype.ack = function (msg) {

	if (this._connector._channel && msg._channelId == this._currentChannelId) {
		console.log(msg._channelId, this._currentChannelId)
		logger.info('RabbitStrategy[ack] - Sending the acknowledgement message:', this.convertMsgToString(msg));
		this._connector._channel.ack(msg);
	} else {
		logger.warn('RabbitStrategy[ack] - Not possible to send the acknowledgement message:', this.convertMsgToString(msg));
	}
}

/**
 * Requeue mensage in the queue.
 * 		
 * @param  {object}  msg - Message to requeue in the queue.
 * @return {void}
 */

RabbitStrategy.prototype.nack = function (msg) {

	if (this._connector._channel && msg._channelId == this._currentChannelId) {
		logger.info('RabbitStrategy[nack] - Sending the acknowledgement negative message:', this.convertMsgToString(msg));
		//@TODO unit tests for these arguments
		this._connector._channel.nack(msg, false, false);
	} else {
		logger.warn('RabbitStrategy[nack] - Not possible to send the acknowledgement negative message:', this.convertMsgToString(msg));
	}
}

/**
 * Convert a mesage object to string.
 * 	
 * @param {Object} - msg - Object message.
 * return {String}         String message.
 */

RabbitStrategy.prototype.convertMsgToString = function (msg) {
	return (msg && msg.content) ? msg.content.toString() : '';
}

module.exports = RabbitStrategy;