import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => onFinish());
        }, 2500);

        return () => clearTimeout(timer);
    }, [fadeAnim, slideAnim, onFinish]);

    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Animated.View
                style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                    alignItems: 'center',
                }}
            >
                <Text className="text-5xl font-extrabold text-blue-600 tracking-tight">
                    SyncTracker
                </Text>
                <View className="h-1 w-12 bg-blue-600 rounded-full mt-2 mb-4" />
                <Text className="text-gray-500 text-lg font-medium text-center px-8">
                    Visible responsibility, realtime sync
                </Text>
            </Animated.View>
        </View>
    );
};

export default SplashScreen;
