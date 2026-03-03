import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useTasks = () => {
    return useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await api.get('/tasks');
            return res.data;
        }
    });
};

export const useRecentActivities = (limit = 3) => {
    return useQuery({
        queryKey: ['activities', 'recent', limit],
        queryFn: async () => {
            const res = await api.get(`/activities?limit=${limit}&scope=all`);
            return res.data;
        }
    });
};

export const useUnreadNotificationsCount = () => {
    return useQuery({
        queryKey: ['notifications', 'unread', 'count'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data.filter((n: any) => n.isRead === 'false' || n.isRead === false).length;
        }
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => api.post('/tasks', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });
};

export const useHomeMutations = () => {
    const queryClient = useQueryClient();

    const nudgeTask = useMutation({
        mutationFn: (taskId: string) => api.post(`/tasks/${taskId}/nudge`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const syncParticipant = useMutation({
        mutationFn: (taskId: string) => api.patch(`/tasks/${taskId}/sync-participant`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const globalSync = useMutation({
        mutationFn: () => api.patch('/tasks/sync-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const logTime = useMutation({
        mutationFn: ({ taskId, ...data }: { taskId: string; durationMinutes: number; description?: string }) =>
            api.post(`/tasks/${taskId}/time-logs`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    return { nudgeTask, syncParticipant, globalSync, logTime };
};


