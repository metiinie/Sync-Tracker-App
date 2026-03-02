import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { RefreshCcw } from 'lucide-react-native';

interface ParticipatingTask {
    task: any;
    role: string;
}

interface ParticipatingSectionProps {
    items: ParticipatingTask[];
    onTaskPress: (taskId: string) => void;
    onQuickSync: (taskId: string) => void;
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

const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
        case 'contributor': return { bg: '#DBEAFE', text: '#1D4ED8' };
        case 'helper': return { bg: '#FCE7F3', text: '#BE185D' };
        case 'reviewer': return { bg: '#FEF3C7', text: '#92400E' };
        case 'observer': return { bg: '#E5E7EB', text: '#374151' };
        default: return { bg: '#E5E7EB', text: '#374151' };
    }
};

const ParticipatingSection: React.FC<ParticipatingSectionProps> = ({ items, onTaskPress, onQuickSync }) => {
    if (items.length === 0) return null;

    return (
        <View style={{ marginTop: 28, marginBottom: 8 }}>
            {/* Section Header */}
            <Text style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#9CA3AF',
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 16,
            }}>
                PARTICIPATING IN
            </Text>

            {/* Compact chip-style items */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {items.map((item) => {
                    const roleBadge = getRoleBadgeColor(item.role);
                    const syncColor = getSyncDot(item.task.syncState);

                    return (
                        <TouchableOpacity
                            key={item.task.id}
                            onPress={() => onTaskPress(item.task.id)}
                            activeOpacity={0.7}
                            style={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: 14,
                                paddingVertical: 10,
                                paddingHorizontal: 14,
                                borderWidth: 1,
                                borderColor: '#F3F4F6',
                                flexDirection: 'row',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.02,
                                shadowRadius: 4,
                                elevation: 1,
                            }}
                        >
                            {/* Sync dot */}
                            <View style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                backgroundColor: syncColor,
                                marginRight: 8,
                            }} />

                            {/* Task title */}
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginRight: 8 }} numberOfLines={1}>
                                {item.task.title}
                            </Text>

                            {/* Role badge */}
                            <View style={{
                                backgroundColor: roleBadge.bg,
                                borderRadius: 6,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                            }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: roleBadge.text, textTransform: 'capitalize' }}>
                                    {item.role || 'Participant'}
                                </Text>
                            </View>

                            {/* Quick Sync Button */}
                            {item.task.participants?.find((p: any) => p.syncState !== 'IN_SYNC') && (
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        onQuickSync(item.task.id);
                                    }}
                                    style={{
                                        marginLeft: 10,
                                        width: 24,
                                        height: 24,
                                        borderRadius: 12,
                                        backgroundColor: '#F3F4F6',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RefreshCcw size={12} color="#4B5563" />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

export default ParticipatingSection;
