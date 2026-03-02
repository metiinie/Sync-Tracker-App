import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { Search, Plus, Bell, X } from 'lucide-react-native';
import TaskItem from '../components/TaskItem';

// ─── SEGMENT TABS ──────────────────────────────────
const SEGMENTS = [
    { id: 'all', label: 'All' },
    { id: 'owned', label: 'Owned' },
    { id: 'delegated', label: 'Delegated' },
    { id: 'participating', label: 'Participating' },
];

// ─── STATUS FILTER CHIPS ───────────────────────────
const STATUS_FILTERS = [
    { id: 'BLOCKED', label: 'Blocked', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
    { id: 'HELP_REQUESTED', label: 'Help Requested', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
    { id: 'NEEDS_UPDATE', label: 'Needs Update', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
    { id: 'IN_SYNC', label: 'In Sync', color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0' },
    { id: 'PENDING', label: 'Pending Acceptance', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
];

// ─── SYNC STATE SORT PRIORITY ──────────────────────
const SYNC_PRIORITY: Record<string, number> = {
    'BLOCKED': 0,
    'HELP_REQUESTED': 1,
    'NEEDS_UPDATE': 2,
    'PENDING': 3,
    'IN_SYNC': 4,
};

const TasksScreen = ({ navigation, route }: any) => {
    const { token, user, settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [activeSegment, setActiveSegment] = useState('all');
    const [activeStatus, setActiveStatus] = useState<string | null>(null);

    // Handle deep-linking params
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (route.params?.segmentId) {
                setActiveSegment(route.params.segmentId);
                // Clear params after applying to avoid sticky behavior
                navigation.setParams({ segmentId: undefined });
            }
        });
        return unsubscribe;
    }, [navigation, route.params]);

    // ─── DATA FETCHING ─────────────────────────────
    const { data: tasks = [], isLoading, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await api.get('/tasks');
            return res.data;
        },
        enabled: !!token,
    });

    // ─── JOIN REAL-TIME ROOMS ──────────────────────
    useEffect(() => {
        if (tasks && tasks.length > 0) {
            const socket = getSocket();
            const taskIds = tasks.map((t: any) => t.id);
            socket.emit('joinTasks', { taskIds });
        }
    }, [tasks.length]);

    // ─── REAL-TIME SOCKET UPDATES ──────────────────
    useEffect(() => {
        const socket = getSocket();

        const handleSyncUpdate = (data: any) => {
            queryClient.setQueryData(['tasks'], (old: any[] | undefined) => {
                if (!old) return old;
                return old.map(t =>
                    t.id === data.taskId
                        ? { ...t, syncState: data.syncState, lastUpdatedAt: new Date().toISOString() }
                        : t
                );
            });
        };

        const handleBlocked = (data: any) => {
            queryClient.setQueryData(['tasks'], (old: any[] | undefined) => {
                if (!old) return old;
                return old.map(t =>
                    t.id === data.taskId
                        ? { ...t, syncState: 'BLOCKED', lastUpdatedAt: new Date().toISOString() }
                        : t
                );
            });
        };

        const handleHelpRequested = (data: any) => {
            queryClient.setQueryData(['tasks'], (old: any[] | undefined) => {
                if (!old) return old;
                return old.map(t =>
                    t.id === data.taskId
                        ? { ...t, syncState: 'HELP_REQUESTED', lastUpdatedAt: new Date().toISOString() }
                        : t
                );
            });
        };

        const handleRefetch = () => {
            refetch();
        };

        socket.on('sync:update', handleSyncUpdate);
        socket.on('task:blocked', handleBlocked);
        socket.on('task:helpRequested', handleHelpRequested);
        socket.on('task:assigned', handleRefetch);
        socket.on('task:transferred', handleRefetch);
        socket.on('task:updated', handleRefetch);
        socket.on('task:deleted', handleRefetch);
        socket.on('milestone:completed', handleRefetch);

        return () => {
            socket.off('sync:update', handleSyncUpdate);
            socket.off('task:blocked', handleBlocked);
            socket.off('task:helpRequested', handleHelpRequested);
            socket.off('task:assigned', handleRefetch);
            socket.off('task:transferred', handleRefetch);
            socket.off('task:updated', handleRefetch);
            socket.off('task:deleted', handleRefetch);
            socket.off('milestone:completed', handleRefetch);
        };
    }, [queryClient, refetch]);

    // Join task rooms
    useEffect(() => {
        const socket = getSocket();
        tasks.forEach((t: any) => {
            socket.emit('joinTask', { taskId: t.id });
        });
    }, [tasks.length]);

    // ─── TOGGLE STATUS FILTER (Multi-select) ───────
    const toggleStatus = useCallback((statusId: string) => {
        setActiveStatus(prev => prev === statusId ? null : statusId);
    }, []);

    // ─── DETERMINE USER ROLE FOR A TASK ────────────
    const getUserRole = useCallback((task: any): 'Owner' | 'Assigner' | 'Participant' | 'Transferring' => {
        const userId = user?.id;
        if (!userId) return 'Participant';

        if (task.status === 'TRANSFERRING' || task.transferPending) {
            if (task.responsibleOwner === userId || task.assignedBy === userId) {
                return 'Transferring';
            }
        }
        if (task.responsibleOwner === userId) return 'Owner';
        if (task.assignedBy === userId && task.responsibleOwner !== userId) return 'Assigner';
        return 'Participant';
    }, [user?.id]);

    // ─── FILTERED + SORTED TASKS ───────────────────
    const filteredTasks = useMemo(() => {
        const userId = user?.id;
        if (!userId) return [];

        let result = [...tasks];

        // 1. Segment filter (role-based)
        switch (activeSegment) {
            case 'owned':
                result = result.filter((t: any) => t.responsibleOwner === userId);
                break;
            case 'delegated':
                result = result.filter((t: any) => t.assignedBy === userId && t.responsibleOwner !== userId);
                break;
            case 'participating':
                result = result.filter((t: any) =>
                    t.responsibleOwner !== userId &&
                    t.assignedBy !== userId
                );
                break;
            default: // 'all'
                break;
        }

        // 2. Status filter (sync state, single-select)
        if (activeStatus) {
            result = result.filter((t: any) => {
                const syncState = t.syncState || 'IN_SYNC';
                const taskStatus = t.status;
                if (activeStatus === 'PENDING') return taskStatus === 'PENDING' || syncState === 'PENDING';
                return syncState === activeStatus;
            });
        }

        // 3. Search filter
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter((t: any) =>
                t.title?.toLowerCase().includes(q) ||
                t.owner?.name?.toLowerCase().includes(q) ||
                t.owner?.email?.toLowerCase().includes(q)
            );
        }

        // 4. Sort by urgency (sync state priority), then by most recently updated
        result.sort((a: any, b: any) => {
            const aPriority = SYNC_PRIORITY[a.syncState] ?? 4;
            const bPriority = SYNC_PRIORITY[b.syncState] ?? 4;
            if (aPriority !== bPriority) return aPriority - bPriority;

            // Within same priority: most recently updated first
            const aTime = new Date(a.lastUpdatedAt || a.updatedAt || a.createdAt).getTime();
            const bTime = new Date(b.lastUpdatedAt || b.updatedAt || b.createdAt).getTime();
            return bTime - aTime;
        });

        return result;
    }, [tasks, activeSegment, activeStatus, search, user?.id]);

    // ─── RENDER TASK CARD ──────────────────────────
    const renderTask = useCallback(({ item }: { item: any }) => (
        <TaskItem
            task={item}
            userRole={getUserRole(item)}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        />
    ), [getUserRole, navigation]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    // ─── LOADING STATE ─────────────────────────────
    if (isLoading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={isDark ? '#F9FAFB' : '#111827'} />
                    <Text style={{ marginTop: 12, fontSize: 14, color: isDark ? '#9CA3AF' : '#9CA3AF', fontWeight: '500' }}>
                        Loading tasks...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? '#111827' : '#FAFAFA'} />

            {/* ═══ HEADER ═══════════════════════════════ */}
            <View style={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 4,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Text style={{
                    fontSize: 28,
                    fontWeight: '800',
                    color: isDark ? '#F9FAFB' : '#111827',
                    letterSpacing: -0.5,
                }}>
                    Tasks
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Activity')}
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
                </TouchableOpacity>
            </View>

            {/* ═══ SEARCH BAR ═══════════════════════════ */}
            <View style={{ paddingHorizontal: 24, marginTop: 12, marginBottom: 16 }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                }}>
                    <Search size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                    <TextInput
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            fontSize: 15,
                            color: isDark ? '#F9FAFB' : '#111827',
                            fontWeight: '500',
                            padding: 0,
                        }}
                        placeholder="Search tasks, owners, or IDs..."
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <X size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ═══ SEGMENTED CONTROL ════════════════════ */}
            <View style={{
                paddingHorizontal: 24,
                marginBottom: 14,
            }}>
                <View style={{
                    flexDirection: 'row',
                    borderBottomWidth: 1,
                    borderBottomColor: '#E5E7EB',
                }}>
                    {SEGMENTS.map(seg => {
                        const isActive = activeSegment === seg.id;
                        return (
                            <TouchableOpacity
                                key={seg.id}
                                onPress={() => setActiveSegment(seg.id)}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    borderBottomWidth: 2,
                                    borderBottomColor: isActive ? '#3B82F6' : 'transparent',
                                }}
                            >
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: isActive ? '700' : '500',
                                    color: isActive ? '#3B82F6' : '#9CA3AF',
                                }}>
                                    {seg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ═══ STATUS FILTER CHIPS ═══════════════════ */}
            <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
                <FlatList
                    horizontal
                    data={STATUS_FILTERS}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item: filter }) => {
                        const isActive = activeStatus === filter.id;
                        return (
                            <TouchableOpacity
                                onPress={() => toggleStatus(filter.id)}
                                activeOpacity={0.7}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: isActive ? filter.bg : '#FFFFFF',
                                    borderWidth: 1.5,
                                    borderColor: isActive ? filter.color : '#E5E7EB',
                                }}
                            >
                                {/* Color Dot */}
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: filter.color,
                                    marginRight: 6,
                                }} />
                                <Text style={{
                                    fontSize: 13,
                                    fontWeight: isActive ? '700' : '500',
                                    color: isActive ? filter.color : '#6B7280',
                                }}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* ═══ TASK LIST ════════════════════════════ */}
            <FlatList
                data={filteredTasks}
                renderItem={renderTask}
                keyExtractor={keyExtractor}
                contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingBottom: 120,
                    paddingTop: 4,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} />
                }
                ListEmptyComponent={
                    <View style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 80,
                    }}>
                        <View style={{
                            width: 72,
                            height: 72,
                            borderRadius: 36,
                            backgroundColor: '#F3F4F6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}>
                            <Search size={32} color="#D1D5DB" />
                        </View>
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: '#9CA3AF',
                            marginBottom: 4,
                        }}>
                            No tasks found
                        </Text>
                        <Text style={{
                            fontSize: 13,
                            color: '#D1D5DB',
                            fontWeight: '500',
                            textAlign: 'center',
                            paddingHorizontal: 40,
                        }}>
                            {search ? 'Try adjusting your search or filters' : 'Create a task to get started'}
                        </Text>
                    </View>
                }
            />

            {/* ═══ FAB (Create Task) ════════════════════ */}
            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                activeOpacity={0.85}
                style={{
                    position: 'absolute',
                    bottom: 100,
                    right: 24,
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#3B82F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 10,
                }}
            >
                <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default TasksScreen;
