import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
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

const KPICard = ({ label, value, valueColor = '#111827' }: { label: string, value: string | number, valueColor?: string }) => (
    <View
        className="bg-white p-5 rounded-3xl w-[48%] mb-4 border border-gray-100"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 }}
    >
        <Text className="text-gray-400 text-xs font-bold mb-2">{label}</Text>
        <Text className="text-2xl font-black" style={{ color: valueColor }}>{value}</Text>
    </View>
);

const ProfileScreen = ({ navigation }: any) => {
    const { user, setSession, settings, updateSettings } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState<'profile' | 'settings'>('profile');

    const fetchProfileData = async () => {
        try {
            const [statsRes, activityRes] = await Promise.all([
                api.get('/users/stats'),
                api.get('/activities?scope=my_tasks&limit=3')
            ]);
            setStats(statsRes.data);
            setRecentActivities(activityRes.data);
        } catch (err) {
            console.error('Failed to fetch profile data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfileData();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Responsible User';

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
                <ActivityIndicator color="#000" size="large" />
            </SafeAreaView>
        );
    }

    const renderProfile = () => (
        <ScrollView
            className="flex-1 px-6"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Profile Card */}
            <View
                className="bg-white rounded-[32px] p-6 mb-2 items-center flex-row border border-gray-100"
                style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}
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
                        <Text className="text-xl font-black text-gray-900">{displayName}</Text>
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
                <KPICard label="Tasks Owned" value={stats?.active ?? '0'} />
                <KPICard label="Tasks Blocked" value={stats?.blocked ?? '0'} valueColor="#EF4444" />
                <KPICard label="Help Requests" value={stats?.helpRequested ?? '0'} valueColor="#3B82F6" />
                <KPICard label="Time Logged" value={`${stats?.totalTimeMins ? Math.floor(stats.totalTimeMins / 60) + 'h ' + (stats.totalTimeMins % 60) + 'm' : '0h 0m'}`} />
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
            <View className="bg-white rounded-3xl mb-8 border border-gray-100 overflow-hidden shadow-sm pt-2 pb-2">
                {recentActivities.length > 0 ? recentActivities.map((act, idx, arr) => (
                    <TouchableOpacity
                        key={act.id}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: act.taskId })}
                        className={`flex-row items-center p-5 ${idx !== arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                        <View className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: act.stateBadge === 'BLOCKED' ? '#ef4444' : act.stateBadge === 'HELP_REQUESTED' ? '#3b82f6' : '#10b981' }} />
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-sm mb-1" numberOfLines={1}>{act.taskTitle}</Text>
                            <Text className="text-gray-400 text-xs font-medium">{act.actionText}</Text>
                        </View>
                        <ChevronRight size={16} color="#D1D5DB" />
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
            className="flex-1 bg-white"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        >
            <View className="border-t border-gray-50">
                {/* Account Security Group */}
                <TouchableOpacity className="flex-row items-center px-6 py-5 border-b border-gray-50">
                    <Edit2 size={20} color="#4B5563" />
                    <Text className="ml-4 font-bold text-gray-800 flex-1 text-base">Update Personal Info</Text>
                    <ChevronRight size={18} color="#D1D5DB" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-6 py-5 border-b border-gray-50">
                    <Lock size={20} color="#4B5563" />
                    <Text className="ml-4 font-bold text-gray-800 flex-1 text-base">Security & Password</Text>
                    <ChevronRight size={18} color="#D1D5DB" />
                </TouchableOpacity>

                {/* Workspace Group */}
                <TouchableOpacity className="flex-row items-center px-6 py-5 border-b border-gray-50">
                    <Briefcase size={20} color="#4B5563" />
                    <Text className="ml-4 font-bold text-gray-800 flex-1 text-base">Workspace Settings</Text>
                    <ChevronRight size={18} color="#D1D5DB" />
                </TouchableOpacity>

                {/* Notifications Group */}
                <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-50">
                    <View className="flex-row items-center">
                        <Bell size={20} color="#4B5563" />
                        <Text className="ml-4 font-bold text-gray-800 text-base">In-app Alerts</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => updateSettings({ inAppNotif: !settings?.inAppNotif })}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${settings?.inAppNotif ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                        <View className={`w-4 h-4 bg-white rounded-full shadow-sm ${settings?.inAppNotif ? 'ml-auto' : ''}`} />
                    </TouchableOpacity>
                </View>
                <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-50">
                    <View className="flex-row items-center">
                        <Mail size={20} color="#4B5563" />
                        <Text className="ml-4 font-bold text-gray-800 text-base">Email Digest</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => updateSettings({ emailDigest: !settings?.emailDigest })}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${settings?.emailDigest ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                        <View className={`w-4 h-4 bg-white rounded-full shadow-sm ${settings?.emailDigest ? 'ml-auto' : ''}`} />
                    </TouchableOpacity>
                </View>

                {/* Sync & Data Group */}
                <View className="flex-row justify-between items-center px-6 py-5 border-b border-gray-50">
                    <View className="flex-row items-center">
                        <RefreshCw size={20} color="#4B5563" />
                        <Text className="ml-4 font-bold text-gray-800 text-base">Real-time Sync</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => updateSettings({ realTimeSync: !settings?.realTimeSync })}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${settings?.realTimeSync ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                        <View className={`w-4 h-4 bg-white rounded-full shadow-sm ${settings?.realTimeSync ? 'ml-auto' : ''}`} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity className="flex-row items-center px-6 py-5 border-b border-gray-50">
                    <Share2 size={20} color="#4B5563" />
                    <Text className="ml-4 font-bold text-gray-800 flex-1 text-base">Export Activity Logs</Text>
                    <Text className="text-blue-600 font-bold text-xs uppercase">CSV/JSON</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-6 py-5 border-b border-gray-100">
                    <Database size={20} color="#4B5563" />
                    <Text className="ml-4 font-bold text-gray-800 flex-1 text-base">Clear Local Cache</Text>
                    <Text className="text-gray-400 font-bold text-xs">24.5 MB</Text>
                </TouchableOpacity>

                {/* Sign Out - Integrated closely at the bottom of the list */}
                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center px-6 py-6 bg-red-50/30"
                >
                    <LogOut size={20} color="#EF4444" />
                    <Text className="ml-4 font-black text-red-500 uppercase tracking-widest text-sm">Sign Out</Text>
                </TouchableOpacity>

                {/* System Info */}
                <View className="px-6 py-10 items-center">
                    <View className="bg-gray-50 px-3 py-1 rounded-full mb-3">
                        <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Info</Text>
                    </View>
                    <Text className="text-gray-400 text-xs font-medium">Sync Tracker v1.0.4 (Alpha)</Text>
                    <Text className="text-gray-300 text-[10px] mt-1 font-mono">ENV: PRODUCTION • BUILD: 2026.03.02</Text>
                    <View className="flex-row items-center mt-4 opacity-30">
                        <Info size={12} color="#9CA3AF" />
                        <Text className="ml-1 text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Powered by Antigravity OS</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView className="flex-1 bg-[#F9FAFB]">
            {/* Header */}
            <View className={`flex-row justify-between items-center px-6 pt-4 pb-4 ${view === 'settings' ? 'bg-white border-b border-gray-50' : 'bg-[#F9FAFB]'}`}>
                <TouchableOpacity
                    onPress={() => view === 'settings' ? setView('profile') : navigation.goBack()}
                    className="p-2 -ml-2"
                >
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-gray-900">
                    {view === 'profile' ? 'Account Profile' : 'Settings'}
                </Text>
                {view === 'profile' ? (
                    <TouchableOpacity onPress={() => setView('settings')} className="p-2 -mr-2">
                        <SettingsIcon size={24} color="#4B5563" />
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
