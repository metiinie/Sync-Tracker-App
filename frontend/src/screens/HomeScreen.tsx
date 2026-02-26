import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, RefreshControl, TouchableOpacity } from 'react-native';
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

        // Listen for all tasks we are involved in
        tasks.forEach(t => {
            socket.emit('joinTask', { taskId: t.id });
        });

        return () => {
            socket.off('sync:update');
        };
    }, [tasks.length]); // Re-join rooms when task list size changes

    // DACHBOARD SECTIONS LOGIC
    const sections = useMemo(() => {
        const defaultSections = {
            alerts: [] as any[],
            responsibility: {
                blocked: [] as any[],
                help: [] as any[],
                needsUpdate: [] as any[],
                inSync: [] as any[],
            },
            delegated: [] as any[],
            participating: [] as any[]
        };

        if (!user) return defaultSections;

        const alerts = tasks.filter(t =>
            (t.syncState === 'BLOCKED' || t.syncState === 'HELP_REQUESTED') &&
            (t.responsibleOwner === user.id || t.assignedBy === user.id)
        );

        const responsibility = {
            blocked: tasks.filter(t => t.responsibleOwner === user.id && t.syncState === 'BLOCKED'),
            help: tasks.filter(t => t.responsibleOwner === user.id && t.syncState === 'HELP_REQUESTED'),
            needsUpdate: tasks.filter(t => t.responsibleOwner === user.id && t.syncState === 'NEEDS_UPDATE'),
            inSync: tasks.filter(t => t.responsibleOwner === user.id && (t.syncState === 'IN_SYNC' || !t.syncState)),
        };

        const delegated = tasks.filter((t: any) => t.assignedBy === user.id && t.responsibleOwner !== user.id);

        const participating = tasks.filter((t: any) =>
            t.participants?.some((p: any) => p.userId === user.id) &&
            t.responsibleOwner !== user.id &&
            t.assignedBy !== user.id
        );

        return { alerts, responsibility, delegated, participating };
    }, [tasks, user]);

    const renderSectionHeader = (title: string, count: number) => (
        <View className="flex-row items-center justify-between mb-4 mt-6">
            <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</Text>
            <View className="bg-gray-200 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-gray-500">{count}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="py-6">
                    <Text className="text-3xl font-extrabold text-gray-900">Dashboard</Text>
                    <Text className="text-gray-500">Visible responsibility, realtime sync</Text>
                </View>

                {/* D. ALERTS STRIP */}
                {sections.alerts.length > 0 && (
                    <View className="mb-4">
                        {sections.alerts.map(task => (
                            <TouchableOpacity
                                key={`alert-${task.id}`}
                                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                                className={`flex-row items-center p-3 rounded-xl mb-2 border ${task.syncState === 'BLOCKED' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}
                            >
                                <View className={`w-2 h-2 rounded-full mr-3 ${task.syncState === 'BLOCKED' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                <Text className={`flex-1 text-sm font-medium ${task.syncState === 'BLOCKED' ? 'text-red-700' : 'text-blue-700'}`}>
                                    {task.syncState === 'BLOCKED' ? `You are BLOCKED on: ${task.title}` : `Help requested on: ${task.title}`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* A. MY DIRECT RESPONSIBILITY */}
                {renderSectionHeader('My Direct Responsibility',
                    sections.responsibility.blocked.length +
                    sections.responsibility.help.length +
                    sections.responsibility.needsUpdate.length +
                    sections.responsibility.inSync.length
                )}

                {sections.responsibility.blocked.map(t => (
                    <TaskItem key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })} />
                ))}
                {sections.responsibility.help.map(t => (
                    <TaskItem key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })} />
                ))}
                {sections.responsibility.needsUpdate.map(t => (
                    <TaskItem key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })} />
                ))}
                {sections.responsibility.inSync.map(t => (
                    <TaskItem key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })} />
                ))}

                {/* B. DELEGATED BY ME */}
                {sections.delegated.length > 0 && (
                    <>
                        {renderSectionHeader('Delegated By Me', sections.delegated.length)}
                        {sections.delegated.map(t => (
                            <TaskItem key={t.id} task={t} onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })} />
                        ))}
                    </>
                )}

                {/* C. PARTICIPATING IN */}
                {sections.participating.length > 0 && (
                    <>
                        {renderSectionHeader('Participating In', sections.participating.length)}
                        {sections.participating.map(t => {
                            const myParticipation = t.participants.find((p: any) => p.userId === user?.id);
                            return (
                                <TaskItem
                                    key={t.id}
                                    task={t}
                                    role={myParticipation?.role}
                                    onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
                                />
                            );
                        })}
                    </>
                )}

                <View className="h-20" />
            </ScrollView>

            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                className="absolute bottom-8 right-8 w-14 h-14 bg-black rounded-full items-center justify-center shadow-xl shadow-gray-400"
            >
                <Text className="text-white text-2xl font-light">+</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default HomeScreen;
