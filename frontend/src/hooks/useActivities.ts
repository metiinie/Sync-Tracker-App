import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useActivities = (scope = 'all', search = '', limit?: number) => {
    return useQuery({
        queryKey: ['activities', scope, search, limit],
        queryFn: async () => {
            let url = `/activities?scope=${scope}`;
            if (search) url += `&search=${search}`;
            if (limit) url += `&limit=${limit}`;
            const res = await api.get(url);
            return res.data;
        },
        placeholderData: (previousData) => previousData, // Smooth transitions during search
    });
};
