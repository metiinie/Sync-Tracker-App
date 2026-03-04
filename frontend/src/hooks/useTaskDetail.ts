import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useTaskDetail = (taskId: string) => {
    return useQuery({
        queryKey: ['task', taskId],
        queryFn: async () => {
            const res = await api.get(`/tasks/${taskId}`);
            return res.data;
        },
        enabled: !!taskId
    });
};

export const useTaskTransfers = (taskId: string, status?: string) => {
    return useQuery({
        queryKey: ['task', taskId, 'transfers'],
        queryFn: async () => {
            const res = await api.get(`/tasks/${taskId}/transfers`);
            return res.data;
        },
        enabled: !!taskId
    });
};

export const useTaskComments = (taskId: string) => {
    return useQuery({
        queryKey: ['task', taskId, 'comments'],
        queryFn: async () => {
            const res = await api.get(`/tasks/${taskId}/comments`);
            return res.data;
        },
        enabled: !!taskId
    });
};

export const useTaskMutations = (taskId: string) => {
    const queryClient = useQueryClient();

    const invalidateTask = () => {
        queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const updateSyncState = useMutation({
        mutationFn: (params: { state: string; note: string }) =>
            api.patch(`/tasks/${taskId}/sync`, params),
        onSuccess: invalidateTask
    });

    const logTime = useMutation({
        mutationFn: (params: { durationMinutes: number; description: string }) =>
            api.post(`/tasks/${taskId}/time-logs`, params),
        onSuccess: invalidateTask
    });

    const addMilestone = useMutation({
        mutationFn: (params: { title: string; dueDate: string }) =>
            api.post(`/tasks/${taskId}/milestones`, params),
        onSuccess: invalidateTask
    });

    const updateMilestone = useMutation({
        mutationFn: ({ milestoneId, ...params }: { milestoneId: string; title?: string; isCompleted?: boolean; dueDate?: string }) =>
            api.patch(`/tasks/milestones/${milestoneId}`, params),
        onSuccess: invalidateTask
    });

    const deleteMilestone = useMutation({
        mutationFn: (milestoneId: string) =>
            api.delete(`/tasks/milestones/${milestoneId}`),
        onSuccess: invalidateTask
    });

    const transferTask = useMutation({
        mutationFn: (params: { newOwnerId: string; note?: string }) =>
            api.patch(`/tasks/${taskId}/transfer`, params),
        onSuccess: invalidateTask
    });

    const addComment = useMutation({
        mutationFn: (content: string) =>
            api.post(`/tasks/${taskId}/comments`, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] });
        }
    });

    const deleteComment = useMutation({
        mutationFn: (commentId: string) =>
            api.delete(`/tasks/comments/${commentId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] });
        }
    });

    const nudgeTask = useMutation({
        mutationFn: () => api.post(`/tasks/${taskId}/nudge`),
        onSuccess: invalidateTask
    });

    const editTask = useMutation({
        mutationFn: (data: any) => api.patch(`/tasks/${taskId}`, data),
        onSuccess: invalidateTask
    });

    const deleteTask = useMutation({
        mutationFn: () => api.delete(`/tasks/${taskId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const addParticipant = useMutation({
        mutationFn: (userId: string) => api.post(`/tasks/${taskId}/participants`, { userId, role: 'contributor' }),
        onSuccess: invalidateTask
    });

    const removeParticipant = useMutation({
        mutationFn: (userId: string) => api.delete(`/tasks/${taskId}/participants/${userId}`),
        onSuccess: invalidateTask
    });

    const acceptTask = useMutation({
        mutationFn: () => api.patch(`/tasks/${taskId}/accept`),
        onSuccess: invalidateTask
    });

    return {
        updateSyncState,
        logTime,
        addMilestone,
        updateMilestone,
        deleteMilestone,
        transferTask,
        addComment,
        deleteComment,
        nudgeTask,
        editTask,
        deleteTask,
        addParticipant,
        removeParticipant,
        acceptTask
    };
};

export const useTransferActions = () => {
    const queryClient = useQueryClient();

    const acceptTransfer = useMutation({
        mutationFn: (transferId: string) =>
            api.patch(`/tasks/transfers/${transferId}/accept`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] }); // Invalidate all task details to be safe
        }
    });

    const rejectTransfer = useMutation({
        mutationFn: (transferId: string) =>
            api.patch(`/tasks/transfers/${transferId}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task'] });
        }
    });

    return { acceptTransfer, rejectTransfer };
};

export const useUsers = (searchQuery = '') => {
    return useQuery({
        queryKey: ['users', searchQuery],
        queryFn: async () => {
            const endpoint = searchQuery ? `/users/search?q=${searchQuery}` : '/users';
            const res = await api.get(endpoint);
            return res.data;
        }
    });
};
