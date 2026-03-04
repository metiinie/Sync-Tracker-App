import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import {
    ArrowLeft, Settings as SettingsIcon, LogOut,
    CheckCircle2, LayoutList, Activity, Clock,
    ChevronDown, ChevronUp, ChevronRight, Edit2, Lock,
    Bell, Mail, Timer, Info, Sun, Moon, Database, Share2, RefreshCw,
    Briefcase, Shield, User as UserIcon, HelpCircle, MapPin
} from 'lucide-react-native';
import api from '../services/api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfileStats } from '../hooks/useProfile';
import { useActivities } from '../hooks/useActivities';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';
import { LinearGradient } from 'expo-linear-gradient';

type TabButtonProps = {
    icon: any;
    label: string;
    onPress: () => void;
    active?: boolean;
};

const QuickActionButton = ({ icon: Icon, label, onPress, active }: TabButtonProps) => (
    <TouchableOpacity
        onPress={onPress}
        className="bg-white rounded-2xl p-4 flex-1 mx-1 items-center justify-center border border-gray-50 shadow-sm"
        style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 }}
    >
        <View className="mb-2">
            <Icon size={20} color="#6366f1" />
        </View>
        <Text className="font-bold text-gray-800 text-xs">{label}</Text>
    </TouchableOpacity>
);

const KPICard = ({ label, value, valueColor = '#111827', isDark }: { label: string, value: string | number, valueColor?: string, isDark: boolean }) => (
    <View
        className={`p-4 rounded-2xl w-[48%] mb-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0.3 : 0.03, shadowRadius: 4, elevation: 2 }}
    >
        <Text className="text-gray-400 text-[10px] font-black tracking-widest uppercase mb-2">{label}</Text>
        <Text className="text-2xl font-black" style={{ color: isDark && valueColor === '#111827' ? '#F9FAFB' : valueColor }}>{value}</Text>
    </View>
);

const SettingItem = ({ icon: Icon, label, color, rightElement, onPress, isDark }: { icon: any, label: string, color: string, rightElement?: React.ReactNode, onPress?: () => void, isDark: boolean }) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="flex-row items-center py-4 px-6"
    >
        <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: color }}>
            <Icon size={20} color="#fff" />
        </View>
        <Text className={`flex-1 ml-4 font-bold text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{label}</Text>
        {rightElement ? rightElement : <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />}
    </TouchableOpacity>
);

const ProfileScreen = ({ navigation }: any) => {
    const { user, setSession, settings, updateSettings } = useAuthStore();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'profile' | 'settings'>('profile');
    const [isExporting, setIsExporting] = useState(false);
    const [isClearingCache, setIsClearingCache] = useState(false);

    const { data: stats, isLoading: statsLoading, isRefetching: statsRefetching } = useProfileStats();
    const { data: recentActivitiesData = [], isLoading: activitiesLoading, isRefetching: activitiesRefetching } = useActivities('my_tasks', '', 3);

    const recentActivities = Array.isArray(recentActivitiesData) ? recentActivitiesData : [];

    const isLoading = (statsLoading || activitiesLoading) && !stats && recentActivities.length === 0;
    const isRefetching = statsRefetching || activitiesRefetching;

    const onRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
        queryClient.invalidateQueries({ queryKey: ['activities', 'my_tasks'] });
    };

    useEffect(() => {
        const socket = getSocket();
        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['profile', 'stats'] });
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
                await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Sync Tracker Logs' });
            } else {
                Alert.alert("Export Error", "Sharing is not available on this device.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to export logs.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleClearCache = async () => {
        Alert.alert("Clear Cache", "Are you sure you want to clear local cache? You will need to re-login.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Clear", style: "destructive", onPress: async () => {
                    setIsClearingCache(true);
                    try {
                        await AsyncStorage.clear();
                        Alert.alert("Success", "Cache cleared.", [{ text: "OK", onPress: handleLogout }]);
                    } catch (e) { Alert.alert("Error", "Failed to clear cache."); }
                    finally { setIsClearingCache(false); }
                }
            }
        ]);
    };

    const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Responsible User';
    const isDark = settings?.theme === 'dark';

    if (isLoading) {
        return (
            <SafeAreaView className={`flex-1 justify-center items-center ${isDark ? 'bg-gray-900' : 'bg-[#FAFAFA]'}`}>
                <ActivityIndicator color={isDark ? '#F9FAFB' : '#6366f1'} size="large" />
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
            {/* Redesigned User Card */}
            <LinearGradient
                colors={isDark ? ['#1e293b', '#0f172a'] : ['#f0f7ff', '#ffffff']}
                className="rounded-3xl p-6 items-center mb-8 border border-white/50"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 }}
            >
                <View className="relative mb-4">
                    <View className="w-20 h-20 rounded-full border-4 border-white shadow-sm items-center justify-center bg-blue-50 overflow-hidden">
                        {user?.user_metadata?.avatar_url ? (
                            <Image source={{ uri: user.user_metadata.avatar_url }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <UserIcon size={40} color="#3b82f6" />
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('EditProfile')}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-100 rounded-full items-center justify-center shadow-sm"
                    >
                        <Edit2 size={12} color="#1f2937" />
                    </TouchableOpacity>
                </View>

                <View className="items-center">
                    <View className="flex-row items-center mb-1">
                        <Text className={`text-2xl font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{displayName}</Text>
                        <View className="ml-2 bg-blue-600 rounded-full p-[2px]">
                            <CheckCircle2 size={10} color="#fff" />
                        </View>
                    </View>
                    <Text className="text-gray-400 font-medium text-xs mb-4">{user?.email}</Text>

                    <View className="flex-row">
                        <View className="bg-purple-50 px-4 py-1.5 rounded-full mr-2">
                            <Text className="text-purple-600 font-bold text-[10px] uppercase">User</Text>
                        </View>
                        <View className="bg-green-50 px-4 py-1.5 rounded-full flex-row items-center">
                            <View className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                            <Text className="text-green-600 font-bold text-[10px] uppercase">Online</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Quick Actions */}
            <View className="flex-row mb-10 -mx-1">
                <QuickActionButton icon={LayoutList} label="Tasks" onPress={() => navigation.navigate('Tasks')} />
                <QuickActionButton icon={Activity} label="Activity" onPress={() => navigation.navigate('Activity')} />
                <QuickActionButton icon={Clock} label="Log" onPress={() => navigation.navigate('Tasks')} />
            </View>

            {/* Performance Overview */}
            <Text className="text-[10px] font-black tracking-[2px] uppercase text-gray-400 mb-4 ml-1">
                Performance Overview
            </Text>
            <View className="flex-row flex-wrap justify-between mb-4">
                <KPICard label="Tasks Owned" value={stats?.active ?? '0'} isDark={isDark} />
                <KPICard label="Tasks Blocked" value={stats?.blocked ?? '0'} valueColor="#EF4444" isDark={isDark} />
                <KPICard label="Help Requests" value={stats?.helpRequested ?? '0'} valueColor="#3B82F6" isDark={isDark} />
                <KPICard label="Time Logged" value={stats?.totalTimeMins ? `${Math.floor(stats.totalTimeMins / 60)}h ${stats.totalTimeMins % 60}m` : '0h 0m'} isDark={isDark} />
            </View>

            {/* Recent Activity */}
            <View className="flex-row justify-between items-center mb-4 pr-1">
                <Text className="text-[10px] font-black tracking-[2px] uppercase text-gray-400">
                    Recent Activity
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
                    <Text className="text-blue-600 font-bold text-[10px] uppercase tracking-wider">View All</Text>
                </TouchableOpacity>
            </View>

            <View className={`rounded-3xl mb-8 border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}>
                {recentActivities.length > 0 ? recentActivities.map((act: any, idx: number, arr: any[]) => (
                    <TouchableOpacity
                        key={act.id}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: act.taskId })}
                        className={`flex-row items-center p-5 ${idx !== arr.length - 1 ? (isDark ? 'border-b border-gray-700' : 'border-b border-gray-50') : ''}`}
                    >
                        <View className="w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center mr-4">
                            <Activity size={18} color={act.stateBadge === 'BLOCKED' ? '#ef4444' : act.stateBadge === 'HELP_REQUESTED' ? '#3b82f6' : '#10b981'} />
                        </View>
                        <View className="flex-1">
                            <Text className={`font-bold text-sm mb-0.5 ${isDark ? 'text-gray-100' : 'text-gray-900'}`} numberOfLines={1}>{act.taskTitle}</Text>
                            <Text className="text-gray-400 text-xs font-medium">{act.actionText}</Text>
                        </View>
                        <ChevronRight size={16} color={isDark ? '#4B5563' : '#D1D5DB'} />
                    </TouchableOpacity>
                )) : (
                    <View className="p-10 items-center">
                        <Activity size={32} color="#e5e7eb" className="mb-2" />
                        <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Recent Activity</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );

    const renderSettings = () => (
        <ScrollView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-[#f8f9fb]'}`} showsVerticalScrollIndicator={false}>
            {/* Header Section simplified */}
            <View className="items-center pt-12 pb-10">
                <Text className={`text-2xl font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{displayName}</Text>
            </View>

            {/* Settings Card */}
            <View className={`flex-1 rounded-t-3xl pt-6 pb-24 border-t ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <Text className={`px-8 text-xl font-black mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Settings</Text>

                <SettingItem
                    isDark={isDark}
                    icon={UserIcon}
                    label="Edit Account"
                    color="#4dd0e1"
                    onPress={() => navigation.navigate('EditProfile')}
                />

                <SettingItem
                    isDark={isDark}
                    icon={Lock}
                    label="Password"
                    color="#ff5252"
                    onPress={() => navigation.navigate('Security')}
                />

                <SettingItem
                    isDark={isDark}
                    icon={Bell}
                    label="Notifications"
                    color="#ff4081"
                    onPress={() => navigation.navigate('NotificationSettings')}
                    rightElement={
                        <View className="flex-row items-center">
                            <Text className="text-gray-400 font-bold mr-2">On</Text>
                            <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
                        </View>
                    }
                />

                <SettingItem
                    isDark={isDark}
                    icon={Shield}
                    label="Privacy"
                    color="#f06292"
                    onPress={() => navigation.navigate('Privacy')}
                />

                <SettingItem
                    isDark={isDark}
                    icon={Briefcase}
                    label="Workspaces"
                    color="#26a69a"
                    onPress={() => navigation.navigate('Workspaces')}
                />

                <SettingItem
                    isDark={isDark}
                    icon={RefreshCw}
                    label="Real-time Sync"
                    color="#6366f1"
                    rightElement={
                        <Switch
                            value={settings?.realTimeSync}
                            onValueChange={handleRealTimeSyncToggle}
                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                            thumbColor="#fff"
                        />
                    }
                />
                <SettingItem
                    isDark={isDark}
                    icon={Share2}
                    label="Export Logs"
                    color="#8b5cf6"
                    onPress={handleExportLogs}
                />
                <SettingItem
                    isDark={isDark}
                    icon={Database}
                    label="Clear Cache"
                    color="#64748b"
                    onPress={handleClearCache}
                />

                <SettingItem
                    isDark={isDark}
                    icon={HelpCircle}
                    label="Help"
                    color="#4fc3f7"
                    onPress={() => navigation.navigate('Help')}
                />

                <SettingItem
                    isDark={isDark}
                    icon={Info}
                    label="About"
                    color="#80deea"
                    onPress={() => navigation.navigate('About')}
                />

                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center mt-8 px-8 py-6"
                >
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                        <LogOut size={20} color="#ef4444" />
                    </View>
                    <Text className="ml-4 font-black text-red-500 uppercase tracking-widest text-sm">Sign Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : (view === 'profile' ? 'bg-[#FAFAFA]' : 'bg-[#f8f9fb]')}`}>
            {/* Nav Header */}
            <View className="flex-row justify-between items-center px-6 pt-2 pb-4">
                <TouchableOpacity
                    onPress={() => view === 'settings' ? setView('profile') : navigation.goBack()}
                    className={`w-10 h-10 items-center justify-center rounded-full border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}
                >
                    <ArrowLeft size={20} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>

                <Text className={`text-lg font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    {view === 'profile' ? 'Profile' : 'Settings'}
                </Text>

                {view === 'profile' ? (
                    <TouchableOpacity
                        onPress={() => setView('settings')}
                        className={`w-10 h-10 items-center justify-center rounded-full border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}
                    >
                        <SettingsIcon size={20} color={isDark ? '#F9FAFB' : '#111827'} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
                        className={`w-10 h-10 items-center justify-center rounded-full border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}
                    >
                        {isDark ? <Sun size={20} color="#FBBF24" /> : <Moon size={20} color="#6366f1" />}
                    </TouchableOpacity>
                )}
            </View>

            {view === 'profile' ? renderProfile() : renderSettings()}
        </SafeAreaView>
    );
};

export default ProfileScreen;
