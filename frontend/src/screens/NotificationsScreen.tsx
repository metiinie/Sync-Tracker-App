import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';

const NotificationsScreen = () => {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-3xl font-bold text-gray-900 mb-2">Notifications</Text>
                <Text className="text-gray-500 mb-10">Stay updated on your responsibilities and sync updates.</Text>

                <View className="py-20 items-center justify-center">
                    <Text className="text-gray-400">No new notifications</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default NotificationsScreen;
