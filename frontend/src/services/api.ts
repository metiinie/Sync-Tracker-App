import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = 'http://192.168.8.182:3000/api/v1'; // Local IP for mobile connectivity

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized! Token might be expired or invalid.');
        }
        console.error(`API Error [${error.config?.url}]:`, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
