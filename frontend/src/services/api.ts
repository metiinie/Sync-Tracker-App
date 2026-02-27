import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Local IP for mobile connectivity

const API_URL = 'http://192.168.8.182:3000/api/v1';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    // Always pull fresh session directly from Supabase to guarantee validity
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Log first 8 chars of JWT and 8 chars of UID for debugging purposes
    const tokenDisplay = token ? `${token.substring(0, 8)}...` : 'None';
    const userDisplay = session?.user?.id ? `${session.user.id.substring(0, 8)}...` : 'Unknown';

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | Token: ${tokenDisplay} | User: ${userDisplay}`);

    return config;
}, (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized! Redirecting to login...');
            // Trigger global logout to force redirect in App.tsx
            const { logout } = useAuthStore.getState();
            await logout();
        }
        console.error(`API Error [${error.config?.url}]:`, error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
