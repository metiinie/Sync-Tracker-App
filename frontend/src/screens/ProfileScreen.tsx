import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { User, LogOut, Shield, AlertCircle, Clock, CheckCircle2, Flag, Settings as SettingsIcon } from 'lucide-react-native';
import api from '../services/api';

const ProfileScreen = () => {
    const { user, token, setSession } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/tasks/stats');
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

    const calculateHealth = () => {
        if (!stats || !stats.syncStates) return { inSync: 0, needsUpdate: 0, blocked: 0 };
        const total = Object.values(stats.syncStates).reduce((a: any, b: any) => a + b, 0) as number;
        if (total === 0) return { inSync: 0, needsUpdate: 0, blocked: 0 };

        return {
            inSync: Math.round((stats.syncStates.IN_SYNC / total) * 100),
            needsUpdate: Math.round((stats.syncStates.NEEDS_UPDATE / total) * 100),
            blocked: Math.round(((stats.syncStates.BLOCKED + stats.syncStates.HELP_REQUESTED) / total) * 100),
        };
    };

    const health = calculateHealth();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView
                className="flex-1 px-6 pt-6"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* User Identity */}
                <View className="flex-row items-center mb-8">
                    <View className="w-16 h-16 bg-gray-900 rounded-2xl items-center justify-center">
                        <User size={32} color="#fff" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-2xl font-black text-gray-900">{user?.user_metadata?.name || 'Responsible User'}</Text>
                        <Text className="text-gray-400 font-bold text-xs uppercase tracking-widest">{user?.email}</Text>
                    </View>
                </View>

                {/* Accountability Snapshot */}
                <Text className="text-lg font-black text-gray-900 mb-4">Accountability Snapshot</Text>

                {loading ? (
                    <ActivityIndicator color="#000" className="my-10" />
                ) : (
                    <>
                        <View className="flex-row flex-wrap justify-between mb-8">
                            <MetricTile label="Active" value={stats?.active || 0} icon={Shield} color="#3b82f6" />
                            <MetricTile label="Blocked" value={stats?.blocked || 0} icon={AlertCircle} color="#ef4444" />
                            <MetricTile label="Help Req." value={stats?.helpRequested || 0} icon={Clock} color="#f59e0b" />
                            <MetricTile label="Delegated" value={stats?.delegated || 0} icon={ArrowUpRight} color="#10b981" />
                        </View>

                        {/* Sync Health */}
                        <View className="bg-gray-50 p-6 rounded-3xl mb-8 border border-gray-100">
                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="font-black text-gray-900">Sync Health</Text>
                                <Text className="text-green-600 font-bold">{health.inSync}% Optimal</Text>
                            </View>

                            <View className="h-3 bg-gray-200 rounded-full flex-row overflow-hidden mb-4">
                                <View style={{ width: `${health.inSync}%` }} className="h-full bg-green-500" />
                                <View style={{ width: `${health.needsUpdate}%` }} className="h-full bg-yellow-500" />
                                <View style={{ width: `${health.blocked}%` }} className="h-full bg-red-500" />
                            </View>

                            <View className="flex-row justify-between">
                                <View className="flex-row items-center">
                                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                                    <Text className="text-[10px] text-gray-400 font-bold uppercase">In Sync</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                    <Text className="text-[10px] text-gray-400 font-bold uppercase">Needs Update</Text>
                                </View>
                                <View className="flex-row items-center">
                                    <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                                    <Text className="text-[10px] text-gray-400 font-bold uppercase">Critical/Blocked</Text>
                                </View>
                            </View>
                        </View>

                        {/* Time Metrics */}
                        <View className="flex-row items-center justify-between bg-black p-6 rounded-3xl mb-10">
                            <View>
                                <Text className="text-gray-400 text-[10px] font-black uppercase tracking-tighter">Total Execution Time</Text>
                                <Text className="text-white text-3xl font-black">{stats?.totalTimeMins || 0}m</Text>
                            </View>
                            <Clock size={32} color="#fff" opacity={0.2} />
                        </View>
                    </>
                )}

                {/* Settings & Logout */}
                <Text className="text-lg font-black text-gray-900 mb-4">Settings</Text>

                <TouchableOpacity className="flex-row items-center p-5 bg-gray-50 rounded-2xl mb-3 border border-gray-100">
                    <SettingsIcon size={20} color="#4b5563" />
                    <Text className="ml-4 font-bold text-gray-700 flex-1">Sync Preferences</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleLogout}
                    className="flex-row items-center p-5 bg-red-50 rounded-2xl mb-3 border border-red-100"
                >
                    <LogOut size={20} color="#ef4444" />
                    <Text className="ml-4 font-bold text-red-600">Secure Logout</Text>
                </TouchableOpacity>

                <View className="items-center mt-6">
                    <Text className="text-gray-300 text-[10px] font-black uppercase tracking-widest">Sync Tracker v1.0.0 (MVP)</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const MetricTile = ({ label, value, icon: Icon, color }: any) => (
    <View className="w-[48%] bg-gray-50 p-5 rounded-3xl mb-4 border border-gray-100">
        <View className="flex-row justify-between items-center mb-1">
            <Icon size={16} color={color} />
            <Text className="text-2xl font-black text-gray-900">{value}</Text>
        </View>
        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</Text>
    </View>
);

// Lucide icon fix for ArrowUpRight if not imported correct above
import { ArrowUpRight } from 'lucide-react-native';

export default ProfileScreen;
