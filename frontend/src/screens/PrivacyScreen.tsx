import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, Shield, Database, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const PrivacyScreen = ({ navigation }: any) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    const [visibility, setVisibility] = useState(true);
    const [analytics, setAnalytics] = useState(false);

    const SettingToggle = ({ icon: Icon, title, description, value, onToggle }: any) => (
        <View className={`flex-row justify-between items-center rounded-2xl px-4 py-4 mb-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <View className="flex-row items-center flex-1 mr-4">
                <View className={`p-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Icon size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </View>
                <View className="ml-3 flex-1">
                    <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</Text>
                    {description && <Text className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</Text>}
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: isDark ? '#374151' : '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#fff"
            />
        </View>
    );

    const ActionButton = ({ icon: Icon, title, color, onPress }: any) => (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center rounded-2xl px-4 py-4 mb-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        >
            <View className="p-2 rounded-xl" style={{ backgroundColor: `${color}10` }}>
                <Icon size={20} color={color} />
            </View>
            <Text className={`ml-3 font-bold text-base flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
            <View className={`flex-row items-center px-6 pt-4 pb-4 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-50 bg-white'}`}>
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>
                <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Privacy</Text>
                <View className="flex-1" />
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                <Text className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Visibility & Data
                </Text>

                <SettingToggle
                    icon={visibility ? Eye : EyeOff}
                    title="Profile Visibility"
                    description="Allow other workspace members to see your profile details"
                    value={visibility}
                    onToggle={setVisibility}
                />

                <SettingToggle
                    icon={Database}
                    title="Usage Analytics"
                    description="Share anonymous data to help improve Sync Tracker"
                    value={analytics}
                    onToggle={setAnalytics}
                />

                <Text className={`text-xs font-bold uppercase tracking-widest mb-4 mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Security & Account
                </Text>

                <ActionButton
                    icon={Shield}
                    title="Data Policy"
                    color="#6366F1"
                    onPress={() => Alert.alert('Data Policy', 'Our data policy ensures your information stays encrypted and secure.')}
                />

                <ActionButton
                    icon={Trash2}
                    title="Request Data Deletion"
                    color="#EF4444"
                    onPress={() => Alert.alert('Delete Data', 'Are you sure you want to request data deletion? This action is permanent.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Request Deletion', style: 'destructive', onPress: () => Alert.alert('Request Sent', 'Our team will process your request within 30 days.') }
                    ])}
                />

                <View className="mb-10" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default PrivacyScreen;
