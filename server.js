const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});

app.use('/peerjs', peerServer);
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join-room', (peerId) => {
    socket.peerId = peerId;
  });

  socket.on('entered-room', ({ room, peerId }) => {
    socket.currentRoom = room;
    socket.broadcast.emit('user-in-room', { userId: peerId, room });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
