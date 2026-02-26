import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

const TaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore(state => state.user);

    const fetchTask = async () => {
        try {
            const response = await api.get(`/tasks/${taskId}`);
            setTask(response.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        try {
            const response = await api.patch(`/tasks/${taskId}/accept`);
            setTask(response.data);
            Alert.alert('Success', 'You have accepted responsibility for this task.');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to accept task');
        }
    };

    const updateSyncState = async (state: string) => {
        try {
            await api.patch(`/tasks/${taskId}/sync`, { syncState: state });
            setTask({ ...task, syncState: state }); // Optimistic UI for MVP
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update sync state');
        }
    };

    useEffect(() => {
        fetchTask();

        const socket = getSocket();
        socket.emit('joinTask', { taskId });

        socket.on('sync:update', (data) => {
            if (data.taskId === taskId) {
                setTask(prev => ({ ...prev, syncState: data.syncState }));
            }
        });

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('sync:update');
        };
    }, [taskId]);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    if (!task) return null;

    const isOwner = task.responsibleOwner === user?.id;

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6 bg-white border-b border-gray-100">
                <Text className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wider">{task.status}</Text>
                <Text className="text-2xl font-bold text-gray-900 mb-2">{task.title}</Text>
                <Text className="text-gray-600 leading-6">{task.description}</Text>
            </View>

            <View className="p-6">
                <Text className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Responsibility</Text>

                {task.status === 'PENDING' && isOwner ? (
                    <TouchableOpacity
                        className="bg-green-600 p-4 rounded-xl items-center mb-6 shadow-md shadow-green-100"
                        onPress={handleAccept}
                    >
                        <Text className="text-white font-bold text-lg">Accept Responsibility</Text>
                    </TouchableOpacity>
                ) : null}

                <View className="bg-white p-4 rounded-xl border border-gray-100 mb-6">
                    <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-500">Owner</Text>
                        <Text className="font-semibold text-gray-900">{task.responsibleOwnerName || 'Awaiting...'}</Text>
                    </View>
                    <View className="flex-row justify-between">
                        <Text className="text-gray-500">Assigned By</Text>
                        <Text className="font-semibold text-gray-900">{task.assignedByName || 'Admin'}</Text>
                    </View>
                </View>

                <Text className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest">Sync Intelligence</Text>

                <View className="flex-row flex-wrap justify-between">
                    {['IN_SYNC', 'NEEDS_UPDATE', 'BLOCKED', 'HELP_REQUESTED'].map((state) => (
                        <TouchableOpacity
                            key={state}
                            onPress={() => updateSyncState(state)}
                            className={`w-[48%] p-4 rounded-xl mb-3 border ${task.syncState === state
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-100'
                                }`}
                        >
                            <Text className={`font-bold text-center ${task.syncState === state ? 'text-white' : 'text-gray-700'
                                }`}>
                                {state.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    className="mt-6 p-4 rounded-xl border border-red-100 items-center"
                    onPress={() => Alert.alert('MVP', 'Transfer logic in Phase 3')}
                >
                    <Text className="text-red-500 font-bold">Initiate Ownership Transfer</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default TaskDetailScreen;
