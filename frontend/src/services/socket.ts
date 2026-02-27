import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = 'http://192.168.8.182:3000'; // Update with your actual Socket URL

let socket: Socket | null = null;

export const getSocket = () => {
    if (!socket) {
        const token = useAuthStore.getState().token;
        socket = io(SOCKET_URL, {
            auth: { token },
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
