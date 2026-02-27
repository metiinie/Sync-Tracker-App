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
import AdminUserDetailScreen from './src/screens/AdminUserDetailScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import SplashScreen from './src/screens/SplashScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const { token, setSession, hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Handle initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[Auth Change] Event:', _event, session ? '(Session Present)' : '(No Session)');
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Wait for store hydration AND Supabase initial check
  if (!hasHydrated || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <StatusBar style="auto" />
          {showSplash ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : (
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
                    name="AdminUserDetail"
                    component={AdminUserDetailScreen}
                    options={{ headerShown: true, title: 'Identity Governance', headerShadowVisible: false }}
                  />
                  <Stack.Screen
                    name="CreateTask"
                    component={CreateTaskScreen}
                    options={{ headerShown: true, title: 'New Track', headerShadowVisible: false }}
                  />
                </>
              )}
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
