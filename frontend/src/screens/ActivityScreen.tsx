import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput, LayoutAnimation, Platform, UIManager, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search,
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
    History,
    Timer,
    ExternalLink,
    LifeBuoy,
    Unlock,
    CheckCircle
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
    return 'EARLIER';
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
    const [scope, setScope] = useState<'my_tasks' | 'delegated' | 'all'>('all');
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('All');

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
    }, [scope]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivities(false);
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
        const groups: Record<string, any[]> = {
            'TODAY': [],
            'YESTERDAY': [],
            'EARLIER': []
        };

        filteredActivities.forEach(activity => {
            const group = getDateGroup(activity.timestamp);
            groups[group].push(activity);
        });

        return groups;
    }, [filteredActivities]);

    const getStatusConfig = (state: string) => {
        switch (state) {
            case 'BLOCKED':
                return {
                    bg: 'bg-red-50',
                    text: 'text-red-600',
                    label: 'BLOCKED',
                    border: 'border-red-100',
                    tint: 'bg-red-[50/30]',
                    iconBg: 'bg-red-100'
                };
            case 'HELP_REQUESTED':
                return {
                    bg: 'bg-blue-50',
                    text: 'text-blue-600',
                    label: 'HELP REQUESTED',
                    border: 'border-blue-100',
                    tint: 'bg-blue-[50/30]',
                    iconBg: 'bg-blue-100'
                };
            case 'PENDING':
                return {
                    bg: 'bg-amber-50',
                    text: 'text-amber-600',
                    label: 'PENDING',
                    border: 'border-amber-100',
                    tint: 'bg-amber-[50/30]',
                    iconBg: 'bg-amber-100'
                };
            case 'IN_SYNC':
                return {
                    bg: 'bg-green-50',
                    text: 'text-green-600',
                    label: 'IN SYNC',
                    border: 'border-green-100',
                    tint: 'bg-green-[50/30]',
                    iconBg: 'bg-green-100'
                };
            default:
                return {
                    bg: 'bg-gray-50',
                    text: 'text-gray-600',
                    label: state.replace('_', ' '),
                    border: 'border-gray-100',
                    tint: 'bg-white',
                    iconBg: 'bg-gray-100'
                };
        }
    };

    const renderCard = (activity: any) => {
        const config = getStatusConfig(activity.stateBadge);

        return (
            <View
                key={activity.id}
                className={`mb-4 rounded-[32px] border ${config.border} ${config.tint} p-6 pb-5 shadow-sm`}
            >
                {/* Top Row: Status & Time */}
                <View className="flex-row justify-between items-center mb-4">
                    <View className={`${config.bg} px-3 py-1 rounded-full`}>
                        <Text className={`${config.text} text-[10px] font-black tracking-widest uppercase`}>
                            {config.label}
                        </Text>
                    </View>
                    <Text className="text-gray-400 text-xs font-medium">
                        {formatTimeAgo(activity.timestamp)}
                    </Text>
                </View>

                {/* Content Row: Text & Avatar */}
                <View className="flex-row items-center">
                    <View className="flex-1 pr-4">
                        <Text className="text-[#1A1A1A] text-[15px] font-bold leading-[22px]">
                            <Text className="font-extrabold">{activity.actorName}</Text>
                            {` marked `}
                            <Text className="text-blue-600 font-extrabold">{activity.taskTitle}</Text>
                            {` as `}
                            <Text className={config.text}>{activity.stateBadge.replace('_', ' ')}</Text>
                        </Text>
                        <Text className="text-gray-400 text-xs mt-2 italic font-medium">
                            Role: {activity.userRole}
                        </Text>
                    </View>

                    <View className={`w-14 h-14 rounded-2xl ${config.iconBg} items-center justify-center overflow-hidden`}>
                        {/* Placeholder for Avatar or Custom Icon based on state */}
                        {activity.stateBadge === 'BLOCKED' ? <Ban size={24} color="#ef4444" strokeWidth={2.5} /> :
                            activity.stateBadge === 'HELP_REQUESTED' ? <HelpCircle size={24} color="#3b82f6" strokeWidth={2.5} /> :
                                activity.stateBadge === 'PENDING' ? <Clock size={24} color="#f59e0b" strokeWidth={2.5} /> :
                                    <CheckCircle size={24} color="#10b981" strokeWidth={2.5} />}
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="mt-5 flex-row gap-3">
                    {activity.stateBadge === 'BLOCKED' ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                            className="flex-1 bg-white border border-red-200 py-3 rounded-2xl items-center justify-center flex-row"
                        >
                            <Unlock size={16} color="#ef4444" className="mr-2" />
                            <Text className="text-red-600 font-black text-xs uppercase tracking-widest">Unblock Task</Text>
                        </TouchableOpacity>
                    ) : activity.stateBadge === 'HELP_REQUESTED' ? (
                        <>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                                className="flex-[1.5] bg-blue-600 py-3 rounded-2xl items-center justify-center flex-row"
                            >
                                <LifeBuoy size={16} color="#fff" className="mr-2" />
                                <Text className="text-white font-black text-xs uppercase tracking-widest">Provide Support</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                                className="flex-1 bg-white border border-blue-200 py-3 rounded-2xl items-center justify-center"
                            >
                                <Text className="text-blue-600 font-black text-xs uppercase tracking-widest">Details</Text>
                            </TouchableOpacity>
                        </>
                    ) : activity.stateBadge === 'PENDING' ? (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                            className="flex-1 bg-white border border-amber-200 py-3 rounded-2xl items-center justify-center flex-row"
                        >
                            <CheckCircle2 size={16} color="#f59e0b" className="mr-2" />
                            <Text className="text-amber-600 font-black text-xs uppercase tracking-widest">Approve Transfer</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('TaskDetail', { taskId: activity.taskId })}
                            className="flex-1 bg-white border border-gray-100 py-3 rounded-2xl items-center justify-center flex-row"
                        >
                            <ExternalLink size={16} color="#4B5563" className="mr-2" />
                            <Text className="text-gray-600 font-black text-xs uppercase tracking-widest">View Task</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center">
                <View className="p-2 -ml-2">
                    <ActivityIcon size={24} color="#000" />
                </View>
                <Text className="text-xl font-black text-gray-900 tracking-tight">Activity</Text>
                <View className="w-10 h-10 rounded-full items-center justify-center">
                    <View className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 border-2 border-white" />
                    <History size={24} color="#000" />
                </View>
            </View>

            {/* 3-Segment Scope Control */}
            <View className="px-6 mb-6">
                <View className="bg-gray-100/80 p-1.5 rounded-[20px] flex-row">
                    <TouchableOpacity
                        onPress={() => setScope('all')}
                        className={`flex-1 py-3 items-center rounded-2xl ${scope === 'all' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-black text-[11px] uppercase tracking-wider ${scope === 'all' ? 'text-blue-600' : 'text-gray-400'}`}>All Activity</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setScope('delegated')}
                        className={`flex-1 py-3 items-center rounded-2xl ${scope === 'delegated' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-black text-[11px] uppercase tracking-wider ${scope === 'delegated' ? 'text-blue-600' : 'text-gray-400'}`}>Delegated By Me</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setScope('my_tasks')}
                        className={`flex-1 py-3 items-center rounded-2xl ${scope === 'my_tasks' ? 'bg-white shadow-sm' : ''}`}
                    >
                        <Text className={`font-black text-[11px] uppercase tracking-wider ${scope === 'my_tasks' ? 'text-blue-600' : 'text-gray-400'}`}>My Tasks</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View className="px-6 mb-6">
                <View className="bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-3.5 flex-row items-center">
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 font-bold text-sm"
                        placeholder="Search task title or actor name"
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Filter Chips */}
            <View className="mb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 10 }}>
                    {FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            onPress={() => setSelectedFilter(filter)}
                            className={`mr-3 px-6 py-2.5 rounded-full border ${selectedFilter === filter ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-100'}`}
                        >
                            <Text className={`text-[11px] font-black uppercase tracking-widest ${selectedFilter === filter ? 'text-white' : 'text-gray-500'}`}>
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
                    <Text className="text-gray-400 font-bold mt-4 uppercase tracking-widest text-[10px]">Synchronizing Feed</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
                >
                    {Object.keys(groupedActivities).map(dateGroup => (
                        groupedActivities[dateGroup].length > 0 && (
                            <View key={dateGroup} className="mt-6">
                                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[3px] mb-6">
                                    {dateGroup}
                                </Text>
                                {groupedActivities[dateGroup].map(activity => renderCard(activity))}
                            </View>
                        )
                    ))}

                    {filteredActivities.length === 0 && (
                        <View className="items-center justify-center py-20 opacity-30">
                            <History size={60} color="#e5e7eb" strokeWidth={1} />
                            <Text className="text-gray-400 font-black mt-4 uppercase tracking-widest text-[10px]">No activity entries found</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default ActivityScreen;
