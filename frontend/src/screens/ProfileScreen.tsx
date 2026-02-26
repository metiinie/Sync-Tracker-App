import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

const ProfileScreen = () => {
    const { user, setSession } = useAuthStore();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-3xl font-bold text-gray-900 mb-2">Profile</Text>
                <Text className="text-gray-500 mb-10">Manage your account and preferences.</Text>

                <View className="bg-gray-50 p-6 rounded-3xl mb-10 border border-gray-100">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</Text>
                    <Text className="text-xl font-bold text-gray-900">{user?.user_metadata?.name || 'User'}</Text>
                    <Text className="text-gray-500">{user?.email}</Text>
                </View>

                <TouchableOpacity
                    onPress={handleLogout}
                    className="bg-red-50 p-5 rounded-3xl border border-red-100 items-center"
                >
                    <Text className="text-red-600 font-bold">Log Out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;
