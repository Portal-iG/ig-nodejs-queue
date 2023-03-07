var cluster = require('cluster');

function WorkerTest() {

	if(cluster.worker){
		cluster.worker.on('disconnect', function (msg) {
			console.info('Worker Desconectado');
		})
		
		process.on('message', this.processMessage);

		process.send({ event: 'ready' });
	}
}

WorkerTest.prototype.processMessage = function (msg) {
		var self = this;
		var messageJson = JSON.parse(msg);

		console.log('Worker Mensagem recebida %s - %s', msg, messageJson.action);

		if (messageJson.action == 'resume') {
			/*
			 * Instructs this worker to process the received message
			 */ 
			run(msg);

		} else if (messageJson.action == 'return') {
			/*
			 * Instructs this worker to return the received message to the queue
			 */ 
			returnToQueue(msg);

		} else if (messageJson.action == 'fail') {
			/*
			 * Instructs this worker to return the received message to the queue
			 */ 
			fail(msg);

		} else if (messageJson.action == 'throw') {
			/* 
			 * Instructs this worker to crash
			 */
			throw new Error('Worker throw test')

		} else {
			run(msg);
		}
}

function run (message) {
	var messageJson = JSON.parse(message);
	

	setTimeout (function () {
		process.send({
			event: 'done',
			error: null, 
			original: message, 
			result: message
		});
	}, messageJson.timeout)
}

function fail (message) {
	process.send({
		event: 'done', 
		error: { message: 'Worker error test' }, 
		original: message
	})
}

function returnToQueue (message) {
	process.send({
		event: 'done', 
		error: null, 
		original: message, 
		result: { $return: true }
	})
}

module.exports = new WorkerTest();