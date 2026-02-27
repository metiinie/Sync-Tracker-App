import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MoreVertical, Clock } from 'lucide-react-native';

interface AdminAuditCardProps {
    task: {
        id: string;
        title: string;
        syncState: string;
        staleDays: number;
        lastSync: string;
        owner: {
            name: string;
            avatarUrl?: string;
        };
        team: string;
    };
    onPress: () => void;
}

const AdminAuditCard = ({ task, onPress }: AdminAuditCardProps) => {
    const getStatusColor = (state: string) => {
        switch (state) {
            case 'BLOCKED': return 'text-red-600 bg-red-50';
            case 'NEEDS_UPDATE': return 'text-yellow-600 bg-yellow-50';
            case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50';
            case 'REVIEW': return 'text-orange-600 bg-orange-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center bg-white p-4 rounded-3xl border border-gray-100 mb-3 shadow-sm"
        >
            <View className="relative">
                <View className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                    {task.owner.avatarUrl ? (
                        <Image source={{ uri: task.owner.avatarUrl }} className="w-full h-full" />
                    ) : (
                        <View className="w-full h-full items-center justify-center">
                            <Text className="text-gray-500 font-bold">{task.owner.name[0]}</Text>
                        </View>
                    )}
                </View>
                {task.syncState === 'BLOCKED' && (
                    <View className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full items-center justify-center shadow-sm">
                        <View className="w-4 h-4 rounded-full bg-red-500 items-center justify-center">
                            <Text className="text-white text-[10px] font-black">!</Text>
                        </View>
                    </View>
                )}
            </View>

            <View className="flex-1 ml-4">
                <View className="flex-row justify-between items-start">
                    <Text className="text-base font-bold text-gray-900 flex-1 pr-2" numberOfLines={1}>
                        {task.title}
                    </Text>
                    <View className={`px-2 py-0.5 rounded-md ${getStatusColor(task.syncState)}`}>
                        <Text className="text-[8px] font-black uppercase tracking-widest">{task.syncState}</Text>
                    </View>
                </View>

                <View className="flex-row items-center mt-1">
                    <Text className="text-gray-400 text-xs font-semibold">{task.owner.name}</Text>
                    <View className="w-1 h-1 rounded-full bg-gray-300 mx-2" />
                    <Text className="text-gray-400 text-xs font-semibold">{task.team}</Text>
                </View>

                <View className="flex-row items-center mt-3">
                    <View className="bg-red-50 px-2 py-1 rounded-lg flex-row items-center">
                        <Text className="text-red-600 text-[10px] font-bold">Stale: <Text className="font-black">{task.staleDays} days</Text></Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] ml-3">Last Sync: {task.lastSync}</Text>
                </View>
            </View>

            <TouchableOpacity className="p-1 ml-2">
                <MoreVertical size={18} color="#9ca3af" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

export default AdminAuditCard;
