import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, TextInput, FlatList, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, Activity as ActivityIcon, Clock, Ban, HelpCircle,
    CheckCircle2, ArrowRightLeft, Flag, RefreshCcw, History,
    ExternalLink, LifeBuoy, Unlock, CheckCircle, X,
    MessageSquare, Bell, Users
} from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { useActivities } from '../hooks/useActivities';
import { useQueryClient } from '@tanstack/react-query';

// ─── HELPERS ────────────────────────────────────────────
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

const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) return 'TODAY';
    if (date >= yesterday) return 'YESTERDAY';
    return 'LATER';
};

// ─── STATUS CONFIG ──────────────────────────────────────
const getStatusConfig = (badge: string) => {
    switch (badge) {
        case 'BLOCKED':
            return { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'BLOCKED' };
        case 'HELP_REQUESTED':
            return { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'HELP REQ' };
        case 'PENDING':
            return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'PENDING' };
        case 'IN_SYNC':
            return { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', label: 'IN SYNC' };
        case 'NEEDS_UPDATE':
            return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'NEEDS UPDATE' };
        case 'MILESTONE':
            return { color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'MILESTONE' };
        case 'TIME':
            return { color: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', label: 'TIME LOG' };
        case 'ACTIVE':
            return { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', label: 'ACCEPTED' };
        case 'COMMENT':
            return { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'COMMENT' };
        case 'NUDGE':
            return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'NUDGE' };
        case 'PARTICIPANT':
            return { color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'TEAM' };
        default:
            return { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', label: badge?.replace('_', ' ') || 'UNKNOWN' };
    }
}

const getStatusIcon = (badge: string, size: number = 22) => {
    switch (badge) {
        case 'BLOCKED': return <Ban size={size} color="#EF4444" strokeWidth={2.5} />;
        case 'HELP_REQUESTED': return <HelpCircle size={size} color="#3B82F6" strokeWidth={2.5} />;
        case 'PENDING': return <Clock size={size} color="#F59E0B" strokeWidth={2.5} />;
        case 'MILESTONE': return <Flag size={size} color="#8B5CF6" strokeWidth={2.5} />;
        case 'TIME': return <Clock size={size} color="#14B8A6" strokeWidth={2.5} />;
        case 'ACTIVE': return <CheckCircle2 size={size} color="#10B981" strokeWidth={2.5} />;
        case 'IN_SYNC': return <CheckCircle size={size} color="#10B981" strokeWidth={2.5} />;
        case 'NEEDS_UPDATE': return <RefreshCcw size={size} color="#F59E0B" strokeWidth={2.5} />;
        case 'COMMENT': return <MessageSquare size={size} color="#3B82F6" strokeWidth={2.5} />;
        case 'NUDGE': return <Bell size={size} color="#F59E0B" strokeWidth={2.5} />;
        case 'PARTICIPANT': return <Users size={size} color="#8B5CF6" strokeWidth={2.5} />;
        default: return <ActivityIcon size={size} color="#6B7280" strokeWidth={2.5} />;
    }
};

// ─── FILTER OPTIONS (with colors) ───────────────────────
const FILTERS = [
    { id: 'All', label: 'All', color: '#111827', bg: '#111827' },
    { id: 'Sync Updates', label: 'Sync Updates', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'Blocked', label: 'Blocked', color: '#EF4444', bg: '#FEF2F2' },
    { id: 'Help Requested', label: 'Help Requested', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'Responsibility Accepted', label: 'Accepted', color: '#10B981', bg: '#F0FDF4' },
    { id: 'Transfers', label: 'Transfers', color: '#F59E0B', bg: '#FFFBEB' },
    { id: 'Milestones', label: 'Milestones', color: '#8B5CF6', bg: '#F5F3FF' },
    { id: 'Time Logged', label: 'Time Logged', color: '#14B8A6', bg: '#F0FDFA' },
    { id: 'Communication', label: 'Comm', color: '#3B82F6', bg: '#EFF6FF' },
    { id: 'Team', label: 'Team', color: '#8B5CF6', bg: '#F5F3FF' }
];

// ─── MAIN COMPONENT ─────────────────────────────────────
const ActivityScreen = ({ navigation }: any) => {
    const { user, settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';
    const [scope, setScope] = useState<'my_tasks' | 'delegated' | 'all' | 'workspace'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');
    const queryClient = useQueryClient();

    // ─── QUERY HOOK ─────────────────────────────────────
    const {
        data: activities = [],
        isLoading: activitiesLoading,
        isRefetching
    } = useActivities(scope, searchQuery);

    const onRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['activities'] });
    };

    // ─── REAL-TIME SYNC ────────────────────────────────
    useEffect(() => {
        const socket = getSocket();
        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activities'] });

        // Listeners for all activity-triggering events
        socket.on('sync:update', invalidate);
        socket.on('timelog:created', invalidate);
        socket.on('milestone:created', invalidate);
        socket.on('milestone:updated', invalidate);
        socket.on('milestone:deleted', invalidate);
        socket.on('task:created', invalidate);
        socket.on('task:updated', invalidate);
        socket.on('task:deleted', invalidate);
        socket.on('task:accepted', invalidate);
        socket.on('task:completed', invalidate);
        socket.on('task:transfer', invalidate);
        socket.on('task:join', invalidate);
        socket.on('task:leave', invalidate);
        socket.on('comment:new', invalidate);
        socket.on('task:nudge', invalidate);

        return () => {
            socket.off('sync:update', invalidate);
            socket.off('timelog:created', invalidate);
            socket.off('milestone:created', invalidate);
            socket.off('milestone:updated', invalidate);
            socket.off('milestone:deleted', invalidate);
            socket.off('task:created', invalidate);
            socket.off('task:updated', invalidate);
            socket.off('task:deleted', invalidate);
            socket.off('task:accepted', invalidate);
            socket.off('task:completed', invalidate);
            socket.off('task:transfer', invalidate);
            socket.off('task:join', invalidate);
            socket.off('task:leave', invalidate);
            socket.off('comment:new', invalidate);
            socket.off('task:nudge', invalidate);
        };
    }, [queryClient]);

    // Join rooms for all tasks in the feed
    useEffect(() => {
        const socket = getSocket();
        if (activities.length > 0) {
            const taskIds = [...new Set(activities.map((a: any) => a.taskId).filter(Boolean))];
            socket.emit('joinTasks', { taskIds });
        }
    }, [activities]);

    // ─── FILTERING ──────────────────────────────────────
    const filteredActivities = useMemo(() => {
        let result = activities;

        if (selectedFilter !== 'All') {
            result = result.filter((a: any) => a.type === selectedFilter);
        }

        return result;
    }, [activities, selectedFilter]);

    // ─── GROUPING ───────────────────────────────────────
    const groupedActivities = useMemo(() => {
        const groups: Record<string, any[]> = {
            'TODAY': [], 'YESTERDAY': [], 'LATER': []
        };
        filteredActivities.forEach((activity: any) => {
            const group = getDateGroup(activity.timestamp);
            groups[group].push(activity);
        });
        return groups;
    }, [filteredActivities]);

    // ─── ACTION BUTTON FOR CARD ─────────────────────────
    const getActionButton = (activity: any) => {
        const goToTask = () => navigation.navigate('TaskDetail', { taskId: activity.taskId });

        switch (activity.stateBadge) {
            case 'BLOCKED':
                return (
                    <TouchableOpacity onPress={goToTask} activeOpacity={0.8}
                        style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: '#FEF2F2', paddingVertical: 12, borderRadius: 12,
                        }}>
                        <Unlock size={14} color="#EF4444" />
                        <Text style={{ marginLeft: 6, color: '#EF4444', fontSize: 13, fontWeight: '700' }}>
                            Unblock Task
                        </Text>
                    </TouchableOpacity>
                );
            case 'HELP_REQUESTED':
                return (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity onPress={goToTask} activeOpacity={0.8}
                            style={{
                                flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12,
                            }}>
                            <LifeBuoy size={14} color="#FFFFFF" />
                            <Text style={{ marginLeft: 6, color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                                Provide Support
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToTask} activeOpacity={0.8}
                            style={{
                                flex: 1, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 12,
                            }}>
                            <Text style={{ color: '#374151', fontSize: 13, fontWeight: '700' }}>
                                View Details
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'PENDING':
                return (
                    <TouchableOpacity onPress={goToTask} activeOpacity={0.8}
                        style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: '#FFFBEB', paddingVertical: 12, borderRadius: 12,
                        }}>
                        <CheckCircle2 size={14} color="#F59E0B" />
                        <Text style={{ marginLeft: 6, color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                            Approve Transfer
                        </Text>
                    </TouchableOpacity>
                );
            default:
                return (
                    <TouchableOpacity onPress={goToTask} activeOpacity={0.8}
                        style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6',
                            paddingVertical: 12, borderRadius: 12,
                        }}>
                        <ExternalLink size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text style={{ marginLeft: 6, color: isDark ? '#D1D5DB' : '#6B7280', fontSize: 13, fontWeight: '600' }}>
                            View Task
                        </Text>
                    </TouchableOpacity>
                );
        }
    };

    // ─── RENDER CARD ────────────────────────────────────
    const renderCard = (activity: any) => {
        const config = getStatusConfig(activity.stateBadge);

        return (
            <View key={activity.id} style={{
                marginBottom: 16, borderRadius: 16, backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                padding: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0.3 : 0.03, shadowRadius: 4, elevation: 1,
            }}>
                {/* Top Row: Status Badge & Time */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ backgroundColor: isDark ? `${config.color}20` : config.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ color: config.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
                            {config.label}
                        </Text>
                    </View>
                    <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
                        {formatTimeAgo(activity.timestamp)}
                    </Text>
                </View>

                {/* Content Row: Description & Icon */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                        <Text style={{ color: isDark ? '#D1D5DB' : '#374151', fontSize: 14, lineHeight: 20 }}>
                            <Text style={{ fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{activity.actorName}</Text>
                            {' '}
                            <Text style={{ color: isDark ? '#9CA3AF' : '#4B5563' }}>{activity.actionText}</Text>
                            {' on '}
                            <Text style={{ fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>{activity.taskTitle}</Text>
                        </Text>
                        {activity.userRole && (
                            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                                Your role: {activity.userRole}
                            </Text>
                        )}
                    </View>

                    <View style={{
                        width: 44, height: 44, borderRadius: 12, backgroundColor: isDark ? `${config.color}20` : config.bg,
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        {getStatusIcon(activity.stateBadge, 20)}
                    </View>
                </View>

                {/* Detail text if available */}
                {activity.detail ? (
                    <View style={{
                        marginTop: 12, padding: 12, backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderRadius: 12, borderLeftWidth: 3, borderLeftColor: config.color
                    }}>
                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563', fontSize: 13, fontStyle: 'italic', lineHeight: 18 }}>
                            "{activity.detail}"
                        </Text>
                    </View>
                ) : null}

                {/* Action Buttons */}
                <View style={{ marginTop: 16 }}>
                    {getActionButton(activity)}
                </View>
            </View>
        );
    };

    // ─── MAIN RENDER ────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? '#111827' : '#FAFAFA'} />

            {/* ═══ HEADER ═══════════════════════════════════ */}
            <View style={{
                paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', letterSpacing: -0.5 }}>
                    Activity
                </Text>
                <View style={{
                    width: 42, height: 42, borderRadius: 14, backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <View style={{
                        position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4,
                        backgroundColor: '#EF4444', borderWidth: 2, borderColor: isDark ? '#374151' : '#F3F4F6', zIndex: 1,
                    }} />
                    <History size={20} color={isDark ? '#E5E7EB' : '#374151'} />
                </View>
            </View>

            {/* ═══ SCOPE CONTROL (3-Segment Pill) ════════════ */}
            <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 16 }}>
                <View style={{
                    flexDirection: 'row', backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16
                }}>
                    {[
                        { id: 'all', label: 'Members' },
                        { id: 'workspace', label: 'Workspace' },
                        { id: 'my_tasks', label: 'Owned' },
                        { id: 'delegated', label: 'Delegated' }
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            onPress={() => setScope(opt.id as any)}
                            style={{
                                flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10,
                                backgroundColor: scope === opt.id ? (isDark ? '#374151' : '#FFF') : 'transparent',
                                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: scope === opt.id ? (isDark ? 0.3 : 0.05) : 0, shadowRadius: 2, elevation: scope === opt.id ? 1 : 0
                            }}
                        >
                            <Text style={{
                                fontSize: 13, fontWeight: scope === opt.id ? '600' : '500',
                                color: scope === opt.id ? (isDark ? '#F9FAFB' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280')
                            }}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* ═══ SEARCH BAR ════════════════════════════════ */}
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                <View style={{
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB',
                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                    flexDirection: 'row', alignItems: 'center',
                }}>
                    <Search size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                    <TextInput
                        style={{ flex: 1, marginLeft: 10, fontSize: 15, color: isDark ? '#F9FAFB' : '#111827', fontWeight: '500', padding: 0 }}
                        placeholder="Search logs, actors, or events..."
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ═══ FILTER CHIPS ═══════════════════════════════ */}
            <View style={{ marginBottom: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 24, paddingRight: 10, gap: 8 }}>
                    {FILTERS.map(filter => {
                        const isActive = selectedFilter === filter.id;
                        return (
                            <TouchableOpacity key={filter.id}
                                onPress={() => setSelectedFilter(filter.id)}
                                activeOpacity={0.8}
                                style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                                    borderWidth: 1,
                                    backgroundColor: isActive ? (filter.id === 'All' ? (isDark ? '#374151' : '#111827') : (isDark ? `${filter.color}1A` : filter.bg)) : (isDark ? '#1F2937' : '#FFFFFF'),
                                    borderColor: isActive ? (filter.id === 'All' ? (isDark ? '#4B5563' : '#111827') : filter.color) : (isDark ? '#374151' : '#E5E7EB'),
                                }}>
                                {filter.id !== 'All' && (
                                    <View style={{
                                        width: 6, height: 6, borderRadius: 3,
                                        backgroundColor: filter.color, marginRight: 6
                                    }} />
                                )}
                                <Text style={{
                                    fontSize: 13, fontWeight: isActive ? '700' : '500',
                                    color: isActive ? (filter.id === 'All' ? '#FFFFFF' : filter.color) : (isDark ? '#9CA3AF' : '#6B7280'),
                                }}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ═══ TIMELINE FEED ══════════════════════════════ */}
            {activitiesLoading && activities.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={isDark ? '#F9FAFB' : '#111827'} size="large" />
                    <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#9CA3AF', fontSize: 13, fontWeight: '500' }}>
                        Loading feed...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={isDark ? '#F9FAFB' : '#111827'} />}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.keys(groupedActivities).map(dateGroup => (
                        groupedActivities[dateGroup].length > 0 && (
                            <View key={dateGroup} style={{ marginTop: 16 }}>
                                <Text style={{
                                    color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 11, fontWeight: '800',
                                    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12,
                                }}>
                                    {dateGroup}
                                </Text>
                                {groupedActivities[dateGroup].map((activity: any) => renderCard(activity))}
                            </View>
                        )
                    ))}

                    {filteredActivities.length === 0 && (
                        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                            <View style={{
                                width: 72, height: 72, borderRadius: 36, backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                            }}>
                                <History size={32} color={isDark ? '#4B5563' : '#D1D5DB'} />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#9CA3AF' : '#9CA3AF', marginBottom: 4 }}>
                                No activity found
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#6B7280' : '#D1D5DB', fontWeight: '500', textAlign: 'center' }}>
                                Activity on your tracks will appear here.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default ActivityScreen;
