import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Clock } from 'lucide-react-native';
import { timeAgo } from '../../utils/timeAgo';

interface DelegatedSectionProps {
    tasks: any[];
    onTaskPress: (taskId: string) => void;
    onNudge: (taskId: string) => void;
    onHeaderPress?: () => void;
}

const getSyncDot = (syncState: string) => {
    switch (syncState) {
        case 'BLOCKED': return '#EF4444';
        case 'HELP_REQUESTED': return '#3B82F6';
        case 'NEEDS_UPDATE': return '#F59E0B';
        case 'IN_SYNC': return '#10B981';
        default: return '#9CA3AF';
    }
};

const getSyncLabel = (syncState: string) => {
    switch (syncState) {
        case 'BLOCKED': return 'Blocked';
        case 'HELP_REQUESTED': return 'Help Requested';
        case 'NEEDS_UPDATE': return 'Needs Update';
        case 'IN_SYNC': return 'On Track';
        default: return 'Pending';
    }
};

const DelegatedSection: React.FC<DelegatedSectionProps> = ({ tasks, onTaskPress, onNudge, onHeaderPress }) => {
    if (tasks.length === 0) return null;

    return (
        <View style={{ marginTop: 28, marginBottom: 8 }}>
            {/* Section Header */}
            <TouchableOpacity onPress={onHeaderPress} disabled={!onHeaderPress} style={{ marginBottom: 16 }}>
                <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: '#9CA3AF',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}>
                    DELEGATED BY ME
                </Text>
            </TouchableOpacity>

            {/* Delegated Task Cards */}
            {tasks.map((task: any) => {
                const isBlocked = task.syncState === 'BLOCKED';
                const dotColor = getSyncDot(task.syncState);
                const syncLabel = getSyncLabel(task.syncState);

                return (
                    <TouchableOpacity
                        key={task.id}
                        onPress={() => onTaskPress(task.id)}
                        activeOpacity={0.7}
                        style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 10,
                            borderLeftWidth: isBlocked ? 3 : 0,
                            borderLeftColor: isBlocked ? '#EF4444' : 'transparent',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 6,
                            elevation: 1,
                            borderWidth: 1,
                            borderColor: '#F3F4F6',
                        }}
                    >
                        {/* Task Title & Nudge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 12 }} numberOfLines={1}>
                                {task.title}
                            </Text>
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation?.();
                                    onNudge(task.id);
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '600' }}>
                                    Nudge
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Owner + Sync State */}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* Avatar circle */}
                            <View style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: '#E5E7EB',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 8,
                            }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280' }}>
                                    {(task.owner?.name || 'U').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500', marginRight: 8 }}>
                                {task.owner?.name || 'Unknown'}
                            </Text>
                            <View style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                backgroundColor: dotColor,
                                marginRight: 5,
                            }} />
                            <Text style={{ fontSize: 12, color: dotColor, fontWeight: '600' }}>
                                {syncLabel}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default DelegatedSection;
