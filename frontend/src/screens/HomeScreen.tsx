import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import TaskItem from '../components/TaskItem';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { Play, UserCheck, AlertOctagon, CheckCircle2, ChevronDown, Check, AlertCircle, Search, Settings, HelpCircle, Briefcase, Plus, Clock } from 'lucide-react-native';

const HomeScreen = ({ navigation }: any) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const user = useAuthStore(state => state.user);

    const fetchTasks = async () => {
        try {
            const [tasksRes, statsRes] = await Promise.all([
                api.get('/tasks'),
                api.get('/tasks/stats')
            ]);
            setTasks(tasksRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const handleQuickAction = async (syncState: string) => {
        // Find tasks where current user is responsible
        const myTasks = tasks.filter(t => t.responsibleOwner === user?.id);
        if (myTasks.length === 0) return;

        try {
            await Promise.all(myTasks.map(t =>
                api.patch(`/tasks/${t.id}/sync`, { syncState })
            ));
            await fetchTasks();
        } catch (error) {
            console.error('Error applying quick action:', error);
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
            // Also refresh stats when sync updates
            api.get('/tasks/stats').then(res => setStats(res.data)).catch(() => { });
        });

        return () => {
            socket.off('sync:update');
        };
    }, []);

    const dashboard = useMemo(() => {
        const userId = user?.id;
        if (!userId || !tasks) return null;

        const myResponsibility = tasks.filter(t => t.responsibleOwner === userId);

        return {
            myTasks: myResponsibility,
            stats: stats || { responsible: 0, delegated: 0, blocked: 0 }
        };
    }, [tasks, user, stats]);

    if (!dashboard) return null;

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Minimal Header */}
            <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                <View className="flex-row items-center">
                    <Text className="text-xl font-black text-gray-900 tracking-tight">SyncTracker</Text>
                </View>
                {/* Placeholder Avatar */}
                <View className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 items-center justify-center">
                    <Text className="text-orange-800 font-bold text-xs">{(user?.email?.[0] || 'U').toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Search Bar - Fake for Dashboard UI */}
                <View className="px-6 mb-6 mt-4">
                    <View className="flex-row items-center bg-gray-100/80 rounded-2xl px-4 py-3 border border-gray-200/50">
                        <Search size={18} color="#9ca3af" />
                        <Text className="flex-1 ml-3 text-gray-400 font-medium">Search tasks, teams, syncs...</Text>
                    </View>
                </View>

                {/* Status Filter Placeholder */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 px-6" contentContainerStyle={{ paddingRight: 40 }}>
                    <View className="bg-gray-900 px-5 py-2 rounded-full mr-2">
                        <Text className="text-white font-bold text-xs">All</Text>
                    </View>
                    {['In Sync', 'Blocked', 'Needs Update', 'Help'].map((f, i) => (
                        <View key={i} className="bg-white border border-gray-200 px-4 py-2 rounded-full mr-2">
                            <Text className="text-gray-600 font-medium text-xs">{f}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Greeting */}
                <View className="px-6 mb-6">
                    <Text className="text-gray-500 text-sm font-medium">Good morning,</Text>
                    <Text className="text-xl font-bold text-gray-900">
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </Text>
                </View>

                {/* OVERVIEW STATS */}
                <View className="px-6 mb-8">
                    <View className="flex-row justify-between items-end mb-4">
                        <Text className="text-lg font-bold text-gray-900">Overview</Text>
                        <Text className="text-blue-600 font-medium flex-row text-xs">View Report</Text>
                    </View>

                    <View className="flex-row justify-between">
                        {/* Responsible For Stat Card */}
                        <View className="bg-white flex-1 rounded-3xl p-4 shadow-sm border border-gray-100 mr-3">
                            <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center mb-4">
                                <Briefcase size={16} color="#3b82f6" />
                            </View>
                            <Text className="text-2xl font-black text-gray-900 mb-1">{dashboard.stats.active + dashboard.stats.pending}</Text>
                            <Text className="text-xs text-gray-500 font-medium">My Tasks</Text>
                        </View>

                        {/* Assigned By Me Stat Card */}
                        <View className="bg-white flex-1 rounded-3xl p-4 shadow-sm border border-gray-100 mr-3">
                            <View className="w-8 h-8 rounded-xl bg-purple-50 items-center justify-center mb-4">
                                <Play size={16} color="#a855f7" />
                            </View>
                            <Text className="text-2xl font-black text-gray-900 mb-1">{dashboard.stats.delegated}</Text>
                            <Text className="text-xs text-gray-500 font-medium">Delegated</Text>
                        </View>

                        {/* Blocked Stat Card */}
                        <View className="bg-white flex-1 rounded-3xl p-4 shadow-sm border border-gray-100">
                            <View className="w-8 h-8 rounded-xl bg-red-50 items-center justify-center mb-4">
                                <AlertOctagon size={16} color="#ef4444" />
                            </View>
                            <Text className="text-2xl font-black text-gray-900 mb-1">{dashboard.stats.blocked}</Text>
                            <Text className="text-xs text-gray-500 font-medium">Blocked</Text>
                        </View>
                    </View>
                </View>

                {/* QUICK ACTIONS */}
                <View className="px-6 mb-8">
                    <Text className="text-lg font-bold text-gray-900 mb-1">Quick Actions</Text>
                    <Text className="text-xs text-gray-500 mb-4">Update status for selected tasks</Text>

                    <View className="flex-row justify-between mb-3">
                        <TouchableOpacity
                            onPress={() => handleQuickAction('IN_SYNC')}
                            className="flex-1 bg-white border border-gray-100 shadow-sm rounded-2xl py-4 items-center mr-3"
                        >
                            <CheckCircle2 size={24} color="#10b981" className="mb-2" />
                            <Text className="text-sm font-bold text-gray-700">Mark In Sync</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleQuickAction('NEEDS_UPDATE')}
                            className="flex-1 bg-blue-50 border border-blue-100 shadow-sm rounded-2xl py-4 items-center"
                        >
                            <Clock size={24} color="#eab308" className="mb-2" />
                            <Text className="text-sm font-bold text-yellow-700">Needs Update</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="flex-row justify-between">
                        <TouchableOpacity
                            onPress={() => handleQuickAction('BLOCKED')}
                            className="flex-1 bg-white border border-gray-100 shadow-sm rounded-2xl py-4 items-center mr-3"
                        >
                            <AlertOctagon size={24} color="#ef4444" className="mb-2" />
                            <Text className="text-sm font-bold text-red-600">Blocked</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleQuickAction('HELP_REQUESTED')}
                            className="flex-1 bg-white border border-gray-100 shadow-sm rounded-2xl py-4 items-center"
                        >
                            <HelpCircle size={24} color="#3b82f6" className="mb-2" />
                            <Text className="text-sm font-bold text-blue-600">Request Help</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ACTIVE TASKS */}
                <View className="px-6 mb-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-lg font-bold text-gray-900">Active Tasks</Text>
                        <FilterIcon />
                    </View>

                    {/* Task List */}
                    {dashboard.myTasks.length === 0 ? (
                        <View className="bg-white p-8 rounded-3xl border border-gray-100 items-center justify-center">
                            <Text className="text-gray-400 font-medium mb-4 text-center">You have no active tasks demanding your attention right now.</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('CreateTask')} className="bg-blue-600 px-6 py-3 rounded-xl">
                                <Text className="text-white font-bold">Create Task</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        dashboard.myTasks.map((t: any) => (
                            <TaskItem
                                key={t.id}
                                task={t}
                                onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Dumb filter icon placeholder
const FilterIcon = () => (
    <View className="flex-row space-x-1 items-center">
        <View className="w-4 border-b-2 border-gray-400" />
        <View className="w-2 border-b-2 border-gray-400" />
        <View className="w-3 border-b-2 border-gray-400" />
    </View>
);

export default HomeScreen;
