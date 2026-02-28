import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { AlertTriangle, Activity, RefreshCcw, HelpCircle, Clock, ShieldAlert, ChevronRight, User } from 'lucide-react-native';
import TaskItem from '../components/TaskItem';

const AdminDashboard = ({ navigation }: any) => {
    const [refreshing, setRefreshing] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['adminDashboard'],
        queryFn: async () => {
            const res = await api.get('/admin/dashboard');
            return res.data;
        }
    });

    const onRefresh = async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    };

    if (isLoading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const { metrics, highRiskTasks, transferAlerts, activityPulse } = data || {};

    const MetricCard = ({ title, count, icon: Icon, colorClass, bgColorClass }: any) => (
        <View className={`flex-1 ${bgColorClass} p-4 rounded-3xl mr-2 mb-2 min-w-[45%]`}>
            <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[10px] font-black text-white/70 uppercase tracking-widest">{title}</Text>
                <Icon size={16} color="rgba(255,255,255,0.7)" />
            </View>
            <Text className="text-2xl font-black text-white">{count || 0}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-3xl font-black text-gray-900">Workspace</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest italic">Global Oversight</Text>
            </View>

            <ScrollView
                className="flex-1 px-6"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* 1️⃣ Global Metrics */}
                <View className="mt-6 flex-row flex-wrap">
                    <MetricCard
                        title="Active Tasks"
                        count={metrics?.totalActiveTasks}
                        icon={Activity}
                        bgColorClass="bg-blue-600"
                    />
                    <MetricCard
                        title="Blocked"
                        count={metrics?.blockedTasks}
                        icon={ShieldAlert}
                        bgColorClass="bg-red-500"
                    />
                    <MetricCard
                        title="Help Req"
                        count={metrics?.helpRequests}
                        icon={HelpCircle}
                        bgColorClass="bg-orange-500"
                    />
                    <MetricCard
                        title="Pending"
                        count={metrics?.pendingAcceptance}
                        icon={Clock}
                        bgColorClass="bg-black"
                    />
                    <MetricCard
                        title="Stale Sync"
                        count={metrics?.staleSyncTasks}
                        icon={RefreshCcw}
                        bgColorClass="bg-gray-400"
                    />
                </View>

                {/* 2️⃣ High-Risk Tasks */}
                <View className="mt-8 mb-4">
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">🔴 High-Risk Tasks</Text>
                    {highRiskTasks?.length === 0 ? (
                        <Text className="text-gray-400 text-sm font-medium italic">No high-risk tasks detected.</Text>
                    ) : (
                        highRiskTasks?.map((task: any) => (
                            <TouchableOpacity
                                key={task.id}
                                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                                className="mb-2"
                            >
                                <TaskItem
                                    task={task}
                                    onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                                />
                                <View className="absolute top-2 right-2 bg-red-600 px-2 py-0.5 rounded-full">
                                    <Text className="text-[8px] font-black text-white uppercase">Critical</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* 3️⃣ Transfer Alerts */}
                <View className="mt-8">
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">📤 Transfer Alerts</Text>
                    {transferAlerts?.length === 0 ? (
                        <Text className="text-gray-400 text-sm font-medium italic">No pending transfers.</Text>
                    ) : (
                        transferAlerts?.map((task: any) => (
                            <TouchableOpacity
                                key={task.id}
                                onPress={() => navigation.navigate('Tasks', { screen: 'TaskDetail', params: { taskId: task.id } })}
                                className="bg-gray-50 p-4 rounded-3xl mb-2 flex-row items-center border border-gray-100"
                            >
                                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
                                    <RefreshCcw size={20} color="#2563eb" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-gray-900 font-bold">{task.title}</Text>
                                    <Text className="text-gray-500 text-xs">Waiting for {task.owner?.name}</Text>
                                </View>
                                <ChevronRight size={16} color="#9ca3af" />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* 4️⃣ Activity Pulse */}
                <View className="mt-8">
                    <Text className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">⚡ Activity Pulse</Text>
                    <View className="bg-white rounded-3xl overflow-hidden border border-gray-100">
                        {activityPulse?.length === 0 ? (
                            <Text className="p-4 text-gray-400 text-sm italic">No recent activity.</Text>
                        ) : (
                            activityPulse?.map((log: any, idx: number) => (
                                <View key={log.id} className={`p-4 flex-row items-start ${idx !== activityPulse.length - 1 ? 'border-b border-gray-50' : ''}`}>
                                    <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mt-1">
                                        <User size={14} color="#6b7280" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-gray-900 font-bold text-sm">{log.user?.name}</Text>
                                            <Text className="text-gray-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                        <Text className="text-gray-600 text-xs">{log.action}</Text>
                                        {log.task && (
                                            <Text className="text-blue-600 text-[10px] font-black uppercase mt-1">@ {log.task.title}</Text>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminDashboard;
