function RabbitmqSenderMock () {}

RabbitmqSenderMock.prototype.send = function (msg) {
	return true;
}

module.exports = RabbitmqSenderMock;