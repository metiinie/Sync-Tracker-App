import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Shield, AlertTriangle, CheckCircle, Clock, User, Briefcase, Activity, Power } from 'lucide-react-native';
import api from '../services/api';

const AdminUserDetailScreen = ({ route, navigation }: any) => {
    const { userId } = route.params;
    const queryClient = useQueryClient();
    const [actionModal, setActionModal] = useState<{ visible: boolean; type: 'ROLE' | 'SUSPEND' | 'REACTIVATE'; reason: string }>({
        visible: false,
        type: 'ROLE',
        reason: ''
    });

    const { data: user, isLoading } = useQuery({
        queryKey: ['admin-user-detail', userId],
        queryFn: async () => {
            const response = await api.get(`/admin/users/${userId}`);
            return response.data;
        }
    });

    const mutation = useMutation({
        mutationFn: async ({ type, payload }: { type: string; payload: any }) => {
            const endpoint = `/admin/users/${userId}/${type}`;
            return await api.post(endpoint, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setActionModal({ ...actionModal, visible: false, reason: '' });
            Alert.alert('Success', 'Action processed successfully.');
        },
        onError: () => {
            Alert.alert('Error', 'Failed to process action.');
        }
    });

    if (isLoading || !user) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    const StatCard = ({ label, value, icon: Icon, color }: any) => (
        <View className="bg-gray-50 p-4 rounded-3xl flex-1 mx-1 border border-gray-100">
            <Icon size={16} color={color} />
            <Text className="text-gray-400 text-[10px] font-bold uppercase mt-2">{label}</Text>
            <Text className="text-gray-900 text-lg font-black">{value}</Text>
        </View>
    );

    const SyncBar = ({ label, count, total, color }: any) => (
        <View className="mb-4">
            <View className="flex-row justify-between mb-1">
                <Text className="text-xs font-bold text-gray-500">{label}</Text>
                <Text className="text-xs font-black text-gray-900">{count}</Text>
            </View>
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View className="h-full" style={{ width: `${(count / (total || 1)) * 100}%`, backgroundColor: color }} />
            </View>
        </View>
    );

    const handleConfirmAction = () => {
        if (!actionModal.reason.trim()) {
            Alert.alert('Error', 'Reason is required.');
            return;
        }

        if (actionModal.type === 'ROLE') {
            const newRole = user.systemRole === 'ADMIN' ? 'USER' : 'ADMIN';
            mutation.mutate({ type: 'role', payload: { role: newRole, reason: actionModal.reason } });
        } else if (actionModal.type === 'SUSPEND') {
            mutation.mutate({ type: 'suspend', payload: { reason: actionModal.reason } });
        } else if (actionModal.type === 'REACTIVATE') {
            mutation.mutate({ type: 'reactivate', payload: { reason: actionModal.reason } });
        }
    };

    return (
        <ScrollView className="flex-1 bg-white px-6">
            {/* Header / Profile */}
            <View className="items-center py-8">
                <View className={`w-24 h-24 rounded-[40px] items-center justify-center ${user.isSuspended ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <User size={48} color={user.isSuspended ? '#ef4444' : '#000'} strokeWidth={1} />
                </View>
                <Text className="text-2xl font-black text-gray-900 mt-4 tracking-tight">{user.name}</Text>
                <View className={`mt-2 px-3 py-1 rounded-full ${user.systemRole === 'ADMIN' ? 'bg-black' : 'bg-blue-50'}`}>
                    <Text className={`text-[10px] font-black uppercase tracking-widest ${user.systemRole === 'ADMIN' ? 'text-white' : 'text-blue-500'}`}>
                        {user.systemRole}
                    </Text>
                </View>
                <Text className="text-gray-400 font-medium mt-1">{user.email}</Text>
            </View>

            {/* Core Metrics */}
            <View className="flex-row mb-6">
                <StatCard label="Active" value={user.tasksAsOwner.length} icon={Briefcase} color="#3b82f6" />
                <StatCard label="Participating" value={user.tasksParticipating.length} icon={Activity} color="#10b981" />
                <StatCard label="Mins Logged" value={user.totalTimeLogged} icon={Clock} color="#8b5cf6" />
            </View>

            {/* Sync Distribution */}
            <View className="bg-white p-6 rounded-[35px] border border-gray-100 mb-8">
                <Text className="text-sm font-black text-gray-900 mb-4 tracking-tight uppercase">Sync Performance distribution</Text>
                <SyncBar label="In Sync" count={user.syncStats.IN_SYNC} total={user.tasksAsOwner.length} color="#10b981" />
                <SyncBar label="Needs Update" count={user.syncStats.NEEDS_UPDATE} total={user.tasksAsOwner.length} color="#f59e0b" />
                <SyncBar label="Blocked" count={user.syncStats.BLOCKED} total={user.tasksAsOwner.length} color="#ef4444" />
                <SyncBar label="Help Requested" count={user.syncStats.HELP_REQUESTED} total={user.tasksAsOwner.length} color="#3b82f6" />
            </View>

            {/* Controls */}
            <View className="mb-20">
                <Text className="text-sm font-black text-gray-900 mb-4 tracking-tight uppercase">Administrative Overrides</Text>

                <TouchableOpacity
                    onPress={() => setActionModal({ visible: true, type: 'ROLE', reason: '' })}
                    className="flex-row items-center bg-gray-50 p-5 rounded-3xl border border-gray-100 mb-4"
                >
                    <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-gray-100">
                        <Shield size={20} color="#000" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="font-black text-gray-900">Modify Privileges</Text>
                        <Text className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Change to {user.systemRole === 'ADMIN' ? 'USER' : 'ADMIN'}</Text>
                    </View>
                    <ChevronLeft size={20} color="#000" className="rotate-180" />
                </TouchableOpacity>

                {user.isSuspended ? (
                    <TouchableOpacity
                        onPress={() => setActionModal({ visible: true, type: 'REACTIVATE', reason: '' })}
                        className="flex-row items-center bg-green-50 p-5 rounded-3xl border border-green-100"
                    >
                        <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-green-100">
                            <CheckCircle size={20} color="#10b981" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="font-black text-green-900">Reactivate Account</Text>
                            <Text className="text-[10px] text-green-600 font-bold uppercase mt-0.5">Restore workspace access</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={() => setActionModal({ visible: true, type: 'SUSPEND', reason: '' })}
                        className="flex-row items-center bg-red-50 p-5 rounded-3xl border border-red-100"
                    >
                        <View className="w-10 h-10 bg-white rounded-2xl items-center justify-center border border-red-100">
                            <Power size={20} color="#ef4444" />
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="font-black text-red-900">Suspend Access</Text>
                            <Text className="text-[10px] text-red-600 font-bold uppercase mt-0.5">Block login and sync</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {/* Action Modal */}
            <Modal visible={actionModal.visible} transparent animationType="fade">
                <View className="flex-1 bg-black/60 justify-center px-6">
                    <View className="bg-white rounded-[40px] p-8">
                        <Text className="text-xl font-black text-gray-900 mb-2">Auth Reason Required</Text>
                        <Text className="text-gray-400 text-sm mb-6">Explain this administrative override for the immutable audit logs.</Text>

                        <TextInput
                            className="bg-gray-50 p-5 rounded-3xl border border-gray-100 text-gray-900 font-bold mb-6 h-32"
                            placeholder="Reason for change..."
                            multiline
                            textAlignVertical="top"
                            value={actionModal.reason}
                            onChangeText={(text) => setActionModal({ ...actionModal, reason: text })}
                        />

                        <View className="flex-row">
                            <TouchableOpacity
                                onPress={() => setActionModal({ ...actionModal, visible: false })}
                                className="flex-1 h-14 items-center justify-center bg-gray-100 rounded-2xl mr-3"
                            >
                                <Text className="font-black text-gray-500">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleConfirmAction}
                                className={`flex-1 h-14 items-center justify-center rounded-2xl ${actionModal.type === 'SUSPEND' ? 'bg-red-600' : 'bg-black'}`}
                            >
                                <Text className="font-black text-white">Execute</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default AdminUserDetailScreen;
