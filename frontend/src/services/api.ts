import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = 'http://10.22.140.80:3000/api/v1'; // Local IP for mobile connectivity

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
