import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = 'http://192.168.8.182:3000'; // Update with your actual Socket URL

let socket: Socket | null = null;

// Mock socket for when real-time sync is disabled
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
        socket = io(SOCKET_URL, {
            auth: { token },
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

