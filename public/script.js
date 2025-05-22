// Floor toggle function stays as-is
function showFloor(floorId) {
  document.querySelectorAll('.floor').forEach(f => f.style.display = 'none');
  document.getElementById(floorId).style.display = 'flex';
}

// Connect to Socket.IO
const socket = io();

// Avatar drag logic
const avatar = document.getElementById('avatar');
let isDragging = false;
let hasJoinedVoice = false;

avatar.addEventListener('mousedown', () => {
  isDragging = true;
  console.log('Drag started');
});
avatar.ondragstart = e => e.preventDefault();

document.addEventListener('mouseup', () => {
  isDragging = false;
  console.log('Drag ended');
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    // Move avatar
    avatar.style.left = e.pageX + 'px';
    avatar.style.top = e.pageY + 'px';
    socket.emit('avatar-move', { x: e.pageX, y: e.pageY });

    // Dynamically get the visible discussion area inside the currently visible floor
    const visibleFloor = document.querySelector('.floor[style*="display: flex"]');
    if (!visibleFloor) return;
    const discussionArea = visibleFloor.querySelector('.discussion');
    if (!discussionArea) return;

    // Check intersection
    const avatarRect = avatar.getBoundingClientRect();
    const discussionRect = discussionArea.getBoundingClientRect();

    const inside =
      avatarRect.left < discussionRect.right &&
      avatarRect.right > discussionRect.left &&
      avatarRect.top < discussionRect.bottom &&
      avatarRect.bottom > discussionRect.top;

    if (inside && !hasJoinedVoice) {
      console.log('Joined voice chat in discussion area');
      socket.emit('join-room', peer.id);
      hasJoinedVoice = true;
    } else if (!inside && hasJoinedVoice) {
      hasJoinedVoice = false; // reset so user can join again
      console.log('Left discussion area');
    }
  }
});

// Receive avatar movements from others
socket.on('avatar-update', (data) => {
  let other = document.getElementById(data.id);
  if (!other) {
    other = document.createElement('div');
    other.className = 'avatar';
    other.id = data.id;
    other.innerText = '🧑';
    other.style.position = 'absolute';
    other.style.fontSize = '30px';
    document.body.appendChild(other);
  }
  other.style.left = data.x + 'px';
  other.style.top = data.y + 'px';
});

// Remove avatar on user disconnect
socket.on('user-disconnected', (id) => {
  const otherAvatar = document.getElementById(id);
  if (otherAvatar) otherAvatar.remove();
});

// PeerJS Setup with deployment-friendly config
const peer = new Peer(undefined, {
  host: location.hostname,
  port: location.protocol === 'https:' ? 443 : 80,
  path: '/peerjs',
  secure: location.protocol === 'https:'
});

const myAudio = document.createElement('audio');
myAudio.muted = true;
const audioGrid = document.createElement('div');
audioGrid.id = 'audio-grid';
document.body.appendChild(audioGrid);
audioGrid.appendChild(myAudio);

navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
  addAudioStream(myAudio, stream);

  peer.on('call', call => {
    call.answer(stream);
    const audio = document.createElement('audio');
    call.on('stream', userAudioStream => {
      addAudioStream(audio, userAudioStream);
    });
  });

  socket.on('user-in-discussion', userId => {
    const call = peer.call(userId, stream);
    const audio = document.createElement('audio');
    call.on('stream', userAudioStream => {
      addAudioStream(audio, userAudioStream);
    });
  });
});

peer.on('open', id => {
  socket.emit('join-room', id);
});

function addAudioStream(audio, stream) {
  audio.srcObject = stream;
  audio.addEventListener('loadedmetadata', () => {
    audio.play();
  });
  audioGrid.appendChild(audio);
}
