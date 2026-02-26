import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const setAuth = useAuthStore(state => state.setAuth);

    const handleLogin = async () => {
        try {
            const response = await api.post('/auth/login', { email, password });
            setAuth(response.data.access_token, response.data.user);
        } catch (error: any) {
            Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
        }
    };

    return (
        <View className="flex-1 justify-center p-8 bg-white">
            <Text className="text-4xl font-bold text-gray-900 mb-2">SyncTracker</Text>
            <Text className="text-gray-500 mb-10 text-lg">Responsibility & Sync Intelligence</Text>

            <View className="mb-6">
                <Text className="text-gray-700 font-semibold mb-2 ml-1">Email</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>

            <View className="mb-10">
                <Text className="text-gray-700 font-semibold mb-2 ml-1">Password</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center shadow-lg shadow-blue-200"
                onPress={handleLogin}
            >
                <Text className="text-white font-bold text-lg">Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity className="mt-6 items-center">
                <Text className="text-gray-500">Don't have an account? <Text className="text-blue-600 font-bold">Sign Up</Text></Text>
            </TouchableOpacity>
        </View>
    );
};

export default LoginScreen;
