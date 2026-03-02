import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { Bell, Shield, X, Clock, ChevronRight } from 'lucide-react-native';
import { isStale, getGreeting } from '../utils/timeAgo';

import AttentionPanel from '../components/dashboard/AttentionPanel';
import ResponsibilitySection from '../components/dashboard/ResponsibilitySection';
import DelegatedSection from '../components/dashboard/DelegatedSection';
import ParticipatingSection from '../components/dashboard/ParticipatingSection';
import QuickActionsBar from '../components/dashboard/QuickActionsBar';

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
};

const HomeScreen = ({ navigation }: any) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showLogTimeModal, setShowLogTimeModal] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [timeLog, setTimeLog] = useState({ hours: '', minutes: '', note: '' });
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoggingTime, setIsLoggingTime] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [staleThreshold, setStaleThreshold] = useState(24);
    const { user, settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks');
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            const response = await api.get('/activities?limit=3&scope=all');
            setRecentActivities(response.data);
        } catch (error) {
            console.error('Error fetching recent activities:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/notifications');
            const unread = response.data.filter((n: any) => n.isRead === 'false').length;
            setUnreadNotifications(unread);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const fetchWorkspaceSettings = async () => {
        try {
            const response = await api.get('/workspace/settings');
            const threshold = parseInt(response.data.staleThresholdHours, 10);
            if (!isNaN(threshold)) setStaleThreshold(threshold);
        } catch (error) {
            console.error('Error fetching workspace settings:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchTasks(), fetchRecentActivities(), fetchUnreadCount(), fetchWorkspaceSettings()]);
        setRefreshing(false);
    };

    const refreshSilent = () => {
        fetchTasks();
        fetchRecentActivities();
        fetchUnreadCount();
        fetchWorkspaceSettings();
    };

    useEffect(() => {
        fetchTasks();
        fetchRecentActivities();
        fetchUnreadCount();
        fetchWorkspaceSettings();

        const socket = getSocket();

        // Real-time event listeners
        socket.on('sync:update', (data) => {
            setTasks(prevTasks => prevTasks.map(t =>
                t.id === data.taskId ? { ...t, syncState: data.syncState, lastUpdatedAt: new Date().toISOString() } : t
            ));
        });

        socket.on('task:created', refreshSilent);
        socket.on('task:updated', refreshSilent);
        socket.on('task:deleted', refreshSilent);
        socket.on('task:transfer', refreshSilent);
        socket.on('task:accepted', refreshSilent);
        socket.on('task:completed', refreshSilent);
        socket.on('milestone:created', refreshSilent);
        socket.on('milestone:updated', refreshSilent);
        socket.on('milestone:deleted', refreshSilent);
        socket.on('comment:new', refreshSilent);
        socket.on('task:join', refreshSilent);
        socket.on('task:leave', refreshSilent);
        socket.on('notification:new', () => {
            setUnreadNotifications(prev => prev + 1);
        });

        return () => {
            socket.off('sync:update');
            socket.off('task:created');
            socket.off('task:updated');
            socket.off('task:deleted');
            socket.off('task:transfer');
            socket.off('task:accepted');
            socket.off('task:completed');
            socket.off('milestone:created');
            socket.off('milestone:updated');
            socket.off('milestone:deleted');
            socket.off('comment:new');
            socket.off('task:join');
            socket.off('task:leave');
            socket.off('notification:new');
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
            // ─── NEW: I am the owner AND it's PENDING (Incoming Transfer) ───
            if (t.responsibleOwner === userId && t.status === 'PENDING') {
                attentionItems.push({ task: t, role: 'Owner', riskState: 'PENDING_ACCEPTANCE' });
            }
            // I am responsible AND BLOCKED
            else if (t.responsibleOwner === userId && t.syncState === 'BLOCKED') {
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
            // Stale beyond threshold
            else if (t.responsibleOwner === userId && isStale(t.lastUpdatedAt || t.createdAt, staleThreshold)) {
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

    const handleParticipantSync = async (taskId: string) => {
        try {
            await api.patch(`/tasks/${taskId}/sync-participant`);
            Alert.alert("Synced", "Your status for this track is now IN_SYNC.");
            fetchTasks();
        } catch (error) {
            console.error('Error syncing participant:', error);
            Alert.alert("Error", "Failed to sync status.");
        }
    };

    const handleNudge = async (taskId: string) => {
        try {
            await api.post(`/tasks/${taskId}/nudge`);
            Alert.alert("Nudge Sent", "The responsible owner has been notified.");
            fetchTasks(); // Refresh to see audit log updates if needed
        } catch (error) {
            console.error('Error nudging task:', error);
            Alert.alert("Error", "Failed to send nudge.");
        }
    };

    const handleCreateTask = () => {
        navigation.navigate('CreateTask');
    };

    const navigateToSegment = (segmentId: string) => {
        navigation.navigate('Tasks', { segmentId });
    };

    const handleGlobalSync = async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            const response = await api.patch('/tasks/sync-all');
            const { ownedCount, participationCount } = response.data;
            Alert.alert(
                "Global Sync Complete",
                `Synchronized ${ownedCount} owned tracks and ${participationCount} participations to IN_SYNC state.`,
                [{ text: "Great" }]
            );
            fetchTasks();
        } catch (error) {
            console.error('Error in global sync:', error);
            Alert.alert("Error", "Failed to perform global sync.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogTime = () => {
        setShowLogTimeModal(true);
    };

    const submitLogTime = async () => {
        if (!selectedTaskId) {
            Alert.alert("Select Task", "Please select a task to log time for.");
            return;
        }

        const h = parseInt(timeLog.hours || '0', 10);
        const m = parseInt(timeLog.minutes || '0', 10);
        const totalMinutes = (h * 60) + m;

        if (totalMinutes <= 0) {
            Alert.alert("Invalid Time", "Please enter a valid duration.");
            return;
        }

        setIsLoggingTime(true);
        try {
            await api.post(`/tasks/${selectedTaskId}/time-logs`, {
                durationMinutes: totalMinutes,
                description: timeLog.note,
            });
            setShowLogTimeModal(false);
            setSelectedTaskId(null);
            setTimeLog({ hours: '', minutes: '', note: '' });
            Alert.alert("Success", "Time logged successfully.");
            fetchTasks();
        } catch (err) {
            console.error('Error logging time:', err);
            Alert.alert("Error", "Failed to log time.");
        } finally {
            setIsLoggingTime(false);
        }
    };

    // ─── DISPLAY NAME ──────────────────────
    const displayName = user?.user_metadata?.name
        || user?.user_metadata?.full_name
        || user?.email?.split('@')[0]
        || 'User';
    const firstName = displayName.split(' ')[0];

    if (!dashboard) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? '#111827' : '#FAFAFA'} />

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
                        <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>
                            SyncTracker
                        </Text>
                        <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#9CA3AF', fontWeight: '500' }}>
                            {getGreeting()}, {firstName}
                        </Text>
                    </View>
                </View>

                {/* Notification Bell */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Notifications')}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Bell size={20} color={isDark ? '#E5E7EB' : '#374151'} />
                    {unreadNotifications > 0 && (
                        <View style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#EF4444',
                            borderWidth: 2,
                            borderColor: isDark ? '#374151' : '#F3F4F6',
                        }} />
                    )}
                </TouchableOpacity>
            </View>

            {/* ─── SCROLLABLE BODY ──────────────── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
            >
                {/* ─── GREETING ────────────────────── */}
                <View style={{ paddingHorizontal: 24, paddingTop: 20, marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '500', marginBottom: 4 }}>
                        {getGreeting()},
                    </Text>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>
                        {firstName}
                    </Text>
                </View>

                {/* ─── ATTENTION PANEL ────────────────────── */}
                <AttentionPanel
                    items={dashboard.attentionItems}
                    onTaskPress={navigateToTask}
                />

                {/* ─── ACTIVITY PULSE (Pulse) ────────────────────── */}
                {recentActivities.length > 0 && (
                    <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 8 }} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Activity Pulse</Text>
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
                                <Text style={{ fontSize: 13, color: '#3B82F6', fontWeight: '600' }}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 10, elevation: 2 }}>
                            {recentActivities.map((act, idx) => (
                                <TouchableOpacity
                                    key={act.id}
                                    onPress={() => navigateToTask(act.taskId)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginBottom: idx === recentActivities.length - 1 ? 0 : 12,
                                        paddingBottom: idx === recentActivities.length - 1 ? 0 : 12,
                                        borderBottomWidth: idx === recentActivities.length - 1 ? 0 : 1,
                                        borderBottomColor: isDark ? '#374151' : '#F3F4F6'
                                    }}
                                >
                                    <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? '#1F2937' : '#F3F6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Clock size={16} color="#3B82F6" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 18 }} numberOfLines={2}>
                                            <Text style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>{act.actorName}</Text>
                                            {' '}
                                            {act.actionText}
                                            {' on '}
                                            <Text style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>{act.taskTitle}</Text>
                                        </Text>
                                        <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 4, fontWeight: '500' }}>
                                            {formatTimeAgo(act.timestamp)}
                                        </Text>
                                    </View>
                                    <ChevronRight size={14} color={isDark ? '#4B5563' : '#D1D5DB'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
                {/* 2️⃣ MY RESPONSIBILITY */}
                <ResponsibilitySection
                    groups={dashboard.myResponsibility}
                    onTaskPress={navigateToTask}
                    onUpdateSync={handleUpdateSync}
                    onHeaderPress={() => navigateToSegment('owned')}
                />

                {/* 3️⃣ DELEGATED BY ME */}
                <DelegatedSection
                    tasks={dashboard.delegated}
                    onTaskPress={navigateToTask}
                    onNudge={handleNudge}
                    onHeaderPress={() => navigateToSegment('delegated')}
                />

                {/* 4️⃣ PARTICIPATING IN */}
                <ParticipatingSection
                    items={dashboard.participating}
                    onTaskPress={navigateToTask}
                    onQuickSync={handleParticipantSync}
                    onHeaderPress={() => navigateToSegment('participating')}
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
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Shield size={36} color={isDark ? '#4B5563' : '#D1D5DB'} />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#9CA3AF' : '#9CA3AF', marginBottom: 4 }}>
                            No tasks on your radar
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? '#6B7280' : '#D1D5DB', fontWeight: '500', textAlign: 'center', paddingHorizontal: 40 }}>
                            Create a task to begin syncing with your team
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* ─── LOG TIME MODAL ────────────────── */}
            <Modal
                visible={showLogTimeModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowLogTimeModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                    <View style={{
                        backgroundColor: isDark ? '#1F2937' : '#FFF',
                        padding: 24,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        maxHeight: '80%'
                    }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 22, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Log Time</Text>
                            <TouchableOpacity
                                onPress={() => setShowLogTimeModal(false)}
                                style={{ padding: 8, backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 12 }}
                            >
                                <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        {/* Task Selector */}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 }}>
                            FOR WHICH TRACK?
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 24 }}
                            contentContainerStyle={{ gap: 10 }}
                        >
                            {tasks.filter(t => t.status === 'ACTIVE' || t.status === 'PENDING').length > 0 ? (
                                tasks.filter(t => t.status === 'ACTIVE' || t.status === 'PENDING').map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setSelectedTaskId(t.id)}
                                        style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 12,
                                            borderRadius: 16,
                                            backgroundColor: selectedTaskId === t.id ? (isDark ? '#3B82F6' : '#1A1A2E') : (isDark ? '#374151' : '#F3F4F6'),
                                            borderWidth: 1,
                                            borderColor: selectedTaskId === t.id ? (isDark ? '#3B82F6' : '#1A1A2E') : (isDark ? '#4B5563' : '#E5E7EB'),
                                            minWidth: 120,
                                        }}
                                    >
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: selectedTaskId === t.id ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                                                marginBottom: 4,
                                            }}
                                        >
                                            {t.title}
                                        </Text>
                                        <Text style={{ fontSize: 11, color: selectedTaskId === t.id ? 'rgba(255,255,255,0.7)' : (isDark ? '#9CA3AF' : '#9CA3AF'), fontWeight: '600' }}>
                                            {t.syncState || 'IN_SYNC'}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ padding: 12, backgroundColor: isDark ? '#374151' : '#F9FAFB', borderRadius: 12 }}>
                                    <Text style={{ color: isDark ? '#9CA3AF' : '#9CA3AF', fontSize: 13 }}>No active tracks available.</Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Time Inputs */}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 }}>
                            DURATION
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={{
                                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                        padding: 16,
                                        borderRadius: 16,
                                        fontSize: 24,
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        color: isDark ? '#F9FAFB' : '#111827',
                                    }}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    placeholderTextColor={isDark ? '#6B7280' : '#D1D5DB'}
                                    value={timeLog.hours}
                                    onChangeText={(text) => setTimeLog({ ...timeLog, hours: text.replace(/[^0-9]/g, '') })}
                                    maxLength={2}
                                />
                                <Text style={{ textAlign: 'center', marginTop: 8, color: isDark ? '#9CA3AF' : '#9CA3AF', fontSize: 12, fontWeight: '600' }}>Hours</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <TextInput
                                    style={{
                                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                        padding: 16,
                                        borderRadius: 16,
                                        fontSize: 24,
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        color: isDark ? '#F9FAFB' : '#111827',
                                    }}
                                    keyboardType="number-pad"
                                    placeholder="00"
                                    placeholderTextColor={isDark ? '#6B7280' : '#D1D5DB'}
                                    value={timeLog.minutes}
                                    onChangeText={(text) => setTimeLog({ ...timeLog, minutes: text.replace(/[^0-9]/g, '') })}
                                    maxLength={2}
                                />
                                <Text style={{ textAlign: 'center', marginTop: 8, color: isDark ? '#9CA3AF' : '#9CA3AF', fontSize: 12, fontWeight: '600' }}>Minutes</Text>
                            </View>
                        </View>

                        {/* Notes */}
                        <TextInput
                            style={{
                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                padding: 16,
                                borderRadius: 16,
                                fontSize: 15,
                                color: isDark ? '#F9FAFB' : '#111827',
                                minHeight: 80,
                                textAlignVertical: 'top',
                                marginBottom: 24,
                            }}
                            placeholder="What did you work on? (Optional)"
                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                            multiline
                            value={timeLog.note}
                            onChangeText={(text) => setTimeLog({ ...timeLog, note: text })}
                        />

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: Platform.OS === 'ios' ? 20 : 0 }}>
                            <TouchableOpacity
                                onPress={() => setShowLogTimeModal(false)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 18,
                                    borderRadius: 18,
                                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#D1D5DB' : '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitLogTime}
                                activeOpacity={0.8}
                                disabled={isLoggingTime || (!selectedTaskId || (!timeLog.hours && !timeLog.minutes))}
                                style={{
                                    flex: 2,
                                    paddingVertical: 18,
                                    borderRadius: 18,
                                    backgroundColor: (!selectedTaskId || (!timeLog.hours && !timeLog.minutes)) ? (isDark ? '#4B5563' : '#E5E7EB') : (isDark ? '#3B82F6' : '#111827'),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: (!selectedTaskId || (!timeLog.hours && !timeLog.minutes)) ? 0 : 0.15,
                                    shadowRadius: 12,
                                    elevation: 5
                                }}
                            >
                                {isLoggingTime ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Clock size={16} color={(!selectedTaskId || (!timeLog.hours && !timeLog.minutes)) ? (isDark ? '#9CA3AF' : '#9CA3AF') : '#FFF'} style={{ marginRight: 8 }} />
                                        <Text style={{ fontSize: 15, fontWeight: '700', color: (!selectedTaskId || (!timeLog.hours && !timeLog.minutes)) ? (isDark ? '#9CA3AF' : '#9CA3AF') : '#FFF' }}>
                                            Log Time
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

export default HomeScreen;
