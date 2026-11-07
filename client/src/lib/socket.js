import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    const token = sessionStorage.getItem('pushkarpath_token');
    
    socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: token || '',
      },
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected, id:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      // Quietly log without crashing app if server is still starting
      console.warn('[Socket] Connection warning:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }

  return socketInstance;
}

/**
 * Helper to subscribe to socket events with clean unsubscription
 */
export function subscribeSocket(event, callback) {
  const socket = getSocket();
  socket.on(event, callback);

  return () => {
    socket.off(event, callback);
  };
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
