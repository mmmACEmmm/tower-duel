const socket = io();
export function joinRoom(id) {
  socket.emit('join', id);
}
export function sendSlice(room, precision) {
  socket.emit('slice', { room, precision });
}
export function onWobble(cb) {
  socket.on('wobble', data => cb(data.precision));
}
