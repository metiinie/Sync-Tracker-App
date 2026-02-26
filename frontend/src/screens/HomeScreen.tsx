import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import TaskItem from '../components/TaskItem';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

const HomeScreen = ({ navigation }: any) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const user = useAuthStore(state => state.user);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchTasks();
        setRefreshing(false);
    };

    useEffect(() => {
        fetchTasks();

        const socket = getSocket();

        socket.on('sync:update', (data) => {
            setTasks(prevTasks => prevTasks.map(t =>
                t.id === data.taskId ? { ...t, syncState: data.syncState } : t
            ));
        });

        return () => {
            socket.off('sync:update');
        };
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <View className="p-6">
                <Text className="text-3xl font-extrabold text-gray-900 mb-2">SyncTracker</Text>
                <Text className="text-gray-500 mb-6">Welcome back, {user?.name}</Text>

                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TaskItem
                            task={item}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                        />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View className="py-20 items-center">
                            <Text className="text-gray-400 font-medium">No accountability tracks found.</Text>
                        </View>
                    }
                />
            </View>

            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                className="absolute bottom-8 right-8 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-xl shadow-blue-300"
            >
                <Text className="text-white text-3xl font-light">+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HomeScreen;
