import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Plus, X, User, Users, Flag, Trash2,
    CheckCircle2, Zap, FileText, Target
} from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTask } from '../hooks/useTasks';
import { useUsers } from '../hooks/useTaskDetail';

// ─── HELPERS ───────────────────────────────────────────
const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
    if (!name) return '#9CA3AF';
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#14B8A6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const getPriorityConfig = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return { color: '#EF4444', bg: '#FEF2F2', label: 'Critical' };
        case 'HIGH': return { color: '#F59E0B', bg: '#FFFBEB', label: 'High' };
        case 'MEDIUM': return { color: '#3B82F6', bg: '#EFF6FF', label: 'Medium' };
        case 'LOW': return { color: '#10B981', bg: '#F0FDF4', label: 'Low' };
        default: return { color: '#6B7280', bg: '#F3F4F6', label: 'Medium' };
    }
};

const CreateTaskScreen = ({ navigation }: any) => {
    const { token, user, settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleOwnerId, setResponsibleOwnerId] = useState('');
    const [participants, setParticipants] = useState<{ userId: string; role: string }[]>([]);
    const [milestones, setMilestones] = useState<string[]>([]);
    const [newMilestone, setNewMilestone] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [selectedRole, setSelectedRole] = useState('contributor');
    const { mutate: launchTrack, isPending: submitting } = useCreateTask();

    // Active section for step indicator
    const [activeSection, setActiveSection] = useState(0);

    // User search/listing
    const { data: allUsers = [], isLoading: loadingUsers } = useUsers();

    const addParticipant = (userId: string) => {
        if (participants.find(p => p.userId === userId)) return;
        if (userId === responsibleOwnerId) {
            Alert.alert('Invalid Selection', 'Responsible Owner cannot be a participant');
            return;
        }
        setParticipants([...participants, { userId, role: selectedRole }]);
    };

    const removeParticipant = (userId: string) => {
        setParticipants(participants.filter(p => p.userId !== userId));
    };

    const addMilestone = () => {
        if (!newMilestone.trim()) return;
        setMilestones([...milestones, newMilestone.trim()]);
        setNewMilestone('');
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const handleCreate = () => {
        if (!title.trim()) {
            Alert.alert('Missing Fields', 'Track title is required.');
            return;
        }
        if (!responsibleOwnerId) {
            Alert.alert('Missing Fields', 'Please assign a Responsible Owner.');
            return;
        }

        launchTrack({
            title,
            description,
            responsibleOwner: responsibleOwnerId,
            participants,
            milestones,
            priority,
        }, {
            onSuccess: () => {
                Alert.alert('Track Launched', 'Responsibility assigned. Awaiting acceptance.');
                navigation.goBack();
            },
            onError: (error: any) => {
                Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to create task');
            }
        });
    };

    // Step indicators
    const steps = [
        { label: 'Details', icon: FileText, filled: !!title.trim() },
        { label: 'Owner', icon: User, filled: !!responsibleOwnerId },
        { label: 'Team', icon: Users, filled: participants.length > 0 },
        { label: 'Goals', icon: Target, filled: milestones.length > 0 },
    ];

    const selectedOwner = allUsers.find((u: any) => u.id === responsibleOwnerId);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111827' : '#FAFAFA'} />

            {/* ─── HEADER ───────────────────────────────────────── */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>
                        New Track
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 1 }}>
                        Assign Accountability
                    </Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {/* ─── STEP INDICATOR ────────────────────────────────── */}
            <View style={{
                flexDirection: 'row',
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                gap: 8,
            }}>
                {steps.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = activeSection === i;
                    const isFilled = step.filled;
                    return (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setActiveSection(i)}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8,
                                borderRadius: 12,
                                backgroundColor: isActive ? (isDark ? '#F9FAFB' : '#111827') : isFilled ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? '#374151' : '#F9FAFB'),
                                borderWidth: 1,
                                borderColor: isActive ? (isDark ? '#F9FAFB' : '#111827') : isFilled ? (isDark ? '#065F46' : '#BBF7D0') : (isDark ? '#4B5563' : '#E5E7EB'),
                            }}
                        >
                            {isFilled && !isActive ? (
                                <CheckCircle2 size={14} color="#10B981" />
                            ) : (
                                <Icon size={14} color={isActive ? (isDark ? '#111827' : '#FFFFFF') : (isDark ? '#9CA3AF' : '#6B7280')} />
                            )}
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color: isActive ? (isDark ? '#111827' : '#FFFFFF') : isFilled ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280'),
                                marginLeft: 4,
                            }}>
                                {step.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ─── CONTENT ──────────────────────────────────────── */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ─── SECTION 1: CORE DETAILS ─────────────── */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>
                            CORE DETAILS
                        </Text>

                        {/* Title */}
                        <View style={{
                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: title.trim() ? '#10B981' : (isDark ? '#374151' : '#F3F4F6'),
                            padding: 16,
                            marginBottom: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.03,
                            shadowRadius: 4,
                            elevation: 1,
                        }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                TRACK TITLE *
                            </Text>
                            <TextInput
                                style={{ fontSize: 16, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827', padding: 0 }}
                                placeholder="e.g., Q1 Revenue Optimization"
                                placeholderTextColor="#D1D5DB"
                                value={title}
                                onChangeText={setTitle}
                                onFocus={() => setActiveSection(0)}
                            />
                        </View>

                        {/* Description */}
                        <View style={{
                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isDark ? '#374151' : '#F3F4F6',
                            padding: 16,
                            marginBottom: 8,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.03,
                            shadowRadius: 4,
                            elevation: 1,
                        }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                MISSION CONTEXT
                            </Text>
                            <TextInput
                                style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', minHeight: 80, padding: 0, textAlignVertical: 'top' }}
                                placeholder="Describe the mission and expectations..."
                                placeholderTextColor="#D1D5DB"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                onFocus={() => setActiveSection(0)}
                            />
                        </View>

                        {/* Priority Selection */}
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>
                            PRIORITY LEVEL
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => {
                                const isSelected = priority === p;
                                const cfg = getPriorityConfig(p);
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => {
                                            setPriority(p);
                                            setActiveSection(0);
                                        }}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            borderRadius: 12,
                                            backgroundColor: isSelected ? cfg.bg : (isDark ? '#1F2937' : '#FFFFFF'),
                                            borderWidth: 1,
                                            borderColor: isSelected ? cfg.color : (isDark ? '#374151' : '#E5E7EB'),
                                            flex: 1,
                                            marginRight: p === 'CRITICAL' ? 0 : 8,
                                            alignItems: 'center',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: isSelected ? 0 : 0.02,
                                            shadowRadius: 2,
                                            elevation: isSelected ? 0 : 1,
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: isSelected ? cfg.color : (isDark ? '#9CA3AF' : '#6B7280') }}>
                                            {p}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* ─── SECTION 2: RESPONSIBLE OWNER ─────────── */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>
                            RESPONSIBLE OWNER
                        </Text>

                        {/* Selected Owner Card */}
                        {selectedOwner && (
                            <View style={{
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderRadius: 16,
                                borderWidth: 2,
                                borderColor: isDark ? '#6366F1' : '#111827',
                                padding: 16,
                                marginBottom: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <View style={{
                                    width: 40, height: 40, borderRadius: 20,
                                    backgroundColor: getAvatarColor(selectedOwner.name),
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>
                                        {getInitials(selectedOwner.name)}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>
                                        {selectedOwner.name}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                                        {selectedOwner.email}
                                    </Text>
                                </View>
                                <View style={{ backgroundColor: isDark ? '#6366F1' : '#111827', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>OWNER</Text>
                                </View>
                            </View>
                        )}

                        {/* User Picker */}
                        {loadingUsers ? (
                            <ActivityIndicator color="#111827" />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {allUsers.map((u: any) => {
                                        const isSelected = responsibleOwnerId === u.id;
                                        return (
                                            <TouchableOpacity
                                                key={u.id}
                                                onPress={() => {
                                                    setResponsibleOwnerId(u.id);
                                                    setActiveSection(1);
                                                    // Remove from participants if already added
                                                    setParticipants(prev => prev.filter(p => p.userId !== u.id));
                                                }}
                                                style={{
                                                    alignItems: 'center',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 12,
                                                    borderRadius: 16,
                                                    backgroundColor: isSelected ? (isDark ? '#6366F1' : '#111827') : (isDark ? '#1F2937' : '#FFFFFF'),
                                                    borderWidth: 1,
                                                    borderColor: isSelected ? (isDark ? '#6366F1' : '#111827') : (isDark ? '#374151' : '#E5E7EB'),
                                                    minWidth: 80,
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 1 },
                                                    shadowOpacity: isSelected ? 0 : 0.03,
                                                    shadowRadius: 4,
                                                    elevation: isSelected ? 0 : 1,
                                                }}
                                            >
                                                <View style={{
                                                    width: 36, height: 36, borderRadius: 18,
                                                    backgroundColor: isSelected ? '#FFFFFF20' : getAvatarColor(u.name),
                                                    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                                                }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                                                        {getInitials(u.name)}
                                                    </Text>
                                                </View>
                                                <Text style={{
                                                    fontSize: 12, fontWeight: '600',
                                                    color: isSelected ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#374151'),
                                                }} numberOfLines={1}>
                                                    {u.name.split(' ')[0]}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 10, color: isSelected ? '#FFFFFF80' : '#9CA3AF',
                                                    marginTop: 2,
                                                }} numberOfLines={1}>
                                                    {u.email.split('@')[0]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}
                    </View>

                    {/* ─── SECTION 3: PARTICIPANTS ──────────────── */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>
                            TEAM PARTICIPANTS
                        </Text>

                        {/* Role Selector Toggle */}
                        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16, width: '60%' }}>
                            {['contributor', 'helper'].map(r => {
                                const isSelected = selectedRole === r;
                                return (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => setSelectedRole(r)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            backgroundColor: isSelected ? (isDark ? '#374151' : '#FFFFFF') : 'transparent',
                                            alignItems: 'center',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 1 },
                                            shadowOpacity: isSelected ? 0.05 : 0,
                                            shadowRadius: 2,
                                            elevation: isSelected ? 1 : 0,
                                        }}
                                    >
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? (isDark ? '#F9FAFB' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280'), textTransform: 'capitalize' }}>
                                            {r}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Selected Chips */}
                        {participants.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 }}>
                                {participants.map(p => {
                                    const userObj = allUsers.find((u: any) => u.id === p.userId);
                                    if (!userObj) return null;
                                    return (
                                        <View key={p.userId} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                            paddingLeft: 4,
                                            paddingRight: 10,
                                            paddingVertical: 4,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                        }}>
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 12,
                                                backgroundColor: getAvatarColor(userObj.name),
                                                alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFF' }}>
                                                    {getInitials(userObj.name)}
                                                </Text>
                                            </View>
                                            <View style={{ marginLeft: 8 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151' }}>
                                                    {userObj.name}
                                                </Text>
                                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' }}>
                                                    {p.role}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => removeParticipant(p.userId)}
                                                style={{ marginLeft: 8, padding: 2 }}
                                            >
                                                <X size={14} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Participant Picker */}
                        {loadingUsers ? (
                            <ActivityIndicator color="#111827" />
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {allUsers.filter((u: any) => u.id !== responsibleOwnerId).map((u: any) => {
                                        const isAdded = !!participants.find(p => p.userId === u.id);
                                        return (
                                            <TouchableOpacity
                                                key={u.id}
                                                onPress={() => {
                                                    isAdded ? removeParticipant(u.id) : addParticipant(u.id);
                                                    setActiveSection(2);
                                                }}
                                                style={{
                                                    alignItems: 'center',
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 12,
                                                    borderRadius: 16,
                                                    backgroundColor: isAdded ? (isDark ? '#1E3A8A' : '#EFF6FF') : (isDark ? '#1F2937' : '#FFFFFF'),
                                                    borderWidth: 1,
                                                    borderColor: isAdded ? '#3B82F6' : (isDark ? '#374151' : '#E5E7EB'),
                                                    minWidth: 80,
                                                }}
                                            >
                                                <View style={{
                                                    width: 36, height: 36, borderRadius: 18,
                                                    backgroundColor: getAvatarColor(u.name),
                                                    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
                                                }}>
                                                    {isAdded ? (
                                                        <CheckCircle2 size={16} color="#FFF" />
                                                    ) : (
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>
                                                            {getInitials(u.name)}
                                                        </Text>
                                                    )}
                                                </View>
                                                <Text style={{
                                                    fontSize: 12, fontWeight: '600',
                                                    color: isAdded ? '#3B82F6' : (isDark ? '#D1D5DB' : '#374151'),
                                                }} numberOfLines={1}>
                                                    {u.name.split(' ')[0]}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}

                        {participants.length === 0 && (
                            <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginTop: 12 }}>
                                No additional participants yet. Tap to add.
                            </Text>
                        )}
                    </View>

                    {/* ─── SECTION 4: MILESTONES ────────────────── */}
                    <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>
                            EXECUTION MILESTONES
                        </Text>

                        {/* Add Milestone Input */}
                        <View style={{
                            flexDirection: 'row',
                            marginBottom: 16,
                            gap: 0,
                        }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                    paddingHorizontal: 16,
                                    paddingVertical: 14,
                                    borderTopLeftRadius: 14,
                                    borderBottomLeftRadius: 14,
                                    borderWidth: 1,
                                    borderRightWidth: 0,
                                    borderColor: isDark ? '#374151' : '#E5E7EB',
                                    fontSize: 14,
                                    color: isDark ? '#F9FAFB' : '#111827',
                                }}
                                placeholder="Add a milestone..."
                                placeholderTextColor="#D1D5DB"
                                value={newMilestone}
                                onChangeText={setNewMilestone}
                                onSubmitEditing={addMilestone}
                                onFocus={() => setActiveSection(3)}
                            />
                            <TouchableOpacity
                                onPress={addMilestone}
                                style={{
                                    backgroundColor: isDark ? '#374151' : '#111827',
                                    paddingHorizontal: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderTopRightRadius: 14,
                                    borderBottomRightRadius: 14,
                                }}
                            >
                                <Plus size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Milestone List */}
                        {milestones.map((m, index) => (
                            <View key={index} style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#F3F4F6',
                                marginBottom: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.02,
                                shadowRadius: 2,
                                elevation: 1,
                            }}>
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: isDark ? '#064E3B' : '#F0FDF4', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981' }}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#374151', marginLeft: 12 }}>
                                    {m}
                                </Text>
                                <TouchableOpacity onPress={() => removeMilestone(index)} style={{ padding: 4 }}>
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {milestones.length === 0 && (
                            <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>
                                Define key checkpoints for this track.
                            </Text>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* ─── BOTTOM LAUNCH BAR ────────────────────────────── */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: Platform.OS === 'ios' ? 34 : 24,
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: isDark ? '#374151' : '#F3F4F6',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.05,
                shadowRadius: 12,
                elevation: 8,
            }}>
                {/* Summary Pills */}
                <View style={{ flexDirection: 'row', marginBottom: 14, gap: 8 }}>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: title.trim() ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? '#451212' : '#FEF2F2'),
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: title.trim() ? '#10B981' : '#EF4444', marginRight: 6 }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: title.trim() ? '#10B981' : '#EF4444' }}>Title</Text>
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: responsibleOwnerId ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? '#451212' : '#FEF2F2'),
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: responsibleOwnerId ? '#10B981' : '#EF4444', marginRight: 6 }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: responsibleOwnerId ? '#10B981' : '#EF4444' }}>Owner</Text>
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    }}>
                        <Users size={10} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 4 }}>{participants.length}</Text>
                    </View>
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                    }}>
                        <Target size={10} color={isDark ? '#9CA3AF' : '#6B7280'} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 4 }}>{milestones.length}</Text>
                    </View>
                </View>

                {/* Launch Button */}
                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={submitting || !title.trim() || !responsibleOwnerId}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: (title.trim() && responsibleOwnerId) ? (isDark ? '#6366F1' : '#111827') : (isDark ? '#374151' : '#D1D5DB'),
                        paddingVertical: 16,
                        borderRadius: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: (title.trim() && responsibleOwnerId) ? 0.15 : 0,
                        shadowRadius: 12,
                        elevation: (title.trim() && responsibleOwnerId) ? 4 : 0,
                    }}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <Zap size={18} color="#FFFFFF" />
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginLeft: 8, letterSpacing: 0.5 }}>
                                Launch Track
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView >
    );
};

export default CreateTaskScreen;
