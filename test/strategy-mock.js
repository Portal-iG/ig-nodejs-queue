var util     = require('util');
var Readable = require('stream').Readable;	

function StrategyMock () { 
	Readable.apply(this, arguments);
	this._options = {};
}

util.inherits(StrategyMock, Readable);

StrategyMock.prototype.startConsuming = function () {}

StrategyMock.prototype._read = function () {}

StrategyMock.prototype.convertMsgToString = function (msg) { return msg.toString()}

StrategyMock.prototype.nack = function (msg) {}

StrategyMock.prototype.ack = function (msg) {}

module.exports = StrategyMock;