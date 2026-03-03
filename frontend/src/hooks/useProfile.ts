import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useProfileStats = () => {
    return useQuery({
        queryKey: ['profile', 'stats'],
        queryFn: async () => {
            const res = await api.get('/users/stats');
            return res.data;
        }
    });
};
