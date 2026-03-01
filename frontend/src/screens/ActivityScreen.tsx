import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search,
    Filter,
    Activity as ActivityIcon,
    Clock,
    Ban,
    HelpCircle,
    CheckCircle2,
    ArrowRightLeft,
    Flag,
    RefreshCcw,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    History,
    Timer
} from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays}d ago`;
};

const getDateGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    return 'Earlier';
};

const FILTERS = [
    'All',
    'Sync Updates',
    'Blocked',
    'Help Requested',
    'Responsibility Accepted',
    'Transfers',
    'Milestones',
    'Time Logged'
];

const ActivityScreen = ({ navigation }: any) => {
    const { user } = useAuthStore();
    const [scope, setScope] = useState<'my_tasks' | 'delegated'>('my_tasks');
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const fetchActivities = async (showLoading = true) => {
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
    };

    useEffect(() => {
        fetchActivities();

        const socket = getSocket();
        // Listen for events that should trigger a feed update
        socket.on('sync:update', () => fetchActivities(false));
        socket.on('timelog:created', () => fetchActivities(false));
        socket.on('milestone:updated', () => fetchActivities(false));
        socket.on('task:accepted', () => fetchActivities(false));
        socket.on('task:transfer', () => fetchActivities(false));

        return () => {
            socket.off('sync:update');
            socket.off('timelog:created');
            socket.off('milestone:updated');
            socket.off('task:accepted');
            socket.off('task:transfer');
        };
    }, [scope]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivities(false);
    };

    const toggleGroup = (groupId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const filteredActivities = useMemo(() => {
        let result = activities;

        if (selectedFilter !== 'All') {
            result = result.filter(a => a.type === selectedFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.taskTitle.toLowerCase().includes(query) ||
                a.actorName.toLowerCase().includes(query)
            );
        }

        return result;
    }, [activities, selectedFilter, searchQuery]);

    const groupedActivities = useMemo(() => {
        // 1. Group by Date
        const dateGroups: Record<string, any[]> = {
            'Today': [],
            'Yesterday': [],
            'Earlier': []
        };

        filteredActivities.forEach(activity => {
            const group = getDateGroup(activity.timestamp);
            dateGroups[group].push(activity);
        });

        // 2. Group within each date by Actor/Task within 5 mins
        const finalGroups: Record<string, any[]> = {};

        Object.keys(dateGroups).forEach(date => {
            const dayActivities = dateGroups[date];
            const processed: any[] = [];

            let currentGroup: any = null;

            dayActivities.forEach((activity, index) => {
                const time = new Date(activity.timestamp).getTime();

                if (currentGroup &&
                    currentGroup.actorId === activity.actorId &&
                    currentGroup.taskId === activity.taskId &&
                    (new Date(currentGroup.activities[0].timestamp).getTime() - time) < 300000) { // 5 mins
                    currentGroup.activities.push(activity);
                } else {
                    currentGroup = {
                        id: `group-${activity.id}`,
                        actorId: activity.actorId,
                        taskId: activity.taskId,
                        actorName: activity.actorName,
                        taskTitle: activity.taskTitle,
                        userRole: activity.userRole,
                        taskState: activity.taskState,
                        activities: [activity]
                    };
                    processed.push(currentGroup);
                }
            });

            finalGroups[date] = processed;
        });

        return finalGroups;
    }, [filteredActivities]);

    const getStateStyles = (state: string) => {
        switch (state) {
            case 'BLOCKED': return { bg: 'bg-red-50', text: 'text-red-600', dot: '#ef4444' };
            case 'HELP_REQUESTED': return { bg: 'bg-blue-50', text: 'text-blue-600', dot: '#3b82f6' };
            case 'NEEDS_UPDATE': return { bg: 'bg-amber-50', text: 'text-amber-600', dot: '#f59e0b' };
            case 'PENDING': return { bg: 'bg-amber-50', text: 'text-amber-600', dot: '#f59e0b' };
            case 'MILESTONE': return { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: '#6366f1' };
            case 'TIME': return { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: '#10b981' };
            default: return { bg: 'bg-green-50', text: 'text-green-600', dot: '#10b981' };
        }
    };

    const getIcon = (type: string, state: string) => {
        const size = 16;
        const styles = getStateStyles(state);

        switch (type) {
            case 'Blocked': return <Ban size={size} color={styles.dot} />;
            case 'Help Requested': return <HelpCircle size={size} color={styles.dot} />;
            case 'Transfers': return <ArrowRightLeft size={size} color={styles.dot} />;
            case 'Milestones': return <Flag size={size} color={styles.dot} />;
            case 'Time Logged': return <Timer size={size} color={styles.dot} />;
            case 'Responsibility Accepted': return <CheckCircle2 size={size} color={styles.dot} />;
            default: return <RefreshCcw size={size} color={styles.dot} />;
        }
    };

    const renderGroup = (group: any) => {
        const isCollapsed = collapsedGroups[group.id];
        const styles = getStateStyles(group.taskState);
        const mainActivity = group.activities[0];

        // Determine card background tint
        let cardBg = 'bg-white';
        if (group.taskState === 'BLOCKED') cardBg = 'bg-red-[50/30]';
        if (group.taskState === 'HELP_REQUESTED') cardBg = 'bg-blue-[50/30]';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: group.taskId } })}
                key={group.id}
                className={`mb-4 rounded-3xl border border-gray-100 shadow-sm overflow-hidden ${cardBg}`}
            >
                <View className="px-5 pt-5 pb-4">
                    <View className="flex-row justify-between items-start">
                        <View className="flex-1 pr-4">
                            <Text className="text-gray-900 font-bold text-base leading-tight">
                                <Text className="text-black font-black">{group.actorName}</Text>
                                {group.activities.length > 1 ? ` performed ${group.activities.length} actions on ` : ` ${mainActivity.action.replace('Sync state updated to ', 'marked ')} on `}
                                <Text className="text-black font-black">{group.taskTitle}</Text>
                            </Text>

                            <View className="flex-row items-center mt-2">
                                <Text className="text-gray-400 text-xs font-bold">
                                    {group.userRole ? `You are ${group.userRole}` : 'Observer'} • Task now {group.taskState.replace('_', ' ')}
                                </Text>
                                <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                                <Text className="text-gray-400 text-xs font-medium">
                                    {formatTimeAgo(mainActivity.timestamp)}
                                </Text>
                            </View>
                        </View>

                        <View className={`${styles.bg} px-3 py-1.5 rounded-full flex-row items-center`}>
                            <View className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: styles.dot }} />
                            <Text className={`${styles.text} text-[10px] font-black tracking-widest`}>
                                {group.taskState}
                            </Text>
                        </View>
                    </View>

                    {group.activities.length > 1 && (
                        <TouchableOpacity
                            onPress={() => toggleGroup(group.id)}
                            className="mt-4 pt-3 border-t border-gray-50 flex-row justify-between items-center"
                        >
                            <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                {isCollapsed ? 'Show' : 'Hide'} {group.activities.length} Grouped Actions
                            </Text>
                            {isCollapsed ? <ChevronDown size={14} color="#9ca3af" /> : <ChevronUp size={14} color="#9ca3af" />}
                        </TouchableOpacity>
                    )}

                    {!isCollapsed && group.activities.length > 1 && (
                        <View className="mt-3">
                            {group.activities.map((act: any, idx: number) => (
                                <View key={act.id} className="flex-row items-center py-1.5 ml-1">
                                    <View className="w-1.5 h-1.5 rounded-full bg-gray-200 mr-3" />
                                    <Text className="text-gray-500 text-xs font-medium flex-1">
                                        {act.action}
                                    </Text>
                                    <Text className="text-gray-300 text-[10px] ml-2">
                                        {formatTimeAgo(act.timestamp)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 pt-2 pb-4">
                <View className="flex-row justify-between items-center mb-6">
                    <View>
                        <Text className="text-3xl font-black text-gray-900 tracking-tight">Activity</Text>
                        <Text className="text-gray-400 text-xs font-black uppercase tracking-[2px]">Accountability Feed</Text>
                    </View>
                    <TouchableOpacity className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <History size={20} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/* Scope Control */}
                <View className="bg-gray-100 p-1.5 rounded-2xl flex-row mb-6">
                    <TouchableOpacity
                        onPress={() => setScope('my_tasks')}
                        className={`flex-1 py-3 items-center rounded-xl ${scope === 'my_tasks' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-black text-sm ${scope === 'my_tasks' ? 'text-gray-900' : 'text-gray-400'}`}>My Tasks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setScope('delegated')}
                        className={`flex-1 py-3 items-center rounded-xl ${scope === 'delegated' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-black text-sm ${scope === 'delegated' ? 'text-gray-900' : 'text-gray-400'}`}>Delegated By Me</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 flex-row items-center mb-6">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 font-bold text-sm"
                        placeholder="Search task title or actor name"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                    {FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setSelectedFilter(filter)}
                            className={`mr-2 px-6 py-2.5 rounded-full border ${selectedFilter === filter ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={`text-xs font-black ${selectedFilter === filter ? 'text-white' : 'text-gray-500'}`}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Timeline Feed */}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#2563eb" size="large" />
                    <Text className="text-gray-400 font-bold mt-4 uppercase tracking-widest text-xs">Synchronizing Feed</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
                >
                    {Object.keys(groupedActivities).map(dateGroup => (
                        groupedActivities[dateGroup].length > 0 && (
                            <View key={dateGroup} className="mt-6">
                                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[3px] mb-6 ml-1">
                                    {dateGroup}
                                </Text>
                                {groupedActivities[dateGroup].map(group => renderGroup(group))}
                            </View>
                        )
                    ))}

                    {filteredActivities.length === 0 && (
                        <View className="items-center justify-center py-20 opacity-40">
                            <History size={60} color="#e5e7eb" strokeWidth={1} />
                            <Text className="text-gray-400 font-black mt-4 uppercase tracking-widest text-xs">No activity entries found</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Floating Action Hint */}
            {activities.length > 0 && !loading && (
                <View className="absolute bottom-32 left-0 right-0 items-center pointer-events-none">
                    <View className="bg-black/80 px-4 py-2 rounded-full flex-row items-center border border-white/20">
                        <Text className="text-white text-[10px] font-black uppercase tracking-widest">
                            Tap Card to Investigation
                        </Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

export default ActivityScreen;
