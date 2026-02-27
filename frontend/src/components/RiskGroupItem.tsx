import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';

interface RiskGroupItemProps {
    task: {
        id: string;
        title: string;
        description?: string;
        team: string;
        statusLabel?: string;
        ownerName: string;
    };
    riskColor: string;
    onPress: () => void;
    onAction?: () => void;
    actionLabel?: string;
}

const RiskGroupItem = ({ task, riskColor, onPress, onAction, actionLabel }: RiskGroupItemProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white rounded-3xl p-5 border border-gray-100 mb-4 shadow-sm relative overflow-hidden"
        >
            <View className={`absolute left-0 top-0 bottom-0 w-1.5 ${riskColor}`} />

            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-row items-center">
                    <View className="bg-gray-100 px-2.5 py-1 rounded-lg mr-2">
                        <Text className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{task.team}</Text>
                    </View>
                    {task.statusLabel && (
                        <View className="bg-red-50 px-2.5 py-1 rounded-lg">
                            <Text className="text-[10px] font-black text-red-600 uppercase tracking-widest">{task.statusLabel}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity className="p-1">
                    <MoreHorizontal size={18} color="#9ca3af" />
                </TouchableOpacity>
            </View>

            <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>{task.title}</Text>
            {task.description && (
                <Text className="text-gray-400 text-sm font-medium mb-4" numberOfLines={2}>{task.description}</Text>
            )}

            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                        <Text className="text-[10px] font-black text-blue-600">{task.ownerName[0]}</Text>
                    </View>
                    <Text className="text-gray-500 text-xs font-semibold">Owner: <Text className="text-gray-900">{task.ownerName}</Text></Text>
                </View>

                {onAction && (
                    <TouchableOpacity
                        onPress={onAction}
                        className="bg-blue-50 px-5 py-2 rounded-xl"
                    >
                        <Text className="text-blue-600 font-black text-xs">{actionLabel || 'Action'}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default RiskGroupItem;
