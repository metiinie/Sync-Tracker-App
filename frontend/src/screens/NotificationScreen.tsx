import React, { useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, AlertCircle, Info, HandMetal } from 'lucide-react-native';
import { timeAgo } from '../utils/timeAgo';
import { useNotifications, useNotificationMutations } from '../hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';

const NotificationScreen = ({ navigation }: any) => {
    const queryClient = useQueryClient();
    const { data: notifications = [], isLoading: notificationsLoading, isRefetching } = useNotifications();
    const { markAsRead, markAllAsRead } = useNotificationMutations();

    // ─── REAL-TIME SYNC ────────────────────────────────
    useEffect(() => {
        const socket = getSocket();
        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

        socket.on('comment:new', invalidate);
        socket.on('task:nudge', invalidate);

        return () => {
            socket.off('comment:new', invalidate);
            socket.off('task:nudge', invalidate);
        };
    }, [queryClient]);

    const onRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleMarkAsReadAction = (id: string) => {
        markAsRead.mutate(id);
    };

    const handleMarkAllReadAction = () => {
        const unreadIds = notifications
            .filter((n: any) => n.isRead === 'false' || n.isRead === false)
            .map((n: any) => n.id);
        if (unreadIds.length > 0) {
            markAllAsRead.mutate(unreadIds);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'NUDGE': return <HandMetal size={18} color="#8B5CF6" />;
            case 'ASSIGNED': return <AlertCircle size={18} color="#3B82F6" />;
            case 'HELP_REQUESTED': return <Info size={18} color="#F59E0B" />;
            case 'TRANSFER_INITIATED': return <AlertCircle size={18} color="#EC4899" />;
            default: return <Bell size={18} color="#6B7280" />;
        }
    };

    const renderEmptyState = () => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <View style={{
                width: 80, height: 80, borderRadius: 30, backgroundColor: '#F3F4F6',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20
            }}>
                <Bell size={32} color="#D1D5DB" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                All clear!
            </Text>
            <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
                You don't have any new notifications right now.
            </Text>
        </View>
    );

    if (notificationsLoading && notifications.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#111827" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF',
                borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 12 }}>
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Notifications</Text>
                </View>
                {notifications.some((n: any) => n.isRead === 'false' || n.isRead === false) && (
                    <TouchableOpacity onPress={handleMarkAllReadAction}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#3B82F6' }}>Mark all as read</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
            >
                {notifications.length === 0 ? renderEmptyState() : (
                    notifications.map((n: any) => (
                        <TouchableOpacity
                            key={n.id}
                            onPress={() => {
                                handleMarkAsReadAction(n.id);
                                if (n.taskId) navigation.navigate('TaskDetail', { taskId: n.taskId });
                            }}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: (n.isRead === 'false' || n.isRead === false) ? '#FFFFFF' : '#F9FAFB',
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                borderWidth: 1,
                                borderColor: (n.isRead === 'false' || n.isRead === false) ? '#E5E7EB' : '#F3F4F6',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: (n.isRead === 'false' || n.isRead === false) ? 0.05 : 0,
                                shadowRadius: 8,
                                elevation: (n.isRead === 'false' || n.isRead === false) ? 2 : 0,
                            }}
                        >
                            {/* Icon container */}
                            <View style={{
                                width: 40, height: 40, borderRadius: 12,
                                backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
                                marginRight: 14, borderWidth: 1, borderColor: '#F3F4F6'
                            }}>
                                {getIcon(n.type)}
                            </View>

                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5 }}>
                                        {n.type}
                                    </Text>
                                    {(n.isRead === 'false' || n.isRead === false) && (
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                                    )}
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: (n.isRead === 'false' || n.isRead === false) ? '700' : '500', color: '#111827', marginBottom: 6 }}>
                                    {n.content}
                                </Text>
                                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                                    {timeAgo(n.createdAt)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationScreen;
