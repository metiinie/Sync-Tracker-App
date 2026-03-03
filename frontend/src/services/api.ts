import axios from 'axios';

const API_URL = 'http://192.168.8.182:3000/api/v1'; // Local IP for mobile connectivity

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000, // 10 seconds global timeout
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
