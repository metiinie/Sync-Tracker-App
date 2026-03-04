import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Share2, Info, ArrowLeft, ExternalLink, Shield, Code, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const AboutScreen = ({ navigation }: any) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    const renderLinkItem = (icon: any, title: string, subtitle: string, onPress: () => void) => (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center p-4 mb-3 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
        >
            <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                {React.createElement(icon, { size: 20, color: isDark ? '#9CA3AF' : '#6B7280' })}
            </View>
            <View className="flex-1">
                <Text className={`font-bold text-base ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{title}</Text>
                <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#4B5563' : '#D1D5DB'} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-[#FAFAFA]'}`}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className={`w-10 h-10 items-center justify-center rounded-full border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-50'}`}
                >
                    <ArrowLeft size={20} color={isDark ? '#F9FAFB' : '#111827'} />
                </TouchableOpacity>
                <Text className={`text-lg font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>About</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Logo & Version Area */}
                <View className="items-center py-10">
                    <View className="w-24 h-24 bg-blue-600 rounded-3xl items-center justify-center mb-6 shadow-sm shadow-blue-500/30">
                        <Share2 size={40} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <Text className={`text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        SyncTracker
                    </Text>
                    <View className="bg-blue-50 px-3 py-1 rounded-full mb-2">
                        <Text className="text-blue-600 font-bold text-xs tracking-widest">VERSION 1.0.4</Text>
                    </View>
                    <Text className={`text-sm text-center px-8 mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        The comprehensive workflow and accountability platform for modern teams.
                    </Text>
                </View>

                {/* Links Section */}
                <Text className={`text-xs font-black tracking-widest uppercase mb-4 ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Resources
                </Text>

                {renderLinkItem(Shield, "Terms of Service", "Read our terms and conditions", () => {
                    Alert.alert("Notice", "Terms of Service document is not available offline.");
                })}

                {renderLinkItem(Info, "Privacy Policy", "How we handle your data", () => {
                    Alert.alert("Notice", "Privacy Policy document is not available offline.");
                })}

                {renderLinkItem(Code, "Open Source Licenses", "Software we utilize", () => {
                    Alert.alert("Notice", "License details are not available offline.");
                })}

                {renderLinkItem(ExternalLink, "Visit our Website", "synctracker.io", () => {
                    Linking.openURL('https://synctracker.io').catch(() => { });
                })}

                <View className="my-8 items-center opacity-50">
                    <Text className={`text-xs font-bold tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        DEVELOPED BY
                    </Text>
                    <Text className={`text-sm font-black mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Google Deepmind Team
                    </Text>
                    <Text className={`text-xs mt-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        © {new Date().getFullYear()} SyncTracker Inc.
                    </Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default AboutScreen;
