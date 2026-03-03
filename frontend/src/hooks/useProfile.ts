import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const useProfileStats = () => {
    return useQuery({
        queryKey: ['profile', 'stats'],
        queryFn: async () => {
            const res = await api.get('/users/stats');
            return res.data;
        }
    });
};

export const useUserSettings = () => {
    return useQuery({
        queryKey: ['userSettings'],
        queryFn: async () => {
            const res = await api.get('/users/settings');
            return res.data;
        }
    });
};

export const useProfileMutations = () => {
    const queryClient = useQueryClient();

    const updateProfile = useMutation({
        mutationFn: async (data: { name: string }) => {
            const res = await api.patch('/users/profile', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
    });

    const updatePassword = useMutation({
        mutationFn: async (password: string) => {
            const res = await api.patch('/users/security/password', { password });
            return res.data;
        }
    });

    const updateUserSettings = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.patch('/users/settings', data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });

            // Handle socket connection
            if (variables.realTimeSync === false) {
                disconnectSocket();
            } else if (variables.realTimeSync === true) {
                connectSocket();
            }
        }
    });

    return { updateProfile, updatePassword, updateUserSettings };
};
