import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    TextInput, ActivityIndicator, Dimensions, Modal, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Network, Clock, FileText, CheckCircle2,
    AlertCircle, HelpCircle, User, Users, Plus, X, ArrowRightLeft,
    ChevronDown, ChevronUp, History, Eye
} from 'lucide-react-native';

import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { timeAgo } from '../utils/timeAgo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SYNC STATE CONFIG ────────────────────────────────
const getSyncConfig = (state: string) => {
    switch (state) {
        case 'IN_SYNC': return { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', label: 'IN SYNC' };
        case 'NEEDS_UPDATE': return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'NEEDS UPDATE' };
        case 'BLOCKED': return { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'BLOCKED' };
        case 'HELP_REQUESTED': return { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'HELP REQUESTED' };
        case 'PENDING': return { color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'PENDING' };
        default: return { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', label: 'UNKNOWN' };
    }
};

const getRoleConfig = (role: string) => {
    switch (role) {
        case 'Originator': return { bg: '#F3F4F6', color: '#4B5563' };
        case 'Owner': return { bg: '#3B82F6', color: '#FFFFFF' };
        case 'Contributor': return { bg: '#F3F4F6', color: '#4B5563' };
        case 'Helper': return { bg: '#EFF6FF', color: '#3B82F6' };
        default: return { bg: '#F3F4F6', color: '#4B5563' };
    }
};

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

const TaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const { user } = useAuthStore();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [visionTab, setVisionTab] = useState<'graph' | 'tree'>('graph');

    // Modals
    const [showVisionModal, setShowVisionModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);

    // Form states
    const [syncParams, setSyncParams] = useState({ state: '', note: '' });
    const [timeLog, setTimeLog] = useState({ hours: '', minutes: '', note: '' });
    const [newMilestone, setNewMilestone] = useState('');
    const [newMilestoneDate, setNewMilestoneDate] = useState('');

    const fetchTask = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            const response = await api.get(`/tasks/${taskId}`);
            setTask(response.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
        } finally {
            setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTask();
        const socket = getSocket();
        socket.emit('joinTask', { taskId });

        const handleUpdate = () => fetchTask(); // For simplicity, re-fetch heavily on changes to ensure relations log correctly
        socket.on('sync:update', handleUpdate);
        socket.on('milestone:updated', handleUpdate);
        socket.on('task:transfer', handleUpdate);
        socket.on('task:assigned', handleUpdate);

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('sync:update', handleUpdate);
            socket.off('milestone:updated', handleUpdate);
            socket.off('task:transfer', handleUpdate);
            socket.off('task:assigned', handleUpdate);
        };
    }, [taskId]);

    // ─── ACTIONS ───────────────────────────────────────────
    const handleUpdateSync = async () => {
        if (!syncParams.state) return;
        if ((syncParams.state === 'BLOCKED' || syncParams.state === 'HELP_REQUESTED') && !syncParams.note.trim()) {
            return; // Note is required
        }
        try {
            await api.patch(`/tasks/${taskId}/sync`, { syncState: syncParams.state });
            if (syncParams.note.trim()) {
                await api.post(`/tasks/${taskId}/time-logs`, {
                    durationMinutes: 0,
                    description: `[${syncParams.state}] ${syncParams.note}`
                });
            }
            setShowSyncModal(false);
            setSyncParams({ state: '', note: '' });
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    const handleLogTime = async () => {
        const h = parseInt(timeLog.hours || '0', 10);
        const m = parseInt(timeLog.minutes || '0', 10);
        const totalMinutes = (h * 60) + m;
        if (totalMinutes <= 0) return;

        try {
            await api.post(`/tasks/${taskId}/time-logs`, {
                durationMinutes: totalMinutes,
                description: timeLog.note,
            });
            setShowTimeModal(false);
            setTimeLog({ hours: '', minutes: '', note: '' });
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    const handleToggleMilestone = async (mid: string, current: string) => {
        try {
            const next = current === 'true' ? false : true;
            await api.patch(`/tasks/milestones/${mid}/toggle`, { isCompleted: next });
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    const handleAddMilestone = async () => {
        if (!newMilestone.trim()) return;
        try {
            await api.post(`/tasks/${taskId}/milestones`, {
                title: newMilestone,
                dueDate: newMilestoneDate || null
            });
            setShowMilestoneModal(false);
            setNewMilestone('');
            setNewMilestoneDate('');
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    const handleDeleteMilestone = async (mid: string) => {
        try {
            await api.delete(`/tasks/milestones/${mid}`);
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    const handleAcceptResponsibility = async () => {
        try {
            await api.patch(`/tasks/${taskId}/accept`);
            fetchTask();
        } catch (err) {
            console.log(err);
        }
    };

    // ─── COMPUTED DATA ─────────────────────────────────────
    const isOwner = task?.responsibleOwner === user?.id;
    const isAssigner = task?.assignedBy === user?.id;
    const isParticipant = task?.participants?.some((p: any) => p.userId === user?.id);
    const syncConfig = task ? getSyncConfig(task.syncState) : getSyncConfig('UNKNOWN');

    // Time calculations
    const totalMinutesLogged = useMemo(() => {
        if (!task?.timeLogs) return 0;
        return task.timeLogs.reduce((acc: number, log: any) => acc + (log.durationMinutes || 0), 0);
    }, [task?.timeLogs]);

    const usersTimeBreakdown = useMemo(() => {
        if (!task?.timeLogs) return [];
        const breakdown: Record<string, { duration: number, name: string }> = {};
        task.timeLogs.forEach((log: any) => {
            const uid = log.user?.id || 'unknown';
            if (!breakdown[uid]) {
                breakdown[uid] = { duration: 0, name: log.user?.name || 'System' };
            }
            breakdown[uid].duration += (log.durationMinutes || 0);
        });
        return Object.values(breakdown).filter(v => v.duration > 0).sort((a, b) => b.duration - a.duration);
    }, [task?.timeLogs]);

    const formatDuration = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    // Participants list for tree
    const treeParticipants = useMemo(() => {
        if (!task) return [];
        const result = [];
        // Originator
        if (task.assigner) result.push({ user: task.assigner, role: 'Originator', authority: 'Originator' });
        // Responsible
        if (task.owner) result.push({ user: task.owner, role: 'Responsible', authority: 'OWNER', syncState: task.syncState });
        // Participants
        if (task.participants) {
            task.participants.forEach((p: any) => result.push({
                user: p.user,
                role: p.role,
                authority: p.role === 'contributor' ? 'Contributor' : 'Helper',
                syncState: p.syncState || 'IN_SYNC'
            }));
        }
        return result;
    }, [task]);


    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#111827" />
                </View>
            </SafeAreaView>
        );
    }

    if (!task) return null;

    const ownerName = task.owner?.name || 'Unassigned';
    const assignerName = task.assigner?.name || 'System';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            {/* 1️⃣ STICKY HEADER */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
                zIndex: 10,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
                            {task.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={{
                                backgroundColor: syncConfig.bg,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginRight: 6,
                            }}>
                                <Text style={{ fontSize: 9, fontWeight: '800', color: syncConfig.color }}>
                                    {syncConfig.label}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>
                                ID: ST-{task.id.substring(0, 4)}
                            </Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setShowVisionModal(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                    }}
                >
                    <Eye size={16} color="#374151" />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6 }}>
                        Vision
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 3️⃣ PRIMARY ACTION BAR (Horizontal Scroll Chips) */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFFFFF' }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 12 }}
                >
                    <TouchableOpacity
                        onPress={() => setShowSyncModal(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F3F4F6',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB'
                        }}
                    >
                        <ArrowRightLeft size={14} color="#374151" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6 }}>
                            Update Sync
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowTimeModal(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F3F4F6',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#E5E7EB'
                        }}
                    >
                        <Clock size={14} color="#374151" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6 }}>
                            Log Time
                        </Text>
                    </TouchableOpacity>

                    {/* Request Help - Auto sets state to HELP_REQUESTED */}
                    <TouchableOpacity
                        onPress={() => {
                            setSyncParams({ state: 'HELP_REQUESTED', note: '' });
                            setShowSyncModal(true);
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#EFF6FF',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#BFDBFE'
                        }}
                    >
                        <HelpCircle size={14} color="#3B82F6" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#3B82F6', marginLeft: 6 }}>
                            Request Help
                        </Text>
                    </TouchableOpacity>

                    {(isOwner) && (
                        <TouchableOpacity
                            onPress={() => {
                                // For MVP we will just alert, proper transfer req future implementation
                                alert('Transfer flow opened');
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#F3F4F6',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: '#E5E7EB'
                            }}
                        >
                            <User size={14} color="#374151" />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6 }}>
                                Transfer Resp.
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>

            {/* MAIN SCROLL VIEW */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTask(true)} />}
            >
                {/* 2️⃣ RESPONSIBILITY SUMMARY BAR */}
                <View style={{ padding: 20 }}>
                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.03,
                        shadowRadius: 8,
                        elevation: 1,
                    }}>
                        {/* Assigned By */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                ASSIGNED BY
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: getAvatarColor(assignerName), alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{getInitials(assignerName)}</Text>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginLeft: 8 }}>{assignerName}</Text>
                            </View>
                        </View>

                        {/* Responsible Owner */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                RESPONSIBLE OWNER
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: getAvatarColor(ownerName), alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFF' }}>{getInitials(ownerName)}</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginLeft: 8 }}>{ownerName}</Text>
                                </View>
                                {task.status === 'PENDING' ? (
                                    <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>PENDING</Text>
                                    </View>
                                ) : (
                                    <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#10B981' }}>ACCEPTED</Text>
                                    </View>
                                )}
                            </View>
                            {task.status === 'PENDING' && isOwner && (
                                <TouchableOpacity
                                    onPress={handleAcceptResponsibility}
                                    style={{ marginTop: 12, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
                                >
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Accept Responsibility</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 }}>
                            {/* Participants */}
                            <View>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                    PARTICIPANTS
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                                        {task.participants?.slice(0, 3).map((p: any, i: number) => (
                                            <View key={i} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#FFF', marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontSize: 8, fontWeight: '700', color: '#6B7280' }}>{getInitials(p.user?.name)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#6B7280', marginLeft: 8 }}>
                                        {task.participants?.length || 0} Active
                                    </Text>
                                </View>
                            </View>

                            {/* Refresh Time */}
                            <View>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, textAlign: 'right' }}>
                                    STATUS REFRESH
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <History size={14} color="#9CA3AF" />
                                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginLeft: 4 }}>
                                        {timeAgo(task.lastUpdatedAt || task.updatedAt)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 4️⃣ TASK OVERVIEW (Expandable) */}
                <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                    <TouchableOpacity
                        onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F9FAFB',
                            padding: 16,
                            borderRadius: 12,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FileText size={18} color="#6B7280" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginLeft: 12 }}>
                                Task Overview
                            </Text>
                        </View>
                        {isOverviewExpanded ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                    </TouchableOpacity>

                    {isOverviewExpanded && (
                        <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8 }}>
                            <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                                {task.description || 'No description provided.'}
                            </Text>
                            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Created: {new Date(task.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 5️⃣ RESPONSIBILITY HIERARCHY MOVED TO VISION MODAL */}
                {/* 7️⃣ PROJECT MILESTONES */}
                <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>PROJECT MILESTONES</Text>

                    {/* Progress Bar */}
                    {task.milestones?.length > 0 && (
                        <View style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563' }}>
                                    Track Progress
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                                    {Math.round((task.milestones.filter((m: any) => m.isCompleted === 'true').length / task.milestones.length) * 100)}%
                                </Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                <View style={{
                                    height: '100%',
                                    backgroundColor: '#10B981',
                                    width: `${(task.milestones.filter((m: any) => m.isCompleted === 'true').length / task.milestones.length) * 100}%`
                                }} />
                            </View>
                        </View>
                    )}

                    {task.milestones?.length === 0 ? (
                        <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No milestones defined.</Text>
                    ) : (
                        task.milestones?.map((m: any, i: number) => {
                            const isCompleted = m.isCompleted === 'true';
                            const dueDate = m.dueDate ? new Date(m.dueDate) : null;
                            const isOverdue = dueDate && !isCompleted && dueDate < new Date();
                            const isNear = dueDate && !isCompleted && (dueDate.getTime() - new Date().getTime()) < 172800000; // 48h

                            return (
                                <View key={m.id} style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                    backgroundColor: '#FFFFFF',
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: isOverdue ? '#FCA5A5' : isNear ? '#FDE68A' : '#F3F4F6'
                                }}>
                                    <TouchableOpacity
                                        onPress={() => handleToggleMilestone(m.id, m.isCompleted)}
                                        style={{
                                            width: 20, height: 20, borderRadius: 10,
                                            borderWidth: 2, borderColor: isCompleted ? '#10B981' : '#D1D5DB',
                                            alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isCompleted ? '#10B981' : 'transparent',
                                            marginRight: 12,
                                        }}
                                    >
                                        {isCompleted && <CheckCircle2 size={12} color="#FFF" />}
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: isCompleted ? '#9CA3AF' : '#111827', textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
                                            {m.title}
                                        </Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <Clock size={10} color={isOverdue ? '#EF4444' : '#9CA3AF'} />
                                            <Text style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#9CA3AF', marginLeft: 4, fontWeight: isOverdue || isNear ? '700' : '400' }}>
                                                {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No due date'}
                                                {isOverdue && ' • OVERDUE'}
                                                {isNear && !isOverdue && ' • APPROACHING'}
                                            </Text>
                                        </View>
                                    </View>
                                    {(isOwner || isAssigner) && (
                                        <TouchableOpacity onPress={() => handleDeleteMilestone(m.id)}>
                                            <X size={16} color="#9CA3AF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })
                    )}
                    {(isOwner || isAssigner) && (
                        <TouchableOpacity
                            onPress={() => setShowMilestoneModal(true)}
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                        >
                            <Plus size={16} color="#3B82F6" />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#3B82F6', marginLeft: 6 }}>Add Milestone</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 8️⃣ TIME ALLOCATION */}
                <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>TIME ALLOCATION</Text>

                    <View style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#F3F4F6',
                        padding: 16,
                        marginBottom: 16,
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View>
                                <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>
                                    {formatDuration(totalMinutesLogged)}
                                </Text>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginTop: 2 }}>
                                    TOTAL TIME LOGGED
                                </Text>
                            </View>
                        </View>

                        {/* Breakdown */}
                        {usersTimeBreakdown.map((ub, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getAvatarColor(ub.name), marginRight: 8 }} />
                                    <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{ub.name}</Text>
                                </View>
                                <Text style={{ fontSize: 13, color: '#111827', fontWeight: '600' }}>{formatDuration(ub.duration)}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 9️⃣ SYSTEM AUDIT LOG */}
                <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>SYSTEM AUDIT LOG</Text>

                    {task.logs?.length === 0 ? (
                        <Text style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No logs yet.</Text>
                    ) : (
                        task.logs?.slice().sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log: any, index: number) => {
                            const isBlockCall = log.action.includes('BLOCKED');
                            const isHelpCall = log.action.includes('HELP_REQUESTED');
                            const iconColor = isBlockCall ? '#EF4444' : isHelpCall ? '#3B82F6' : '#10B981';

                            return (
                                <View key={log.id} style={{ flexDirection: 'row', marginBottom: 20 }}>
                                    <View style={{ width: 16, alignItems: 'center' }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: iconColor, marginTop: 4, zIndex: 10 }} />
                                        {index !== task.logs.length - 1 && (
                                            <View style={{ width: 2, flex: 1, backgroundColor: '#F3F4F6', marginTop: 2, marginBottom: -24 }} />
                                        )}
                                    </View>
                                    <View style={{ marginLeft: 16, flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                                            {log.user?.name || 'System'}{' '}
                                            <Text style={{ fontWeight: '400', color: '#4B5563' }}>
                                                {log.action}
                                            </Text>
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                                            {timeAgo(log.timestamp)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

            </ScrollView>

            {/* ─── MODALS ─────────────────────────────────────────── */}

            {/* SYNC UPDATE MODAL */}
            <Modal visible={showSyncModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 }}>Update Sync State</Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 }}>
                            {[
                                { id: 'IN_SYNC', label: 'In Sync', color: '#10B981', bg: '#F0FDF4' },
                                { id: 'NEEDS_UPDATE', label: 'Needs Update', color: '#F59E0B', bg: '#FFFBEB' },
                                { id: 'BLOCKED', label: 'Blocked', color: '#EF4444', bg: '#FEF2F2' },
                                { id: 'HELP_REQUESTED', label: 'Help Requested', color: '#3B82F6', bg: '#EFF6FF' },
                            ].map(s => {
                                const isSelected = syncParams.state === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setSyncParams({ ...syncParams, state: s.id })}
                                        style={{
                                            width: '48%',
                                            padding: 12,
                                            borderRadius: 12,
                                            backgroundColor: isSelected ? s.bg : '#F9FAFB',
                                            borderWidth: 2,
                                            borderColor: isSelected ? s.color : '#F3F4F6',
                                            marginBottom: 8,
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? s.color : '#4B5563' }}>
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {(syncParams.state === 'BLOCKED' || syncParams.state === 'HELP_REQUESTED') && (
                            <TextInput
                                style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                                placeholder="Why? (Required)"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                value={syncParams.note}
                                onChangeText={t => setSyncParams({ ...syncParams, note: t })}
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowSyncModal(false)} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdateSync} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', opacity: (!syncParams.state || ((syncParams.state === 'BLOCKED' || syncParams.state === 'HELP_REQUESTED') && !syncParams.note.trim())) ? 0.5 : 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Commit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* LOG TIME MODAL */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View style={{ backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 }}>Log Time</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <TextInput
                                style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 16, color: '#111827', textAlign: 'center' }}
                                placeholder="Hours"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={timeLog.hours}
                                onChangeText={t => setTimeLog({ ...timeLog, hours: t })}
                            />
                            <TextInput
                                style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 16, color: '#111827', textAlign: 'center' }}
                                placeholder="Mins"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={timeLog.minutes}
                                onChangeText={t => setTimeLog({ ...timeLog, minutes: t })}
                            />
                        </View>
                        <TextInput
                            style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: '#111827', marginBottom: 24 }}
                            placeholder="What did you work on? (Optional)"
                            placeholderTextColor="#9CA3AF"
                            value={timeLog.note}
                            onChangeText={t => setTimeLog({ ...timeLog, note: t })}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowTimeModal(false)} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleLogTime} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Log Time</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ADD MILESTONE MODAL */}
            <Modal visible={showMilestoneModal} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 20 }}>
                    <View style={{ backgroundColor: '#FFF', padding: 24, borderRadius: 24 }}>
                        <TextInput
                            style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: '#111827', marginBottom: 12 }}
                            placeholder="Milestone title..."
                            placeholderTextColor="#9CA3AF"
                            value={newMilestone}
                            onChangeText={setNewMilestone}
                            autoFocus
                        />
                        <TextInput
                            style={{ backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: '#111827', marginBottom: 24 }}
                            placeholder="Due Date (YYYY-MM-DD)"
                            placeholderTextColor="#9CA3AF"
                            value={newMilestoneDate}
                            onChangeText={setNewMilestoneDate}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowMilestoneModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddMilestone} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* FULLSCREEN VISION MODAL */}
            <Modal visible={showVisionModal} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', zIndex: 10 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827' }}>Vision</Text>

                        <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 4, borderRadius: 8 }}>
                            <TouchableOpacity
                                onPress={() => setVisionTab('graph')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: visionTab === 'graph' ? '#FFF' : 'transparent', shadowOpacity: visionTab === 'graph' ? 0.05 : 0 }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: visionTab === 'graph' ? '#111827' : '#6B7280' }}>Graph</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setVisionTab('tree')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: visionTab === 'tree' ? '#FFF' : 'transparent', shadowOpacity: visionTab === 'tree' ? 0.05 : 0 }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: visionTab === 'tree' ? '#111827' : '#6B7280' }}>Tree</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setShowVisionModal(false)} style={{ backgroundColor: '#F3F4F6', padding: 8, borderRadius: 20 }}>
                            <X size={20} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    {visionTab === 'graph' ? (
                        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', paddingTop: 20 }}>
                            <Svg height="100%" width="100%">
                                {/* Lines from Center to Owner */}
                                <Line x1={SCREEN_WIDTH / 2} y1={80} x2={SCREEN_WIDTH / 2} y2={180} stroke="#E5E7EB" strokeWidth="2" strokeDasharray="5,5" />

                                {/* Lines from Owner to Participants */}
                                {task.participants?.map((p: any, i: number) => {
                                    const total = task.participants.length;
                                    const radius = 120;
                                    const angle = (Math.PI / (total + 1)) * (i + 1);
                                    const pos = {
                                        x: (SCREEN_WIDTH / 2) + radius * Math.cos(Math.PI + angle),
                                        y: 180 + radius * Math.sin(Math.PI + angle)
                                    };
                                    return <Line key={`l-${i}`} x1={SCREEN_WIDTH / 2} y1={180} x2={pos.x} y2={pos.y} stroke="#E2E8F0" strokeWidth="1.5" />;
                                })}

                                {/* Center Node: Task */}
                                <G>
                                    <Circle cx={SCREEN_WIDTH / 2} cy={80} r="30" fill="#111827" />
                                    <SvgText x={SCREEN_WIDTH / 2} y={85} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">TASK</SvgText>
                                </G>

                                {/* Owner Node */}
                                <G>
                                    <Circle cx={SCREEN_WIDTH / 2} cy={180} r="36" fill={getSyncConfig(task.syncState).color} />
                                    <Circle cx={SCREEN_WIDTH / 2} cy={180} r="30" fill="#fff" />
                                    <SvgText x={SCREEN_WIDTH / 2} y={185} fill="#111827" fontSize="10" textAnchor="middle" fontWeight="bold">
                                        {getInitials(ownerName)}
                                    </SvgText>
                                    <SvgText x={SCREEN_WIDTH / 2} y={230} fill="#4B5563" fontSize="11" textAnchor="middle" fontWeight="600">
                                        {ownerName}
                                    </SvgText>
                                    <SvgText x={SCREEN_WIDTH / 2} y={245} fill="#9CA3AF" fontSize="9" textAnchor="middle" fontWeight="800" letterSpacing="0.5">
                                        OWNER
                                    </SvgText>
                                </G>

                                {/* Participant Nodes */}
                                {task.participants?.map((p: any, i: number) => {
                                    const total = task.participants.length;
                                    const radius = 120;
                                    const angle = (Math.PI / (total + 1)) * (i + 1);
                                    const pos = {
                                        x: (SCREEN_WIDTH / 2) + radius * Math.cos(Math.PI + angle),
                                        y: 180 + radius * Math.sin(Math.PI + angle)
                                    };
                                    const roleColor = getRoleConfig(p.role === 'contributor' ? 'Contributor' : 'Helper').color;
                                    return (
                                        <G key={`p-${i}`}>
                                            <Circle cx={pos.x} cy={pos.y} r="22" fill="#F8FAFC" stroke={getSyncConfig(p.syncState || 'IN_SYNC').color} strokeWidth="2.5" />
                                            <SvgText x={pos.x} y={pos.y + 4} fill="#64748B" fontSize="9" textAnchor="middle" fontWeight="700">
                                                {getInitials(p.user?.name)}
                                            </SvgText>
                                            <SvgText x={pos.x} y={pos.y + 35} fill="#9CA3AF" fontSize="8" textAnchor="middle" fontWeight="800" letterSpacing="0.5">
                                                {p.role.toUpperCase()}
                                            </SvgText>
                                        </G>
                                    );
                                })}
                            </Svg>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, backgroundColor: '#FAFAFA' }} contentContainerStyle={{ padding: 20 }}>
                            <View style={{ borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFF' }}>
                                {/* Header Row */}
                                <View style={{ flexDirection: 'row', backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                    <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 }}>STAKEHOLDER</Text>
                                    <Text style={{ flex: 1.5, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 }}>ROLE AUTHORITY</Text>
                                    <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textAlign: 'right' }}>STATUS</Text>
                                </View>

                                {/* Hierarchy Rows */}
                                {treeParticipants.map((p, i) => {
                                    const roleCfg = getRoleConfig(p.authority);
                                    const syncCfg = getSyncConfig(p.syncState || 'IN_SYNC');
                                    const isNodeBlocked = p.syncState === 'BLOCKED';

                                    return (
                                        <View key={i} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 14,
                                            paddingHorizontal: 16,
                                            borderBottomWidth: i === treeParticipants.length - 1 ? 0 : 1,
                                            borderBottomColor: '#F3F4F6',
                                            backgroundColor: isNodeBlocked ? '#FEF2F2' : '#FFFFFF',
                                        }}>
                                            {/* Stakeholder */}
                                            <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: getAvatarColor(p.user?.name), alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>{getInitials(p.user?.name)}</Text>
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                                                        {p.user?.name}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Role Authority */}
                                            <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                                <View style={{
                                                    alignSelf: 'flex-start',
                                                    backgroundColor: roleCfg.bg,
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 4,
                                                    borderRadius: 6,
                                                }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: roleCfg.color, textTransform: 'uppercase' }}>
                                                        {p.authority}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Status */}
                                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: syncCfg.color }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

export default TaskDetailScreen;
