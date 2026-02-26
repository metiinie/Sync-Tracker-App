import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity } from 'react-native';
import api from '../services/api';
import TaskItem from '../components/TaskItem';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { AlertCircle, Clock, Users, ChevronRight, Bell, Flag, Shield } from 'lucide-react-native';

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

        // Auto-join rooms for all tasks
        tasks.forEach(t => {
            socket.emit('joinTask', { taskId: t.id });
        });

        return () => {
            socket.off('sync:update');
        };
    }, [tasks.length]);

    const dashboard = useMemo(() => {
        const userId = user?.id;
        if (!userId) return null;

        const myResponsibility = {
            blocked: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'BLOCKED'),
            help: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'HELP_REQUESTED'),
            needsUpdate: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'NEEDS_UPDATE'),
            inSync: tasks.filter(t => t.responsibleOwner === userId && (t.syncState === 'IN_SYNC' || !t.syncState)),
        };

        const delegated = tasks.filter(t => t.assignedBy === userId && t.responsibleOwner !== userId);
        const participating = tasks.filter(t =>
            t.participants?.some((p: any) => p.userId === userId) &&
            t.responsibleOwner !== userId &&
            t.assignedBy !== userId
        );

        // Critical Alerts
        const alerts = [];
        // 1. I am blocked
        myResponsibility.blocked.forEach(t => alerts.push({ type: 'BLOCKED_ME', task: t }));
        // 2. Help requested on my delegated tasks
        delegated.filter(t => t.syncState === 'HELP_REQUESTED').forEach(t => alerts.push({ type: 'HELP_REQ_DELEGATED', task: t }));
        // 3. Responsibility transfer pending
        tasks.filter(t => t.responsibleOwner === userId && t.status === 'PENDING').forEach(t => alerts.push({ type: 'TRANSFER_PENDING', task: t }));

        return { myResponsibility, delegated, participating, alerts };
    }, [tasks, user]);

    const renderSectionHeader = (title: string, subtitle?: string) => (
        <View className="mb-4 mt-8">
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{title}</Text>
            {subtitle && <Text className="text-gray-900 font-bold text-lg">{subtitle}</Text>}
        </View>
    );

    if (!dashboard) return null;

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-4 pb-2">
                <Text className="text-3xl font-black text-gray-900">Radar</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">Execution Control Center</Text>
            </View>

            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* D. CRITICAL ALERTS STRIP */}
                {dashboard.alerts.length > 0 && (
                    <View className="mt-4">
                        {dashboard.alerts.map((alert, idx) => (
                            <TouchableOpacity
                                key={`alert-${idx}`}
                                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: alert.task.id } })}
                                className="bg-black p-4 rounded-3xl mb-2 flex-row items-center"
                            >
                                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                                    <Bell size={16} color="#fff" />
                                </View>
                                <View className="ml-3 flex-1">
                                    <Text className="text-white text-xs font-black uppercase tracking-tighter">
                                        {alert.type.replace(/_/g, ' ')}
                                    </Text>
                                    <Text className="text-white text-sm font-bold" numberOfLines={1}>
                                        {alert.task.title}
                                    </Text>
                                </View>
                                <ChevronRight size={16} color="#444" />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* A. MY RESPONSIBILITY */}
                {renderSectionHeader('Section A', 'My Responsibility')}

                {/* Grouped by Status */}
                {['blocked', 'help', 'needsUpdate', 'inSync'].map((key) => {
                    const groupTasks = (dashboard.myResponsibility as any)[key];
                    if (groupTasks.length === 0) return null;

                    const labelMap: any = {
                        blocked: '🔴 Blocked',
                        help: '🔵 Help Requested',
                        needsUpdate: '🟡 Needs Update',
                        inSync: '🟢 In Sync'
                    };

                    return (
                        <View key={key} className="mb-4">
                            <Text className="text-[10px] font-black text-gray-400 mb-3 px-2 italic">{labelMap[key]}</Text>
                            {groupTasks.map((t: any) => (
                                <TaskItem
                                    key={t.id}
                                    task={t}
                                    onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}
                                />
                            ))}
                        </View>
                    );
                })}

                {/* B. DELEGATED BY ME */}
                {dashboard.delegated.length > 0 && (
                    <>
                        {renderSectionHeader('Section B', 'Delegated By Me')}
                        {dashboard.delegated.map(t => (
                            <View key={t.id} className="relative">
                                <TaskItem
                                    task={t}
                                    onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}
                                />
                                {t.syncState === 'BLOCKED' && (
                                    <View className="absolute top-2 right-2 bg-red-500 px-2 py-0.5 rounded-full border-2 border-white">
                                        <Text className="text-[8px] font-black text-white uppercase">Red Alert</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </>
                )}

                {/* C. PARTICIPATING IN */}
                {dashboard.participating.length > 0 && (
                    <>
                        {renderSectionHeader('Section C', 'Participating In')}
                        {dashboard.participating.map(t => {
                            const myParticipation = t.participants.find((p: any) => p.userId === user?.id);
                            return (
                                <TaskItem
                                    key={t.id}
                                    task={t}
                                    role={myParticipation?.role}
                                    onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: t.id } })}
                                />
                            );
                        })}
                    </>
                )}

                {/* Empty State */}
                {tasks.length === 0 && (
                    <View className="items-center justify-center py-20">
                        <Shield size={64} color="#e5e7eb" />
                        <Text className="text-gray-400 font-bold mt-4 text-center px-10">No tasks on your radar. Create one to begin sync.</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                onPress={() => navigation.navigate('Tasks', { screen: 'CreateTask' })}
                className="absolute bottom-10 right-8 w-16 h-16 bg-black rounded-full items-center justify-center shadow-2xl shadow-gray-500"
            >
                <Text className="text-white text-3xl font-light">+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HomeScreen;
