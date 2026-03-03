import axios from 'axios';
import { API_BASE_URL } from '../config/apiConfig';

const api = axios.create({
    baseURL: API_BASE_URL,
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
