import './global.css';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './src/store/authStore';
import { supabase } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MainTabs from './src/navigation/MainTabs';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import SplashScreen from './src/screens/SplashScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import WorkspacesScreen from './src/screens/WorkspacesScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import HelpScreen from './src/screens/HelpScreen';
import AboutScreen from './src/screens/AboutScreen';
const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const { token, setSession, settings } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await setSession(session);
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Render content based on app state
  const renderContent = () => {
    if (showSplash) {
      return <SplashScreen onFinish={() => setShowSplash(false)} />;
    }

    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      );
    }

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{ headerShown: true, title: 'Track Details', headerShadowVisible: false }}
            />
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{ headerShown: true, title: 'New Track', headerShadowVisible: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Security"
              component={SecurityScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Workspaces"
              component={WorkspacesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Privacy"
              component={PrivacyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Help"
              component={HelpScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <View className={settings?.theme === 'dark' ? 'dark flex-1' : 'flex-1'} style={{ backgroundColor: settings?.theme === 'dark' ? '#111827' : '#F9FAFB' }}>
        <NavigationContainer>
          <StatusBar style={settings?.theme === 'dark' ? 'light' : 'dark'} />
          {renderContent()}
        </NavigationContainer>
      </View>
    </QueryClientProvider>
  );
}
