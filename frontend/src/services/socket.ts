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
    }
    return socket || mockSocket;
};

export const connectSocket = () => {
    const { token, settings, user } = useAuthStore.getState();
    if (settings?.realTimeSync && token && !socket) {
        socket = io(SOCKET_URL, { auth: { token } });

        // Immediately join personal user room for notifications + transfers
        socket.on('connect', () => {
            if (user?.id) {
                socket?.emit('joinUser', { userId: user.id });
            }
        });
    }
    return socket || mockSocket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
