import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, TextInput, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical, Flag, Clock, User, CheckCircle2, History, MessageSquare, AlertCircle, Plus, ArrowRightLeft, Users, ChevronRight } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

const TaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const { user } = useAuthStore();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchTask = async () => {
        try {
            const response = await api.get(`/tasks/${taskId}`);
            setTask(response.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
        const socket = getSocket();
        socket.emit('joinTask', { taskId });

        socket.on('sync:update', (data) => {
            if (data.taskId === taskId) {
                setTask((prev: any) => prev ? { ...prev, syncState: data.syncState } : prev);
            }
        });

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('sync:update');
        };
    }, [taskId]);


    const getSyncColor = (state: string) => {
        switch (state) {
            case 'IN_SYNC': return { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-700', label: 'All metrics synchronized' };
            case 'NEEDS_UPDATE': return { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-700', label: 'Awaiting input' };
            case 'BLOCKED': return { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-700', label: 'Missing requirements' };
            case 'HELP_REQUESTED': return { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700', label: 'Assistance needed' };
            default: return { bg: 'bg-gray-400', border: 'border-gray-400', text: 'text-gray-600', label: 'Unknown state' };
        }
    };

    if (loading || !task) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    const mainSyncStyle = getSyncColor(task.syncState);

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-gray-900 tracking-tight" numberOfLines={1}>{task.title}</Text>
                <TouchableOpacity className="p-2">
                    <MoreVertical size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTask} />}
            >
                {/* Title & Metadata Block */}
                <View className="bg-white px-6 pt-6 pb-6 mb-2 border-b border-gray-100 shadow-sm shadow-gray-200/50">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                            <Text className="text-green-700 text-xs font-bold tracking-wider uppercase">On Track</Text>
                        </View>
                        <Text className="text-gray-400 text-xs font-bold">
                            Due Oct 15
                        </Text>
                    </View>

                    <Text className="text-2xl font-black text-gray-900 mb-2">{task.title}</Text>

                    <View className="flex-row items-center mb-6">
                        <View className="w-5 h-5 rounded-full bg-blue-100 items-center justify-center mr-2 border border-blue-200">
                            <Text className="text-[8px] font-bold text-blue-700">{task.assigner?.name?.[0] || 'A'}</Text>
                        </View>
                        <Text className="text-gray-500 text-sm">By {task.assigner?.name?.split(' ')[0]}</Text>
                        <Text className="text-gray-300 mx-2">•</Text>
                        <Text className="text-blue-600 font-bold text-sm">High Priority</Text>
                    </View>

                    {/* Action Buttons Row */}
                    <View className="flex-row items-center space-x-3">
                        <TouchableOpacity className="flex-row items-center bg-blue-600 px-5 py-3 rounded-xl shadow-sm shadow-blue-500/30 mr-3">
                            <ArrowRightLeft size={16} color="#ffffff" />
                            <Text className="text-white font-bold ml-2 text-sm">Transfer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center border border-gray-200 px-5 py-3 rounded-xl mr-3 bg-white">
                            <Users size={16} color="#4b5563" />
                            <Text className="text-gray-700 font-bold ml-2 text-sm">Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center border border-gray-200 px-5 py-3 rounded-xl bg-white">
                            <Flag size={16} color="#4b5563" />
                            <Text className="text-gray-700 font-bold ml-2 text-sm">Help</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* RESPONSIBILITY TREE */}
                <View className="px-6 py-6 bg-white border-b border-gray-100 mb-2">
                    <Text className="text-xs font-black text-gray-400 uppercase tracking-[2px] mb-6">Responsibility Tree</Text>

                    {/* TREE CONTAINER */}
                    <View className="pl-4 border-l-2 border-gray-100 relative">

                        {/* 1. Main Owner Node */}
                        <TouchableOpacity
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 relative ml-2 z-10"
                            style={{ elevation: 2 }}
                        >
                            {/* Branch Line Connector */}
                            <View className="absolute top-1/2 -left-6 w-6 border-b-2 border-gray-100" />
                            <View className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl ${mainSyncStyle.bg}`} />

                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm mr-3 items-center justify-center">
                                        <Text className="text-xs font-bold text-gray-600">{task.owner?.name?.[0]}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-gray-900 text-base">{task.owner?.name}</Text>
                                        <Text className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">Responsible Owner</Text>
                                        <View className="flex-row items-center mt-1">
                                            <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${mainSyncStyle.bg}`} />
                                            <Text className="text-gray-500 text-xs">{mainSyncStyle.label}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="text-gray-400 text-xs font-medium mb-3">2h ago</Text>
                                    <ChevronDown size={16} color="#9ca3af" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* 2. Participants Nodes */}
                        <View className="pl-6 border-l-2 border-orange-200 relative ml-8 -mt-6 pt-10">
                            {task.participants?.map((p: any, index: number) => {
                                // Defaulting participant sync states based on mockups for visual demo
                                // Assuming real implementation would map p.syncState which doesn't exist yet on participant model
                                const pSync = p.role === 'Reviewer' ? getSyncColor('IN_SYNC') : getSyncColor(index % 2 === 0 ? 'NEEDS_UPDATE' : 'BLOCKED');

                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 relative z-10"
                                    >
                                        {/* Connector Line */}
                                        <View className="absolute top-1/2 -left-6 w-6 border-b-2 border-orange-200" />
                                        <View className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl ${pSync.bg}`} />

                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center flex-1">
                                                <View className="w-8 h-8 rounded-full bg-gray-100 mr-3 items-center justify-center border border-white shadow-sm">
                                                    <Text className="text-gray-500 font-bold text-[10px]">{p.user?.name?.[0]}</Text>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="font-bold text-gray-900 text-sm">{p.user?.name}</Text>
                                                    <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">{p.role}</Text>
                                                    <View className="flex-row items-center mt-1">
                                                        <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${pSync.bg}`} />
                                                        <Text className="text-gray-500 text-xs" numberOfLines={1}>{pSync.label}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View className="items-end">
                                                <Text className={`text-xs font-medium mb-3 ${pSync.bg === 'bg-red-500' ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                                    {pSync.bg === 'bg-red-500' ? 'Overdue' : '1d ago'}
                                                </Text>
                                                <ChevronRight size={16} color="#9ca3af" />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                    </View>
                </View>

                {/* OWNER'S SYNC HISTORY SECTIONS */}
                <View className="px-6 py-6 bg-white">
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-lg font-bold text-gray-900">{task.owner?.name?.split(' ')[0]}'s Sync History</Text>
                        <History size={18} color="#9ca3af" />
                    </View>

                    {/* Quick Info Grid */}
                    <View className="flex-row justify-between mb-8">
                        <View className="flex-1 items-center bg-gray-50 py-3 rounded-2xl mr-3 border border-gray-100">
                            <Clock size={16} color="#6b7280" className="mb-1" />
                            <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Time Logged</Text>
                            <Text className="font-black text-gray-900">12h 45m</Text>
                        </View>
                        <View className="flex-1 items-center bg-gray-50 py-3 rounded-2xl border border-gray-100">
                            <CheckCircle2 size={16} color="#6b7280" className="mb-1" />
                            <Text className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Milestones</Text>
                            <Text className="font-black text-gray-900">4 / 8</Text>
                        </View>
                    </View>

                    {/* Timeline Log Mockup */}
                    <View className="mb-2">
                        {[
                            { title: 'Status changed to In Sync', time: '10:24 AM', type: 'success' },
                            { title: 'Project ownership transferred', time: 'Yesterday', type: 'info' },
                            { title: 'Requested help regarding API Authentication', time: 'Yesterday', type: 'warning' },
                        ].map((log, index) => (
                            <View key={index} className="flex-row mb-6 relative">
                                <View className="items-center z-10 w-8">
                                    <View className={`w-3 h-3 rounded-full mt-1 ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                    {index !== 2 && <View className="absolute top-5 bottom-[-24px] w-0.5 bg-gray-100" />}
                                </View>
                                <View className="flex-1 bg-white border border-gray-100 shadow-sm rounded-xl p-3 -mt-1 ml-2">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-xs text-gray-500 font-bold">{log.time}</Text>
                                    </View>
                                    <Text className="text-sm text-gray-800 font-medium">{log.title}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// Dumb Arrow for Tree View Line Connector
const ChevronDown = ({ size, color }: any) => (
    <View style={{ transform: [{ rotate: '-90deg' }] }}>
        <ChevronLeft size={size} color={color} />
    </View>
);

export default TaskDetailScreen;
