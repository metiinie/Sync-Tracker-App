import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import api, { setAuthToken } from '../services/api';
import { disconnectSocket, connectSocket } from '../services/socket';

interface UserSettings {
    theme: 'light' | 'dark';
    inAppNotif: boolean;
    emailDigest: boolean;
    realTimeSync: boolean;
}

interface AuthState {
    session: Session | null;
    user: User | null;
    token: string | null;
    settings: UserSettings | null;
    setSession: (session: Session | null) => Promise<void>;
    fetchSettings: () => Promise<void>;
    updateSettings: (data: Partial<UserSettings>) => Promise<void>;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    token: null,
    settings: null,
    setSession: async (session) => {
        if (session) {
            const token = session.access_token;
            const user = session.user;
            setAuthToken(token);
            set({
                session,
                user,
                token
            });
            // Fetch settings and initialize socket if needed
            await get().fetchSettings();

            const currentSettings = get().settings;
            if (currentSettings?.realTimeSync && token && user?.id) {
                connectSocket(token, user.id);
            }
        } else {
            setAuthToken(null);
            disconnectSocket();
            set({ session: null, user: null, token: null, settings: null });
        }
    },
    fetchSettings: async () => {
        try {
            // Increase timeout to 10 seconds for initial load stability
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Settings fetch timeout')), 10000)
            );
            const fetchPromise = api.get('/users/settings');

            const res: any = await Promise.race([fetchPromise, timeoutPromise]);
            set({ settings: res.data });
        } catch (err: any) {
            console.error('Failed to fetch user settings:', err.message);
            // Default settings if fetch fails or times out
            if (!get().settings) {
                set({ settings: { theme: 'light', inAppNotif: true, emailDigest: false, realTimeSync: true } });
            }
        }
    },
    updateSettings: async (data) => {
        const { settings, token, user } = get();
        if (!settings) return;

        // Optimistic update
        const newSettings = { ...settings, ...data };
        set({ settings: newSettings });

        // Handle Socket connection explicitly based on realTimeSync
        if (data.realTimeSync === false) {
            disconnectSocket();
        } else if (data.realTimeSync === true && token && user?.id) {
            connectSocket(token, user.id);
        }

        try {
            await api.patch('/users/settings', data);
        } catch (err) {
            console.error('Failed to sync settings with backend', err);
            // Revert on error
            set({ settings });
        }
    },

    setUser: (user) => set({ user }),
    logout: async () => {
        await supabase.auth.signOut();
        setAuthToken(null);
        disconnectSocket();
        set({ session: null, user: null, token: null, settings: null });
    },
}));

