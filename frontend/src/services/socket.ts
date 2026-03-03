import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.8.182:3000';

let socket: Socket | null = null;

const mockSocket = {
    on: () => { },
    off: () => { },
    emit: () => { },
    disconnect: () => { },
    connected: false,
} as any;

const setupSocketListeners = (s: Socket, userId: string) => {
    s.on('connect', () => {
        if (userId) {
            s.emit('joinUser', { userId });
            console.log(`[Socket] Joined personal room: user:${userId}`);
        }
    });

    if (s.connected && userId) {
        s.emit('joinUser', { userId });
        console.log(`[Socket] Re-joined personal room on init: user:${userId}`);
    }
};

export const getSocket = () => {
    return socket || mockSocket;
};

export const connectSocket = (token: string, userId: string) => {
    if (socket) {
        socket.disconnect();
    }
    socket = io(SOCKET_URL, { auth: { token } });
    setupSocketListeners(socket, userId);
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
