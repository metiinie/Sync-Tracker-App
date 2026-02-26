import React, { useState, useMemo } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Search, Filter, Users, Shield, Clock, AlertCircle } from 'lucide-react-native';
import TaskItem from '../components/TaskItem';

const AdminTasksScreen = ({ navigation }: any) => {
    const [search, setSearch] = useState('');
    const [activeStatus, setActiveStatus] = useState<string | null>(null);
    const [activeSync, setActiveSync] = useState<string | null>(null);

    const { data: tasks = [], isLoading, refetch } = useQuery({
        queryKey: ['adminAllTasks', activeStatus, activeSync, search],
        queryFn: async () => {
            const params: any = {};
            if (activeStatus) params.status = activeStatus;
            if (activeSync) params.syncState = activeSync;
            if (search) params.search = search;

            const res = await api.get('/admin/tasks', { params });
            return res.data;
        }
    });

    const onRefresh = async () => {
        await refetch();
    };

    const StatusFilters = [
        { id: 'PENDING', label: 'Pending' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'COMPLETED', label: 'Done' },
        { id: 'FROZEN', label: 'Frozen' },
    ];

    const SyncFilters = [
        { id: 'IN_SYNC', label: 'In Sync', color: '#10b981' },
        { id: 'NEEDS_UPDATE', label: 'Needs Update', color: '#f59e0b' },
        { id: 'BLOCKED', label: 'Blocked', color: '#ef4444' },
        { id: 'HELP_REQUESTED', label: 'Help!', color: '#3b82f6' },
    ];

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-3xl font-black text-gray-900">Task Oversight</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest italic">Workspace Inventory</Text>

                {/* Search */}
                <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mt-6 border border-gray-100">
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 text-sm font-medium"
                        placeholder="Search workspace..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Horizontal Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 pb-2">
                    <TouchableOpacity
                        onPress={() => { setActiveStatus(null); setActiveSync(null); }}
                        className={`px-4 py-2 rounded-full mr-2 border ${!activeStatus && !activeSync ? 'bg-black border-black' : 'bg-white border-gray-100'}`}
                    >
                        <Text className={`text-xs font-black ${!activeStatus && !activeSync ? 'text-white' : 'text-gray-400'}`}>ALL</Text>
                    </TouchableOpacity>

                    {StatusFilters.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            onPress={() => setActiveStatus(activeStatus === f.id ? null : f.id)}
                            className={`px-4 py-2 rounded-full mr-2 border ${activeStatus === f.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-100'}`}
                        >
                            <Text className={`text-xs font-black ${activeStatus === f.id ? 'text-white' : 'text-gray-400'}`}>{f.label.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}

                    <View className="w-[1px] h-6 bg-gray-100 mx-2 mt-1" />

                    {SyncFilters.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            onPress={() => setActiveSync(activeSync === f.id ? null : f.id)}
                            className={`px-4 py-2 rounded-full mr-2 border ${activeSync === f.id ? 'bg-black border-black' : 'bg-white border-gray-100'}`}
                        >
                            <View className="flex-row items-center">
                                <View style={{ backgroundColor: f.color }} className="w-2 h-2 rounded-full mr-2" />
                                <Text className={`text-xs font-black ${activeSync === f.id ? 'text-white' : 'text-gray-400'}`}>{f.label.toUpperCase()}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
            >
                {tasks.length === 0 ? (
                    <View className="items-center justify-center py-20">
                        <Shield size={64} color="#f1f5f9" />
                        <Text className="text-gray-300 font-bold mt-4">No matching tasks found.</Text>
                    </View>
                ) : (
                    tasks.map((task: any) => (
                        <TouchableOpacity
                            key={task.id}
                            onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                        >
                            <TaskItem
                                task={task}
                                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                            />
                            {task.status === 'FROZEN' && (
                                <View className="absolute top-2 right-2 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                                    <Text className="text-[8px] font-black text-blue-600 uppercase">Frozen</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminTasksScreen;
