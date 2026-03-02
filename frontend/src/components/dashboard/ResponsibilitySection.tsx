import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Edit3, Users, Clock } from 'lucide-react-native';
import { timeAgo } from '../../utils/timeAgo';
import { useAuthStore } from '../../store/authStore';

interface ResponsibilitySectionProps {
    groups: {
        blocked: any[];
        help: any[];
        needsUpdate: any[];
        inSync: any[];
    };
    onTaskPress: (taskId: string) => void;
    onUpdateSync: (taskId: string) => void;
    onHeaderPress?: () => void;
}

const statusConfig: Record<string, { dot: string; label: string; icon: string }> = {
    blocked: { dot: '#EF4444', label: 'Blocked', icon: '🔴' },
    help: { dot: '#3B82F6', label: 'Help Requested', icon: '🔵' },
    needsUpdate: { dot: '#F59E0B', label: 'Needs Update', icon: '🟡' },
    inSync: { dot: '#10B981', label: 'In Sync', icon: '🟢' },
};

const ResponsibilitySection: React.FC<ResponsibilitySectionProps> = ({ groups, onTaskPress, onUpdateSync, onHeaderPress }) => {
    const { settings } = useAuthStore();
    const isDark = settings?.theme === 'dark';

    const hasAny = groups.blocked.length + groups.help.length + groups.needsUpdate.length + groups.inSync.length > 0;

    if (!hasAny) return null;

    return (
        <View style={{ marginTop: 28, marginBottom: 8 }}>
            {/* Section Header */}
            <TouchableOpacity onPress={onHeaderPress} disabled={!onHeaderPress} style={{ marginBottom: 16 }}>
                <Text style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}>
                    MY RESPONSIBILITY
                </Text>
            </TouchableOpacity>

            {/* Grouped Tasks */}
            {(['blocked', 'help', 'needsUpdate', 'inSync'] as const).map((key) => {
                const tasksInGroup = groups[key];
                if (tasksInGroup.length === 0) return null;
                const config = statusConfig[key];

                return (
                    <View key={key} style={{ marginBottom: 6 }}>
                        {tasksInGroup.map((task: any) => (
                            <TouchableOpacity
                                key={task.id}
                                onPress={() => onTaskPress(task.id)}
                                activeOpacity={0.7}
                                style={{
                                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: isDark ? 0.3 : 0.04,
                                    shadowRadius: 6,
                                    elevation: 1,
                                    borderWidth: 1,
                                    borderColor: isDark ? '#374151' : '#F3F4F6',
                                }}
                            >
                                {/* Sync State Icon */}
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 14,
                                    backgroundColor: `${config.dot}15`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 14,
                                }}>
                                    <View style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: 6,
                                        backgroundColor: config.dot,
                                    }} />
                                </View>

                                {/* Task Info */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 3 }} numberOfLines={1}>
                                        {task.title}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#9CA3AF', fontWeight: '500' }}>
                                            {config.label}
                                        </Text>
                                        {task.assigner?.name && (
                                            <>
                                                <Text style={{ fontSize: 12, color: isDark ? '#4B5563' : '#D1D5DB', marginHorizontal: 6 }}>•</Text>
                                                <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#9CA3AF', fontWeight: '500' }}>
                                                    By {task.assigner.name}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </View>

                                {/* Update Sync Action */}
                                <TouchableOpacity
                                    onPress={(e) => {
                                        e.stopPropagation?.();
                                        onUpdateSync(task.id);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: 12,
                                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginLeft: 8,
                                    }}
                                >
                                    <Edit3 size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            })}
        </View>
    );
};

export default ResponsibilitySection;
