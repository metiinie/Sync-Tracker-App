import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useWorkspaceSettings = () => {
    return useQuery({
        queryKey: ['workspace', 'settings'],
        queryFn: async () => {
            const res = await api.get('/workspace/settings');
            return res.data;
        }
    });
};

export const useWorkspaceMutations = () => {
    const queryClient = useQueryClient();

    const updateSettings = useMutation({
        mutationFn: async (data: {
            staleThresholdHours?: number | string;
            allowResponsibilityTransfer?: boolean;
            enableHelperRole?: boolean;
        }) => {
            const res = await api.patch('/workspace/settings', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace', 'settings'] });
        }
    });

    return { updateSettings };
};
