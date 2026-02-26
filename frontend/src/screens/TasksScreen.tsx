import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';

const TasksScreen = () => {
    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView className="flex-1 px-6 pt-6">
                <Text className="text-3xl font-bold text-gray-900 mb-2">My Tasks</Text>
                <Text className="text-gray-500 mb-10">Manage all your accountability tracks in one place.</Text>

                <View className="py-20 items-center justify-center">
                    <Text className="text-gray-400">Task management coming soon</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default TasksScreen;
