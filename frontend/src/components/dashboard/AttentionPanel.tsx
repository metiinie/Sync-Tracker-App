import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircle, Clock } from 'lucide-react-native';
import { timeAgo } from '../../utils/timeAgo';
import { useAuthStore } from '../../store/authStore';

interface AttentionItem {
    task: any;
    role: 'Owner' | 'Assigner' | 'Participant';
    riskState: string;
}

interface AttentionPanelProps {
    items: AttentionItem[];
    onTaskPress: (taskId: string) => void;
}

const getRiskConfig = (riskState: string, isDark: boolean) => {
    switch (riskState) {
        case 'BLOCKED':
            return {
                bg: isDark ? '#451A1A' : '#FEF2F2',
                border: '#EF4444',
                badge: '#EF4444',
                badgeText: '#FFFFFF',
                label: 'BLOCKED',
            };
        case 'HELP_REQUESTED':
            return {
                bg: isDark ? '#1E3A8A' : '#EFF6FF',
                border: '#3B82F6',
                badge: '#3B82F6',
                badgeText: '#FFFFFF',
                label: 'HELP REQUESTED',
            };
        case 'STALE':
            return {
                bg: isDark ? '#45290A' : '#FFFBEB',
                border: '#F59E0B',
                badge: '#F59E0B',
                badgeText: '#FFFFFF',
                label: 'STALE',
            };
        case 'PENDING_ACCEPTANCE':
            return {
                bg: isDark ? '#2E1065' : '#F5F3FF',
                border: '#8B5CF6',
                badge: '#8B5CF6',
                badgeText: '#FFFFFF',
                label: 'PENDING ACCEPTANCE',
            };
        default:
            return {
                bg: isDark ? '#1F2937' : '#F9FAFB',
                border: isDark ? '#4B5563' : '#9CA3AF',
                badge: isDark ? '#4B5563' : '#9CA3AF',
                badgeText: '#FFFFFF',
                label: riskState,
            };
    }
};

const AttentionPanel: React.FC<AttentionPanelProps> = ({ items, onTaskPress }) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    if (items.length === 0) {
        return (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
                {/* Section Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 24 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        NEEDS ATTENTION
                    </Text>
                </View>

                {/* Empty State */}
                <View style={{
                    backgroundColor: isDark ? '#064E3B' : '#F0FDF4',
                    borderRadius: 16,
                    padding: 24,
                    marginHorizontal: 24,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? '#059669' : '#D1FAE5',
                }}>
                    <View style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isDark ? '#10B981' : '#DCFCE7',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                    }}>
                        <CheckCircle size={24} color={isDark ? '#FFFFFF' : '#10B981'} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#A7F3D0' : '#065F46', marginBottom: 2 }}>
                        Everything is in sync.
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#34D399' : '#6EE7B7', fontWeight: '500' }}>
                        No blocked tasks or pending requests
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 8, marginBottom: 8 }}>
            {/* Section Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    NEEDS ATTENTION
                </Text>
                <View style={{
                    backgroundColor: items.some(i => i.riskState === 'PENDING_ACCEPTANCE') ? '#8B5CF6' : '#EF4444',
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>
                        {items.length} {items.some(i => i.riskState === 'PENDING_ACCEPTANCE') ? 'ACTIONABLE' : 'CRITICAL'}
                    </Text>
                </View>
            </View>

            {/* Attention Cards */}
            <View style={{ paddingHorizontal: 24 }}>
                {items.map((item, idx) => {
                    const config = getRiskConfig(item.riskState, isDark);
                    return (
                        <TouchableOpacity
                            key={`attention-${item.task.id}-${idx}`}
                            onPress={() => onTaskPress(item.task.id)}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: config.bg,
                                borderRadius: 14,
                                padding: 14,
                                marginBottom: 8,
                                borderLeftWidth: 4,
                                borderLeftColor: config.border,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 6,
                                elevation: 2,
                            }}
                        >
                            {/* Top Row: Badge + Time */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <View style={{
                                    backgroundColor: config.badge,
                                    borderRadius: 6,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                }}>
                                    <Text style={{ fontSize: 9, fontWeight: '800', color: config.badgeText, letterSpacing: 0.5 }}>
                                        {config.label}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Clock size={11} color="#9CA3AF" />
                                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 }}>
                                        {timeAgo(item.task.lastUpdatedAt || item.task.createdAt)}
                                    </Text>
                                </View>
                            </View>

                            {/* Task Title */}
                            <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 6 }} numberOfLines={2}>
                                {item.task.title}
                            </Text>

                            {/* Bottom Row: Role + Arrow */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '500' }}>
                                    Role: <Text style={{ fontWeight: '700', color: isDark ? '#D1D5DB' : '#374151' }}>{item.role}</Text>
                                </Text>
                                <Text style={{ fontSize: 12, color: config.border, fontWeight: '600' }}>
                                    View Details
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default AttentionPanel;
