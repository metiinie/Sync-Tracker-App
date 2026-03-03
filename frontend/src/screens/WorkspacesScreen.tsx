import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Save, Link, Users } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

import { useWorkspaceSettings, useWorkspaceMutations } from '../hooks/useWorkspace';

const WorkspacesScreen = ({ navigation }: any) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    // ─── QUERY & MUTATIONS ──────────────────────────────
    const { data: wsData, isLoading: fetchLoading } = useWorkspaceSettings();
    const { updateSettings } = useWorkspaceMutations();

    // Form state
    const [staleThresholdHours, setStaleThresholdHours] = useState('24');
    const [allowResponsibilityTransfer, setAllowResponsibilityTransfer] = useState(true);
    const [enableHelperRole, setEnableHelperRole] = useState(true);

    useEffect(() => {
        if (wsData) {
            setStaleThresholdHours(wsData.staleThresholdHours?.toString() || '24');
            setAllowResponsibilityTransfer(wsData.allowResponsibilityTransfer);
            setEnableHelperRole(wsData.enableHelperRole);
        }
    }, [wsData]);

    const handleSave = async () => {
        const hours = parseInt(staleThresholdHours, 10);
        if (isNaN(hours) || hours <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid number of hours.');
            return;
        }

        updateSettings.mutate({
            staleThresholdHours: hours,
            allowResponsibilityTransfer,
            enableHelperRole
        }, {
            onSuccess: () => {
                Alert.alert('Success', 'Workspace settings updated successfully.');
                navigation.goBack();
            },
            onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update workspace settings.');
            }
        });
    };

    const loading = fetchLoading;
    const saving = updateSettings.isPending;

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
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Header */}
                <View className={`flex-row items-center px-6 pt-4 pb-4 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-50 bg-white'}`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                        <ArrowLeft size={24} color={isDark ? '#F9FAFB' : '#111827'} />
                    </TouchableOpacity>
                    <Text className={`text-lg font-black ml-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Workspaces</Text>
                    <View className="flex-1" />
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                        {/* Threshold Input */}
                        <View className="mb-6">
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Stale Threshold (Hours)
                            </Text>
                            <View className={`flex-row items-center rounded-2xl px-4 py-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <View className={`p-2 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <Clock size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </View>
                                <TextInput
                                    className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                                    value={staleThresholdHours}
                                    onChangeText={setStaleThresholdHours}
                                    keyboardType="numeric"
                                    placeholder="e.g. 24"
                                    placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                                />
                                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>hrs</Text>
                            </View>
                            <Text className={`text-xs mt-2 pl-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                Tracks un-updated for this duration will flag as STALE.
                            </Text>
                        </View>

                        {/* Toggles */}
                        <View className="mb-8">
                            <Text className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Collaboration Settings
                            </Text>
                            <ToggleRow
                                icon={Link}
                                title="Responsibility Transfers"
                                description="Allow members to reassign track ownership"
                                value={allowResponsibilityTransfer}
                                onToggle={setAllowResponsibilityTransfer}
                            />
                            <ToggleRow
                                icon={Users}
                                title="Helper Roles"
                                description="Enable 'Help Requested' syncing state"
                                value={enableHelperRole}
                                onToggle={setEnableHelperRole}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className={`flex-row items-center justify-center py-4 rounded-2xl mb-12 ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Save size={20} color="#fff" />
                                    <Text className="text-white font-bold text-base ml-2">Save Workspace</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default WorkspacesScreen;
