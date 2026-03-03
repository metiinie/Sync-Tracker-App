import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        }
    });
};

export const useNotificationMutations = () => {
    const queryClient = useQueryClient();

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.patch(`/notifications/${id}/read`);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllAsRead = useMutation({
        mutationFn: async (ids: string[]) => {
            // Recommendation: Backend should have a bulk mark-as-read endpoint
            // For now, we follow the existing pattern if bulk isn't available
            await Promise.all(ids.map(id => api.patch(`/notifications/${id}/read`)));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    return { markAsRead, markAllAsRead };
};
