var logger 	= require('./log');
var async 	= require('async');
var fs 		= require('fs');

/**
 * @class QueueConsumer
 * 
 * Agent which listens for new messages arriving at a strategy, dispatching 
 * them to a message handler
 * 
 * @param {consumerStrategy}  strategy - An instance of aws-sqs or rabbitmq.
 * @param {WorkerPool} 		  workerPool - Worker pool to actually handle messages.
 *
 * @author Ricardo Massa / Diego Hakamada
 */

//@TODO remover sender
function QueueConsumer (consumerStrategy, workerPool, sender) {
	if (!(this instanceof QueueConsumer))
		return new QueueConsumer(consumerStrategy, workerPool);

	this._consumerStrategy = consumerStrategy;
	this._workerPool = workerPool;
	this._sender = sender;
	this._setupListeners();
}

/**
 * Setup listeners.
 * 
 * @param  {void}
 * @return {void}
 */

QueueConsumer.prototype._setupListeners = function () {
	var self = this;

	var receivingMessage = function (msg) {
		
		if (msg) {
			if (!self._workerPool.isFull()) {
				self._handleMessageResult(new Array(msg));
			} 

			if (self._workerPool.isFull()) {
				logger.debug('QueueConsumer[setupListeners] - pause stream')
				self._consumerStrategy.pause();
			}
		}
	}

	self._consumerStrategy.on('data', receivingMessage);
}

/**
 * Resumes queue consuming.
 * 
 * @return {void}
 */

QueueConsumer.prototype.resume = function () {
	var self = this;
	self._consumerStrategy.startConsuming();
}

/**
 * Handle the message result.
 * 
 * @param  {Array}    msgs - messages
 * @return {void}
 */

QueueConsumer.prototype._handleMessageResult = function (msgs) {
	var self = this;

	if (this._consumerStrategy._options.healthcheckFile) {
		this._touchHealthcheck();
	} else {
		logger.debug('QueueConsumer[handleMessageResult] - No healthcheck file defined - skipping healthcheck touch');
	}

	if (!msgs || msgs.length == 0) {
		logger.info('QueueConsumer[handleMessageResult] - No new messages');
		return;
	}			
	/**
	 * @TODO unit tests for this scenario
	 */
	if (msgs.constructor != Array) {
		logger.warn('QueueConsumer[handleMessageResult] - Unable to process messages object', msgs);
		return;
	}

	logger.info('QueueConsumer[handleMessageResult] - Retrieved ' + msgs.length + ' new messages');
	
	async.each(msgs, 
			function (it, cb) {
				self._processMessage(it, cb)
			},
			function (err) {
				if (err) {
					logger.error('QueueConsumer[handleMessageResult] - Error while processing previous messages:', err.stack || err)	
				} else {
					logger.info('QueueConsumer[handleMessageResult] - Done processing ' + msgs.length + ' messages');
				}

				logger.debug('QueueConsumer[handleMessageResult] - resume stream')
				self._consumerStrategy.resume();
			}
	)	
}

/**
 * Touches healthcheck files so external watchers are able
 * to know the consumer is running.
 * @return {void} 
 */

QueueConsumer.prototype._touchHealthcheck = function () {
	logger.info('QueueConsumer[touchHealthcheck] - Touching healthcheck file');
	var self = this;

	var path = self._consumerStrategy._options.healthcheckFile;

	var exists = fs.existsSync(path);

	if (!exists) {
		logger.info('QueueConsumer[touchHealthcheck] - Creating healthcheck file');
		fs.appendFileSync(path, '');
	}

	fs.utimes(path, new Date(), new Date(), function (err) {
		if (err) {
			logger.error('QueueConsumer[touchHealthcheck] - Error touching healthcheck file', 
					self._consumerStrategy._options.healthcheckFile,
					err.stack || err);
		}
	})
}

/**
 * Dispatches a message to message handler.
 * 
 * @param  {object}    msg - Message to handle.
 * @param  {Function}  cb - Callback.
 * @return {void}
 */

QueueConsumer.prototype._processMessage = function (msg, cb) {
	var self = this;
	logger.info('QueueConsumer[processMessage] - Dispatching message to handler:', self._consumerStrategy.convertMsgToString(msg));

	this._workerPool.process(self._consumerStrategy.convertMsgToString(msg), function (err, result) {
		self._handleProcessResult(err, msg, result, cb);
	})
}

/**
 * Handles the outcome of a message processing operation.
 * 
 * @param  {Error}   err - Error.
 * @param  {object}  msg - The message the operation attempted to process.
 * @param  {object}  result - The result of processing.
 *     @param {boolean}  $return - Whether this message should return to queue.
 * @param  {Function}  cb - Callback.
 * @return {void}       
 */

QueueConsumer.prototype._handleProcessResult = function (err, msg, result, cb) {
	var self = this;

	if (err && this._sender && result && result.update) {
		 	var isSent = this._sender.send(result.update);

		 	if (isSent) {
		 		self._consumerStrategy.nack(msg);
		 	}

		 	cb();
		 	return;
	} else {
		if (err) {
			logger.error('QueueConsumer[handleProcessResult] - Failed to process message:', self._consumerStrategy.convertMsgToString(msg), err.stack || err, 
					'keeping it');

			self._consumerStrategy.nack(msg);

		} else if (result && result.$return) {
			logger.info('QueueConsumer[handleProcessResult] - Keeping message:', self._consumerStrategy.convertMsgToString(msg));
			
			self._consumerStrategy.nack(msg); 
		} else {
			logger.debug('QueueConsumer[handleProcessResult] - Processed message:', self._consumerStrategy.convertMsgToString(msg));
			self._consumerStrategy.ack(msg);
		}

		cb(err);
	}
}

module.exports = QueueConsumer;