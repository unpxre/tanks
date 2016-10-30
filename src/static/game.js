
var socket = io.connect(document.domain);

socket.on('connect', function () {
    sessionId = socket.io.engine.id;
    console.log('Connected ' + sessionId);
    socket.emit('joinToGame', {});
});

socket.on('error', function (reason) {
   console.log('Unable to connect to server', reason);
});

socket.on('joinedToGame', function (data) {
   console.log('Joined to game', data);
});
