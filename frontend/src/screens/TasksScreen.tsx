import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import TaskItem from '../components/TaskItem';
import { Search, Plus, ListFilter, Shield, Users, ArrowLeft } from 'lucide-react-native';

const Filters = [
    { id: 'all', label: 'All' },
    { id: 'owned', label: 'In Sync' }, // Map 'owned' visually to 'In Sync' based on design
    { id: 'assigned', label: 'Blocked' },
    { id: 'participating', label: 'Needs Update' },
    { id: 'pending', label: 'Help Requested' },
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

        // Apply Custom Filtering Logic mapped to the new labels
        switch (activeFilter) {
            case 'owned':
                result = result.filter((t: any) => t.syncState === 'IN_SYNC' || !t.syncState);
                break;
            case 'assigned':
                result = result.filter((t: any) => t.syncState === 'BLOCKED');
                break;
            case 'participating':
                result = result.filter((t: any) => t.syncState === 'NEEDS_UPDATE');
                break;
            case 'pending':
                result = result.filter((t: any) => t.syncState === 'HELP_REQUESTED');
                break;
            default:
                break;
        }

        return result;
    }, [tasks, search, activeFilter]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header Area */}
            <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-100 z-10 shadow-sm">
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4 p-2 -ml-2">
                        <ArrowLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-xl font-black text-gray-900 flex-1">Global Search</Text>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center bg-gray-100/80 rounded-2xl px-4 py-3 border border-gray-200/50 mb-5">
                    <Search size={18} color="#9ca3af" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 text-base py-0"
                        placeholder="Search tasks, owners, or teams..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        autoCorrect={false}
                    />
                </View>

                {/* Filter Chips Container */}
                <View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        {Filters.map((f) => {
                            const isActive = activeFilter === f.id;
                            return (
                                <TouchableOpacity
                                    key={f.id}
                                    onPress={() => setActiveFilter(f.id)}
                                    className={`px-5 py-2 rounded-full mr-2.5 border ${isActive
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'bg-white border-gray-200 shadow-sm'
                                        }`}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center">
                                        {f.label === 'In Sync' && <View className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />}
                                        {f.label === 'Blocked' && <View className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-red-500'}`} />}
                                        {f.label === 'Needs Update' && <View className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-yellow-500'}`} />}
                                        {f.label === 'Help Requested' && <View className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-blue-500'}`} />}

                                        <Text className={`font-bold text-xs ${isActive ? 'text-white' : 'text-gray-600'}`}>
                                            {f.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-6"
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
            >
                <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    Recent Tasks ({filteredTasks.length})
                </Text>

                {filteredTasks.length === 0 ? (
                    <View className="py-20 items-center justify-center bg-white rounded-3xl border border-gray-100 mt-4">
                        <ListFilter size={48} color="#e5e7eb" className="mb-4" />
                        <Text className="text-gray-500 font-bold mb-2 text-center text-lg">No Results Found</Text>
                        <Text className="text-gray-400 font-medium text-center px-10">Adjust your search or filter settings to find what you need.</Text>
                    </View>
                ) : (
                    filteredTasks.map((task: any) => {
                        const myParticipation = task.participants?.find((p: any) => p.userId === user?.id);
                        return (
                            <TaskItem
                                key={task.id}
                                task={task}
                                role={myParticipation?.role}
                                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                            />
                        );
                    })
                )}
            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                onPress={() => navigation.navigate('Tasks', { screen: 'CreateTask' })}
                className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-500/50 z-50"
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default TasksScreen;
