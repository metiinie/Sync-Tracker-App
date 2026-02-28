import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PlusCircle, RefreshCw, Clock } from 'lucide-react-native';

interface QuickActionsBarProps {
    onCreateTask: () => void;
    onGlobalSync: () => void;
    onLogTime: () => void;
}

const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ onCreateTask, onGlobalSync, onLogTime }) => {
    const actions = [
        { label: 'Create', icon: PlusCircle, onPress: onCreateTask, color: '#3B82F6' },
        { label: 'Global Sync', icon: RefreshCw, onPress: onGlobalSync, color: '#8B5CF6' },
        { label: 'Log Time', icon: Clock, onPress: onLogTime, color: '#F59E0B' },
    ];

    return (
        <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 24,
            marginHorizontal: 0,
            marginTop: 24,
            marginBottom: 12,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: '#F3F4F6',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
        }}>
            {actions.map((action) => {
                const Icon = action.icon;
                return (
                    <TouchableOpacity
                        key={action.label}
                        onPress={action.onPress}
                        activeOpacity={0.7}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 6,
                            marginHorizontal: 4,
                            backgroundColor: `${action.color}0D`,
                            borderRadius: 14,
                        }}
                    >
                        <Icon size={18} color={action.color} />
                        <Text style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: action.color,
                            marginLeft: 6,
                        }}>
                            {action.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default QuickActionsBar;
