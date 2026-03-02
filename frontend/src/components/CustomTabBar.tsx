import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Home as HomeIcon, CheckCircle2, Bell, UserCircle2 } from 'lucide-react-native';

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
    return (
        <View style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            right: 24,
            flexDirection: 'row',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 28,
            height: 64,
            alignItems: 'center',
            justifyContent: 'space-around',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 8,
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.04)',
        }}>
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

                const getIcon = () => {
                    const color = isFocused ? '#111827' : '#9CA3AF';
                    const size = 22;
                    const strokeWidth = isFocused ? 2.5 : 2;

                    switch (route.name) {
                        case 'Home': return <HomeIcon size={size} color={color} strokeWidth={strokeWidth} />;
                        case 'Tasks': return <CheckCircle2 size={size} color={color} strokeWidth={strokeWidth} />;
                        case 'Activity': return <Bell size={size} color={color} strokeWidth={strokeWidth} />;
                        case 'Profile': return <UserCircle2 size={size} color={color} strokeWidth={strokeWidth} />;
                        default: return null;
                    }
                };

                const getLabel = () => {
                    switch (route.name) {
                        case 'Home': return 'Home';
                        case 'Tasks': return 'Tasks';
                        case 'Activity': return 'Activity';
                        case 'Profile': return 'Profile';
                        default: return route.name;
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
                        style={{ alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 6 }}
                    >
                        <View style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 4,
                            borderRadius: 16,
                            backgroundColor: isFocused ? '#F3F4F6' : 'transparent',
                        }}>
                            {getIcon()}
                        </View>
                        <Text style={{
                            fontSize: 10,
                            fontWeight: isFocused ? '700' : '500',
                            color: isFocused ? '#111827' : '#9CA3AF',
                            marginTop: 2,
                        }}>
                            {getLabel()}
                        </Text>
                        {isFocused && (
                            <View style={{
                                position: 'absolute',
                                bottom: -4,
                                width: 4,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: '#111827',
                            }} />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default CustomTabBar;
