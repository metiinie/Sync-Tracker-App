import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { Bell, Shield } from 'lucide-react-native';
import { isStale } from '../utils/timeAgo';

import AttentionPanel from '../components/dashboard/AttentionPanel';
import ResponsibilitySection from '../components/dashboard/ResponsibilitySection';
import DelegatedSection from '../components/dashboard/DelegatedSection';
import ParticipatingSection from '../components/dashboard/ParticipatingSection';
import QuickActionsBar from '../components/dashboard/QuickActionsBar';

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
};

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

        // Real-time event listeners
        socket.on('sync:update', (data) => {
            setTasks(prevTasks => prevTasks.map(t =>
                t.id === data.taskId ? { ...t, syncState: data.syncState, lastUpdatedAt: new Date().toISOString() } : t
            ));
        });

        socket.on('task:blocked', (data) => {
            setTasks(prevTasks => prevTasks.map(t =>
                t.id === data.taskId ? { ...t, syncState: 'BLOCKED', lastUpdatedAt: new Date().toISOString() } : t
            ));
        });

        socket.on('task:helpRequested', (data) => {
            setTasks(prevTasks => prevTasks.map(t =>
                t.id === data.taskId ? { ...t, syncState: 'HELP_REQUESTED', lastUpdatedAt: new Date().toISOString() } : t
            ));
        });

        socket.on('task:assigned', () => {
            fetchTasks(); // Re-fetch to get new task
        });

        socket.on('task:transferred', () => {
            fetchTasks();
        });

        socket.on('milestone:completed', () => {
            fetchTasks();
        });

        return () => {
            socket.off('sync:update');
            socket.off('task:blocked');
            socket.off('task:helpRequested');
            socket.off('task:assigned');
            socket.off('task:transferred');
            socket.off('milestone:completed');
        };
    }, []);

    // Join rooms for all tasks
    useEffect(() => {
        const socket = getSocket();
        tasks.forEach(t => {
            socket.emit('joinTask', { taskId: t.id });
        });
    }, [tasks.length]);

    // ─── DASHBOARD DATA COMPUTATION ──────────────────────
    const dashboard = useMemo(() => {
        const userId = user?.id;
        if (!userId) return null;

        // ─── 1. ATTENTION PANEL ──────────────────────
        const attentionItems: { task: any; role: 'Owner' | 'Assigner' | 'Participant'; riskState: string }[] = [];

        tasks.forEach(t => {
            // I am responsible AND BLOCKED
            if (t.responsibleOwner === userId && t.syncState === 'BLOCKED') {
                attentionItems.push({ task: t, role: 'Owner', riskState: 'BLOCKED' });
            }
            // I am responsible AND HELP_REQUESTED
            else if (t.responsibleOwner === userId && t.syncState === 'HELP_REQUESTED') {
                attentionItems.push({ task: t, role: 'Owner', riskState: 'HELP_REQUESTED' });
            }
            // I assigned it AND owner is BLOCKED
            else if (t.assignedBy === userId && t.responsibleOwner !== userId && t.syncState === 'BLOCKED') {
                attentionItems.push({ task: t, role: 'Assigner', riskState: 'BLOCKED' });
            }
            // I assigned it AND owner needs HELP
            else if (t.assignedBy === userId && t.responsibleOwner !== userId && t.syncState === 'HELP_REQUESTED') {
                attentionItems.push({ task: t, role: 'Assigner', riskState: 'HELP_REQUESTED' });
            }
            // Stale beyond threshold (24h)
            else if (t.responsibleOwner === userId && isStale(t.lastUpdatedAt || t.createdAt, 24)) {
                attentionItems.push({ task: t, role: 'Owner', riskState: 'STALE' });
            }
        });

        // ─── 2. MY RESPONSIBILITY ──────────────────────
        const myResponsibility = {
            blocked: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'BLOCKED'),
            help: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'HELP_REQUESTED'),
            needsUpdate: tasks.filter(t => t.responsibleOwner === userId && t.syncState === 'NEEDS_UPDATE'),
            inSync: tasks.filter(t => t.responsibleOwner === userId && (t.syncState === 'IN_SYNC' || !t.syncState)),
        };

        // ─── 3. DELEGATED BY ME ──────────────────────
        const delegated = tasks.filter(t => t.assignedBy === userId && t.responsibleOwner !== userId);

        // ─── 4. PARTICIPATING IN ──────────────────────
        const participating = tasks
            .filter(t =>
                t.participants?.some((p: any) => p.userId === userId) &&
                t.responsibleOwner !== userId &&
                t.assignedBy !== userId
            )
            .map(t => {
                const myParticipation = t.participants.find((p: any) => p.userId === userId);
                return { task: t, role: myParticipation?.role || 'contributor' };
            });

        return { attentionItems, myResponsibility, delegated, participating };
    }, [tasks, user]);

    // ─── NAVIGATION HELPERS ──────────────────────
    const navigateToTask = (taskId: string) => {
        navigation.navigate('TaskDetail', { taskId });
    };

    const handleUpdateSync = (taskId: string) => {
        navigation.navigate('TaskDetail', { taskId });
    };

    const handleNudge = (taskId: string) => {
        // TODO: Implement nudge notification
        console.log('Nudge task:', taskId);
    };

    const handleCreateTask = () => {
        navigation.navigate('CreateTask');
    };

    const handleGlobalSync = () => {
        // TODO: Implement global sync update
        console.log('Global sync');
    };

    const handleLogTime = () => {
        // TODO: Navigate to time logging
        console.log('Log time');
    };

    // ─── DISPLAY NAME ──────────────────────
    const displayName = user?.user_metadata?.name
        || user?.user_metadata?.full_name
        || user?.email?.split('@')[0]
        || 'User';
    const firstName = displayName.split(' ')[0];

    if (!dashboard) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            {/* ─── HEADER ──────────────────────── */}
            <View style={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* App Icon */}
                    <View style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: '#1A1A2E',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                    }}>
                        <View style={{
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            borderWidth: 2.5,
                            borderColor: '#FFFFFF',
                        }} />
                        <View style={{
                            position: 'absolute',
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#10B981',
                            bottom: 8,
                            right: 8,
                        }} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>
                            SyncTracker
                        </Text>
                        <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>
                            {getGreeting()}, {firstName}
                        </Text>
                    </View>
                </View>

                {/* Notification Bell */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Activity')}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Bell size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            {/* ─── SCROLLABLE BODY ──────────────── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 140 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* 1️⃣ ATTENTION PANEL */}
                <AttentionPanel
                    items={dashboard.attentionItems}
                    onTaskPress={navigateToTask}
                />

                {/* 2️⃣ MY RESPONSIBILITY */}
                <ResponsibilitySection
                    groups={dashboard.myResponsibility}
                    onTaskPress={navigateToTask}
                    onUpdateSync={handleUpdateSync}
                />

                {/* 3️⃣ DELEGATED BY ME */}
                <DelegatedSection
                    tasks={dashboard.delegated}
                    onTaskPress={navigateToTask}
                    onNudge={handleNudge}
                />

                {/* 4️⃣ PARTICIPATING IN */}
                <ParticipatingSection
                    items={dashboard.participating}
                    onTaskPress={navigateToTask}
                />

                {/* 5️⃣ QUICK ACTIONS */}
                <QuickActionsBar
                    onCreateTask={handleCreateTask}
                    onGlobalSync={handleGlobalSync}
                    onLogTime={handleLogTime}
                />

                {/* Empty State */}
                {tasks.length === 0 && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Shield size={36} color="#D1D5DB" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 }}>
                            No tasks on your radar
                        </Text>
                        <Text style={{ fontSize: 13, color: '#D1D5DB', fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 }}>
                            Create a task to begin syncing with your team
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default HomeScreen;
