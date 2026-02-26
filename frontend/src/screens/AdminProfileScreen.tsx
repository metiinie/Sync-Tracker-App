import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, TextInput, Modal } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Shield, History, Activity, Database, ChevronRight, Filter, Search, Clock, User, Briefcase } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const AdminProfileScreen = () => {
    const queryClient = useQueryClient();
    const { logout } = useAuthStore();
    const [auditFilters, setAuditFilters] = useState({ userId: '', action: '', visible: false });

    // Queries
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: async () => (await api.get('/admin/settings')).data
    });

    const { data: snapshot, isLoading: snapshotLoading } = useQuery({
        queryKey: ['admin-snapshot'],
        queryFn: async () => (await api.get('/admin/snapshot')).data
    });

    const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
        queryKey: ['admin-audit-logs', auditFilters.userId, auditFilters.action],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (auditFilters.userId) params.append('userId', auditFilters.userId);
            if (auditFilters.action) params.append('action', auditFilters.action);
            return (await api.get(`/admin/audit-logs?${params.toString()}`)).data;
        }
    });

    // Mutations
    const updateSettingsMutation = useMutation({
        mutationFn: async (newData: any) => await api.patch('/admin/settings', newData),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    });

    const SettingToggle = ({ label, value, onValueChange, icon: Icon }: any) => (
        <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
            <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-xl bg-gray-50 items-center justify-center mr-3">
                    <Icon size={18} color="#000" />
                </View>
                <Text className="text-gray-900 font-bold">{label}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#f1f5f9', true: '#000' }}
                thumbColor="#fff"
            />
        </View>
    );

    const SnapshotCard = ({ label, value, icon: Icon, color }: any) => (
        <View className="bg-gray-50 p-4 rounded-3xl mr-4 border border-gray-100 min-w-[120px]">
            <Icon size={16} color={color} />
            <Text className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{label}</Text>
            <Text className="text-lg font-black text-gray-900">{value}</Text>
        </View>
    );

    if (settingsLoading || snapshotLoading) {
        return <View className="flex-1 justify-center items-center bg-white"><ActivityIndicator color="#000" /></View>;
    }

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6">
                <View className="pt-6 pb-2">
                    <Text className="text-3xl font-black text-gray-900 tracking-tight">System</Text>
                    <Text className="text-gray-400 font-medium mb-8">Workspace Oversight & Settings</Text>
                </View>

                {/* System Snapshot */}
                <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Core health metrics</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
                    <SnapshotCard label="Users" value={snapshot.totalUsers} icon={User} color="#3b82f6" />
                    <SnapshotCard label="Tasks" value={snapshot.totalTasks} icon={Briefcase} color="#10b981" />
                    <SnapshotCard label="Active" value={snapshot.activeTasks} icon={Activity} color="#8b5cf6" />
                    <SnapshotCard label="Status" value={snapshot.health} icon={Database} color="#f59e0b" />
                </ScrollView>

                {/* Workspace Settings */}
                <View className="bg-white rounded-[35px] border border-gray-100 p-6 mb-8 shadow-sm">
                    <Text className="font-black text-gray-900 mb-4 text-base">Workspace Controls</Text>

                    <View className="flex-row items-center justify-between py-4 border-b border-gray-50">
                        <View className="flex-row items-center flex-1">
                            <View className="w-8 h-8 rounded-xl bg-gray-50 items-center justify-center mr-3">
                                <Clock size={18} color="#000" />
                            </View>
                            <Text className="text-gray-900 font-bold">Stale Threshold</Text>
                        </View>
                        <TextInput
                            className="text-right font-black text-gray-900 w-20"
                            value={settings.staleThresholdHours}
                            onChangeText={(val) => updateSettingsMutation.mutate({ staleThresholdHours: val })}
                            keyboardType="numeric"
                        />
                        <Text className="text-xs font-bold text-gray-400 ml-1">hrs</Text>
                    </View>

                    <SettingToggle
                        label="Allow Transfers"
                        value={settings.allowResponsibilityTransfer}
                        onValueChange={(val) => updateSettingsMutation.mutate({ allowResponsibilityTransfer: val })}
                        icon={Shield}
                    />
                    <SettingToggle
                        label="Helper Roles"
                        value={settings.enableHelperRole}
                        onValueChange={(val) => updateSettingsMutation.mutate({ enableHelperRole: val })}
                        icon={Activity}
                    />
                </View>

                {/* Audit Logs Trigger */}
                <TouchableOpacity
                    onPress={() => setAuditFilters({ ...auditFilters, visible: true })}
                    className="flex-row items-center bg-black p-6 rounded-[35px] mb-12 shadow-lg"
                >
                    <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                        <History size={24} color="#fff" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-white font-black text-lg">Immutable Audit</Text>
                        <Text className="text-white/60 text-xs font-bold capitalize">View system-wide security logs</Text>
                    </View>
                    <ChevronRight size={24} color="#fff" />
                </TouchableOpacity>

                {/* Sign Out */}
                <TouchableOpacity onPress={logout} className="items-center py-6 mb-10">
                    <Text className="text-red-500 font-black tracking-widest uppercase">Terminate Session</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Audit Logs Modal */}
            <Modal visible={auditFilters.visible} animationType="slide">
                <SafeAreaView className="flex-1 bg-white">
                    <View className="px-6 pt-6 flex-row justify-between items-center">
                        <Text className="text-2xl font-black text-gray-900">Global Audit</Text>
                        <TouchableOpacity onPress={() => setAuditFilters({ ...auditFilters, visible: false })}>
                            <Text className="font-black text-blue-500">Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="px-6 py-4 flex-row">
                        <View className="flex-1 flex-row items-center bg-gray-50 px-4 h-12 rounded-2xl border border-gray-100 mr-2">
                            <Search size={16} color="#94a3b8" />
                            <TextInput
                                placeholder="Search actions..."
                                className="flex-1 ml-2 font-bold text-gray-900"
                                value={auditFilters.action}
                                onChangeText={(text) => setAuditFilters({ ...auditFilters, action: text })}
                            />
                        </View>
                    </View>

                    <FlatList
                        data={auditLogs}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 50 }}
                        renderItem={({ item }) => (
                            <View className="py-4 border-b border-gray-50">
                                <View className="flex-row justify-between items-center mb-1">
                                    <View className="bg-gray-100 px-2 py-0.5 rounded-lg">
                                        <Text className="text-[10px] font-black text-gray-500">{item.action.split(' ')[0]}</Text>
                                    </View>
                                    <Text className="text-[10px] text-gray-400 font-bold">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </Text>
                                </View>
                                <Text className="text-gray-900 font-bold mb-1">{item.action}</Text>
                                <View className="flex-row items-center">
                                    <User size={10} color="#94a3b8" />
                                    <Text className="text-[10px] text-gray-400 font-medium ml-1">{item.user.name}</Text>
                                    {item.task && (
                                        <>
                                            <View className="w-1 h-1 bg-gray-200 rounded-full mx-2" />
                                            <Briefcase size={10} color="#94a3b8" />
                                            <Text className="text-[10px] text-gray-400 font-medium ml-1">{item.task.title}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View className="py-20 items-center">
                                <History size={48} color="#f1f5f9" />
                                <Text className="text-gray-300 font-bold mt-4">No audit trails match filters.</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

export default AdminProfileScreen;
