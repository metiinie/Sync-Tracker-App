import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Mail } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const NotificationSettingsScreen = ({ navigation }: any) => {
    const { settings, updateSettings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    const ToggleRow = ({ icon: Icon, title, description, value, onToggle }: any) => (
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
            <TouchableOpacity
                onPress={() => onToggle(!value)}
                className={`w-12 h-6 rounded-full p-1 transition-colors justify-center ${value ? 'bg-blue-600' : isDark ? 'bg-gray-600' : 'bg-gray-300'}`}
            >
                <View className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? 'ml-auto' : ''}`} />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView className="flex-1" style={{ backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
            {/* Header */}
            <View className={`flex-row items-center px-6 pt-4 pb-4 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-50 bg-white'}`}>
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ArrowLeft size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>
                <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</Text>
                <View className="flex-1" />
            </View>

            <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                <View className="mb-8">
                    <Text className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Alert Preferences
                    </Text>
                    <ToggleRow
                        icon={Bell}
                        title="In-app Alerts"
                        description="Receive push notifications and in-app updates for track activity"
                        value={settings?.inAppNotif}
                        onToggle={(val: boolean) => updateSettings({ inAppNotif: val })}
                    />
                    <ToggleRow
                        icon={Mail}
                        title="Email Digest"
                        description="Receive a daily or weekly summary of your tasks directly to your inbox"
                        value={settings?.emailDigest}
                        onToggle={(val: boolean) => updateSettings({ emailDigest: val })}
                    />
                </View>

                <Text className={`text-xs text-center px-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    These settings are synced universally across all your devices.
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationSettingsScreen;
