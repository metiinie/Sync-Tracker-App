import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TaskItemProps {
    task: any;
    onPress: () => void;
    role?: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, role }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'ACTIVE': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getSyncStyles = (sync: string) => {
        switch (sync) {
            case 'IN_SYNC': return { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'IN SYNC' };
            case 'NEEDS_UPDATE': return { bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'NEEDS UPDATE' };
            case 'BLOCKED': return { bg: 'bg-red-500', text: 'text-red-700', label: 'BLOCKED' };
            case 'HELP_REQUESTED': return { bg: 'bg-blue-500', text: 'text-blue-700', label: 'HELP REQUESTED' };
            default: return { bg: 'bg-gray-400', text: 'text-gray-600', label: 'UNKNOWN' };
        }
    };

    const participantCount = task.participants?.length || 0;
    const syncStyles = getSyncStyles(task.syncState);

    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white p-5 rounded-2xl shadow-sm mb-4 border border-gray-100"
            activeOpacity={0.7}
        >
            {/* Header Row: Role & Sync Status */}
            <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                    {role && (
                        <View className="bg-indigo-50 px-2.5 py-1 rounded-md mr-2 border border-indigo-100/50">
                            <Text className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{role}</Text>
                        </View>
                    )}
                    <View className="bg-gray-50 px-2.5 py-1 rounded-md">
                        <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {task.status}
                        </Text>
                    </View>
                </View>

                {/* Sync Badge */}
                <View className="flex-row items-center">
                    <Text className={`text-[10px] font-black mr-1.5 tracking-wider ${syncStyles.text}`}>
                        {syncStyles.label}
                    </Text>
                    <View className={`w-2.5 h-2.5 rounded-full ${syncStyles.bg} shadow-sm`} />
                </View>
            </View>

            {/* Title */}
            <Text className="text-lg font-bold text-gray-900 mb-1 leading-tight" numberOfLines={2}>
                {task.title}
            </Text>

            {/* Description / Subtext */}
            <Text className="text-sm text-gray-500 mb-4" numberOfLines={2}>
                {task.description || 'No additional description provided.'}
            </Text>

            {/* Footer */}
            <View className="flex-row items-center justify-between mt-1">
                <View className="flex-row items-center">
                    {/* Placeholder Avatar */}
                    <View className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white shadow-sm items-center justify-center mr-2">
                        <Text className="text-[10px] font-bold text-gray-500">
                            {task.responsibleOwner?.name?.[0] || '?'}
                        </Text>
                    </View>
                    <Text className="text-xs text-gray-500 font-medium">
                        {task.responsibleOwner?.name || 'Unassigned'}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    <Text className="text-[11px] text-gray-400 font-medium">
                        {new Date(task.updatedAt || task.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default TaskItem;
