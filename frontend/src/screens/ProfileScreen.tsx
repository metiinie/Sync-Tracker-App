import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import {
    ArrowLeft, Settings as SettingsIcon, LogOut,
    CheckCircle2, LayoutList, Activity, Clock,
    ChevronDown, ChevronUp, ChevronRight, Edit2, Lock,
    Bell, Mail, Timer, Info
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
    const { user, setSession } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // UI State
    const [notifOpen, setNotifOpen] = useState(true);
    const [inAppNotif, setInAppNotif] = useState(true);
    const [emailDigest, setEmailDigest] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/users/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Responsible User';

    // Mock recent activity since it's not in the current endpoint yet,
    // but we can deduce it from tasks active.
    const mockActivity = [
        { id: '1', title: 'Update API Auth Logic', role: 'Lead Developer', color: '#10b981' },
        { id: '2', title: 'Drafting Q3 Security Audit', role: 'Reviewer', color: '#ef4444' },
        { id: '3', title: 'Legacy Migration Plan', role: 'Contributor', color: '#f59e0b' }
    ];

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#FAFAFA] justify-center items-center">
                <ActivityIndicator color="#000" size="large" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F9FAFB]">
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 pt-4 pb-2 bg-[#F9FAFB]">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text className="text-lg font-black text-gray-900">Account Profile</Text>
                <TouchableOpacity className="p-2 -mr-2">
                    <SettingsIcon size={24} color="#4B5563" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View
                    className="bg-white rounded-[32px] p-6 mb-4 items-center flex-row border border-gray-100"
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
                                {/* Fallback avatar style simulating the image illustration */}
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

                {/* Status Text (Italic) */}
                <View className="flex-row items-center mb-6 pl-2">
                    <Info size={14} color="#6B7280" />
                    <Text className="text-gray-500 italic ml-2 text-sm font-medium">Focusing on API Documentation</Text>
                </View>

                {/* Quick Actions */}
                <View className="flex-row justify-between mb-8 -mx-1">
                    <QuickActionButton
                        icon={LayoutList}
                        label="Tasks"
                        onPress={() => navigation.navigate('Tasks')}
                    />
                    <QuickActionButton
                        icon={Activity}
                        label="Activity"
                        onPress={() => navigation.navigate('Team')}
                    />
                    <QuickActionButton
                        icon={Clock}
                        label="Log"
                        onPress={() => { }}
                        active={true}
                    />
                </View>

                {/* Key Performance Indicators */}
                <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 pl-2">
                    Key Performance Indicators
                </Text>
                <View className="flex-row flex-wrap justify-between mb-2">
                    <KPICard label="Tasks Owned" value={stats?.active || '4'} />
                    <KPICard label="Tasks Blocked" value={stats?.blocked || '2'} valueColor="#EF4444" />
                    <KPICard label="Help Requests" value={stats?.helpRequested || '1'} valueColor="#3B82F6" />
                    <KPICard label="Time Logged" value={`${stats?.totalTimeMins ? Math.floor(stats.totalTimeMins / 60) + 'h ' + (stats.totalTimeMins % 60) + 'm' : '12h 45m'}`} />
                </View>

                {/* Recent Activity (also labeled KPI in mockup) */}
                <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 pl-2 mt-4">
                    Recent Activity
                </Text>
                <View className="bg-white rounded-3xl mb-8 border border-gray-100 overflow-hidden shadow-sm pt-2 pb-2">
                    {mockActivity.map((act, idx) => (
                        <TouchableOpacity key={act.id} className={`flex-row items-center p-5 ${idx !== mockActivity.length - 1 ? 'border-b border-gray-50' : ''}`}>
                            <View className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: act.color }} />
                            <View className="flex-1">
                                <Text className="text-gray-900 font-bold text-sm mb-1">{act.title}</Text>
                                <Text className="text-gray-400 text-xs font-medium">{act.role}</Text>
                            </View>
                            <ChevronRight size={16} color="#D1D5DB" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Notification Settings */}
                <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 pl-2">
                    Notification Settings
                </Text>
                <View className="bg-white rounded-3xl mb-8 border border-gray-100 shadow-sm overflow-hidden">
                    <TouchableOpacity
                        onPress={() => setNotifOpen(!notifOpen)}
                        className="flex-row justify-between items-center p-5"
                    >
                        <View className="flex-row items-center">
                            <Bell size={18} color="#6B7280" />
                            <Text className="ml-3 font-bold text-gray-900">Notification Settings</Text>
                        </View>
                        {notifOpen ? <ChevronUp size={18} color="#9CA3AF" /> : <ChevronDown size={18} color="#9CA3AF" />}
                    </TouchableOpacity>

                    {notifOpen && (
                        <View className="px-5 pb-5 mt-2">
                            <View className="flex-row justify-between items-center py-3">
                                <Text className="text-gray-600 font-medium">In-app notifications</Text>
                                {/* Custom simple toggle visually */}
                                <TouchableOpacity
                                    onPress={() => setInAppNotif(!inAppNotif)}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors ${inAppNotif ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <View className={`w-4 h-4 bg-white rounded-full shadow-sm ${inAppNotif ? 'ml-auto' : ''}`} />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row justify-between items-center py-3">
                                <Text className="text-gray-600 font-medium">Email digests</Text>
                                <TouchableOpacity
                                    onPress={() => setEmailDigest(!emailDigest)}
                                    className={`w-11 h-6 rounded-full p-1 transition-colors ${emailDigest ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <View className={`w-4 h-4 bg-white rounded-full shadow-sm ${emailDigest ? 'ml-auto' : ''}`} />
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-between items-center mt-4 bg-gray-50 p-4 rounded-2xl">
                                <View className="flex-row items-center">
                                    <Timer size={16} color="#6B7280" />
                                    <Text className="text-gray-700 font-bold ml-2 text-sm">Presence Timeout</Text>
                                </View>
                                <Text className="text-blue-600 font-bold text-xs">15 min</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Account & Security */}
                <Text className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-4 pl-2 mt-2">
                    Account & Security
                </Text>
                <View className="bg-white rounded-3xl mb-6 border border-gray-100 shadow-sm overflow-hidden py-1">
                    <TouchableOpacity className="flex-row items-center p-5 border-b border-gray-50">
                        <Edit2 size={18} color="#6B7280" />
                        <Text className="ml-4 font-bold text-gray-800 flex-1">Edit Profile</Text>
                        <ChevronRight size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center p-5 border-b border-gray-50">
                        <Lock size={18} color="#6B7280" />
                        <Text className="ml-4 font-bold text-gray-800 flex-1">Change Password</Text>
                        <ChevronRight size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleLogout} className="flex-row items-center p-5">
                        <LogOut size={18} color="#6B7280" />
                        <Text className="ml-4 font-bold text-gray-800 flex-1">Logout</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity className="py-4 items-center justify-center p-5 mb-10">
                    <Text className="text-red-500 font-bold text-[11px] uppercase tracking-widest flex-row items-center">
                        <View className="w-4 h-4 rounded-[4px] border border-red-200 items-center justify-center mr-2">
                            <Text className="text-red-400 text-[10px]">×</Text>
                        </View> DELETE ACCOUNT
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;
