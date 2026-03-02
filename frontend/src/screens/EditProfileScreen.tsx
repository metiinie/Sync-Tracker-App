import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Save, Mail } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { supabase } from '../services/supabase';

const EditProfileScreen = ({ navigation }: any) => {
    const { user, settings } = useAuthStore();
    const [name, setName] = useState(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }

        setLoading(true);
        try {
            // Update custom DB
            await api.patch('/users/profile', { name });

            // Update Supabase Auth metadata
            const { error } = await supabase.auth.updateUser({
                data: { full_name: name, name: name }
            });

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully.');
            navigation.goBack();
        } catch (error: any) {
            console.error('Update profile error:', error);
            Alert.alert('Error', error.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const isDark = settings?.theme === 'dark';

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View className={`flex-row items-center px-6 pt-4 pb-4 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-50 bg-white'}`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <ArrowLeft size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                    </TouchableOpacity>
                    <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Profile</Text>
                    <View className="flex-1" />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                    <View className="mb-6">
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 py-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <User size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <TextInput
                                className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                            />
                        </View>
                    </View>

                    <View className="mb-8">
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Email Address</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 py-4 border ${isDark ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <Mail size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                            <TextInput
                                className={`flex-1 ml-3 text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                                value={email}
                                editable={false}
                                selectTextOnFocus={false}
                                placeholder="Enter your email"
                            />
                        </View>
                        <Text className="text-xs text-gray-400 mt-2 pl-1">Email address cannot be changed currently.</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        className={`flex-row items-center justify-center py-4 rounded-2xl ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Save size={20} color="#fff" />
                                <Text className="text-white font-bold text-base ml-2">Save Profile</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default EditProfileScreen;
