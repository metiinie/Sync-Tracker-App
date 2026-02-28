import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Search, Plus, Filter, CheckCircle2, AlertCircle, Clock, UserCheck, Users } from 'lucide-react-native';

const Filters = [
    { id: 'all', label: 'All', icon: Filter },
    { id: 'owned', label: 'Owned', icon: UserCheck },
    { id: 'assigned', label: 'Assigned By Me', icon: CheckCircle2 },
    { id: 'participating', label: 'Participating', icon: Users },
    { id: 'pending', label: 'Pending Acceptance', icon: Clock },
];

const TasksScreen = ({ navigation }: any) => {
    const { token, user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const { data: tasks = [], isLoading, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await api.get('/tasks');
            return res.data;
        },
        enabled: !!token,
    });

    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Apply Search
        if (search) {
            result = result.filter((t: any) =>
                t.title.toLowerCase().includes(search.toLowerCase()) ||
                t.description?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply Category Filter
        switch (activeFilter) {
            case 'owned':
                result = result.filter((t: any) => t.responsibleOwner === user?.id && t.status !== 'PENDING');
                break;
            case 'assigned':
                result = result.filter((t: any) => t.assignedBy === user?.id && t.responsibleOwner !== user?.id);
                break;
            case 'participating':
                result = result.filter((t: any) =>
                    t.responsibleOwner !== user?.id &&
                    t.assignedBy !== user?.id
                );
                break;
            case 'pending':
                result = result.filter((t: any) => t.responsibleOwner === user?.id && t.status === 'PENDING');
                break;
            default:
                break;
        }

        return result;
    }, [tasks, search, activeFilter, user?.id]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-3xl font-bold text-gray-900 mb-1">My Tasks</Text>
                <Text className="text-gray-500 mb-6 font-medium">System Engine & Structure</Text>

                {/* Search Bar */}
                <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-3 mb-6 border border-gray-200/50">
                    <Search size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 text-base"
                        placeholder="Search by title..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                    contentContainerStyle={{ paddingRight: 20 }}
                >
                    {Filters.map((f) => {
                        const Icon = f.icon;
                        const isActive = activeFilter === f.id;
                        return (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setActiveFilter(f.id)}
                                className={`flex-row items-center px-4 py-2.5 rounded-full mr-3 border ${isActive ? 'bg-black border-black' : 'bg-white border-gray-200'
                                    }`}
                            >
                                <Icon size={16} color={isActive ? '#fff' : '#6b7280'} />
                                <Text className={`ml-2 font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} />
                }
            >
                {filteredTasks.length === 0 ? (
                    <View className="py-20 items-center justify-center">
                        <AlertCircle size={48} color="#e5e7eb" className="mb-4" />
                        <Text className="text-gray-400 font-medium">No tasks found</Text>
                    </View>
                ) : (
                    filteredTasks.map((task: any) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                        />
                    ))
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                className="absolute bottom-28 right-6 w-16 h-16 bg-black rounded-full items-center justify-center shadow-xl shadow-black/40"
            >
                <Plus size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default TasksScreen;
