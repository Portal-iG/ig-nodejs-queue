function WorkerPoolMock () {}

WorkerPoolMock.prototype.isFull = function () { return false}

WorkerPoolMock.prototype.process = function (msg, callback) { callback()}

module.exports = WorkerPoolMock;