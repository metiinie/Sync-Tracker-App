import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, TextInput, FlatList, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, Activity as ActivityIcon, Clock, Ban, HelpCircle,
    CheckCircle2, ArrowRightLeft, Flag, RefreshCcw, History,
    ExternalLink, LifeBuoy, Unlock, CheckCircle, X
} from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

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
    { id: 'Time Logged', label: 'Time Logged', color: '#14B8A6', bg: '#F0FDFA' }
];

// ─── MAIN COMPONENT ─────────────────────────────────────
const ActivityScreen = ({ navigation }: any) => {
    const { user } = useAuthStore();
    const [scope, setScope] = useState<'my_tasks' | 'delegated' | 'all'>('all');
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');

    // ─── FETCH ──────────────────────────────────────────
    const fetchActivities = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await api.get(`/activities?scope=${scope}`);
            setActivities(res.data);
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [scope]);

    useEffect(() => {
        fetchActivities();

        const socket = getSocket();
        const refresh = () => fetchActivities(false);

        socket.on('sync:update', refresh);
        socket.on('timelog:created', refresh);
        socket.on('milestone:updated', refresh);
        socket.on('task:accepted', refresh);
        socket.on('task:transfer', refresh);

        return () => {
            socket.off('sync:update', refresh);
            socket.off('timelog:created', refresh);
            socket.off('milestone:updated', refresh);
            socket.off('task:accepted', refresh);
            socket.off('task:transfer', refresh);
        };
    }, [fetchActivities]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchActivities(false);
    }, [fetchActivities]);

    // ─── FILTERING ──────────────────────────────────────
    const filteredActivities = useMemo(() => {
        let result = activities;

        if (selectedFilter !== 'All') {
            result = result.filter(a => a.type === selectedFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(a =>
                a.taskTitle?.toLowerCase().includes(query) ||
                a.actorName?.toLowerCase().includes(query) ||
                a.action?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [activities, selectedFilter, searchQuery]);

    // ─── GROUPING ───────────────────────────────────────
    const groupedActivities = useMemo(() => {
        const groups: Record<string, any[]> = {
            'TODAY': [], 'YESTERDAY': [], 'LATER': []
        };
        filteredActivities.forEach(activity => {
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
                            backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
                            paddingVertical: 12, borderRadius: 12,
                        }}>
                        <ExternalLink size={14} color="#6B7280" />
                        <Text style={{ marginLeft: 6, color: '#6B7280', fontSize: 13, fontWeight: '600' }}>
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
                marginBottom: 16, borderRadius: 16, backgroundColor: '#FFFFFF',
                padding: 16, borderWidth: 1, borderColor: '#F3F4F6',
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
            }}>
                {/* Top Row: Status Badge & Time */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ backgroundColor: config.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
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
                        <Text style={{ color: '#374151', fontSize: 14, lineHeight: 20 }}>
                            <Text style={{ fontWeight: '700', color: '#111827' }}>{activity.actorName}</Text>
                            {' marked '}
                            <Text style={{ fontWeight: '700', color: '#111827' }}>{activity.taskTitle}</Text>
                            {' as '}
                            <Text style={{ fontWeight: '700', color: config.color }}>{activity.stateBadge?.replace('_', ' ')}</Text>
                        </Text>
                        {activity.userRole && (
                            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4, fontWeight: '500' }}>
                                Triggered by {activity.userRole}
                            </Text>
                        )}
                    </View>

                    <View style={{
                        width: 44, height: 44, borderRadius: 12, backgroundColor: config.bg,
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        {getStatusIcon(activity.stateBadge, 20)}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={{ marginTop: 16 }}>
                    {getActionButton(activity)}
                </View>
            </View>
        );
    };

    // ─── MAIN RENDER ────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            {/* ═══ HEADER ═══════════════════════════════════ */}
            <View style={{
                paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>
                    Activity
                </Text>
                <View style={{
                    width: 42, height: 42, borderRadius: 14, backgroundColor: '#F3F4F6',
                    alignItems: 'center', justifyContent: 'center'
                }}>
                    <View style={{
                        position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4,
                        backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#F3F4F6', zIndex: 1,
                    }} />
                    <History size={20} color="#374151" />
                </View>
            </View>

            {/* ═══ SCOPE CONTROL (3-Segment Pill) ════════════ */}
            <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 16 }}>
                <View style={{
                    backgroundColor: '#F3F4F6', padding: 4, borderRadius: 14, flexDirection: 'row',
                }}>
                    {[
                        { key: 'all' as const, label: 'All Activity' },
                        { key: 'delegated' as const, label: 'Delegated' },
                        { key: 'my_tasks' as const, label: 'My Tasks' },
                    ].map(tab => {
                        const isActive = scope === tab.key;
                        return (
                            <TouchableOpacity key={tab.key}
                                onPress={() => setScope(tab.key)}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
                                    backgroundColor: isActive ? '#111827' : 'transparent',
                                }}>
                                <Text style={{
                                    fontSize: 12, fontWeight: isActive ? '700' : '600',
                                    color: isActive ? '#FFFFFF' : '#6B7280',
                                }}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* ═══ SEARCH BAR ════════════════════════════════ */}
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                <View style={{
                    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                    flexDirection: 'row', alignItems: 'center',
                }}>
                    <Search size={18} color="#9CA3AF" />
                    <TextInput
                        style={{ flex: 1, marginLeft: 10, fontSize: 15, color: '#111827', fontWeight: '500', padding: 0 }}
                        placeholder="Search logs, actors, or events..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color="#9CA3AF" />
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
                                    backgroundColor: isActive ? (filter.id === 'All' ? '#111827' : filter.bg) : '#FFFFFF',
                                    borderColor: isActive ? (filter.id === 'All' ? '#111827' : filter.color) : '#E5E7EB',
                                }}>
                                {filter.id !== 'All' && (
                                    <View style={{
                                        width: 6, height: 6, borderRadius: 3,
                                        backgroundColor: filter.color, marginRight: 6
                                    }} />
                                )}
                                <Text style={{
                                    fontSize: 13, fontWeight: isActive ? '700' : '500',
                                    color: isActive ? (filter.id === 'All' ? '#FFFFFF' : filter.color) : '#6B7280',
                                }}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ═══ TIMELINE FEED ══════════════════════════════ */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#111827" size="large" />
                    <Text style={{ marginTop: 12, color: '#9CA3AF', fontSize: 13, fontWeight: '500' }}>
                        Loading feed...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.keys(groupedActivities).map(dateGroup => (
                        groupedActivities[dateGroup].length > 0 && (
                            <View key={dateGroup} style={{ marginTop: 16 }}>
                                <Text style={{
                                    color: '#9CA3AF', fontSize: 11, fontWeight: '800',
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
                                width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                            }}>
                                <History size={32} color="#D1D5DB" />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#9CA3AF', marginBottom: 4 }}>
                                No activity found
                            </Text>
                            <Text style={{ fontSize: 13, color: '#D1D5DB', fontWeight: '500', textAlign: 'center' }}>
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
