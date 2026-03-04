import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    TextInput, ActivityIndicator, Dimensions, Modal, KeyboardAvoidingView, Platform, StatusBar, Alert, Image, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ChevronLeft, Network, Clock, FileText, CheckCircle2,
    AlertCircle, HelpCircle, User, Users, Plus, X, ArrowRightLeft,
    ChevronDown, ChevronUp, History, Eye, Send, RefreshCcw, Paperclip, Image as ImageIcon, MessageCircle, Trash2, BarChart2, Target, ArrowRight, MessageSquare, Check
} from 'lucide-react-native';
import VisionGraph from '../components/vision/VisionGraph';
import * as ImagePicker from 'expo-image-picker';

import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import api from '../services/api';
import { API_BASE_URL } from '../config/apiConfig';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';
import { timeAgo } from '../utils/timeAgo';
import { useTaskDetail, useTaskComments, useTaskMutations, useTransferActions, useTaskTransfers, useUsers } from '../hooks/useTaskDetail';
import { useQueryClient } from '@tanstack/react-query';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SYNC STATE CONFIG ────────────────────────────────
const getSyncConfig = (state: string) => {
    switch (state) {
        case 'IN_SYNC': return { color: '#10B981', bg: '#F0FDF4', border: '#BBF7D0', label: 'IN SYNC' };
        case 'NEEDS_UPDATE': return { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'NEEDS UPDATE' };
        case 'BLOCKED': return { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'BLOCKED' };
        case 'HELP_REQUESTED': return { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'HELP REQUESTED' };
        case 'PENDING': return { color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', label: 'PENDING' };
        case 'COMPLETED': return { color: '#111827', bg: '#F3F4F6', border: '#E5E7EB', label: 'COMPLETED' };
        default: return { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', label: 'UNKNOWN' };
    }
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

const UserAvatar = ({ name, url, size = 40, border = 0, borderColor = 'transparent' }: { name: string, url?: string, size?: number, border?: number, borderColor?: string }) => {
    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: getAvatarColor(name),
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: border,
            borderColor: borderColor
        }}>
            {url ? (
                <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
            ) : (
                <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: '#FFF' }}>{getInitials(name)}</Text>
            )}
        </View>
    );
};



const TaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const queryClient = useQueryClient();
    const { user, settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    // ─── QUERY HOOKS ───────────────────────────────────
    const { data: task, isLoading: taskLoading, error: taskError } = useTaskDetail(taskId);
    const { data: comments = [], isLoading: commentsLoading } = useTaskComments(taskId);
    const { data: transfers = [] } = useTaskTransfers(taskId);

    const { acceptTask, updateSyncState, addParticipant, removeParticipant, logTime, addMilestone, updateMilestone, deleteMilestone, editTask, addComment, deleteComment, transferTask, nudgeTask, deleteTask } = useTaskMutations(taskId);

    const { acceptTransfer, rejectTransfer } = useTransferActions();

    const [activeTab, setActiveTab] = useState<'overview' | 'tree' | 'graph' | 'logs' | 'discussion'>('overview');
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [visionTab, setVisionTab] = useState<'graph' | 'tree'>('graph');

    // Modals
    const [showVisionModal, setShowVisionModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUserData, setSelectedUserData] = useState<any>(null);

    // Form states
    const [syncParams, setSyncParams] = useState({ state: '', note: '' });
    const [timeLog, setTimeLog] = useState({ hours: '', minutes: '', note: '' });
    const [newMilestone, setNewMilestone] = useState('');
    const [newMilestoneDate, setNewMilestoneDate] = useState('');
    const [editTaskData, setEditTaskData] = useState({ title: '', description: '', priority: 'MEDIUM' });
    const [editMilestoneData, setEditMilestoneData] = useState({ id: '', title: '', dueDate: '' });
    const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    const handleUploadAttachment = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setUploadingAttachment(true);
            try {
                const uri = result.assets[0].uri;
                const formData = new FormData();
                const filename = uri.split('/').pop() || 'attachment.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const ext = match ? match[1] : (result.assets[0].type === 'image' ? 'jpg' : 'mp4');
                let type = `${result.assets[0].type}/${ext}`;
                if (type === 'image/jpg') type = 'image/jpeg';

                formData.append('file', {
                    uri,
                    name: filename,
                    type,
                } as any);

                const token = useAuthStore.getState().token;

                const res = await fetch(`${API_BASE_URL}/upload/task-attachment/${taskId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error(`Upload failed with status ${res.status}`);
                }

                queryClient.invalidateQueries({ queryKey: ['task', taskId] });
                Alert.alert('Success', 'Attachment uploaded.');
            } catch (error: any) {
                console.error('Attachment upload error:', error);
                Alert.alert('Error', 'Failed to upload attachment.');
            } finally {
                setUploadingAttachment(false);
            }
        }
    };
    const { data: searchedUsers = [], isLoading: searchingUsers } = useUsers(userSearch.length >= 2 ? userSearch : '');
    const users = searchedUsers.filter((u: any) => u.id !== user?.id);
    const [selectedNewOwner, setSelectedNewOwner] = useState<any>(null);
    const [transferNote, setTransferNote] = useState('');

    const pendingTransfer = useMemo(() => {
        if (task?.status === 'TRANSFER_PENDING') {
            return transfers.find((t: any) => t.status === 'PENDING');
        }
        return null;
    }, [task?.status, transfers]);

    useEffect(() => {
        const socket = getSocket();
        socket.emit('joinTask', { taskId });

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId] });
        };

        const invalidateComments = () => {
            queryClient.invalidateQueries({ queryKey: ['task', taskId, 'comments'] });
        };

        socket.on('task:updated', invalidate);
        socket.on('task:transferred', invalidate);
        socket.on('task:accepted', invalidate);
        socket.on('transfer:initiated', invalidate);
        socket.on('transfer:accepted', invalidate);
        socket.on('transfer:rejected', invalidate);
        socket.on('milestone:created', invalidate);
        socket.on('milestone:updated', invalidate);
        socket.on('milestone:deleted', invalidate);
        socket.on('comment:new', invalidateComments);
        socket.on('sync:update', invalidate);

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('task:updated', invalidate);
            socket.off('task:transferred', invalidate);
            socket.off('task:accepted', invalidate);
            socket.off('transfer:initiated', invalidate);
            socket.off('transfer:accepted', invalidate);
            socket.off('transfer:rejected', invalidate);
            socket.off('milestone:created', invalidate);
            socket.off('milestone:updated', invalidate);
            socket.off('milestone:deleted', invalidate);
            socket.off('comment:new', invalidateComments);
            socket.off('sync:update', invalidate);
        };
    }, [taskId, queryClient]);

    const searchUsers = (q: string) => {
        setUserSearch(q);
    };


    // ─── ACTIONS ───────────────────────────────────────────
    const handleTransferInitiate = async (newOwnerId: string, note?: string) => {
        transferTask.mutate({ newOwnerId, note }, {
            onSuccess: () => {
                setShowTransferModal(false);
                setSelectedNewOwner(null);
                setTransferNote('');
                Alert.alert("Transfer Initiated", "The recipient has been notified to accept responsibility.");
            }
        });
    };

    const handleAcceptTransfer = async (transferId: string) => {
        acceptTransfer.mutate(transferId, {
            onSuccess: () => {
                Alert.alert("Success", "You are now responsible for this track.");
            }
        });
    };

    const handleRejectTransfer = async (transferId: string) => {
        rejectTransfer.mutate(transferId, {
            onSuccess: () => {
                Alert.alert("Rejected", "The transfer has been cancelled.");
            }
        });
    };

    const handleDeleteComment = async (commentId: string) => {
        deleteComment.mutate(commentId);
    };

    const handleUpdateTask = async () => {
        editTask.mutate(editTaskData, {
            onSuccess: () => setShowEditModal(false)
        });
    };

    const handleDeleteTask = async () => {
        deleteTask.mutate(undefined, {
            onSuccess: () => {
                setShowEditModal(false);
                Alert.alert("Success", "Track has been permanently removed.");
                navigation.goBack();
            }
        });
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        addComment.mutate(commentText.trim(), {
            onSuccess: () => setCommentText('')
        });
    };

    const handleAddParticipant = async (userId: string) => {
        addParticipant.mutate(userId);
    };

    const handleRemoveParticipant = async (userId: string) => {
        removeParticipant.mutate(userId);
    };

    const handleUpdateSync = async () => {
        updateSyncState.mutate(syncParams, {
            onSuccess: () => setShowSyncModal(false)
        });
    };

    const handleLogTime = async () => {
        const h = parseInt(timeLog.hours || '0', 10);
        const m = parseInt(timeLog.minutes || '0', 10);
        const totalMinutes = (h * 60) + m;

        logTime.mutate({ durationMinutes: totalMinutes, description: timeLog.note }, {
            onSuccess: () => {
                setShowTimeModal(false);
                setTimeLog({ hours: '', minutes: '', note: '' });
            }
        });
    };

    const handleToggleMilestone = async (mid: string, current: string) => {
        updateMilestone.mutate({ milestoneId: mid, isCompleted: current !== 'COMPLETED' });
    };

    const handleAddMilestone = async () => {
        addMilestone.mutate({ title: newMilestone, dueDate: newMilestoneDate }, {
            onSuccess: () => {
                setShowMilestoneModal(false);
                setNewMilestone('');
                setNewMilestoneDate('');
            }
        });
    };

    const handleUpdateMilestone = async () => {
        updateMilestone.mutate({
            milestoneId: editMilestoneData.id,
            title: editMilestoneData.title,
            dueDate: editMilestoneData.dueDate
        }, {
            onSuccess: () => setShowEditMilestoneModal(false)
        });
    };

    const handleNudge = async () => {
        nudgeTask.mutate(undefined, {
            onSuccess: () => Alert.alert("Nudge Sent", "The responsible owner has been notified.")
        });
    };

    const handleCompleteTask = async () => {
        Alert.alert("Complete Track", "Mark this entire track as COMPLETED?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Complete",
                onPress: () => {
                    editTask.mutate({ status: 'COMPLETED' });
                }
            }
        ]);
    };

    const handleDeleteMilestone = async (mid: string) => {
        deleteMilestone.mutate(mid);
    };

    const handleAcceptResponsibility = async () => {
        // Find the pending transfer to me
        const myTransfer = transfers.find((t: any) => t.toUserId === user?.id && t.status === 'PENDING');
        if (myTransfer) {
            handleAcceptTransfer(myTransfer.id);
        }
    };

    const handleRejectResponsibility = async () => {
        // Find the pending transfer to me
        const myTransfer = transfers.find((t: any) => t.toUserId === user?.id && t.status === 'PENDING');
        if (myTransfer) {
            handleRejectTransfer(myTransfer.id);
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

    const treeParticipants = useMemo(() => {
        if (!task) return [];
        const result = [];
        // Originator
        if (task.assigner) result.push({ user: task.assigner, role: 'Originator', authority: 'Originator', level: 0 });
        // Responsible
        if (task.owner) result.push({ user: task.owner, role: 'Responsible', authority: 'OWNER', syncState: task.syncState, level: 1 });
        // Participants
        if (task.participants) {
            task.participants.forEach((p: any) => result.push({
                user: p.user,
                role: p.role,
                authority: p.role === 'contributor' ? 'Contributor' : 'Helper',
                syncState: p.syncState || 'IN_SYNC',
                level: 2
            }));
        }
        return result;
    }, [task]);


    if (taskLoading && !task) {
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
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#111827' : '#FAFAFA'} />

            {/* 1️⃣ STICKY HEADER */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                zIndex: 10,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 10 }}>
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
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
                            {task.priority && (
                                <View style={{
                                    backgroundColor: getPriorityConfig(task.priority).bg,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    marginRight: 6,
                                    borderWidth: 1,
                                    borderColor: getPriorityConfig(task.priority).color + '20',
                                }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: getPriorityConfig(task.priority).color }}>
                                        {getPriorityConfig(task.priority).label.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>
                                ID: ST-{task.id.substring(0, 4)}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#D1D5DB', marginHorizontal: 4 }}>•</Text>
                            <TouchableOpacity
                                onPress={() => queryClient.invalidateQueries({ queryKey: ['task', taskId] })}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <RefreshCcw size={10} color="#9CA3AF" style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#9CA3AF' }}>
                                    {taskLoading ? 'Syncing...' : 'Synced'}
                                </Text>
                            </TouchableOpacity>
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

                {(isOwner || isAssigner) && (
                    <TouchableOpacity
                        onPress={() => {
                            setEditTaskData({
                                title: task.title,
                                description: task.description || '',
                                priority: task.priority || 'MEDIUM'
                            });
                            setShowEditModal(true);
                        }}
                        style={{
                            marginLeft: 10,
                            backgroundColor: '#F3F4F6',
                            padding: 8,
                            borderRadius: 12,
                        }}
                    >
                        <FileText size={18} color="#374151" />
                    </TouchableOpacity>
                )}
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

                    {/* Request Help - Direct update instead of just opening modal? No, let's keep modal but make note optional */}
                    <TouchableOpacity
                        onPress={() => {
                            setSyncParams({ state: 'HELP_REQUESTED', note: '' });
                            setShowSyncModal(true);
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#FEF2F2',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#FECACA'
                        }}
                    >
                        <HelpCircle size={14} color="#EF4444" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444', marginLeft: 6 }}>
                            Request Help
                        </Text>
                    </TouchableOpacity>

                    {(isOwner) && (
                        <TouchableOpacity
                            onPress={() => {
                                setShowTransferModal(true);
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
                    {(isOwner) && (
                        <TouchableOpacity
                            onPress={() => {
                                setShowParticipantsModal(true);
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
                            <Users size={14} color="#374151" />
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginLeft: 6 }}>
                                Participants
                            </Text>
                        </TouchableOpacity>
                    )}
                    {isAssigner && task.status !== 'COMPLETED' && (
                        <>
                            <TouchableOpacity
                                onPress={handleNudge}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#FFFBEB',
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: '#FDE68A'
                                }}
                            >
                                <AlertCircle size={14} color="#F59E0B" />
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#F59E0B', marginLeft: 6 }}>
                                    Nudge
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCompleteTask}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#F0FDF4',
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: '#BBF7D0'
                                }}
                            >
                                <CheckCircle2 size={14} color="#10B981" />
                                <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981', marginLeft: 6 }}>
                                    Complete Track
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>

            {/* 4️⃣ TAB BAR */}
            <View style={{
                flexDirection: 'row',
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                paddingHorizontal: 10,
            }}>
                {(['overview', 'tree', 'graph', 'logs', 'discussion'] as const).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            paddingVertical: 14,
                            alignItems: 'center',
                            borderBottomWidth: activeTab === tab ? 2 : 0,
                            borderBottomColor: '#3B82F6',
                        }}
                    >
                        <Text style={{
                            fontSize: 10,
                            fontWeight: activeTab === tab ? '700' : '600',
                            color: activeTab === tab ? '#3B82F6' : (isDark ? '#9CA3AF' : '#6B7280'),
                            textTransform: 'capitalize'
                        }}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* MAIN SCROLL VIEW */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={taskLoading} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['task', taskId] })} />}
            >
                {/* 🚨 NEW TASK ACCEPTANCE BANNER */}
                {task?.status === 'PENDING' && isOwner && activeTab === 'overview' && (
                    <View style={{
                        backgroundColor: '#F5F3FF',
                        margin: 20,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#DDD6FE',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <CheckCircle2 size={20} color="#8B5CF6" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#5B21B6', marginLeft: 10 }}>
                                Accept Responsibility
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#6D28D9', marginBottom: 16 }}>
                            {task.assigner?.name || 'Someone'} has assigned you as the Responsible Owner for this track. You must accept to begin tracking.
                        </Text>
                        <TouchableOpacity
                            onPress={() => acceptTask.mutate()}
                            disabled={acceptTask.isPending}
                            style={{
                                backgroundColor: '#8B5CF6',
                                paddingVertical: 12,
                                borderRadius: 8,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center'
                            }}
                        >
                            {acceptTask.isPending ? <ActivityIndicator size="small" color="#FFF" /> : (
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Accept Track</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* 🚨 PENDING TRANSFER BANNER */}
                {task?.status === 'TRANSFER_PENDING' && pendingTransfer && activeTab === 'overview' && (
                    <View style={{
                        backgroundColor: '#FFFBEB',
                        margin: 20,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <ArrowRightLeft size={20} color="#F59E0B" />
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400E', marginLeft: 10 }}>
                                Responsibility Transfer Pending
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: '#B45309', marginBottom: 16 }}>
                            {pendingTransfer.fromUser?.name} wants to transfer responsibility to {pendingTransfer.toUser?.role === user?.id ? 'YOU' : pendingTransfer.toUser?.name}.
                            {pendingTransfer.note ? `\n\nNote: "${pendingTransfer.note}"` : ''}
                        </Text>

                        {pendingTransfer.toUserId === user?.id ? (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => handleAcceptTransfer(pendingTransfer.id)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#10B981',
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Accept</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleRejectTransfer(pendingTransfer.id)}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#EF4444',
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                                    Awaiting response from {pendingTransfer.toUser?.name}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                {activeTab === 'overview' && (
                    <>
                        {/* 2️⃣ RESPONSIBILITY SUMMARY BAR */}
                        <View style={{ padding: 20 }}>
                            <View style={{
                                backgroundColor: '#FFF',
                                borderRadius: 16,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: '#F3F4F6',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 2,
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 4 }}>RESPONSIBLE OWNER</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: syncConfig.color, marginRight: 8 }} />
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{ownerName}</Text>
                                        </View>
                                    </View>
                                    <UserAvatar name={ownerName} url={task.owner?.avatarUrl} size={40} />
                                </View>

                                <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 15 }} />

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 }}>SYNC STATE</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: syncConfig.color }}>{syncConfig.label.toUpperCase()}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 4 }}>LAST SYNC</Text>
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563' }}>{task.lastUpdatedAt ? new Date(task.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* 3️⃣ VISUAL HIERARCHY (COMPACT) */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Authority Status</Text>
                                <TouchableOpacity onPress={() => setShowVisionModal(true)}>
                                    <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Expand Vision</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* ORIGINATOR */}
                                <View style={{ alignItems: 'center', marginRight: 15 }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden' }}>
                                        <UserAvatar name={assignerName} url={task.assigner?.avatarUrl} size={44} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '700' }}>ORIGIN</Text>
                                </View>

                                <ArrowRight size={16} color="#D1D5DB" style={{ marginRight: 15, marginTop: -15 }} />

                                {/* RESPONSIBLE */}
                                <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', borderWidth: 3, borderColor: syncConfig.color, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: syncConfig.color, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}>
                                        <UserAvatar name={ownerName} url={task.owner?.avatarUrl} size={44} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: syncConfig.color, fontWeight: '800' }}>RESPONSIBLE</Text>
                                </View>

                                {task.participants?.length > 0 && (
                                    <>
                                        <ArrowRight size={16} color="#D1D5DB" style={{ marginHorizontal: 15, marginTop: -15 }} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {task.participants.slice(0, 3).map((p: any, i: number) => (
                                                <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                                                    <UserAvatar name={p.user?.name} url={p.user?.avatarUrl} size={34} border={2} borderColor="#FFF" />
                                                </View>
                                            ))}
                                            {task.participants.length > 3 && (
                                                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', marginLeft: -10, borderWidth: 2, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280' }}>+{task.participants.length - 3}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>

                        {/* 4️⃣ QUICK STATS */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DBEAFE' }}>
                                    <Clock size={18} color="#3B82F6" style={{ marginBottom: 8 }} />
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E40AF' }}>{formatDuration(totalMinutesLogged)}</Text>
                                    <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '700' }}>LOGGED</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E0E7FF' }}>
                                    <Target size={18} color="#4F46E5" style={{ marginBottom: 8 }} />
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#3730A3' }}>{task.milestones?.filter((m: any) => m.isCompleted).length}/{task.milestones?.length}</Text>
                                    <Text style={{ fontSize: 10, color: '#4F46E5', fontWeight: '700' }}>MILESTONES</Text>
                                </View>
                                <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DCFCE7' }}>
                                    <MessageSquare size={18} color="#16A34A" style={{ marginBottom: 8 }} />
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#166534' }}>{comments.length}</Text>
                                    <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '700' }}>REMARKS</Text>
                                </View>
                            </View>
                        </View>

                        {/* 5.5️⃣ ATTACHMENTS */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Media & Attachments</Text>
                                <TouchableOpacity onPress={handleUploadAttachment} disabled={uploadingAttachment}>
                                    {uploadingAttachment ? (
                                        <ActivityIndicator size="small" color="#3B82F6" />
                                    ) : (
                                        <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>+ Add Media</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {!task?.attachments || task.attachments.length === 0 ? (
                                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' }}>
                                    <Paperclip size={24} color="#9CA3AF" />
                                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>No attachments yet.</Text>
                                </View>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                    {task.attachments.map((att: any) => (
                                        <View key={att.id} style={{ width: 100 }}>
                                            <View style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: '#F3F4F6', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
                                                {att.fileType.startsWith('image') ? (
                                                    <Image source={{ uri: att.url }} style={{ width: '100%', height: '100%' }} />
                                                ) : (
                                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                        <FileText size={32} color="#9CA3AF" />
                                                    </View>
                                                )}
                                            </View>
                                            <Text numberOfLines={1} style={{ fontSize: 10, color: '#4B5563', marginTop: 4, textAlign: 'center' }}>{att.fileName}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        {/* 5️⃣ DESCRIPTION */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Track Vision & Mission</Text>
                            <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#F3F4F6' }}>
                                <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                                    {task.description || 'No description provided for this track.'}
                                </Text>
                            </View>
                        </View>

                        {/* 6️⃣ CORE LOGS (MINI) */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827' }}>Recent Audit Chain</Text>
                                <TouchableOpacity onPress={() => setActiveTab('logs')}>
                                    <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '600' }}>Full Trail</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6' }}>
                                {task.syncLogs?.slice(0, 5).map((log: any, i: number) => (
                                    <View key={log.id} style={{
                                        flexDirection: 'row',
                                        padding: 12,
                                        borderBottomWidth: i === 4 || i === task.syncLogs.length - 1 ? 0 : 1,
                                        borderBottomColor: '#F9FAFB',
                                        alignItems: 'center'
                                    }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getSyncConfig(log.syncState || (log.details?.type === 'SYNC_UPDATE' ? log.details.newState : 'STABLE')).color, marginRight: 12 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, color: isDark ? '#F9FAFB' : '#1F2937', fontWeight: '500' }}>{log.action}</Text>
                                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.user?.name}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {activeTab === 'discussion' && (
                    <View style={{ padding: 20 }}>

                        {comments.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 40 }}>
                                <MessageCircle size={48} color="#E5E7EB" />
                                <Text style={{ color: '#9CA3AF', marginTop: 10, fontWeight: '600' }}>No remarks yet.</Text>
                            </View>
                        ) : (
                            comments.map((comment: any) => (
                                <View key={comment.id} style={{ marginBottom: 16, flexDirection: 'row' }}>
                                    <UserAvatar name={comment.user?.name} url={comment.user?.avatarUrl} size={36} />
                                    <View style={{ flex: 1, backgroundColor: comment.userId === user?.id ? (isDark ? '#1E3A8A' : '#EFF6FF') : (isDark ? '#374151' : '#F9FAFB'), padding: 12, borderRadius: 12, borderWidth: 1, borderColor: comment.userId === user?.id ? (isDark ? '#1E40AF' : '#DBEAFE') : (isDark ? '#4B5563' : '#F3F4F6'), marginLeft: 12 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#F9FAFB' : '#1F2937' }}>{comment.user?.name}</Text>
                                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#4B5563', lineHeight: 20 }}>{comment.content}</Text>

                                        {comment.userId === user?.id && (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteComment(comment.id)}
                                                style={{ alignSelf: 'flex-end', marginTop: 8 }}
                                            >
                                                <Trash2 size={14} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}

                        <View style={{ height: 100 }} />
                    </View>
                )}

                {activeTab === 'logs' && (
                    <View style={{ padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 20 }}>Audit Trail</Text>
                        <View style={{ borderLeftWidth: 1, borderLeftColor: isDark ? '#374151' : '#E5E7EB', marginLeft: 10, paddingLeft: 20 }}>
                            {task.syncLogs?.map((log: any, i: number) => (
                                <View key={log.id} style={{ marginBottom: 24, position: 'relative' }}>
                                    <View style={{
                                        position: 'absolute',
                                        left: -26,
                                        top: 4,
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: '#FFF',
                                        borderWidth: 2,
                                        borderColor: '#3B82F6',
                                    }} />
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 4 }}>
                                        {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                                    </Text>
                                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827' }}>{log.action}</Text>
                                        <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#4B5563', marginTop: 4 }}>Stakeholder: {log.user?.name}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {(activeTab === 'tree' || activeTab === 'graph') && (
                    <View style={{ height: 600, backgroundColor: isDark ? '#111827' : '#FFF' }}>
                        <View style={{ padding: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Structural Vision</Text>
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>Visual representation of authority and sync status.</Text>
                        </View>
                        {activeTab === 'graph' ? (
                            <View style={{ flex: 1 }}>
                                <VisionGraph
                                    task={task}
                                    ownerName={ownerName}
                                    assignerName={assignerName}
                                    height={500}
                                    isDark={isDark}
                                />
                            </View>
                        ) : (
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                                <View style={{ borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 16, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFF' }}>
                                    {/* Header Row */}
                                    <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#374151' : '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#4B5563' : '#F3F4F6' }}>
                                        <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 }}>STAKEHOLDER</Text>
                                        <Text style={{ flex: 1.5, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 }}>AUTHORITY</Text>
                                        <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textAlign: 'right' }}>STATUS</Text>
                                    </View>

                                    {/* Hierarchy Rows */}
                                    {treeParticipants.map((p, i) => {
                                        const roleCfg = getRoleConfig(p.authority);
                                        const syncCfg = getSyncConfig(p.syncState || 'IN_SYNC');
                                        const isNodeBlocked = p.syncState === 'BLOCKED';

                                        return (
                                            <TouchableOpacity
                                                key={i}
                                                onPress={() => {
                                                    setSelectedUserData({ ...p.user, role: p.role, authority: p.authority });
                                                    setShowUserModal(true);
                                                }}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingVertical: 14,
                                                    paddingHorizontal: 16,
                                                    paddingLeft: 16 + (p.level * 20),
                                                    borderBottomWidth: i === treeParticipants.length - 1 ? 0 : 1,
                                                    borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                                                    backgroundColor: isNodeBlocked ? (isDark ? '#451212' : '#FEF2F2') : (isDark ? '#1F2937' : '#FFFFFF'),
                                                }}
                                            >
                                                {/* Stakeholder */}
                                                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: getAvatarColor(p.user?.name), alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>{getInitials(p.user?.name)}</Text>
                                                    </View>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
                                                        {p.user?.name}
                                                    </Text>
                                                </View>

                                                {/* Role Authority */}
                                                <View style={{ flex: 1.5, justifyContent: 'center' }}>
                                                    <View style={{
                                                        alignSelf: 'flex-start',
                                                        backgroundColor: isDark ? '#374151' : roleCfg.bg,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                        borderRadius: 6,
                                                    }}>
                                                        <Text style={{ fontSize: 9, fontWeight: '800', color: isDark ? '#F9FAFB' : roleCfg.color, textTransform: 'uppercase' }}>
                                                            {p.authority}
                                                        </Text>
                                                    </View>
                                                </View>

                                                {/* Status */}
                                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: syncCfg.color }} />
                                                    <ArrowRight size={10} color={isDark ? '#4B5563' : '#D1D5DB'} style={{ marginLeft: 8 }} />
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                )}
                {activeTab === 'overview' && (
                    <>
                        {/* 2️⃣ RESPONSIBILITY SUMMARY BAR */}
                        <View style={{ padding: 20 }}>
                            <View style={{
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#F3F4F6',
                                padding: 16,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDark ? 0.2 : 0.03,
                                shadowRadius: 8,
                                elevation: 1,
                            }}>
                                {/* Assigned By */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>
                                        ASSIGNED BY
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <UserAvatar name={assignerName} url={task.assigner?.avatarUrl} size={24} />
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
                                            <UserAvatar name={ownerName} url={task.owner?.avatarUrl} size={24} />
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
                                        <View style={{ flexDirection: 'row', marginTop: 12 }}>
                                            <TouchableOpacity
                                                onPress={handleAcceptResponsibility}
                                                style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginRight: 8 }}
                                            >
                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Accept</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleRejectResponsibility}
                                                style={{ flex: 1, backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}
                                            >
                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Reject</Text>
                                            </TouchableOpacity>
                                        </View>
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
                                                    <View key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                                                        <UserAvatar name={p.user?.name} url={p.user?.avatarUrl} size={24} border={2} borderColor="#FFF" />
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
                                            <Text style={{ fontSize: 13, fontWeight: '500', color: isDark ? '#D1D5DB' : '#374151', marginLeft: 4 }}>
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
                                    backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                    padding: 16,
                                    borderRadius: 12,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <FileText size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#F9FAFB' : '#374151', marginLeft: 12 }}>
                                        Task Overview
                                    </Text>
                                </View>
                                {isOverviewExpanded ? <ChevronUp size={20} color="#9CA3AF" /> : <ChevronDown size={20} color="#9CA3AF" />}
                            </TouchableOpacity>

                            {isOverviewExpanded && (
                                <View style={{ padding: 16, backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8 }}>
                                    <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#4B5563', lineHeight: 22 }}>
                                        {task.description || 'No description provided.'}
                                    </Text>
                                    <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Created: {new Date(task.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* 7️⃣ PROJECT MILESTONES */}
                        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2, marginBottom: 16 }}>MILESTONES & PROGRESS</Text>

                            {/* Progress Bar */}
                            {task.milestones?.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563' }}>
                                            Track Progress
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                                            {Math.round((task.milestones?.filter((m: any) => m.isCompleted === 'true').length || 0) / (task.milestones?.length || 1) * 100)}%
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
                                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isOverdue ? '#FCA5A5' : isNear ? '#FDE68A' : (isDark ? '#374151' : '#F3F4F6')
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
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: isCompleted ? '#9CA3AF' : (isDark ? '#F9FAFB' : '#111827'), textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
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
                                                {isCompleted && m.completedByUser && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                        <UserAvatar name={m.completedByUser.name} url={m.completedByUser.avatarUrl} size={14} />
                                                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600', marginLeft: 6 }}>
                                                            Completed by {m.completedByUser.name.split(' ')[0]}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            {(isOwner || isAssigner) && (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setEditMilestoneData({
                                                                id: m.id,
                                                                title: m.title,
                                                                dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split('T')[0] : ''
                                                            });
                                                            setShowEditMilestoneModal(true);
                                                        }}
                                                        style={{ marginRight: 12 }}
                                                    >
                                                        <FileText size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDeleteMilestone(m.id)}>
                                                        <X size={16} color="#9CA3AF" />
                                                    </TouchableOpacity>
                                                </View>
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
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.2 }}>TIME ALLOCATION</Text>
                                <TouchableOpacity onPress={() => setShowTimeModal(true)}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#3B82F6' }}>Add Log</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                borderRadius: 20,
                                padding: 24,
                                borderWidth: 1,
                                borderColor: isDark ? '#374151' : '#F3F4F6',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: isDark ? 0.3 : 0.05,
                                shadowRadius: 12,
                                elevation: 2,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <Clock size={14} color={isDark ? '#3B82F6' : '#2563EB'} />
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#9CA3AF' : '#4B5563', marginLeft: 6, letterSpacing: 0.5 }}>TOTAL TIME LOGGED</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                            <Text style={{ fontSize: 36, fontWeight: '900', color: isDark ? '#F9FAFB' : '#111827' }}>
                                                {Math.floor(totalMinutesLogged / 60)}
                                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#9CA3AF' }}>h</Text>
                                            </Text>
                                            <Text style={{ fontSize: 36, fontWeight: '900', color: isDark ? '#F9FAFB' : '#111827', marginLeft: 8 }}>
                                                {totalMinutesLogged % 60}
                                                <Text style={{ fontSize: 18, fontWeight: '700', color: '#9CA3AF' }}>m</Text>
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{
                                        backgroundColor: isDark ? `${getSyncConfig(task.syncState || 'IN_SYNC').color}30` : getSyncConfig(task.syncState || 'IN_SYNC').bg,
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: isDark ? `${getSyncConfig(task.syncState || 'IN_SYNC').color}50` : 'transparent',
                                        marginBottom: 4
                                    }}>
                                        <Text style={{ fontSize: 10, fontWeight: '900', color: getSyncConfig(task.syncState || 'IN_SYNC').color }}>{getSyncConfig(task.syncState || 'IN_SYNC').label.toUpperCase()}</Text>
                                    </View>
                                </View>

                                {/* Breakdown Chart-like view */}
                                {usersTimeBreakdown.length > 0 && (
                                    <View style={{ height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginBottom: 20, backgroundColor: isDark ? '#374151' : '#F3F4F6' }}>
                                        {usersTimeBreakdown.map((ub, idx) => (
                                            <View
                                                key={idx}
                                                style={{
                                                    width: `${(ub.duration / totalMinutesLogged) * 100}%`,
                                                    backgroundColor: getAvatarColor(ub.name),
                                                    height: '100%'
                                                }}
                                            />
                                        ))}
                                    </View>
                                )}

                                <View style={{ gap: 12 }}>
                                    {usersTimeBreakdown.map((ub, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getAvatarColor(ub.name), marginRight: 10 }} />
                                                <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', fontWeight: '600' }}>{ub.name}</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, color: isDark ? '#F9FAFB' : '#111827', fontWeight: '700' }}>{formatDuration(ub.duration)}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Recent Entries - Enhanced */}
                                {task.timeLogs?.length > 0 && (
                                    <View style={{ marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#F3F4F6' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1 }}>RECENT ENTRIES</Text>
                                        </View>
                                        {task.timeLogs.slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3).map((log: any) => (
                                            <View key={log.id} style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                                padding: 12,
                                                borderRadius: 12,
                                                marginBottom: 8
                                            }}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#F9FAFB' : '#374151' }} numberOfLines={1}>{log.description || 'Log Entry'}</Text>
                                                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{log.user?.name} • {timeAgo(log.createdAt)}</Text>
                                                </View>
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280' }}>{formatDuration(log.durationMinutes)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
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
                                                    <View style={{ width: 2, flex: 1, backgroundColor: isDark ? '#374151' : '#F3F4F6', marginTop: 2, marginBottom: -24 }} />
                                                )}
                                            </View>
                                            <View style={{ marginLeft: 16, flex: 1 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827' }}>
                                                    {log.user?.name || 'System'}{' '}
                                                    <Text style={{ fontWeight: '400', color: isDark ? '#9CA3AF' : '#4B5563' }}>
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
                    </>
                )}

            </ScrollView>

            {/* 💬 STICKY COMMENT INPUT */}
            {
                activeTab === 'discussion' && (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: isDark ? '#1F2937' : '#FFF',
                            padding: 12,
                            borderTopWidth: 1,
                            borderTopColor: isDark ? '#374151' : '#F3F4F6',
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                                borderRadius: 20,
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                fontSize: 14,
                                color: isDark ? '#FFF' : '#111827',
                                maxHeight: 100,
                            }}
                            placeholder="Add a remark..."
                            value={commentText}
                            onChangeText={setCommentText}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={async () => {
                                if (!commentText.trim()) return;
                                try {
                                    await api.post(`/tasks/${taskId}/comments`, { content: commentText });
                                    setCommentText('');
                                    Keyboard.dismiss();
                                } catch (err) {
                                    console.log(err);
                                }
                            }}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#3B82F6',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: 10,
                            }}
                        >
                            <Send size={18} color="#FFF" />
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                )
            }

            {/* ─── MODALS ─────────────────────────────────────────── */}

            {/* SYNC UPDATE MODAL */}
            <Modal visible={showSyncModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 16 }}>Update Sync State</Text>

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
                                            backgroundColor: isSelected ? s.bg : (isDark ? '#374151' : '#F9FAFB'),
                                            borderWidth: 2,
                                            borderColor: isSelected ? s.color : (isDark ? '#4B5563' : '#F3F4F6'),
                                            marginBottom: 8,
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? s.color : (isDark ? '#9CA3AF' : '#4B5563') }}>
                                            {s.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {(syncParams.state === 'BLOCKED' || syncParams.state === 'HELP_REQUESTED') && (
                            <TextInput
                                style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
                                placeholder="Why? (Required)"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                value={syncParams.note}
                                onChangeText={t => setSyncParams({ ...syncParams, note: t })}
                            />
                        )}

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowSyncModal(false)} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdateSync} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: isDark ? '#3B82F6' : '#111827', alignItems: 'center', opacity: !syncParams.state ? 0.5 : 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* LOG TIME MODAL */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 16 }}>Log Time</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <TextInput
                                style={{ flex: 1, backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 16, color: isDark ? '#FFF' : '#111827', textAlign: 'center' }}
                                placeholder="Hours"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={timeLog.hours}
                                onChangeText={t => setTimeLog({ ...timeLog, hours: t })}
                            />
                            <TextInput
                                style={{ flex: 1, backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 16, color: isDark ? '#FFF' : '#111827', textAlign: 'center' }}
                                placeholder="Mins"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={timeLog.minutes}
                                onChangeText={t => setTimeLog({ ...timeLog, minutes: t })}
                            />
                        </View>
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 24 }}
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
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#374151' : 'transparent' }}>
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 12 }}
                            placeholder="Milestone title..."
                            placeholderTextColor="#9CA3AF"
                            value={newMilestone}
                            onChangeText={setNewMilestone}
                            autoFocus
                        />
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 24 }}
                            placeholder="Due Date (YYYY-MM-DD)"
                            placeholderTextColor="#9CA3AF"
                            value={newMilestoneDate}
                            onChangeText={setNewMilestoneDate}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowMilestoneModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddMilestone} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* EDIT MILESTONE MODAL */}
            <Modal visible={showEditMilestoneModal} transparent animationType="fade">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#374151' : 'transparent' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 16 }}>Edit Milestone</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 12 }}
                            placeholder="Milestone title..."
                            placeholderTextColor="#9CA3AF"
                            value={editMilestoneData.title}
                            onChangeText={t => setEditMilestoneData({ ...editMilestoneData, title: t })}
                        />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, marginLeft: 4 }}>DUE DATE</Text>
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 24 }}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9CA3AF"
                            value={editMilestoneData.dueDate}
                            onChangeText={t => setEditMilestoneData({ ...editMilestoneData, dueDate: t })}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowEditMilestoneModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdateMilestone} style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: isDark ? '#3B82F6' : '#111827', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* EDIT TASK MODAL */}
            <Modal visible={showEditModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 20 }}>Edit Task</Text>

                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 12 }}
                            placeholder="Task Title"
                            placeholderTextColor="#9CA3AF"
                            value={editTaskData.title}
                            onChangeText={t => setEditTaskData({ ...editTaskData, title: t })}
                        />
                        <TextInput
                            style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 16, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', marginBottom: 20, minHeight: 100, textAlignVertical: 'top' }}
                            placeholder="Task Description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            value={editTaskData.description}
                            onChangeText={t => setEditTaskData({ ...editTaskData, description: t })}
                        />

                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 }}>PRIORITY LEVEL</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => {
                                const isSelected = editTaskData.priority === p;
                                const cfg = getPriorityConfig(p);
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        onPress={() => setEditTaskData({ ...editTaskData, priority: p })}
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            backgroundColor: isSelected ? cfg.bg : (isDark ? '#374151' : '#F3F4F6'),
                                            borderWidth: 1,
                                            borderColor: isSelected ? cfg.color : (isDark ? '#4B5563' : 'transparent'),
                                            minWidth: '22%',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? cfg.color : (isDark ? '#9CA3AF' : '#6B7280') }}>{p}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#F3F4F6', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#9CA3AF' : '#4B5563' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdateTask} style={{ flex: 1, padding: 16, borderRadius: 12, backgroundColor: isDark ? '#3B82F6' : '#111827', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>

                        {isAssigner && (
                            <TouchableOpacity
                                onPress={() => {
                                    Alert.alert(
                                        'Delete Task',
                                        'Are you sure you want to delete this task? This cannot be undone.',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: handleDeleteTask }
                                        ]
                                    );
                                }}
                                style={{ marginTop: 12, padding: 16, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Delete Task</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* MANAGE PARTICIPANTS MODAL */}
            <Modal visible={showParticipantsModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Manage Participants</Text>
                            <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
                                <X size={24} color={isDark ? '#9CA3AF' : '#9CA3AF'} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 }}>ADD CONTRIBUTOR</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            borderWidth: 1,
                            borderColor: isDark ? '#4B5563' : '#E5E7EB',
                            marginBottom: 16
                        }}>
                            <Users size={18} color="#9CA3AF" />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: isDark ? '#FFF' : '#111827' }}
                                placeholder="Search by name..."
                                placeholderTextColor="#9CA3AF"
                                value={userSearch}
                                onChangeText={searchUsers}
                            />
                        </View>

                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                            {searchingUsers ? (
                                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} />
                            ) : users.length > 0 ? (
                                users.map((u: any) => (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => handleAddParticipant(u.id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 10,
                                            borderBottomWidth: 1,
                                            borderBottomColor: isDark ? '#374151' : '#F3F4F6'
                                        }}
                                    >
                                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: getAvatarColor(u.name), alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#FFF' }}>{getInitials(u.name)}</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#D1D5DB' : '#111827', flex: 1 }}>{u.name}</Text>
                                        <Plus size={16} color="#3B82F6" />
                                    </TouchableOpacity>
                                ))
                            ) : userSearch.length >= 2 && (
                                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: 10 }}>No users found</Text>
                            )}
                        </ScrollView>

                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginTop: 20, marginBottom: 12 }}>CURRENT PARTICIPANTS</Text>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                            {task.participants?.map((p: any) => (
                                <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#F3F4F6' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: getAvatarColor(p.user?.name), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>{getInitials(p.user?.name)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827' }}>{p.user?.name}</Text>
                                        <Text style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase' }}>{p.role}</Text>
                                    </View>
                                    {isAssigner && p.userId !== task.responsibleOwner && (
                                        <TouchableOpacity onPress={() => handleRemoveParticipant(p.userId)} style={{ padding: 8 }}>
                                            <X size={16} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowParticipantsModal(false)}
                            style={{ marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' }}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* TRANSFER MODAL */}
            <Modal visible={showTransferModal} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Transfer Responsibility</Text>
                            <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                                <X size={24} color={isDark ? '#9CA3AF' : '#9CA3AF'} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginBottom: 16 }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderColor: isDark ? '#4B5563' : '#E5E7EB'
                            }}>
                                <Users size={18} color="#9CA3AF" />
                                <TextInput
                                    style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: isDark ? '#FFF' : '#111827' }}
                                    placeholder="Search by name or email..."
                                    placeholderTextColor="#9CA3AF"
                                    value={userSearch}
                                    onChangeText={searchUsers}
                                />
                            </View>
                        </View>

                        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                            {searchingUsers ? (
                                <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 20 }} />
                            ) : users.length > 0 ? (
                                users.map((u: any) => (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => setSelectedNewOwner(u)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                                            backgroundColor: selectedNewOwner?.id === u.id ? (isDark ? '#2D3748' : '#EFF6FF') : 'transparent',
                                            paddingHorizontal: 10,
                                            borderRadius: 8
                                        }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: getAvatarColor(u.name), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>{getInitials(u.name)}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#D1D5DB' : '#111827' }}>{u.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{u.email}</Text>
                                        </View>
                                        {selectedNewOwner?.id === u.id && <Check size={18} color="#3B82F6" />}
                                    </TouchableOpacity>
                                ))
                            ) : userSearch.length >= 2 && (
                                <Text style={{ textAlign: 'center', color: '#9CA3AF', marginVertical: 20 }}>No users found</Text>
                            )}
                        </ScrollView>

                        {selectedNewOwner && (
                            <View style={{ marginTop: 20 }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8 }}>TRANSFER NOTE (OPTIONAL)</Text>
                                <TextInput
                                    style={{ backgroundColor: isDark ? '#374151' : '#F9FAFB', padding: 12, borderRadius: 12, fontSize: 14, color: isDark ? '#FFF' : '#111827', minHeight: 80, textAlignVertical: 'top' }}
                                    placeholder="Why are you transferring this track?"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    value={transferNote}
                                    onChangeText={setTransferNote}
                                />
                                <TouchableOpacity
                                    onPress={() => handleTransferInitiate(selectedNewOwner.id, transferNote)}
                                    disabled={transferTask.isPending}
                                    style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center' }}
                                >
                                    {transferTask.isPending ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFF' }}>Initiate Transfer to {selectedNewOwner.name.split(' ')[0]}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* FULLSCREEN VISION MODAL */}
            <Modal visible={showVisionModal} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#1F2937' : '#FFF', borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#F3F4F6', zIndex: 10 }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#F9FAFB' : '#111827' }}>Vision</Text>

                        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 4, borderRadius: 8 }}>
                            <TouchableOpacity
                                onPress={() => setVisionTab('graph')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: visionTab === 'graph' ? (isDark ? '#4B5563' : '#FFF') : 'transparent', shadowOpacity: visionTab === 'graph' ? 0.05 : 0 }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: visionTab === 'graph' ? (isDark ? '#F9FAFB' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>Graph</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setVisionTab('tree')}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: visionTab === 'tree' ? (isDark ? '#4B5563' : '#FFF') : 'transparent', shadowOpacity: visionTab === 'tree' ? 0.05 : 0 }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: visionTab === 'tree' ? (isDark ? '#F9FAFB' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>Tree</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setShowVisionModal(false)} style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 8, borderRadius: 20 }}>
                            <X size={20} color={isDark ? '#E5E7EB' : '#374151'} />
                        </TouchableOpacity>
                    </View>

                    {visionTab === 'graph' ? (
                        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
                            <VisionGraph
                                task={task}
                                ownerName={ownerName}
                                assignerName={assignerName}
                                height={SCREEN_HEIGHT * 0.7}
                            />

                            {/* Legend */}
                            <View style={{
                                position: 'absolute',
                                bottom: 20,
                                left: 20,
                                right: 20,
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#F3F4F6',
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                gap: 12
                            }}>
                                {[
                                    { label: 'In Sync', color: '#10B981' },
                                    { label: 'Stale', color: '#F59E0B' },
                                    { label: 'Blocked', color: '#EF4444' },
                                    { label: 'Help', color: '#3B82F6' }
                                ].map(item => (
                                    <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 6 }} />
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280' }}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FAFAFA' }} contentContainerStyle={{ padding: 20 }}>
                            <View style={{ borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 16, overflow: 'hidden', backgroundColor: isDark ? '#1F2937' : '#FFF' }}>
                                {/* Header Row */}
                                <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#1F2937' : '#F9FAFB', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#F3F4F6' }}>
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
                                            paddingLeft: 16 + (p.level * 24),
                                            borderBottomWidth: i === treeParticipants.length - 1 ? 0 : 1,
                                            borderBottomColor: isDark ? '#374151' : '#F3F4F6',
                                            backgroundColor: isNodeBlocked ? (isDark ? '#7F1D1D' : '#FEF2F2') : (isDark ? '#1F2937' : '#FFFFFF'),
                                        }}>
                                            {/* Stakeholder */}
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setSelectedUserData({ ...p.user, role: p.role, authority: p.authority });
                                                    setShowUserModal(true);
                                                }}
                                                style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}
                                            >
                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: getAvatarColor(p.user?.name), alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>{getInitials(p.user?.name)}</Text>
                                                </View>
                                                <View>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#F9FAFB' : '#111827' }} numberOfLines={1}>
                                                        {p.user?.name}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

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
