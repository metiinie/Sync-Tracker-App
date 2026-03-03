import { useQuery } from '@tanstack/react-query';
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

export const useWorkspaceSettings = () => {
    return useQuery({
        queryKey: ['workspace', 'settings'],
        queryFn: async () => {
            const res = await api.get('/workspace/settings');
            return res.data;
        }
    });
};
