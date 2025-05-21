const io = require('socket.io')(3000);
io.on('connection', socket => {
  socket.on('join', room => socket.join(room));
  socket.on('slice', ({ room, precision }) => {
    socket.to(room).emit('wobble', { precision });
  });
});
