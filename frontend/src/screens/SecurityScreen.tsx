import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Save, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

import { useProfileMutations } from '../hooks/useProfile';

const SecurityScreen = ({ navigation }: any) => {
    const { settings } = useAuthStore();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { updatePassword } = useProfileMutations();

    const handleUpdatePassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }

        updatePassword.mutate(password, {
            onSuccess: async () => {
                try {
                    const { error } = await supabase.auth.updateUser({
                        password: password
                    });

                    if (error) throw error;

                    Alert.alert('Success', 'Password updated successfully. You will be signed out to log back in.', [
                        {
                            text: 'OK', onPress: async () => {
                                await supabase.auth.signOut();
                            }
                        }
                    ]);
                } catch (error: any) {
                    console.error('Supabase password update error:', error);
                    Alert.alert('Success', 'Security preference updated, but auth sync failed.');
                }
            },
            onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update security settings.');
            }
        });
    };

    const loading = updatePassword.isPending;

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
                    <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</Text>
                    <View className="flex-1" />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>

                    <View className={`flex-row items-start p-4 rounded-2xl mb-8 border ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                        <ShieldCheck size={24} color="#6366F1" className="mt-1" />
                        <View className="flex-1 ml-3">
                            <Text className={`font-bold text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Secure your account</Text>
                            <Text className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-indigo-200/70' : 'text-indigo-700/80'}`}>Updating your password will sign you out of all active sessions to ensure maximum security.</Text>
                        </View>
                    </View>

                    <View className="mb-6">
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>New Password</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 py-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <Lock size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <TextInput
                                className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter new password"
                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <View className="mb-8">
                        <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Confirm Password</Text>
                        <View className={`flex-row items-center rounded-2xl px-4 py-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <Lock size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <TextInput
                                className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
                                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleUpdatePassword}
                        disabled={loading}
                        className={`flex-row items-center justify-center py-4 rounded-2xl ${loading ? 'bg-blue-400' : 'bg-blue-600'}`}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Save size={20} color="#fff" />
                                <Text className="text-white font-bold text-base ml-2">Update Password</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SecurityScreen;
