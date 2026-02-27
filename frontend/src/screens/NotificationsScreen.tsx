import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle2, UserPlus, AlertTriangle, ArrowRightLeft, Flag, Circle, Filter } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

const NotificationsScreen = ({ navigation }: any) => {
    const { token } = useAuthStore();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const socket = getSocket();
        socket.on('notification:new', (notification) => {
            setNotifications(prev => [notification, ...prev]);
        });

        return () => {
            socket.off('notification:new');
        };
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string, taskId: string | null) => {
        try {
            await api.patch(`/notifications/${id}/read`, {});
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: 'true' } : n));

            if (taskId) {
                navigation.navigate('TaskDetail', { taskId });
            }
        } catch (err) {
            console.error('Failed to mark as read', err);
        }
    };

    const filteredNotifications = useMemo(() => {
        if (filter === 'UNREAD') return notifications.filter(n => n.isRead === 'false');
        return notifications;
    }, [notifications, filter]);

    const getIcon = (type: string) => {
        const size = 20;
        switch (type) {
            case 'ASSIGNED': return <Bell size={size} color="#f59e0b" />;
            case 'PARTICIPANT_ADDED': return <UserPlus size={size} color="#3b82f6" />;
            case 'HELP_REQUESTED': return <AlertTriangle size={size} color="#ef4444" />;
            case 'TRANSFER_INITIATED': return <ArrowRightLeft size={size} color="#8b5cf6" />;
            case 'MILESTONE_COMPLETED': return <CheckCircle2 size={size} color="#10b981" />;
            default: return <Bell size={size} color="#6b7280" />;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-2 pb-4 border-b border-gray-100 flex-row justify-between items-center">
                <View>
                    <Text className="text-2xl font-black text-gray-900">Signals</Text>
                    <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">Accountability Feed</Text>
                </View>
                <TouchableOpacity
                    onPress={() => setFilter(filter === 'ALL' ? 'UNREAD' : 'ALL')}
                    className={`flex-row items-center px-4 py-2 rounded-full border ${filter === 'UNREAD' ? 'bg-black border-black' : 'bg-gray-50 border-gray-200'}`}
                >
                    <Filter size={14} color={filter === 'UNREAD' ? '#fff' : '#4b5563'} />
                    <Text className={`ml-2 text-xs font-bold ${filter === 'UNREAD' ? 'text-white' : 'text-gray-600'}`}>
                        {filter === 'UNREAD' ? 'Unread Only' : 'All Signals'}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color="#000" />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    contentContainerStyle={{ padding: 24 }}
                >
                    {filteredNotifications.length === 0 ? (
                        <View className="items-center justify-center py-20">
                            <View className="bg-gray-50 p-8 rounded-full mb-4">
                                <Bell size={40} color="#e5e7eb" />
                            </View>
                            <Text className="text-gray-400 font-bold">No accountability signals found</Text>
                        </View>
                    ) : (
                        filteredNotifications.map((n) => (
                            <TouchableOpacity
                                key={n.id}
                                onPress={() => markAsRead(n.id, n.taskId)}
                                className={`flex-row p-5 rounded-3xl mb-4 border ${n.isRead === 'false' ? 'bg-white border-black border-2 shadow-sm' : 'bg-gray-50 border-gray-100'}`}
                            >
                                <View className={`w-12 h-12 rounded-2xl items-center justify-center ${n.isRead === 'false' ? 'bg-gray-900' : 'bg-gray-200'}`}>
                                    {getIcon(n.type)}
                                </View>
                                <View className="ml-4 flex-1">
                                    <View className="flex-row justify-between items-start mb-1">
                                        <Text className={`text-[10px] font-black uppercase tracking-widest ${n.isRead === 'false' ? 'text-black' : 'text-gray-400'}`}>
                                            {n.type.replace('_', ' ')}
                                        </Text>
                                        <Text className="text-[10px] text-gray-400">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text className={`text-sm leading-5 ${n.isRead === 'false' ? 'text-gray-900 font-bold' : 'text-gray-500 font-medium'}`}>
                                        {n.content}
                                    </Text>
                                    {n.task && (
                                        <View className="flex-row items-center mt-2">
                                            <Flag size={10} color="#9ca3af" />
                                            <Text className="text-[10px] text-gray-400 font-bold ml-1 italic">{n.task.title}</Text>
                                        </View>
                                    )}
                                </View>
                                {n.isRead === 'false' && (
                                    <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export default NotificationsScreen;
