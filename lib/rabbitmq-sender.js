var logger         = require('./log');
var AMQPconnector  = require('./amqp-connector');

/**
 * @class RabbitmqSender
 * 
 * Agent send messages to Rabbitmq.
 * 
 * @param {Opbject}    amqp - a lib of ampq.
 * @param {Opbject}    options - options to send to queue
 *
 * @author Diego Hakamada
 */

function RabbitmqSender (amqpConector, options) {
	if (!(this instanceof RabbitmqSender))
		return new RabbitmqSender(amqpConector, options);

	this._options = RabbitmqSender._normalizeOptions(options);
	this._amqpConector = amqpConector;
	this._amqpConector.createConnect();
}

RabbitmqSender._normalizeOptions = function (options) {
	var opts = options || {};
	return opts;
}

/**
 *  Send message to exchange/queue exist.
 * 
 * @param  {Object}      msg - message to send
 * @return {callback}    callback
 */

RabbitmqSender.prototype.send = function (msg) {
	var self = this;
	
	if (self._amqpConector._channel) {
		logger.info('RabbitmqSender[send] - Sending message:', msg);
		return self._amqpConector._channel.publish(self._options.amqp.mainExchange.name, 
			   self._options.amqp.mainExchange.publish.routingKey, 
			   new Buffer(msg), 
			  self._options.amqp.mainExchange.publish.options)
	} else {
		logger.debug('RabbitmqSender[send] - Channel does not connected - msg:', msg);
		return false;
	}
}

module.exports = RabbitmqSender;