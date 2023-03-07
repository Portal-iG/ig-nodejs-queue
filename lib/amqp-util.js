var async 	= require('async');
var logger 	= require('./log');

function AMQPUtil (amqp, options) {
	this._options = options;
	this._amqp = amqp;
	this._conn = null;
	this._channel = null;
	this._exchanges = null;
}

AMQPUtil.prototype._createConnect = function (callback) {
	var self = this;

	if(!self._conn) {

		this._amqp.connect(this._options.host).then(function (conn) {
			logger.info('AMQPUtil[createConnect] - Connected AMQP');

			self._conn = conn;

			conn.on('close', function () {
				logger.info('AMQPUtil[createConnect] - Close connection')
				self._conn = null;
			})

			conn.on('error', function (reason) {
				logger.info('AMQPUtil[createConnect] - Error connection', reason);
				callback(reason);
				return;
			})

			callback(null, conn);
		}).then(null, function (rejected) {
			callback(rejected);
			return;
		})
	} else {
		callback();
	}
}

AMQPUtil.prototype._createChannel = function (callback) {

	var self = this;

	var create = function (createChannel) {
		createChannel.then(function (ch) {
			logger.info('AMQPUtil[createChannel] - Created channel');
			self._channel = ch;

			ch.on('error', function(reason) {
				logger.warn('RabbitmqSender[createChannel] - Error:', reason);
				callback(reason);
			})

			ch.on('close', function() {
				logger.warn('AMQPUtil[createChannel] - Close channel');
				self._channel = null;
			})

			callback();
		})
	}

	if (!self._conn){
		self._createConnect(function (err) {

			if(err) {
				callback(err);
				return;
			}
			create(self._conn.createChannel());
		});

	} else {
		if(!self._channel){
			create(self._conn.createChannel());
		}
		else 
			callback();
	}
}

AMQPUtil.prototype.configureExchange = function (callback) {

	var self = this;
	this._exchanges = self._options.amqp.exchanges;
	var exchange = self._exchanges.pop();

	if(!exchange) {
		logger.info('AMQPUtil[configureExchanges] - Close connection');
		if(self._channel)
			self._channel.close();
		self._conn.close();
		callback();
		return;
	} else {
		
		self._createChannel(function (err, result) {

			if(err) {
				callback(err);
				return;
			}
			
			self._channel.assertExchange(exchange.name, 
	    						 exchange.type,
	    						 exchange.options)
			.then(function() {
	            return self._channel.assertQueue(exchange.queue.name, 
		            					  exchange.queue.options)
	        }).then(function() {
				return self._channel.bindQueue(exchange.queue.name, 
					                exchange.name, exchange.queue.pattern);

			}).then(function (resolve) {
				logger.info('AMQPUtil[configureExchange] - Configured exchange:', exchange.name)
				self.configureExchange(callback);
			}, function (reject) {
				logger.warn('AMQPUtil[configureExchange] - Not possible to configure exchange:', exchange.name)
				self.configureExchange(callback);
			})
		})
	}
}

module.exports = AMQPUtil;