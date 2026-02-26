import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const setAuth = useAuthStore(state => state.setAuth);

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const response = await api.post('/auth/login', { email, password });
                setAuth(response.data.access_token, response.data.user);
            } else {
                const response = await api.post('/auth/register', { name, email, password });
                setAuth(response.data.access_token, response.data.user);
            }
        } catch (error: any) {
            Alert.alert(
                isLogin ? 'Login Failed' : 'Registration Failed',
                error.response?.data?.message || 'Something went wrong'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSSO = (provider: string) => {
        Alert.alert('SSO Login', `${provider} login will be available soon in this demo.`);
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

                    <Text className="text-3xl font-bold text-gray-900 mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        {isLogin ? 'Sign in to continue tracking your progress' : 'Join us to start syncing your responsibilities'}
                    </Text>

                    {/* Form */}
                    {!isLogin && (
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
                    )}

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

                    <View className="mb-8">
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

                    {/* Action Button */}
                    <TouchableOpacity
                        className={`p-5 rounded-2xl items-center shadow-xl ${loading ? 'bg-blue-400' : 'bg-blue-600'} shadow-blue-200`}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        <Text className="text-white font-bold text-lg">
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="flex-row items-center my-8">
                        <View className="flex-1 h-[1px] bg-gray-100" />
                        <Text className="mx-4 text-gray-400 font-medium">OR CONTINUE WITH</Text>
                        <View className="flex-1 h-[1px] bg-gray-100" />
                    </View>

                    {/* SSO Buttons */}
                    <View className="flex-row gap-4 mb-8">
                        <TouchableOpacity
                            onPress={() => handleSSO('Google')}
                            className="flex-1 flex-row items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
                        >
                            <Ionicons name="logo-google" size={20} color="#ea4335" />
                            <Text className="ml-2 font-semibold text-gray-700">Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleSSO('Microsoft')}
                            className="flex-1 flex-row items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm"
                        >
                            <Ionicons name="logo-windows" size={20} color="#0078d4" />
                            <Text className="ml-2 font-semibold text-gray-700">Microsoft</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Toggle Mode */}
                    <TouchableOpacity
                        className="items-center mb-8"
                        onPress={() => setIsLogin(!isLogin)}
                    >
                        <Text className="text-gray-500 font-medium">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <Text className="text-blue-600 font-bold">{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

export default LoginScreen;

