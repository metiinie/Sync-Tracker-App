import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { timeAgo } from '../utils/timeAgo';
import { useAuthStore } from '../store/authStore';

interface TaskItemProps {
    task: any;
    onPress: () => void;
    userRole?: 'Owner' | 'Assigner' | 'Participant' | 'Transferring';
}

// ─── SYNC STATE CONFIG ────────────────────────────────
const getSyncConfig = (syncState: string) => {
    switch (syncState) {
        case 'BLOCKED':
            return { color: '#EF4444', bg: '#FEF2F2', label: 'Blocked', icon: '⚠️' };
        case 'HELP_REQUESTED':
            return { color: '#3B82F6', bg: '#EFF6FF', label: 'Help Requested', icon: '🤚' };
        case 'NEEDS_UPDATE':
            return { color: '#F59E0B', bg: '#FFFBEB', label: 'Needs Update', icon: '🔄' };
        case 'IN_SYNC':
            return { color: '#10B981', bg: '#F0FDF4', label: 'In Sync', icon: '✓' };
        case 'PENDING':
            return { color: '#8B5CF6', bg: '#F5F3FF', label: 'Pending', icon: '⏳' };
        default:
            return { color: '#10B981', bg: '#F0FDF4', label: 'In Sync', icon: '✓' };
    }
};

// ─── ROLE BADGE CONFIG ────────────────────────────────
const getRoleConfig = (role: string) => {
    switch (role) {
        case 'Owner':
            return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
        case 'Assigner':
            return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
        case 'Participant':
            return { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0' };
        case 'Transferring':
            return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' };
        default:
            return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
    }
};

// ─── PRIORITY CONFIG ──────────────────────────────────
const getPriorityConfig = (priority: string) => {
    switch (priority) {
        case 'CRITICAL':
            return { color: '#EF4444', bg: '#FEF2F2', label: 'Critical' };
        case 'HIGH':
            return { color: '#F59E0B', bg: '#FFFBEB', label: 'High' };
        case 'MEDIUM':
            return { color: '#3B82F6', bg: '#EFF6FF', label: 'Medium' };
        case 'LOW':
            return { color: '#10B981', bg: '#F0FDF4', label: 'Low' };
        default:
            return { color: '#6B7280', bg: '#F3F4F6', label: 'Medium' };
    }
};

// ─── OWNER INITIALS ─────────────────────────────────
const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
    if (!name) return '#9CA3AF';
    const colors = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#14B8A6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, userRole }) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';
    const [expanded, setExpanded] = useState(false);

    const syncConfig = getSyncConfig(task.syncState);
    const role = userRole || 'Owner';
    const roleConfig = getRoleConfig(role);
    const ownerName = task.owner?.name || task.owner?.email?.split('@')[0] || 'Unassigned';
    const assignerName = task.assigner?.name || task.assigner?.email?.split('@')[0] || 'System';
    const participantCount = task.participants?.length || 0;
    const completedMilestones = task.milestones?.filter((m: any) => m.isCompleted === 'true')?.length || task.completedMilestones || 0;
    const totalMilestones = task.milestones?.length || task.totalMilestones || 0;
    const isHelpRequested = task.syncState === 'HELP_REQUESTED';
    const isTransferPending = task.status === 'TRANSFERRING' || task.transferPending;
    const updatedTime = timeAgo(task.lastUpdatedAt || task.updatedAt || task.createdAt);

    const handlePress = () => {
        if (expanded) {
            onPress();
        } else {
            setExpanded(true);
        }
    };

    const handleCollapse = () => {
        setExpanded(false);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            style={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: isDark ? '#374151' : '#F0F0F0',
                borderLeftWidth: 4,
                borderLeftColor: syncConfig.color,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.3 : 0.04,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            {/* ─── TOP ROW: Role Badge + Icons + Timestamp ─── */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Role Badge */}
                    <View style={{
                        backgroundColor: roleConfig.bg,
                        borderRadius: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: roleConfig.border,
                    }}>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: roleConfig.color,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                        }}>
                            {role === 'Assigner' ? 'ASSIGNER' : role === 'Participant' ? 'PARTICIPANT' : role === 'Transferring' ? 'TRANSFERRING' : 'OWNER'}
                        </Text>
                    </View>

                    {/* Priority Badge */}
                    <View style={{
                        backgroundColor: getPriorityConfig(task.priority).bg,
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: getPriorityConfig(task.priority).color + '20',
                    }}>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: getPriorityConfig(task.priority).color,
                        }}>
                            {getPriorityConfig(task.priority).label}
                        </Text>
                    </View>

                    {/* Sync State Dot */}
                    <View style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: isDark ? `${syncConfig.color}20` : syncConfig.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: syncConfig.color,
                        }} />
                    </View>

                    {/* Help Requested Icon */}
                    {isHelpRequested && (
                        <AlertTriangle size={14} color="#F59E0B" />
                    )}

                    {/* Transfer Pending Icon */}
                    {isTransferPending && (
                        <ArrowRightLeft size={14} color="#8B5CF6" />
                    )}
                </View>

                {/* Timestamp */}
                <Text style={{
                    fontSize: 12,
                    color: '#9CA3AF',
                    fontWeight: '500',
                    fontStyle: 'italic',
                }}>
                    Updated {updatedTime}
                </Text>
            </View>

            {/* ─── TITLE ─── */}
            <Text
                style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: isDark ? '#F9FAFB' : '#111827',
                    marginBottom: 12,
                    lineHeight: 20,
                }}
                numberOfLines={2}
            >
                {task.title}
            </Text>

            {/* ─── BOTTOM ROW: Owner + Participants + Milestone ─── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Owner */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    {/* Avatar */}
                    <View style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: ownerName !== 'Unassigned' ? getAvatarColor(ownerName) : '#E5E7EB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                    }}>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '700',
                            color: ownerName !== 'Unassigned' ? '#FFFFFF' : '#9CA3AF',
                        }}>
                            {getInitials(ownerName)}
                        </Text>
                    </View>
                    <Text style={{
                        fontSize: 13,
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        fontWeight: '500',
                    }} numberOfLines={1}>
                        {ownerName}
                    </Text>
                </View>

                {/* Participant Count */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                    <Users size={14} color="#9CA3AF" />
                    <Text style={{
                        fontSize: 12,
                        color: '#9CA3AF',
                        fontWeight: '600',
                        marginLeft: 4,
                    }}>
                        {participantCount}
                    </Text>
                </View>

                {/* Milestone Progress */}
                {totalMilestones > 0 && (
                    <View style={{
                        backgroundColor: completedMilestones === totalMilestones ? (isDark ? '#064E3B' : '#F0FDF4') : (isDark ? '#374151' : '#F9FAFB'),
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: 1,
                        borderColor: completedMilestones === totalMilestones ? (isDark ? '#059669' : '#BBF7D0') : (isDark ? '#4B5563' : '#E5E7EB'),
                    }}>
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: completedMilestones === totalMilestones ? (isDark ? '#34D399' : '#059669') : (isDark ? '#D1D5DB' : '#374151'),
                        }}>
                            {completedMilestones}/{totalMilestones}
                        </Text>
                    </View>
                )}
            </View>

            {/* ─── EXPANDABLE PREVIEW ─── */}
            <View style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#374151' : '#F3F4F6',
            }}>
                {/* Assigned By */}
                <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500' }}>
                        Assigned by:{' '}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#D1D5DB' : '#374151', fontWeight: '600' }}>
                        {assignerName}
                    </Text>
                </View>

                {/* Description */}
                {task.description && (
                    <Text
                        style={{
                            fontSize: 13,
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            lineHeight: 18,
                            marginBottom: 6,
                        }}
                        numberOfLines={2}
                    >
                        {task.description}
                    </Text>
                )}

                {/* Last Log */}
                {task.lastLog && (
                    <View style={{
                        backgroundColor: isDark ? '#374151' : '#F9FAFB',
                        borderRadius: 8,
                        padding: 10,
                        marginTop: 4,
                    }}>
                        <Text style={{ fontSize: 12, color: isDark ? '#D1D5DB' : '#6B7280', fontStyle: 'italic' }} numberOfLines={1}>
                            📝 {task.lastLog}
                        </Text>
                    </View>
                )}

                {/* Tap to open detail hint */}
                <TouchableOpacity
                    onPress={onPress}
                    style={{
                        marginTop: 8,
                        alignSelf: 'flex-end',
                    }}
                >
                    <Text style={{
                        fontSize: 12,
                        color: isDark ? '#60A5FA' : '#3B82F6',
                        fontWeight: '600',
                    }}>
                        Open Full Details →
                    </Text>
                </TouchableOpacity>

                {/* Collapse button */}
                <TouchableOpacity
                    onPress={handleCollapse}
                    style={{ marginTop: 4, alignSelf: 'center' }}
                >
                    <Text style={{ fontSize: 11, color: '#D1D5DB', fontWeight: '500' }}>
                        Tap to collapse
                    </Text>
                </TouchableOpacity>
            </View>
            )}
        </TouchableOpacity>
    );
};

export default TaskItem;
