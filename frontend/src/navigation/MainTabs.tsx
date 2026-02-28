import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TasksScreen from '../screens/TasksScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CustomTabBar from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen name="Radar" component={HomeScreen} />
            <Tab.Screen name="Tasks" component={TasksScreen} />
            <Tab.Screen name="Team" component={NotificationsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

export default MainTabs;
