const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, { path: '/peerjs' });

app.use('/peerjs', peerServer);
app.use(express.static('public'));

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const users = {};      // socketId -> { peerId, room }
const rooms = {};      // roomName -> Set of peerIds

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);

  socket.on('join-room', peerId => {
    users[socket.id] = { peerId, room: null };
    console.log(`User joined with peer ID: ${peerId}`);
  });

  socket.on('avatar-move', pos => {
    if (!users[socket.id]) return;
    io.emit('avatar-update', { id: users[socket.id].peerId, x: pos.x, y: pos.y });
  });

  socket.on('update-room', newRoom => {
    if (!users[socket.id]) return;

    const user = users[socket.id];

    // Remove from old room
    if (user.room && rooms[user.room]) {
      rooms[user.room].delete(user.peerId);
      if (rooms[user.room].size === 0) {
        delete rooms[user.room];
      }
    }

    user.room = newRoom;

    // Add to new room
    if (!rooms[newRoom]) {
      rooms[newRoom] = new Set();
    }
    rooms[newRoom].add(user.peerId);

    // Notify everyone in the same room with peer IDs present
    io.to(socket.id).emit('users-in-room', Array.from(rooms[newRoom]));
  });

  socket.on('disconnect', () => {
    if (!users[socket.id]) return;
    const user = users[socket.id];

    if (user.room && rooms[user.room]) {
      rooms[user.room].delete(user.peerId);
      if (rooms[user.room].size === 0) {
        delete rooms[user.room];
      }
    }

    io.emit('user-disconnected', user.peerId);
    delete users[socket.id];
  });
});
