import { io } from 'socket.io-client';
import logger from '../utils/logger';
import config from '../config';

let socket: any = null;

export const initializeSocket = (token: any) => {
  if (!socket) {
    const wsUrl = config.wsUrl;
    logger.info(`Initializing socket connection to ${wsUrl}`);

    socket = io(wsUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      path: '/socket.io',
    });

    socket.on('connect', () => {
      logger.info('Socket connected');
    });

    socket.on('authenticated', () => {
      logger.info('Socket authenticated successfully');
    });

    socket.on('authentication_error', (error: any) => {
      logger.error('Socket authentication failed:', error);
      disconnectSocket();
    });

    socket.on('disconnect', (reason: any) => {
      logger.warn(`Socket disconnected: ${reason}`);
    });

    socket.on('error', (error: any) => {
      logger.error('Socket error:', error);
    });

    socket.on('connect_error', (error: any) => {
      logger.error('Socket connection error:', error);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    logger.warn('Socket not initialized');
    return null;
  }
  return socket;
};

export const emitEvent = (event: any, data: any) => {
  const currentSocket = getSocket();
  logger.info(`Emitting event: ${event}`, data);
  currentSocket.emit(event, data);
};

export const onEvent = (event: any, callback: any) => {
  const currentSocket = getSocket();
  logger.info(`Listening for event: ${event}`);
  currentSocket.on(event, callback);
};

export const offEvent = (event: any, callback: any) => {
  const currentSocket = getSocket();
  logger.info(`Removing listener for event: ${event}`);
  currentSocket.off(event, callback);
};

const socketService = {
  initializeSocket,
  disconnectSocket,
  getSocket,
  emitEvent,
  onEvent,
  offEvent,
};

export default socketService;
