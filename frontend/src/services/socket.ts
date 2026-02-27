import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const API_BASE = 'http://192.168.8.182:3000'; // Match your API URL
const SOCKET_URL = API_BASE;

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
