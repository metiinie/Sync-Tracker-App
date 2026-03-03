import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import {
    ArrowLeft, Settings as SettingsIcon, LogOut,
    CheckCircle2, LayoutList, Activity, Clock,
    ChevronDown, ChevronUp, ChevronRight, Edit2, Lock,
    Bell, Mail, Timer, Info, Sun, Moon, Database, Share2, RefreshCw,
    Briefcase
} from 'lucide-react-native';
import api from '../services/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfileStats } from '../hooks/useProfile';
import { useActivities } from '../hooks/useActivities';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';

type TabButtonProps = {
    icon: any;
    label: string;
    onPress: () => void;
    active?: boolean;
};

const QuickActionButton = ({ icon: Icon, label, onPress, active }: TabButtonProps) => (
    <TouchableOpacity
        onPress={onPress}
        className={`flex-row items-center justify-center px-4 py-3 rounded-full flex-1 mx-1 border ${active ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
            }`}
        style={!active ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : {}}
    >
        <Icon size={16} color={active ? '#fff' : '#1f2937'} />
        <Text className={`font-bold ml-2 text-xs ${active ? 'text-white' : 'text-gray-800'}`}>{label}</Text>
    </TouchableOpacity>
);

const KPICard = ({ label, value, valueColor = '#111827', isDark }: { label: string, value: string | number, valueColor?: string, isDark: boolean }) => (
    <View
        className={`p-5 rounded-3xl w-[48%] mb-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.03, shadowRadius: 4, elevation: 2 }}
    >
        <Text className="text-gray-400 text-xs font-bold mb-2">{label}</Text>
        <Text className="text-2xl font-black" style={{ color: isDark && valueColor === '#111827' ? '#F9FAFB' : valueColor }}>{value}</Text>
    </View>
);

const ProfileScreen = ({ navigation }: any) => {
    const { user, setSession, settings, updateSettings } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'profile' | 'settings'>('profile');
    const [isExporting, setIsExporting] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);

    // ─── QUERY HOOKS ────────────────────────────────────
    const { data: stats, isLoading: statsLoading, isRefetching: statsRefetching } = useProfileStats();
    const { data: recentActivities = [], isLoading: activitiesLoading, isRefetching: activitiesRefetching } = useActivities('my_tasks', '', 3);

    const isLoading = statsLoading || activitiesLoading;
    const isRefetching = statsRefetching || activitiesRefetching;

    const onRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['activities', 'my_tasks'] });
    };

    // ─── REAL-TIME SYNC ────────────────────────────────
    useEffect(() => {
        const socket = getSocket();
        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });

        // Stats should refresh on any meaningful task change
        socket.on('task:created', invalidate);
        socket.on('task:updated', invalidate);
        socket.on('task:deleted', invalidate);
        socket.on('task:completed', invalidate);
        socket.on('task:accepted', invalidate);
        socket.on('milestone:completed', invalidate);
        socket.on('sync:update', invalidate);

        return () => {
            socket.off('task:created', invalidate);
            socket.off('task:updated', invalidate);
            socket.off('task:deleted', invalidate);
            socket.off('task:completed', invalidate);
            socket.off('task:accepted', invalidate);
            socket.off('milestone:completed', invalidate);
            socket.off('sync:update', invalidate);
        };
    }, [queryClient]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const handleRealTimeSyncToggle = () => {
        const newValue = !settings?.realTimeSync;
        updateSettings({ realTimeSync: newValue });
        Alert.alert(
            "Real-time Sync",
            newValue ? "Real-time updates are now enabled." : "Real-time updates have been paused."
        );
    };

    const handleExportLogs = async () => {
        setIsExporting(true);
        try {
            const [tasksRes, activitiesRes] = await Promise.all([
                api.get('/tasks'),
                api.get('/activities?scope=all&limit=100')
            ]);

            const exportData = {
                timestamp: new Date().toISOString(),
                user: user?.email,
                tasks: tasksRes.data,
                activities: activitiesRes.data
            };

            const fileUri = `${FileSystem.cacheDirectory}sync_tracker_export.json`;
            await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export Sync Tracker Logs'
                });
            } else {
                Alert.alert("Export Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            console.error("Export logs error:", error);
            Alert.alert("Error", "Failed to export logs.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearCache = async () => {
        Alert.alert(
            "Clear Cache",
            "Are you sure you want to clear the local application cache? You will need to re-login.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        setIsClearingCache(true);
                        try {
                            // Leave supabase session alone, clear everything else
                            const keys = await AsyncStorage.getAllKeys();
                            const keysToKeep = keys.filter(k => k.includes('supabase'));
                            const multiSet = keysToKeep.map(k => [k, ''] as [string, string]); // We actually want to KEEP these. 
                            // It's safer to just clear specific app keys or clear all and force relogin
                            await AsyncStorage.clear();
                            Alert.alert("Success", "Cache cleared. Signing out...", [{ text: "OK", onPress: handleLogout }]);
                        } catch (e) {
                            Alert.alert("Error", "Failed to clear cache.");
                        } finally {
                            setIsClearingCache(false);
                        }
                    }
                }
            ]
        );
    };

    const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Responsible User';

    const isDark = settings?.theme === 'dark';

    if (isLoading && !stats && recentActivities.length === 0) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center ${isDark ? 'bg-gray-900' : 'bg-[#FAFAFA]'}`}>
                <ActivityIndicator color={isDark ? '#F9FAFB' : '#000'} size="large" />
            </SafeAreaView>
        );
    }

    const renderProfile = () => (
        <ScrollView
            className="flex-1 px-6"
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={isDark ? '#F9FAFB' : '#111827'} />}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Card */}
            <View
                className={`rounded-[32px] p-6 mb-2 items-center flex-row border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.3 : 0.05, shadowRadius: 10, elevation: 3 }}
            >
                <View className="relative w-20 h-20">
                    {user?.user_metadata?.avatar_url ? (
                        <Image
                            source={{ uri: user.user_metadata.avatar_url }}
                            className="w-20 h-20 rounded-full"
                        />
                    ) : (
                        <View className="w-20 h-20 bg-[#FCD34D] rounded-full items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                            <View className="w-10 h-10 bg-[#FDBA74] rounded-full mt-2" />
                        </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
                </View>

                <View className="ml-5 flex-1 justify-center">
                    <View className="flex-row items-center">
                        <Text className={`text-xl font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{displayName}</Text>
                        <View className="ml-1 bg-blue-600 rounded-full p-[2px]">
                            <CheckCircle2 size={12} color="#fff" />
                        </View>
                    </View>
                    <Text className="text-gray-500 font-medium text-sm mt-0.5">{user?.email}</Text>
                    <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                        STANDARD USER • <Text className="text-blue-600">ONLINE</Text>
                    </Text>
                </View>
            </View>

            {/* Quick Actions - Narrowed space and closer to card */}
            <View className="flex-row mb-8 -mx-0.5">
                <QuickActionButton
                    icon={LayoutList}
                    label="Tasks"
                    onPress={() => navigation.navigate('Tasks')}
                />
                <QuickActionButton
                    icon={Activity}
                    label="Activity"
                    onPress={() => navigation.navigate('Activity')}
                />
                <QuickActionButton
                    icon={Clock}
                    label="Log"
                    onPress={() => navigation.navigate('Tasks')}
                />
            </View>

            {/* Key Performance Indicators */}
            <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 pl-2">
                Key Performance Indicators
            </Text>
            <View className="flex-row flex-wrap justify-between mb-2">
                <KPICard label="Tasks Owned" value={stats?.active ?? '0'} isDark={isDark} />
                <KPICard label="Tasks Blocked" value={stats?.blocked ?? '0'} valueColor="#EF4444" isDark={isDark} />
                <KPICard label="Help Requests" value={stats?.helpRequested ?? '0'} valueColor="#3B82F6" isDark={isDark} />
                <KPICard label="Time Logged" value={`${stats?.totalTimeMins ? Math.floor(stats.totalTimeMins / 60) + 'h ' + (stats.totalTimeMins % 60) + 'm' : '0h 0m'}`} isDark={isDark} />
            </View>

            {/* Recent Activity */}
            <View className="flex-row justify-between items-end mb-4 pr-2 mt-4">
                <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 pl-2">
                    Recent Activity
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
                    <Text className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">View All</Text>
                </TouchableOpacity>
            </View>
            <View className={`rounded-3xl mb-8 border overflow-hidden shadow-sm pt-2 pb-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {recentActivities.length > 0 ? recentActivities.map((act: any, idx: number, arr: any[]) => (
                    <TouchableOpacity
                        key={act.id}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: act.taskId })}
                        className={`flex-row items-center p-5 ${idx !== arr.length - 1 ? (isDark ? 'border-b border-gray-700' : 'border-b border-gray-50') : ''}`}
                    >
                        <View className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: act.stateBadge === 'BLOCKED' ? '#ef4444' : act.stateBadge === 'HELP_REQUESTED' ? '#3b82f6' : '#10b981' }} />
                        <View className="flex-1">
                            <Text className={`font-bold text-sm mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`} numberOfLines={1}>{act.taskTitle}</Text>
                            <Text className="text-gray-400 text-xs font-medium">{act.actionText}</Text>
                        </View>
                        <ChevronRight size={16} color={isDark ? '#4B5563' : '#D1D5DB'} />
                    </TouchableOpacity>
                )) : (
                    <View className="p-8 items-center">
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Recent Activity</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderSettings = () => (
        <ScrollView
            className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-white'}`}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <View className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-50'}`}>
                {/* Account Security Group */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditProfile')}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}
                >
                    <Edit2 size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    <Text className={`ml-4 font-bold flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Edit Profile</Text>
                    <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Security')}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}
                >
                    <Lock size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    <Text className={`ml-4 font-bold flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Security</Text>
                    <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
                </TouchableOpacity>

                {/* Workspace Group */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Workspaces')}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}
                >
                    <Briefcase size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    <Text className={`ml-4 font-bold flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Workspaces</Text>
                    <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
                </TouchableOpacity>

                {/* Notifications Group */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('NotificationSettings')}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}
                >
                    <Bell size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    <Text className={`ml-4 font-bold flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Notifications</Text>
                    <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
                </TouchableOpacity>


                {/* Sync & Data Group */}
                <View className={`flex-row justify-between items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}>
                    <View className="flex-row items-center">
                        <RefreshCw size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                        <Text className={`ml-4 font-bold text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Real-time Sync</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleRealTimeSyncToggle}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${settings?.realTimeSync ? 'bg-blue-600' : (isDark ? 'bg-gray-700' : 'bg-gray-200')}`}
                    >
                        <View className={`w-4 h-4 rounded-full shadow-sm ${settings?.realTimeSync ? 'ml-auto bg-white' : 'bg-white'}`} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    onPress={handleExportLogs}
                    disabled={isExporting}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-50'}`}
                >
                    {isExporting ? <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#4B5563'} className="mr-1" /> : <Share2 size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />}
                    <Text className={`ml-4 font-bold flex-1 text-base ${isExporting ? 'text-gray-500' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
                        {isExporting ? 'Exporting...' : 'Export Logs'}
                    </Text>
                    <Text className="text-blue-600 font-bold text-xs uppercase">JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleClearCache}
                    disabled={isClearingCache}
                    className={`flex-row items-center px-6 py-5 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
                >
                    {isClearingCache ? <ActivityIndicator size="small" color={isDark ? '#9CA3AF' : '#4B5563'} className="mr-1" /> : <Database size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />}
                    <Text className={`ml-4 font-bold flex-1 text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Clear Cache</Text>
                    <Text className="text-gray-500 font-bold text-xs">Clear Local</Text>
                </TouchableOpacity>

                {/* Sign Out - Integrated closely at the bottom of the list */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className={`flex-row items-center px-6 py-6 ${isDark ? 'bg-red-900/20' : 'bg-red-50/30'}`}
                >
                    <LogOut size={20} color="#EF4444" />
                    <Text className="ml-4 font-black text-red-500 uppercase tracking-widest text-sm">Sign Out</Text>
                </TouchableOpacity>

                {/* System Info */}
                <View className="px-6 py-10 items-center">
                    <Text className="text-gray-500 text-[10px] font-bold tracking-widest uppercase">v1.0.4</Text>
                    <View className="flex-row items-center mt-2 opacity-40">
                        <Info size={12} color="#9CA3AF" />
                        <Text className="ml-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Powered by Awol</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-[#F9FAFB]'}`}>
            {/* Header */}
            <View className={`flex-row justify-between items-center px-6 pt-4 pb-4 ${view === 'settings' ? (isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-50') : (isDark ? 'bg-gray-900' : 'bg-[#F9FAFB]')}`}>
                <TouchableOpacity
                    onPress={() => view === 'settings' ? setView('profile') : navigation.goBack()}
                    className="p-2 -ml-2"
                >
                    <ArrowLeft size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>
                <Text className={`text-lg font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {view === 'profile' ? 'Account Profile' : 'Settings'}
                </Text>
                {view === 'profile' ? (
                    <TouchableOpacity onPress={() => setView('settings')} className="p-2 -mr-2">
                        <SettingsIcon size={24} color={isDark ? '#9CA3AF' : '#4B5563'} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => updateSettings({ theme: settings?.theme === 'dark' ? 'light' : 'dark' })}
                        className="p-2 -mr-2"
                    >
                        {settings?.theme === 'dark' ? <Sun size={24} color="#F59E0B" /> : <Moon size={24} color="#3B82F6" />}
                    </TouchableOpacity>
                )}
            </View>

            {view === 'profile' ? renderProfile() : renderSettings()}
        </SafeAreaView>
    );
};

export default ProfileScreen;
