const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const app = express();
const server = createServer(app);
const io = new Server(server);
const peerServer = ExpressPeerServer(server, { path: '/peerjs' });
app.use('/peerjs', peerServer);
app.use(express.static(__dirname));
io.on('connection', socket => {
  socket.on('join-room', id => socket.peerId = id);
  socket.on('entered-room', ({ room, peerId }) => {
    socket.currentRoom = room;
    io.emit('user-in-room', { userId: peerId, room });
  });
  socket.on('avatar-move', data => {
    socket.broadcast.emit('avatar-update', { id: socket.peerId, ...data });
  });
  socket.on('disconnect', () => {
    io.emit('user-disconnected', socket.peerId);
  });
});
server.listen(10000, () => console.log('Server running on http://localhost:10000'));
