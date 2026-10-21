import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

class SocketManager {
  private socket: Socket | null = null;

  connect(token: string): Socket {
    this.disconnect();

    this.socket = io(API_BASE.replace(/\/api$/, ''), {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected with ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketManager = new SocketManager();
