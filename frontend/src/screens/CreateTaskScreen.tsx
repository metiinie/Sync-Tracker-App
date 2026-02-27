import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, X, User, Users, Flag, Trash2, CheckCircle2 } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const CreateTaskScreen = ({ navigation }: any) => {
    const { token } = useAuthStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleOwnerId, setResponsibleOwnerId] = useState('');
    const [participants, setParticipants] = useState<{ userId: string, role: string }[]>([]);
    const [milestones, setMilestones] = useState<string[]>([]);
    const [newMilestone, setNewMilestone] = useState('');

    // User search (simplified for MVP)
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/users');
                setAllUsers(res.data);
            } catch (err) {
                console.error('Failed to fetch users', err);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [token]);

    const addParticipant = (userId: string) => {
        if (participants.find(p => p.userId === userId)) return;
        if (userId === responsibleOwnerId) {
            Alert.alert('Invalid Selection', 'Responsible Owner cannot be a participant');
            return;
        }
        setParticipants([...participants, { userId, role: 'contributor' }]);
    };

    const removeParticipant = (userId: string) => {
        setParticipants(participants.filter(p => p.userId !== userId));
    };

    const addMilestone = () => {
        if (!newMilestone.trim()) return;
        setMilestones([...milestones, newMilestone.trim()]);
        setNewMilestone('');
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const handleCreate = async () => {
        if (!title || !responsibleOwnerId) {
            Alert.alert('Missing Fields', 'Title and Responsible Owner are required');
            return;
        }

        try {
            await api.post('/tasks', {
                title,
                description,
                responsibleOwner: responsibleOwnerId,
                participants,
                milestones,
            });
            Alert.alert('Success', 'Responsibility assigned. Awaiting acceptance.');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create task');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center px-6 pt-2 pb-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-xl font-bold ml-2">New Accountability Track</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Basic Info */}
                <View className="mb-8">
                    <Text className="text-gray-900 font-bold text-lg mb-4">Core Information</Text>
                    <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-4">
                        <Text className="text-gray-400 text-xs font-bold uppercase mb-2">Track Title</Text>
                        <TextInput
                            className="text-gray-900 text-base font-semibold"
                            placeholder="e.g., Q1 Revenue Optimization"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>
                    <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <Text className="text-gray-400 text-xs font-bold uppercase mb-2">Context / Description</Text>
                        <TextInput
                            className="text-gray-900 text-base"
                            placeholder="What is the mission?"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                {/* Responsible Owner */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <User size={20} color="#000" />
                        <Text className="text-gray-900 font-bold text-lg ml-2">Responsible Owner</Text>
                    </View>
                    {loadingUsers ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {allUsers.map((u) => {
                                const isSelected = responsibleOwnerId === u.id;
                                return (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => setResponsibleOwnerId(u.id)}
                                        className={`mr-3 px-4 py-3 rounded-2xl border ${isSelected ? 'bg-black border-black' : 'bg-gray-50 border-gray-100'
                                            } items-center`}
                                    >
                                        <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                                            {u.name}
                                        </Text>
                                        <Text className={`text-xs ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                                            {u.email.split('@')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                </View>

                {/* Participants */}
                <View className="mb-8">
                    <View className="flex-row items-center mb-4">
                        <Users size={20} color="#000" />
                        <Text className="text-gray-900 font-bold text-lg ml-2">Participants</Text>
                    </View>

                    {/* Selected Participants Chips */}
                    <View className="flex-row flex-wrap mb-4">
                        {participants.length === 0 && (
                            <Text className="text-gray-400 italic">No additional participants yet</Text>
                        )}
                        {participants.map((p) => {
                            const userObj = allUsers.find(u => u.id === p.userId);
                            return (
                                <View key={p.userId} className="bg-gray-100 rounded-full px-3 py-1.5 flex-row items-center mr-2 mb-2">
                                    <Text className="text-gray-700 text-sm font-medium mr-2">{userObj?.name}</Text>
                                    <TouchableOpacity onPress={() => removeParticipant(p.userId)}>
                                        <X size={14} color="#6b7280" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    {/* Participant Picker */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {allUsers.filter(u => u.id !== responsibleOwnerId).map((u) => {
                            const isAdded = participants.find(p => p.userId === u.id);
                            return (
                                <TouchableOpacity
                                    key={u.id}
                                    onPress={() => isAdded ? removeParticipant(u.id) : addParticipant(u.id)}
                                    className={`mr-3 px-4 py-2 rounded-xl border ${isAdded ? 'bg-gray-200 border-gray-300' : 'bg-white border-gray-200'
                                        }`}
                                >
                                    <Text className="text-gray-600 font-medium">+ {u.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Milestones */}
                <View className="mb-10">
                    <View className="flex-row items-center mb-4">
                        <Flag size={20} color="#000" />
                        <Text className="text-gray-900 font-bold text-lg ml-2">Milestones</Text>
                    </View>

                    <View className="flex-row mb-4">
                        <TextInput
                            className="flex-1 bg-gray-50 p-4 rounded-l-2xl border-y border-l border-gray-100"
                            placeholder="Add a milestone..."
                            value={newMilestone}
                            onChangeText={setNewMilestone}
                        />
                        <TouchableOpacity
                            onPress={addMilestone}
                            className="bg-black px-6 items-center justify-center rounded-r-2xl"
                        >
                            <Plus size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {milestones.map((m, index) => (
                        <View key={index} className="flex-row items-center bg-gray-50 p-4 rounded-xl mb-2 border border-gray-100">
                            <CheckCircle2 size={18} color="#9ca3af" />
                            <Text className="flex-1 ml-3 text-gray-700 font-medium">{m}</Text>
                            <TouchableOpacity onPress={() => removeMilestone(index)}>
                                <Trash2 size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleCreate}
                    className="bg-black py-5 rounded-3xl items-center shadow-lg shadow-black/30"
                >
                    <Text className="text-white font-bold text-lg">Launch Track</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};


export default CreateTaskScreen;
