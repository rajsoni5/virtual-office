const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Use dynamic port from environment or 3000
const PORT = process.env.PORT || 3000;

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
});

app.use('/peerjs', peerServer);
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (peerId) => {
    socket.broadcast.emit('user-connected', peerId);
  });

  socket.on('avatar-move', (position) => {
    socket.broadcast.emit('avatar-move', position);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
