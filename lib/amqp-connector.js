var async 			= require('async');
var logger 			= require('./log');
var EventEmitter    = require('events').EventEmitter;
var util 			= require('util');

function AMQPConnector (amqp, options) {
	if (!(this instanceof AMQPConnector))
		return new AMQPConnector(amqp, options);

	EventEmitter.call(this);

	this._options = AMQPConnector.normalizeOptions(options);
	this._amqp = amqp;
	this._conn = null;
	this._channel = null;
	this._timer = null;
	this._isReconnecting = false;
}

//Inherit the prototype methods from EventsEmitter to AMQPConnector
util.inherits(AMQPConnector, EventEmitter);


AMQPConnector.normalizeOptions = function (options) {
	var opts = options || {};
	opts.amqp.backoffTime = opts.amqp.backoffTime || 120000;
	opts.amqp.channelTimeout = opts.amqp.channelTimeout || 120000;
	return opts;
}

/**
 * Create connection.
 * 		
 * @param  {void}
 * @return {void}
 */

AMQPConnector.prototype.createConnect = function () {
	var self = this;

	if(!self._conn) {

		self._amqp.connect(self._options.amqp.host).then(function (conn) {
			logger.debug('AMQPConnector[createConnect] - Connected AMQP');

			self._conn = conn;
			self._isReconnecting = false;

			clearTimeout(self._timer);

			conn.on('close', function () {
				logger.warn('AMQPConnector[createConnect] - Close connection')
			})

			conn.on('error', function (err) {
	    	  self._conn = null;
	          logger.error('AMQPConnector[createConnect] - Error in connection:', ( err && err.stack ) ? err.stack : err);
	          self._handleConnectionError();
			})

		}).then(function () {
			self._createChannel();
		}, function (err) {
			logger.error('AMQPConnector[createConnect] - Connect failed:', ( err && err.stack ) ? err.stack : err);
			if (!self._conn) {
				self._handleConnectionError();
			}
		})
	} else {
		if (!self._channel)
			self._createChannel();
	}
}

/**
 * Create channel with AMQP.
 * 		
 * @param  {object}	 conn - connection.
 * @return {object}	 ok   - promise object.
 */

AMQPConnector.prototype._createChannel = function () {

	var self = this;

	try {
		self._conn.createChannel().then(function (ch) {

			logger.debug('AMQPConnector[createChannel] - Created channel');

			self._channel = ch;

			ch.on('error', function (err) {
				logger.error('AMQPConnector[createChannel] - Error in channel:', err);
			});

			ch.on('close', function () {
				logger.warn('AMQPConnector[createChannel] - Close channel');
				self._channel = null;
				
				if(self._conn) {
					setTimeout(function () {
						self._createChannel();
					}, self._options.amqp.channelTimeout);
				}
			});

			ch.on('blocked', function (reason) {
				logger.warn('AMQPConnector[createChannel] - Blocked channel:', reason);
			});

			ch.on('unblocked', function () {
				logger.warn('AMQPConnector[createChannel] - Unblocked channel');
			});

			ch.checkExchange(self._options.amqp.mainExchange.name)
			.then(function() {
	        	return ch.checkQueue(self._options.amqp.mainExchange.queue.name);
	        }).then(function () {
	        	return self._channel.bindQueue(self._options.amqp.mainExchange.queue.name, 
					                		   self._options.amqp.mainExchange.name, 
					                		   self._options.amqp.mainExchange.queue.pattern);
			}).then(function () {
				return self._channel.prefetch(self._options.amqp.maxPerFetch);

	        }).then(function() {
	        	logger.info('AMQPConnector[createChannel] - Ready');
	        	self.emit('ready');
	        }, function (rejected) {
	        	logger.debug('AMQPConnector[createChannel] - Rejected in channel:', rejected);
	        	setTimeout(function () {
					self._createChannel();
				}, self._options.amqp.channelTimeout);
	        });
		})
	} catch (err) {
		logger.error('AMQPConnector[createChannel] - Error to create channel:', ( err && err.stack ) ? err.stack : err);
		if (self._conn) {
			setTimeout(function () {
				self._createChannel();
			}, self._options.amqp.channelTimeout);			
		}
	}
}

/**
 * Handle connection errors of connection and channel.
 * Whether autoReconnect is true, then attemps to reconnect.
 * 		
 * @param  {Error}  error - Error.
 * @return {void}
 */

AMQPConnector.prototype._handleConnectionError = function () {
	var self = this;

	if (!self._isReconnecting && self._options.amqp.autoReconnect) {
		logger.warn('AMQPConnector[handleConnectionError] - Reconnect with amqp');

		self._isReconnecting = true;

		self._timer = setInterval( function () {
			self.createConnect();
		}, self._options.amqp.backoffTime);
 	}
}

module.exports = AMQPConnector;