import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, ChevronRight, Shield, AlertTriangle, Clock } from 'lucide-react-native';
import api from '../services/api';

const AdminUsersScreen = ({ navigation }: any) => {
    const [search, setSearch] = useState('');

    const { data: users = [], isLoading, refetch } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const response = await api.get('/admin/users');
            return response.data;
        }
    });

    const onRefresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const filteredUsers = users.filter((u: any) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const UserItem = ({ user }: { user: any }) => (
        <TouchableOpacity
            onPress={() => navigation.navigate('AdminUserDetail', { userId: user.id })}
            className="bg-white p-4 rounded-3xl mb-4 border border-gray-100 shadow-sm flex-row items-center"
        >
            <View className={`w-12 h-12 rounded-2xl items-center justify-center ${user.isSuspended ? 'bg-red-50' : 'bg-gray-50'}`}>
                <Users size={24} color={user.isSuspended ? '#ef4444' : '#000'} />
            </View>

            <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                    <Text className="font-black text-gray-900 text-lg">{user.name}</Text>
                    <View className={`ml-2 px-2 py-0.5 rounded-full ${user.systemRole === 'ADMIN' ? 'bg-black' : 'bg-gray-100'}`}>
                        <Text className={`text-[8px] font-black uppercase ${user.systemRole === 'ADMIN' ? 'text-white' : 'text-gray-500'}`}>
                            {user.systemRole}
                        </Text>
                    </View>
                </View>
                <Text className="text-gray-400 text-xs">{user.email}</Text>

                <View className="flex-row mt-3">
                    <View className="flex-row items-center mr-4">
                        <Shield size={12} color="#3b82f6" />
                        <Text className="text-[10px] font-bold text-gray-500 ml-1">{user.metrics.activeTasks} Active</Text>
                    </View>
                    <View className="flex-row items-center mr-4">
                        <AlertTriangle size={12} color="#ef4444" />
                        <Text className="text-[10px] font-bold text-gray-500 ml-1">{user.metrics.blockedTasks} Blocked</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Clock size={12} color="#94a3b8" />
                        <Text className="text-[10px] font-bold text-gray-400 ml-1">
                            {new Date(user.metrics.lastActivity).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
            </View>

            <ChevronRight size={20} color="#e2e8f0" />
            {user.isSuspended && (
                <View className="absolute top-2 right-10 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                    <Text className="text-[8px] font-black text-red-600 uppercase tracking-widest">Suspended</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="px-6 pt-6 pb-2">
                <Text className="text-3xl font-black text-gray-900 tracking-tight">Governance</Text>
                <Text className="text-gray-400 font-medium mb-6">Identity and Access Control</Text>

                <View className="flex-row items-center bg-gray-50 px-4 h-14 rounded-2xl border border-gray-100 mb-6">
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        className="flex-1 ml-3 text-gray-900 font-bold"
                        placeholder="Search identities..."
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </View>

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
                renderItem={({ item }) => <UserItem user={item} />}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View className="items-center justify-center py-20">
                        <Users size={64} color="#f1f5f9" />
                        <Text className="text-gray-300 font-bold mt-4">No users found.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

export default AdminUsersScreen;
