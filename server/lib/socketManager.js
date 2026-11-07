const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    // Optional JWT verification from handshake auth or query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET || 'pushkarpath-jwt-secret-2027';
        const decoded = jwt.verify(token, secret);
        socket.user = decoded;
        if (decoded.role) {
          socket.join(`role:${decoded.role}`);
        }
        if (decoded.assignment?.lotCode) {
          socket.join(`lot:${decoded.assignment.lotCode}`);
        }
      } catch (err) {
        // Continue as anonymous client
      }
    }

    // Allow clients to join specific rooms (e.g. lot tracking)
    socket.on('join:lot', (lotCode) => {
      if (lotCode && typeof lotCode === 'string') {
        socket.join(`lot:${lotCode.toUpperCase()}`);
      }
    });

    socket.on('leave:lot', (lotCode) => {
      if (lotCode && typeof lotCode === 'string') {
        socket.leave(`lot:${lotCode.toUpperCase()}`);
      }
    });

    socket.on('join:room', (room) => {
      if (room && typeof room === 'string') {
        socket.join(room);
      }
    });

    socket.on('disconnect', () => {
      // Clean up
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet. Call initSocket(server) first.');
  }
  return io;
}

function emitLotUpdate(lot) {
  if (!io) return;
  io.emit('lot:update', lot);
  if (lot && lot.code) {
    io.to(`lot:${lot.code}`).emit('lot:update', lot);
  }
}

function emitLotsChanged() {
  if (!io) return;
  io.emit('lots:changed');
}

function emitGhatsChanged() {
  if (!io) return;
  io.emit('ghats:changed');
}

function emitScanNew(scan) {
  if (!io) return;
  io.emit('scan:new', scan);
  if (scan && scan.lotCode) {
    io.to(`lot:${scan.lotCode}`).emit('scan:new', scan);
  }
}

function emitAuditNew(audit) {
  if (!io) return;
  io.emit('audit:new', audit);
  io.to('role:admin').emit('audit:new', audit);
}

function emitSimTick(data) {
  if (!io) return;
  io.emit('sim:tick', data);
}

module.exports = {
  initSocket,
  getIO,
  emitLotUpdate,
  emitLotsChanged,
  emitGhatsChanged,
  emitScanNew,
  emitAuditNew,
  emitSimTick
};
