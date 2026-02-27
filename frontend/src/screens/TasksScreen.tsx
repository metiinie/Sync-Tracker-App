import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Search, Plus, ListFilter, ArrowLeft, Filter, Bell, User as UserIcon, MoreHorizontal, ChevronDown, Zap, TrendingUp } from 'lucide-react-native';
import AdminAuditCard from '../components/AdminAuditCard';
import FocusTaskCard from '../components/FocusTaskCard';
import RiskGroupItem from '../components/RiskGroupItem';

const TasksScreen = ({ navigation }: any) => {
    const { token, user, systemRole } = useAuthStore();
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'audit' | 'risk' | 'velocity'>('audit'); // Admin modes

    const isAdmin = systemRole === 'ADMIN';

    const { data: tasks = [], isLoading, refetch } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            const res = await api.get('/tasks');
            return res.data;
        },
        enabled: !!token,
    });

    const filteredTasks = useMemo(() => {
        let result = tasks;
        if (search) {
            result = result.filter((t: any) =>
                t.title.toLowerCase().includes(search.toLowerCase())
            );
        }
        return result;
    }, [tasks, search]);

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // --- RENDER ADMIN VIEW ---
    const renderAdminView = () => {
        return (
            <View className="flex-1">
                {/* Header for Admin */}
                <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-xl font-black text-gray-900">{viewMode === 'audit' ? 'Task Audit' : viewMode === 'risk' ? 'Risk Overview' : 'Sync Velocity'}</Text>
                    </View>
                    <View className="flex-row items-center">
                        <TouchableOpacity className="bg-blue-50 px-4 py-2 rounded-full flex-row items-center mr-3">
                            <Filter size={16} color="#3b82f6" />
                            <Text className="text-blue-600 font-bold ml-2 text-xs">Filter</Text>
                        </TouchableOpacity>
                        <Search size={22} color="#374151" />
                    </View>
                </View>

                {/* Sub-navigation for Admin */}
                <View className="px-6 py-3 bg-white flex-row">
                    <TouchableOpacity
                        onPress={() => setViewMode('audit')}
                        className={`mr-6 pb-2 border-b-2 ${viewMode === 'audit' ? 'border-blue-600' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold text-sm ${viewMode === 'audit' ? 'text-blue-600' : 'text-gray-400'}`}>Audit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setViewMode('risk')}
                        className={`mr-6 pb-2 border-b-2 ${viewMode === 'risk' ? 'border-blue-600' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold text-sm ${viewMode === 'risk' ? 'text-blue-600' : 'text-gray-400'}`}>Risk</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setViewMode('velocity')}
                        className={`pb-2 border-b-2 ${viewMode === 'velocity' ? 'border-blue-600' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold text-sm ${viewMode === 'velocity' ? 'text-blue-600' : 'text-gray-400'}`}>Velocity</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    className="flex-1 px-6"
                    contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
                >
                    {viewMode === 'audit' && (
                        <>
                            {/* Summary Cards */}
                            <View className="flex-row mb-6">
                                <View className="flex-1 bg-red-50/50 p-5 rounded-[28px] border border-red-50 mr-3">
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center">
                                            <View className="w-4 h-0.5 bg-white rotate-45 absolute" />
                                            <View className="w-4 h-0.5 bg-white -rotate-45" />
                                        </View>
                                        <View className="bg-red-100 px-2 py-0.5 rounded-lg">
                                            <Text className="text-red-700 text-[10px] font-black">+12%</Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Blocked</Text>
                                    <Text className="text-3xl font-black text-gray-900">12</Text>
                                </View>

                                <View className="flex-1 bg-orange-50/50 p-5 rounded-[28px] border border-orange-50">
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View className="w-8 h-8 rounded-full border-2 border-orange-500 items-center justify-center">
                                            <View className="w-3 h-3 border-b-2 border-orange-500 rounded-sm" />
                                        </View>
                                        <View className="bg-gray-100 px-2 py-0.5 rounded-lg">
                                            <Text className="text-gray-500 text-[10px] font-black">0%</Text>
                                        </View>
                                    </View>
                                    <Text className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Stale</Text>
                                    <Text className="text-3xl font-black text-gray-900">5</Text>
                                </View>
                            </View>

                            {/* Quick Buttons */}
                            <View className="flex-row mb-8">
                                <TouchableOpacity className="flex-1 bg-[#0f172a] py-4 rounded-2xl flex-row items-center justify-center mr-3">
                                    <Bell size={18} color="white" />
                                    <Text className="text-white font-bold ml-2">Bulk Nudge</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="flex-1 bg-white border border-gray-200 py-4 rounded-2xl flex-row items-center justify-center">
                                    <UserIcon size={18} color="#374151" />
                                    <Text className="text-gray-900 font-bold ml-2">Reassign</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Bottlenecks List */}
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-bold text-gray-900">Critical Bottlenecks</Text>
                                <TouchableOpacity><Text className="text-blue-600 font-bold text-sm">View All</Text></TouchableOpacity>
                            </View>

                            {filteredTasks.map((t: any) => (
                                <AdminAuditCard
                                    key={t.id}
                                    task={{
                                        ...t,
                                        owner: { name: t.owner?.email?.split('@')[0] || 'Unknown' },
                                        team: t.department || 'General',
                                        staleDays: 3, // Mocked
                                        lastSync: '2h ago' // Mocked
                                    }}
                                    onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
                                />
                            ))}
                        </>
                    )}

                    {viewMode === 'risk' && (
                        <>
                            <Text className="text-xl font-bold text-gray-900 mb-6">Critical Risk (3 Tasks)</Text>
                            {filteredTasks.slice(0, 3).map((t: any) => (
                                <RiskGroupItem
                                    key={t.id}
                                    task={{
                                        ...t,
                                        team: t.department || 'Product',
                                        statusLabel: 'Stale 15D',
                                        ownerName: t.owner?.email?.split('@')[0] || 'Unknown'
                                    }}
                                    riskColor="bg-red-500"
                                    onPress={() => { }}
                                />
                            ))}

                            <Text className="text-xl font-bold text-gray-900 mt-6 mb-6">High Risk (5 Tasks)</Text>
                            {filteredTasks.slice(3, 5).map((t: any) => (
                                <RiskGroupItem
                                    key={t.id}
                                    task={{
                                        ...t,
                                        team: t.department || 'Engineering',
                                        statusLabel: 'Transfer Pending',
                                        ownerName: t.owner?.email?.split('@')[0] || 'Unknown'
                                    }}
                                    riskColor="bg-orange-500"
                                    onPress={() => { }}
                                    onAction={() => { }}
                                    actionLabel="Assign"
                                />
                            ))}
                        </>
                    )}

                    {viewMode === 'velocity' && (
                        <>
                            {/* Velocity Stats */}
                            <View className="flex-row mb-8">
                                <View className="flex-1 mr-4">
                                    <Text className="text-gray-400 text-[10px] font-black uppercase mb-1">Avg Resolve Time</Text>
                                    <View className="flex-row items-end">
                                        <Text className="text-2xl font-black text-gray-900">4.2h</Text>
                                        <Text className="text-green-500 text-[10px] font-black ml-2 mb-1">^ 12%</Text>
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-400 text-[10px] font-black uppercase mb-1">Sync Frequency</Text>
                                    <View className="flex-row items-end">
                                        <Text className="text-2xl font-black text-gray-900">Daily</Text>
                                        <Text className="text-gray-400 text-[10px] font-black ml-2 mb-1">{"->"} Stable</Text>
                                    </View>
                                </View>
                            </View>

                            <Text className="text-xl font-bold text-gray-900 mb-6">Active Blocks</Text>
                            {filteredTasks.map((t: any) => (
                                <TouchableOpacity key={t.id} className="bg-white rounded-3xl p-6 border border-gray-100 mb-4 shadow-sm">
                                    <View className="flex-row justify-between mb-4">
                                        <View>
                                            <Text className="text-lg font-bold text-gray-900 mb-1">{t.title}</Text>
                                            <Text className="text-gray-400 text-xs font-medium">{t.department || 'General'}</Text>
                                        </View>
                                        <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                                            <TrendingUp size={20} color="#3b82f6" />
                                        </View>
                                    </View>

                                    <View className="flex-row items-center justify-between border-t border-gray-50 pt-4">
                                        <View>
                                            <Text className="text-gray-400 text-[10px] font-black uppercase">Avg Resolve</Text>
                                            <Text className="text-gray-900 font-bold">2.4h</Text>
                                        </View>
                                        <View>
                                            <Text className="text-gray-400 text-[10px] font-black uppercase">Frequency</Text>
                                            <Text className="text-gray-900 font-bold">2x / Day</Text>
                                        </View>
                                        <TouchableOpacity className="flex-row items-center">
                                            <Text className="text-blue-600 font-black text-xs mr-1">Graph</Text>
                                            <ChevronDown size={14} color="#3b82f6" style={{ transform: [{ rotate: '-90deg' }] }} />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </>
                    )}
                </ScrollView>
            </View>
        );
    };

    // --- RENDER CUSTOMER VIEW ---
    const renderCustomerView = () => {
        return (
            <View className="flex-1">
                {/* Header for Customer */}
                <View className="px-6 py-4 bg-white flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <TouchableOpacity>
                            <View className="w-8 h-8 rounded-full bg-blue-100 p-1 items-center justify-center">
                                <Zap size={18} color="#3b82f6" />
                            </View>
                        </TouchableOpacity>
                        <Text className="text-2xl font-black text-gray-900 ml-3">Focus View</Text>
                    </View>
                    <View className="flex-row items-center">
                        <Search size={22} color="#374151" className="mr-4" />
                        <Filter size={22} color="#374151" />
                    </View>
                </View>

                <View className="px-6 mt-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                        {['All', 'Sync Due', 'Stale', 'Completed'].map((f, i) => (
                            <TouchableOpacity
                                key={f}
                                onPress={() => setActiveFilter(f.toLowerCase())}
                                className={`px-6 py-2.5 rounded-full mr-3 border ${activeFilter === f.toLowerCase() || (i === 0 && activeFilter === 'all')
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-100 shadow-sm'
                                    }`}
                            >
                                <Text className={`font-bold text-sm ${activeFilter === f.toLowerCase() || (i === 0 && activeFilter === 'all') ? 'text-white' : 'text-gray-600'
                                    }`}>{f}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView
                    className="flex-1 px-6"
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-gray-900">Needs Attention</Text>
                        <View className="bg-red-50 px-2 py-0.5 rounded-md">
                            <Text className="text-red-600 font-black text-[10px]">2 Critical</Text>
                        </View>
                    </View>

                    {filteredTasks.length > 0 ? (
                        <>
                            <FocusTaskCard
                                task={{
                                    ...filteredTasks[0],
                                    department: filteredTasks[0].department || 'Finance Dept',
                                    meta: 'Audit Trail',
                                    staleInfo: '2d',
                                    participants: filteredTasks[0].participants || []
                                }}
                                type="CRITICAL"
                                onPress={() => navigation.navigate('TaskDetail', { taskId: filteredTasks[0].id })}
                                onAction={() => { }}
                            />
                            {filteredTasks[1] && (
                                <FocusTaskCard
                                    task={{
                                        ...filteredTasks[1],
                                        department: filteredTasks[1].department || 'Marketing',
                                        meta: 'Campaign Q4',
                                        dueIn: '45m',
                                        participants: filteredTasks[1].participants || []
                                    }}
                                    type="DUE"
                                    onPress={() => navigation.navigate('TaskDetail', { taskId: filteredTasks[1].id })}
                                    onAction={() => { }}
                                />
                            )}
                        </>
                    ) : (
                        <Text className="text-gray-400 italic font-medium px-4 py-8 text-center">No tasks need immediate attention.</Text>
                    )}

                    <Text className="text-xl font-bold text-gray-900 mt-6 mb-4">Upcoming Syncs</Text>

                    {/* Mocked Upcoming Syncs as per Image 4 */}
                    {[
                        { title: 'Weekly Team Standup', team: 'Engineering • Core Platform', time: '2:00 PM', icon: <View className="w-8 h-8 rounded-full border-2 border-blue-600 mr-4" /> },
                        { title: 'Client Feedback Review', team: 'Design • Mobile App Refresh', time: 'Tomorrow', icon: <View className="w-8 h-8 rounded-full border-2 border-blue-200 mr-4" /> },
                        { title: 'Quarterly Planning', team: 'Leadership • Strategy', time: 'Fri, Oct 24', icon: <View className="w-8 h-8 rounded-full border-2 border-blue-100 mr-4" /> },
                    ].map((sync, i) => (
                        <TouchableOpacity key={i} className="flex-row items-center mb-6">
                            {sync.icon}
                            <View className="flex-1">
                                <Text className="text-base font-bold text-gray-900">{sync.title}</Text>
                                <Text className="text-gray-400 text-xs font-medium">{sync.team}</Text>
                            </View>
                            <Text className="text-gray-400 text-xs font-bold">{sync.time}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {isAdmin ? renderAdminView() : renderCustomerView()}

            {/* FAB */}
            <TouchableOpacity
                onPress={() => navigation.navigate('CreateTask')}
                className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-500/50 z-50"
            >
                <Plus size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

export default TasksScreen;

