import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Layout, Share2, Info, GitBranch, Share, List, Clock, CheckCircle2, AlertCircle, HelpCircle, Plus, User, Users, Flag as FlagIcon, Shield, Slash, Unlock, Trash2, XCircle } from 'lucide-react-native';
import { Modal } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../services/socket';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TaskDetailScreen = ({ route, navigation }: any) => {
    const { taskId } = route.params;
    const { token, user } = useAuthStore();
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview'); // Overview, Tree, Graph, Logs
    const [newTimeLog, setNewTimeLog] = useState({ duration: '', description: '' });

    const fetchTask = async () => {
        try {
            const response = await axios.get(`${API_URL}/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTask(response.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTask();
        const socket = getSocket();
        socket.emit('joinTask', { taskId });

        socket.on('sync:update', (data) => {
            if (data.taskId === taskId) {
                setTask((prev: any) => prev ? { ...prev, syncState: data.syncState } : prev);
            }
        });

        socket.on('milestone:updated', (newMilestone) => {
            setTask((prev: any) => {
                if (!prev) return prev;
                const updatedMilestones = prev.milestones.map((m: any) =>
                    m.id === newMilestone.id ? newMilestone : m
                );
                return { ...prev, milestones: updatedMilestones };
            });
        });

        return () => {
            socket.emit('leaveTask', { taskId });
            socket.off('sync:update');
            socket.off('milestone:updated');
        };
    }, [taskId]);

    const handleToggleMilestone = async (mid: string, current: string) => {
        try {
            const next = current === 'true' ? false : true;
            await axios.patch(`${API_URL}/tasks/milestones/${mid}/toggle`,
                { isCompleted: next },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            Alert.alert('Error', 'Failed to update milestone');
        }
    };

    const handleLogTime = async () => {
        if (!newTimeLog.duration) return;
        try {
            await axios.post(`${API_URL}/tasks/${taskId}/time-logs`, {
                durationMinutes: newTimeLog.duration,
                description: newTimeLog.description,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewTimeLog({ duration: '', description: '' });
            fetchTask(); // Refresh to get logs
        } catch (err) {
            Alert.alert('Error', 'Failed to log time');
        }
    };

    const updateSyncState = async (state: string) => {
        try {
            await axios.patch(`${API_URL}/tasks/${taskId}/sync`,
                { syncState: state },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            Alert.alert('Error', 'Failed to update sync state');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    if (!task) return null;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-lg font-bold">Track Engine</Text>
                <TouchableOpacity>
                    <Share2 size={20} color="#000" />
                </TouchableOpacity>
            </View>

            {/* Tab Bar Container */}
            <View className="px-6 py-4">
                <View className="flex-row bg-gray-100 rounded-2xl p-1">
                    {['Overview', 'Tree', 'Graph', 'Logs'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`flex-1 py-3 rounded-[14px] items-center ${activeTab === tab ? 'bg-white shadow-sm' : ''
                                }`}
                        >
                            <Text className={`text-xs font-bold ${activeTab === tab ? 'text-black' : 'text-gray-400'}`}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Content Area */}
            <View className="flex-1">
                {activeTab === 'Overview' && <OverviewTab task={task} user={user} updateSyncState={updateSyncState} handleToggleMilestone={handleToggleMilestone} newTimeLog={newTimeLog} setNewTimeLog={setNewTimeLog} handleLogTime={handleLogTime} fetchTask={fetchTask} />}
                {activeTab === 'Tree' && <TreeViewTab task={task} fetchTask={fetchTask} />}
                {activeTab === 'Graph' && <GraphViewTab task={task} />}
                {activeTab === 'Logs' && <LogsTab task={task} />}
            </View>
        </SafeAreaView>
    );
};

// --- MODALS & COMPONENTS ---

const AdminActionModal = ({ visible, title, onClose, onConfirm }: any) => {
    const [reason, setReason] = useState('');
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 justify-center px-6">
                <View className="bg-white rounded-3xl p-6">
                    <Text className="text-xl font-black text-gray-900 mb-2">{title}</Text>
                    <Text className="text-gray-500 text-sm mb-4">A reason is required for this administrative action.</Text>
                    <TextInput
                        className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-900 mb-6"
                        placeholder="Type reason here..."
                        multiline
                        value={reason}
                        onChangeText={setReason}
                    />
                    <View className="flex-row">
                        <TouchableOpacity onPress={onClose} className="flex-1 py-4 items-center">
                            <Text className="text-gray-400 font-bold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { onConfirm(reason); setReason(''); }}
                            className="flex-1 bg-black py-4 rounded-2xl items-center"
                        >
                            <Text className="text-white font-bold">Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// --- SUBSCREENS ---

const OverviewTab = ({ task, user, updateSyncState, handleToggleMilestone, newTimeLog, setNewTimeLog, handleLogTime, fetchTask }: any) => {
    const { systemRole, token } = useAuthStore();
    const [actionConfig, setActionConfig] = useState<any>(null);

    const handleAdminAction = async (endpoint: string, reason: string) => {
        try {
            await axios.post(`${API_URL}/admin/tasks/${task.id}/${endpoint}`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActionConfig(null);
            fetchTask();
        } catch (err) {
            Alert.alert('Error', 'Admin action failed');
        }
    };

    const AdminActionBtn = ({ label, icon: Icon, color, endpoint }: any) => (
        <TouchableOpacity
            onPress={() => setActionConfig({ title: label, endpoint })}
            className="flex-row items-center bg-gray-50 p-4 rounded-2xl mb-2 border border-gray-100"
        >
            <Icon size={18} color={color} />
            <Text className="ml-3 font-bold text-gray-700 text-xs">{label}</Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
            <AdminActionModal
                visible={!!actionConfig}
                title={actionConfig?.title}
                onClose={() => setActionConfig(null)}
                onConfirm={(reason: string) => handleAdminAction(actionConfig.endpoint, reason)}
            />
            <View className="mb-8">
                <View className="flex-row items-center mb-1">
                    <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Responsibility</Text>
                    <View className={`ml-3 px-2 py-0.5 rounded-full ${task.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Text className={`text-[10px] font-bold ${task.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-500'}`}>{task.status}</Text>
                    </View>
                </View>
                <Text className="text-2xl font-black text-gray-900 mb-2">{task.title}</Text>
                <Text className="text-gray-500 leading-6 text-base">{task.description}</Text>
            </View>

            {/* Sync Controls */}
            <View className="mb-8">
                <Text className="text-sm font-bold text-gray-900 mb-4">Update My Sync State</Text>
                <View className="flex-row flex-wrap justify-between">
                    {[
                        { id: 'IN_SYNC', label: 'In Sync', color: '#10b981', icon: CheckCircle2 },
                        { id: 'NEEDS_UPDATE', label: 'Needs Update', color: '#f59e0b', icon: Clock },
                        { id: 'BLOCKED', label: 'Blocked', color: '#ef4444', icon: AlertCircle },
                        { id: 'HELP_REQUESTED', label: 'Help!', color: '#3b82f6', icon: HelpCircle },
                    ].map((s) => {
                        const Icon = s.icon;
                        const isSelected = task.syncState === s.id;
                        return (
                            <TouchableOpacity
                                key={s.id}
                                onPress={() => updateSyncState(s.id)}
                                className={`w-[48%] flex-row items-center p-4 rounded-2xl mb-3 border ${isSelected ? 'bg-white border-black border-2' : 'bg-gray-50 border-gray-100'
                                    }`}
                            >
                                <Icon size={18} color={s.color} />
                                <Text className="ml-2 font-bold text-gray-900 text-xs">{s.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Participants */}
            <View className="mb-8">
                <Text className="text-sm font-bold text-gray-900 mb-4">Stakeholders</Text>
                <View className="flex-row items-center mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <View className="w-10 h-10 bg-black rounded-full items-center justify-center">
                        <User size={20} color="#fff" />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="font-bold text-gray-900">{task.owner?.name}</Text>
                        <Text className="text-gray-400 text-xs">Responsible Owner</Text>
                    </View>
                    <View className="px-3 py-1 bg-green-100 rounded-full">
                        <Text className="text-green-700 text-[10px] font-black italic">LEAD</Text>
                    </View>
                </View>
                {task.participants?.map((p: any) => (
                    <View key={p.id} className="flex-row items-center mb-3 px-4 py-3 bg-white rounded-2xl border border-gray-100">
                        <View className="w-8 h-8 bg-gray-200 rounded-full items-center justify-center">
                            <Users size={16} color="#4b5563" />
                        </View>
                        <View className="ml-3 flex-1">
                            <Text className="font-semibold text-gray-700">{p.user?.name}</Text>
                        </View>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">{p.role}</Text>
                    </View>
                ))}
            </View>

            {/* Milestones */}
            <View className="mb-8">
                <Text className="text-sm font-bold text-gray-900 mb-4">Milestones</Text>
                {task.milestones?.length === 0 && <Text className="text-gray-400 italic mb-4">No milestones defined</Text>}
                {task.milestones?.map((m: any) => (
                    <TouchableOpacity
                        key={m.id}
                        onPress={() => handleToggleMilestone(m.id, m.isCompleted)}
                        className="flex-row items-center mb-3 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                        <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${m.isCompleted === 'true' ? 'bg-black border-black' : 'border-gray-300'}`}>
                            {m.isCompleted === 'true' && <CheckCircle2 size={14} color="#fff" />}
                        </View>
                        <Text className={`ml-3 flex-1 font-medium ${m.isCompleted === 'true' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {m.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Time Logging */}
            <View className="mb-8">
                <Text className="text-sm font-bold text-gray-900 mb-4">Log Execution Time</Text>
                <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <View className="flex-row mb-3">
                        <TextInput
                            className="flex-1 bg-white p-3 rounded-xl border border-gray-100 text-sm"
                            placeholder="Mins (e.g., 45)"
                            keyboardType="numeric"
                            value={newTimeLog.duration}
                            onChangeText={(t) => setNewTimeLog({ ...newTimeLog, duration: t })}
                        />
                        <View className="w-4" />
                        <TextInput
                            className="flex-[2] bg-white p-3 rounded-xl border border-gray-100 text-sm"
                            placeholder="Description..."
                            value={newTimeLog.description}
                            onChangeText={(t) => setNewTimeLog({ ...newTimeLog, description: t })}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleLogTime}
                        className="bg-black py-3 rounded-xl items-center"
                    >
                        <Text className="text-white font-bold text-sm">Commit Time</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Admin Actions Suite */}
            {systemRole === 'ADMIN' && (
                <View className="mb-8 mt-4">
                    <Text className="text-sm font-black text-red-600 mb-4 tracking-widest uppercase">Admin Action Suite</Text>
                    <View className="flex-row flex-wrap justify-between">
                        <View className="w-[48%]">
                            {task.status !== 'FROZEN' ? (
                                <AdminActionBtn label="Freeze Task" icon={Slash} color="#3b82f6" endpoint="freeze" />
                            ) : (
                                <AdminActionBtn label="Unfreeze / Reopen" icon={Unlock} color="#10b981" endpoint="reopen" />
                            )}
                        </View>
                        <View className="w-[48%]">
                            <AdminActionBtn label="Force Close" icon={XCircle} color="#ef4444" endpoint="force-close" />
                        </View>
                    </View>
                    <Text className="text-[10px] text-gray-400 italic mt-2">Actions here will be logged immutably and broadcast to all stakeholders.</Text>
                </View>
            )}
        </ScrollView>
    );
};

const TreeViewTab = ({ task, fetchTask }: any) => {
    const { systemRole, token } = useAuthStore();
    const [removeUser, setRemoveUser] = useState<any>(null);

    const handleRemoveParticipant = async (reason: string) => {
        try {
            await axios.delete(`${API_URL}/admin/tasks/${task.id}/participants/${removeUser.id}`, {
                data: { reason },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRemoveUser(null);
            fetchTask();
        } catch (err) {
            Alert.alert('Error', 'Failed to remove participant');
        }
    };
    return (
        <ScrollView className="flex-1 px-6 pt-4">
            <AdminActionModal
                visible={!!removeUser}
                title={`Remove ${removeUser?.name}`}
                onClose={() => setRemoveUser(null)}
                onConfirm={handleRemoveParticipant}
            />
            <View className="flex-row items-center mb-6">
                <View className="w-1.5 h-10 bg-black rounded-full" />
                <View className="ml-4">
                    <Text className="text-lg font-black text-gray-900">Relational Hierarchy</Text>
                    <Text className="text-gray-400 text-xs">Structural view of roles and status</Text>
                </View>
            </View>

            <View className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                {/* Level 1: Task */}
                <View className="flex-row items-center mb-6">
                    <View className="w-8 h-8 bg-black rounded-lg items-center justify-center rotate-45">
                        <View className="-rotate-45">
                            <Layout size={16} color="#fff" />
                        </View>
                    </View>
                    <Text className="ml-4 font-black text-gray-900">{task.title}</Text>
                </View>

                {/* Level 2: Owner */}
                <View className="flex-row ml-10 mb-6 items-center">
                    <View className="w-0.5 h-12 bg-gray-200 absolute -left-4 -top-8" />
                    <View className="w-4 h-0.5 bg-gray-200 absolute -left-4 top-4" />
                    <View className="w-3 h-3 rounded-full bg-blue-500 mr-4 shadow-sm shadow-blue-200" />
                    <View>
                        <Text className="font-bold text-gray-800">{task.owner?.name}</Text>
                        <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Responsible Owner</Text>
                    </View>
                </View>

                {/* Level 3: Participants */}
                {task.participants?.map((p: any, i: number) => (
                    <View key={p.id} className="flex-row ml-20 mb-6 items-center">
                        <View className="w-0.5 h-16 bg-gray-200 absolute -left-4 -top-12" />
                        <View className="w-4 h-0.5 bg-gray-200 absolute -left-4 top-4" />
                        <View className="w-3 h-3 rounded-full bg-gray-300 mr-4" />
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-600">{p.user?.name}</Text>
                            <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.role}</Text>
                        </View>
                        {systemRole === 'ADMIN' && (
                            <TouchableOpacity
                                onPress={() => setRemoveUser(p.user)}
                                className="ml-2 w-8 h-8 rounded-full bg-red-50 items-center justify-center border border-red-100"
                            >
                                <Trash2 size={14} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const GraphViewTab = ({ task }: any) => {
    // Basic SVG Graph Layout
    const center = SCREEN_WIDTH / 2;
    const padding = 60;

    const ownerPos = { x: center, y: 150 };
    const participants = task.participants || [];

    // Position participants in semi-circles
    const getPos = (index: number, total: number, radius: number, yOffset: number) => {
        if (total === 1) return { x: center, y: yOffset + radius };
        const angle = (Math.PI / (total + 1)) * (index + 1);
        return {
            x: center + radius * Math.cos(Math.PI + angle),
            y: yOffset + radius * Math.sin(Math.PI + angle)
        };
    };

    const getSyncColor = (state: string) => {
        switch (state) {
            case 'IN_SYNC': return '#10b981';
            case 'NEEDS_UPDATE': return '#f59e0b';
            case 'BLOCKED': return '#ef4444';
            case 'HELP_REQUESTED': return '#3b82f6';
            default: return '#9ca3af';
        }
    };

    return (
        <View className="flex-1 items-center bg-gray-50 pt-10">
            <Svg height="100%" width="100%">
                {/* Lines from Center to Owner */}
                <Line x1={center} y1={50} x2={ownerPos.x} y2={ownerPos.y} stroke="#e5e7eb" strokeWidth="2" strokeDasharray="5,5" />

                {/* Lines from Owner to Participants */}
                {participants.map((p: any, i: number) => {
                    const pos = getPos(i, participants.length, 120, ownerPos.y);
                    return <Line key={`l-${i}`} x1={ownerPos.x} y1={ownerPos.y} x2={pos.x} y2={pos.y} stroke="#e2e8f0" strokeWidth="1.5" />;
                })}

                {/* Center Node: Task */}
                <G>
                    <Circle cx={center} cy={50} r="30" fill="#000" />
                    <SvgText x={center} y={55} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">TASK</SvgText>
                </G>

                {/* Owner Node */}
                <G>
                    <Circle cx={ownerPos.x} cy={ownerPos.y} r="35" fill={getSyncColor(task.syncState)} />
                    <Circle cx={ownerPos.x} cy={ownerPos.y} r="28" fill="#fff" />
                    <SvgText x={ownerPos.x} y={ownerPos.y + 5} fill="#000" fontSize="8" textAnchor="middle" fontWeight="bold">OWNER</SvgText>
                    <SvgText x={ownerPos.x} y={ownerPos.y + 50} fill="#4b5563" fontSize="10" textAnchor="middle" fontWeight="bold">{task.owner?.name}</SvgText>
                </G>

                {/* Participant Nodes */}
                {participants.map((p: any, i: number) => {
                    const pos = getPos(i, participants.length, 120, ownerPos.y);
                    return (
                        <G key={`p-${i}`}>
                            <Circle cx={pos.x} cy={pos.y} r="20" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                            <SvgText x={pos.x} y={pos.y + 4} fill="#64748b" fontSize="8" textAnchor="middle">{p.user?.name.split(' ')[0]}</SvgText>
                            <SvgText x={pos.x} y={pos.y + 35} fill="#94a3b8" fontSize="7" textAnchor="middle" fontWeight="bold">{p.role.toUpperCase()}</SvgText>
                        </G>
                    );
                })}
            </Svg>

            <View className="absolute bottom-10 bg-white/80 px-4 py-2 rounded-full border border-gray-100">
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Animated Engine Visualization</Text>
            </View>
        </View>
    );
};

const LogsTab = ({ task }: any) => {
    return (
        <ScrollView className="flex-1 px-6 pt-6">
            <View className="mb-8">
                <Text className="text-xl font-black text-gray-900 mb-2">Immutable Audit Feed</Text>
                <Text className="text-gray-400 text-sm">Every responsibility shift is tracked</Text>
            </View>

            {task.logs?.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log: any, i: number) => (
                <View key={log.id} className="flex-row mb-6">
                    <View className="items-center">
                        <View className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-black' : 'bg-gray-200'} z-10`} />
                        {i !== task.logs.length - 1 && <View className="w-0.5 flex-1 bg-gray-100 -mt-0.5" />}
                    </View>
                    <View className="ml-4 flex-1 pb-6">
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            {new Date(log.timestamp).toLocaleString()}
                        </Text>
                        <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <Text className="text-gray-800 font-bold mb-1">{log.user?.name || 'System'}</Text>
                            <Text className="text-gray-600 text-sm">{log.action}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </ScrollView>
    );
};

export default TaskDetailScreen;
