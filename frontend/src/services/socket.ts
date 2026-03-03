import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = 'http://192.168.8.182:3000';

let socket: Socket | null = null;

const mockSocket = {
    on: () => { },
    off: () => { },
    emit: () => { },
    disconnect: () => { },
    connected: false,
} as any;

const setupSocketListeners = (s: Socket) => {
    s.on('connect', () => {
        const { user } = useAuthStore.getState();
        if (user?.id) {
            s.emit('joinUser', { userId: user.id });
            console.log(`[Socket] Joined personal room: user:${user.id}`);
        }
    });

    // Handle existing connection case
    if (s.connected) {
        const { user } = useAuthStore.getState();
        if (user?.id) {
            s.emit('joinUser', { userId: user.id });
            console.log(`[Socket] Re-joined personal room on init: user:${user.id}`);
        }
    }
};

export const getSocket = () => {
    const { token, settings } = useAuthStore.getState();

    if (!settings?.realTimeSync) {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        return mockSocket;
    }

    if (!socket && token) {
        socket = io(SOCKET_URL, { auth: { token } });
        setupSocketListeners(socket);
    }
    return socket || mockSocket;
};

export const connectSocket = () => {
    const { token, settings } = useAuthStore.getState();
    if (settings?.realTimeSync && token && !socket) {
        socket = io(SOCKET_URL, { auth: { token } });
        setupSocketListeners(socket);
    }
    return socket || mockSocket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
