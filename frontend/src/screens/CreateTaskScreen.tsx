import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import api from '../services/api';

const CreateTaskScreen = ({ navigation }: any) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleOwner, setResponsibleOwner] = useState(''); // In a real app, this would be a user picker

    const handleCreate = async () => {
        if (!title || !responsibleOwner) {
            Alert.alert('Missing Fields', 'Title and Responsible Owner are required');
            return;
        }

        try {
            await api.post('/tasks', {
                title,
                description,
                responsibleOwner,
            });
            Alert.alert('Success', 'Task created. Awaiting acceptance.');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create task');
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <Text className="text-2xl font-bold text-gray-900 mb-6">Create New Task</Text>

            <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Title</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                    placeholder="What needs to be done?"
                    value={title}
                    onChangeText={setTitle}
                />
            </View>

            <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Description</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-32"
                    placeholder="Provide more context..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                />
            </View>

            <View className="mb-8">
                <Text className="text-gray-700 font-semibold mb-2">Responsible Owner (User ID)</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                    placeholder="Accountability starts with a name"
                    value={responsibleOwner}
                    onChangeText={setResponsibleOwner}
                />
                <Text className="text-xs text-gray-400 mt-2">
                    Ownership must be accepted before the task becomes active.
                </Text>
            </View>

            <TouchableOpacity
                className="bg-blue-600 p-4 rounded-xl items-center"
                onPress={handleCreate}
            >
                <Text className="text-white font-bold text-lg">Assign Responsibility</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default CreateTaskScreen;
