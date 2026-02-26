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
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'ACTIVE': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getSyncColor = (sync: string) => {
        switch (sync) {
            case 'IN_SYNC': return 'bg-green-500';
            case 'NEEDS_UPDATE': return 'bg-yellow-500';
            case 'BLOCKED': return 'bg-red-500';
            case 'HELP_REQUESTED': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const participantCount = task.participants?.length || 0;

    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100"
        >
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                    <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>{task.title}</Text>
                    {role && (
                        <View className="bg-gray-100 self-start px-2 py-0.5 rounded-md mt-1">
                            <Text className="text-[10px] font-bold text-gray-500 uppercase">{role}</Text>
                        </View>
                    )}
                </View>
                <View className={`px-2 py-1 rounded-full ${getStatusColor(task.status).split(' ')[0]}`}>
                    <Text className={`text-[10px] font-bold ${getStatusColor(task.status).split(' ')[1]}`}>
                        {task.status}
                    </Text>
                </View>
            </View>

            <View className="flex-row items-center mb-3">
                <View className={`w-2.5 h-2.5 rounded-full mr-2 ${getSyncColor(task.syncState)}`} />
                <Text className="text-xs font-medium text-gray-700">{task.syncState?.replace('_', ' ') || 'IN SYNC'}</Text>
                {participantCount > 0 && (
                    <Text className="text-xs text-gray-400 ml-2">• {participantCount} participants</Text>
                )}
            </View>

            <View className="flex-row items-center justify-between border-t border-gray-50 pt-3">
                <Text className="text-[11px] text-gray-400">
                    By: {task.assigner?.name || 'System'}
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                    Owner: {task.owner?.name || 'Unassigned'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default TaskItem;
