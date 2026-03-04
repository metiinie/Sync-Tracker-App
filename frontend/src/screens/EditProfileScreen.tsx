import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Save, Mail } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { supabase } from '../services/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useProfileMutations } from '../hooks/useProfile';

const EditProfileScreen = ({ navigation }: any) => {
    const { user, settings, setUser } = useAuthStore();
    const [name, setName] = useState(user?.user_metadata?.name || user?.user_metadata?.full_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || null);
    const [uploading, setUploading] = useState(false);
    const { updateProfile } = useProfileMutations();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('file', {
                uri,
                name: filename,
                type,
            } as any);

            const res = await api.post('/upload/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const newAvatarUrl = res.data.url;
            setAvatarUrl(newAvatarUrl);

            // Update Supabase metadata
            await supabase.auth.updateUser({
                data: { avatar_url: newAvatarUrl }
            });

            // Update local state
            setUser({
                ...user,
                user_metadata: {
                    ...user.user_metadata,
                    avatar_url: newAvatarUrl
                }
            });

            Alert.alert('Success', 'Profile photo updated.');
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Error', 'Failed to upload image.');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }

        updateProfile.mutate({ name }, {
            onSuccess: async () => {
                try {
                    // Update Supabase Auth metadata
                    const { error } = await supabase.auth.updateUser({
                        data: { full_name: name, name: name }
                    });
                    if (error) throw error;
                    Alert.alert('Success', 'Profile updated successfully.');
                    navigation.goBack();
                } catch (error: any) {
                    console.error('Supabase update error:', error);
                    Alert.alert('Success', 'Profile updated in database, but metadata sync failed.');
                }
            },
            onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update profile.');
            }
        });
    };

    const loading = updateProfile.isPending;

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
                    <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit Account</Text>
                    <View className="flex-1" />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                    <View className="items-center mb-8">
                        <TouchableOpacity onPress={pickImage} disabled={uploading}>
                            <View className={`w-32 h-32 rounded-full items-center justify-center border-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-white shadow-sm'}`}>
                                {uploading ? (
                                    <ActivityIndicator color={isDark ? '#F9FAFB' : '#111827'} />
                                ) : avatarUrl ? (
                                    <Image
                                        source={{ uri: avatarUrl }}
                                        style={{ width: '100%', height: '100%', borderRadius: 64 }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <User size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
                                )}
                            </View>
                            <View className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full border-2 border-white shadow-sm">
                                <Save size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text className={`mt-4 text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {uploading ? 'Uploading...' : 'Tap to change photo'}
                        </Text>
                    </View>

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
                                <Text className="text-white font-bold text-base ml-2">Save Account Details</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default EditProfileScreen;
