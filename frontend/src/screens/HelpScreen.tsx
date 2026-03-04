import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Mail, ExternalLink, ChevronDown, ChevronUp, FileText } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';

const FAQS = [
    {
        question: "How do I reset my password?",
        answer: "You can securely update your password by navigating to Settings > Password. Follow the prompts to enter your current password and create a new, strong password."
    },
    {
        question: "Can I use SyncTracker on multiple devices?",
        answer: "Yes! As long as you log in with the same account credentials, your tasks, responsibilities, and settings will automatically sync across all your devices in real-time."
    },
    {
        question: "How do 'Transfers' work?",
        answer: "If you are assigned a task, you can 'Transfer' responsibility to someone else. It will show up on their radar as 'PENDING ACCEPTANCE'. Once they accept, they become the new owner."
    },
    {
        question: "My real-time sync isn't working.",
        answer: "Check your internet connection first. Ensure that 'Real-time Sync' is toggled ON under Settings > Workspaces. If issues persist, try restarting the app or clearing the cache."
    }
];

const HelpScreen = ({ navigation }: any) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    const filteredFaqs = FAQS.filter(f =>
        f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchQuery.toLowerCase())
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
                <Text className={`text-lg font-black ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Help Center</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                {/* Search Header */}
                <View className="mb-8 mt-4">
                    <Text className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        How can we help?
                    </Text>
                    <View className={`flex-row items-center px-4 py-3 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <Search size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
                        <TextInput
                            placeholder="Search articles and FAQs..."
                            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className={`flex-1 ml-3 font-medium text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                        />
                    </View>
                </View>

                {/* Support Actions */}
                <View className="flex-row gap-3 mb-8">
                    <TouchableOpacity
                        className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
                    >
                        <Mail size={18} color="#3b82f6" />
                        <Text className={`font-bold ml-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Email Us</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => Linking.openURL('https://support.synctracker.io').catch(() => { })}
                        className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}
                    >
                        <ExternalLink size={18} color="#10b981" />
                        <Text className={`font-bold ml-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Forums</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQs */}
                <Text className={`text-xs font-black tracking-widest uppercase mb-4 ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Frequently Asked Questions
                </Text>

                <View className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                    {filteredFaqs.length > 0 ? filteredFaqs.map((faq, index) => (
                        <View key={index} className={`${index !== filteredFaqs.length - 1 ? (isDark ? 'border-b border-gray-700' : 'border-b border-gray-50') : ''}`}>
                            <TouchableOpacity
                                onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                className="flex-row items-center justify-between p-4"
                            >
                                <Text className={`flex-1 font-bold text-[15px] pr-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                    {faq.question}
                                </Text>
                                {expandedFaq === index ? (
                                    <ChevronUp size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                                ) : (
                                    <ChevronDown size={18} color={isDark ? '#6B7280' : '#9CA3AF'} />
                                )}
                            </TouchableOpacity>
                            {expandedFaq === index && (
                                <View className="px-4 pb-4">
                                    <Text className={`text-sm leading-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {faq.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )) : (
                        <View className="p-8 items-center">
                            <FileText size={32} color={isDark ? '#4B5563' : '#D1D5DB'} className="mb-4" />
                            <Text className={`font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No results found</Text>
                            <Text className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                We couldn't find any FAQs matching "{searchQuery}"
                            </Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

export default HelpScreen;
