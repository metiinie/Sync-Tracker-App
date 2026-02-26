import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminDashboard from '../screens/AdminDashboard';
import AdminTasksScreen from '../screens/AdminTasksScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import CustomTabBar from '../components/CustomTabBar';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const { systemRole, setSystemRole } = useAuthStore();

    React.useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/auth/profile');
                setSystemRole(response.data.systemRole);
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };
        fetchProfile();
    }, []);

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            {systemRole === 'ADMIN' && (
                <>
                    <Tab.Screen name="Admin" component={AdminDashboard} />
                    <Tab.Screen name="All Tasks" component={AdminTasksScreen} />
                    <Tab.Screen name="Users" component={AdminUsersScreen} />
                </>
            )}
            <Tab.Screen name="Dashboard" component={HomeScreen} />
            <Tab.Screen name="Tasks" component={TasksScreen} />
            <Tab.Screen name="Notifications" component={NotificationsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

export default MainTabs;
