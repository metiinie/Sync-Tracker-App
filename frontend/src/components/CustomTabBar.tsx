import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LayoutGrid, CheckSquare, Bell, User, Users } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    return (
        <View className="absolute bottom-6 left-6 right-6 flex-row bg-white/90 rounded-[35px] h-16 items-center justify-around shadow-2xl shadow-gray-400 border border-gray-100/50">
            {state.routes.map((route: any, index: number) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, { merge: true });
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                const Icon = () => {
                    const color = isFocused ? '#000000' : '#9ca3af';
                    const size = 24;
                    switch (route.name) {
                        case 'Admin Dashboard': return <LayoutGrid size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Admin': return <LayoutGrid size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'All Tasks': return <CheckSquare size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Users': return <Users size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Dashboard': return <LayoutGrid size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Tasks': return <CheckSquare size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Notifications': return <Bell size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        case 'Profile': return <User size={size} color={color} strokeWidth={isFocused ? 2.5 : 2} />;
                        default: return null;
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        className="items-center justify-center"
                    >
                        <View className={`items-center justify-center p-2 ${isFocused ? 'bg-gray-100/50' : ''} rounded-2xl`}>
                            <Icon />
                        </View>
                        {isFocused && (
                            <View className="absolute -bottom-1 w-1 h-1 bg-black rounded-full" />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default CustomTabBar;
