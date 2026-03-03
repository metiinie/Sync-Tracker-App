import axios from 'axios';

const API_URL = 'http://192.168.8.182:3000/api/v1'; // Local IP for mobile connectivity

const api = axios.create({
    baseURL: API_URL,
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
