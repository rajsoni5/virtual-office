function showFloor(floorId) {
  document.querySelectorAll('.floor').forEach(f => f.style.display = 'none');
  document.getElementById(floorId).style.display = 'flex';
}
const socket = io();
const avatar = document.getElementById('avatar');
let isDragging = false;
let currentRoom = null;
const peers = {};
const peer = new Peer(undefined, { host: '/', port: 3000, path: '/peerjs' });
const myAudio = document.createElement('audio');
myAudio.muted = true;
const audioContainer = document.createElement('div');
audioContainer.id = 'audio-container';
document.body.appendChild(audioContainer);
navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
  peer.on('call', call => {
    call.answer(stream);
    const audio = document.createElement('audio');
    call.on('stream', userAudio => addAudioStream(audio, userAudio));
  });
  socket.on('user-in-room', ({ userId, room }) => {
    if (room === currentRoom && !peers[userId]) {
      const call = peer.call(userId, stream);
      const audio = document.createElement('audio');
      call.on('stream', userAudio => addAudioStream(audio, userAudio));
      peers[userId] = call;
    }
  });
});
peer.on('open', id => socket.emit('join-room', id));
function addAudioStream(audio, stream) {
  audio.srcObject = stream;
  audio.addEventListener('loadedmetadata', () => audio.play());
  audioContainer.appendChild(audio);
}
avatar.addEventListener('mousedown', () => isDragging = true);
avatar.ondragstart = e => e.preventDefault();
document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  avatar.style.left = e.pageX + 'px';
  avatar.style.top = e.pageY + 'px';
  socket.emit('avatar-move', { x: e.pageX, y: e.pageY });
  const visibleFloor = document.querySelector('.floor[style*="display: flex"]');
  const rooms = visibleFloor?.querySelectorAll('.room') || [];
  const avatarRect = avatar.getBoundingClientRect();
  let foundRoom = null;
  rooms.forEach(room => {
    const rect = room.getBoundingClientRect();
    const inside =
      avatarRect.left < rect.right &&
      avatarRect.right > rect.left &&
      avatarRect.top < rect.bottom &&
      avatarRect.bottom > rect.top;
    if (inside) foundRoom = room.dataset.room;
  });
  if (foundRoom && foundRoom !== currentRoom) {
    currentRoom = foundRoom;
    socket.emit('entered-room', { room: foundRoom, peerId: peer.id });
  }
});
