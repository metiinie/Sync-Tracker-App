import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Zap, AlertTriangle, CheckCircle2 } from 'lucide-react-native';

interface FocusTaskCardProps {
    task: {
        id: string;
        title: string;
        department: string;
        meta: string;
        staleInfo?: string;
        dueIn?: string;
        participants: any[];
    };
    type: 'CRITICAL' | 'DUE' | 'NORMAL';
    onPress: () => void;
    onAction: () => void;
}

const FocusTaskCard = ({ task, type, onPress, onAction }: FocusTaskCardProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm mb-4"
        >
            <View className="flex-row items-start justify-between mb-4">
                <View className="flex-row items-center flex-1">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${type === 'CRITICAL' ? 'bg-red-50' : 'bg-orange-50'
                        }`}>
                        {type === 'CRITICAL' ? (
                            <AlertTriangle size={20} color="#ef4444" />
                        ) : (
                            <Zap size={20} color="#f59e0b" />
                        )}
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>{task.title}</Text>
                        <Text className="text-gray-400 text-xs font-medium">{task.department} • {task.meta}</Text>
                    </View>
                </View>

                {task.staleInfo && (
                    <View className="bg-red-50 px-3 py-2 rounded-xl">
                        <Text className="text-red-600 text-[10px] font-black uppercase text-center">Stale: {task.staleInfo}</Text>
                        <Text className="text-red-600 text-[10px] font-black uppercase text-center">overdue</Text>
                    </View>
                )}
                {task.dueIn && (
                    <View className="bg-orange-50 px-3 py-2 rounded-xl">
                        <Text className="text-orange-600 text-[10px] font-black uppercase text-center">Due in {task.dueIn}</Text>
                    </View>
                )}
            </View>

            <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row -space-x-2">
                    {task.participants.slice(0, 3).map((p, i) => (
                        <View key={p.id || i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white items-center justify-center overflow-hidden">
                            <Text className="text-[10px] font-bold text-gray-500">{p.name?.[0] || 'U'}</Text>
                        </View>
                    ))}
                    {task.participants.length > 3 && (
                        <View className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white items-center justify-center">
                            <Text className="text-[8px] font-black text-gray-400">+{task.participants.length - 3}</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    onPress={onAction}
                    className="bg-blue-600 px-6 py-3 rounded-2xl flex-row items-center"
                >
                    {type === 'CRITICAL' ? (
                        <>
                            <Zap size={16} color="white" />
                            <Text className="text-white font-black text-sm ml-2">Quick Sync</Text>
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={16} color="white" />
                            <Text className="text-white font-black text-sm ml-2">Mark Done</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export default FocusTaskCard;
