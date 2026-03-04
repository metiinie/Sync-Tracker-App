import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Complete auth session if returning from OAuth browser flow
WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<any>();

    const setSession = useAuthStore(state => state.setSession);

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                },
            });

            if (error) throw error;

            if (data.session) {
                setSession(data.session);
            } else {
                Alert.alert('Success', 'Registration successful! Please check your email for verification.');
                navigation.navigate('Login');
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleSSO = async (provider: 'google') => {
        try {
            const redirectUrl = Linking.createURL('auth');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success' && result.url) {
                    // @ts-ignore - Supabase types might be outdated, but getSessionFromUrl exists in runtime for OAuth parsing
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl({
                        url: result.url,
                    });

                    if (sessionError) throw sessionError;

                    if (sessionData.session) {
                        setSession(sessionData.session);
                    }
                }
            }
        } catch (error: any) {
            Alert.alert('SSO Failed', error.message || 'Something went wrong');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                <View className="flex-1 justify-center p-8">
                    {/* Header */}
                    <View className="mb-12">
                        <Text className="text-5xl font-extrabold text-blue-600 tracking-tighter">SyncTracker</Text>
                        <Text className="text-gray-400 text-lg mt-1 font-medium italic">Visible responsibility, realtime sync</Text>
                    </View>

                    <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
                    <Text className="text-gray-500 mb-8">Join us to start syncing your responsibilities</Text>

                    {/* Form */}
                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold mb-2 ml-1">Full Name</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 p-1">
                            <View className="p-3">
                                <Ionicons name="person-outline" size={20} color="#94a3b8" />
                            </View>
                            <TextInput
                                className="flex-1 p-3 text-gray-900"
                                placeholder="John Doe"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold mb-2 ml-1">Email</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 p-1">
                            <View className="p-3">
                                <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                            </View>
                            <TextInput
                                className="flex-1 p-3 text-gray-900"
                                placeholder="name@example.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View className="mb-4">
                        <Text className="text-gray-700 font-semibold mb-2 ml-1">Password</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 p-1">
                            <View className="p-3">
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                            </View>
                            <TextInput
                                className="flex-1 p-3 text-gray-900"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    <View className="mb-8">
                        <Text className="text-gray-700 font-semibold mb-2 ml-1">Confirm Password</Text>
                        <View className="flex-row items-center bg-gray-50 rounded-2xl border border-gray-100 p-1">
                            <View className="p-3">
                                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />
                            </View>
                            <TextInput
                                className="flex-1 p-3 text-gray-900"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                        className={`p-5 rounded-2xl items-center shadow-xl ${loading ? 'bg-blue-400' : 'bg-blue-600'} shadow-blue-200`}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold text-lg">
                            {loading ? 'Processing...' : 'Create Account'}
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center my-8">
                        <View className="flex-1 h-[1px] bg-gray-100" />
                        <Text className="mx-4 text-gray-400 font-medium">OR CONTINUE WITH</Text>
                        <View className="flex-1 h-[1px] bg-gray-100" />
                    </View>

                    {/* SSO Buttons */}
                    <View className="flex-row gap-4 mb-4">
                        <TouchableOpacity
                            onPress={() => handleSSO('google')}
                            className="flex-1 flex-row items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
                        >
                            <Ionicons name="logo-google" size={20} color="#ea4335" />
                            <Text className="ml-2 font-semibold text-gray-700">Continue with Google</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Toggle Mode */}
                    <TouchableOpacity
                        className="items-center mt-8 mb-8"
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text className="text-gray-500 font-medium">
                            Already have an account? <Text className="text-blue-600 font-bold">Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default RegisterScreen;
