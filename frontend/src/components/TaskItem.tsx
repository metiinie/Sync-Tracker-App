import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TaskItemProps {
    task: any;
    onPress: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
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
            case 'NEEDS_UPDATE': return 'bg-orange-500';
            case 'BLOCKED': return 'bg-red-500';
            case 'HELP_REQUESTED': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white p-4 rounded-xl shadow-sm mb-3 border border-gray-100"
        >
            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-bold text-gray-900">{task.title}</Text>
                <View className={`px-2 py-1 rounded-full ${getStatusColor(task.status).split(' ')[0]}`}>
                    <Text className={`text-xs font-semibold ${getStatusColor(task.status).split(' ')[1]}`}>
                        {task.status}
                    </Text>
                </View>
            </View>

            <Text className="text-gray-600 mb-3" numberOfLines={2}>
                {task.description || 'No description provided'}
            </Text>

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className={`w-3 h-3 rounded-full mr-2 ${getSyncColor(task.syncState)}`} />
                    <Text className="text-sm text-gray-500">{task.syncState || 'IN_SYNC'}</Text>
                </View>
                <Text className="text-xs text-gray-400">
                    Responsible: {task.responsibleOwnerName || 'Unknown'}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default TaskItem;
