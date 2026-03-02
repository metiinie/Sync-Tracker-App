import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import api from '../services/api';
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
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    token: null,
    settings: null,
    setSession: async (session) => {
        if (session) {
            set({
                session,
                user: session.user,
                token: session.access_token
            });
            // Fetch settings after session is established
            await get().fetchSettings();
        } else {
            set({ session: null, user: null, token: null, settings: null });
        }
    },
    fetchSettings: async () => {
        try {
            const res = await api.get('/users/settings');
            set({ settings: res.data });
        } catch (err) {
            console.error('Failed to fetch user settings', err);
        }
    },
    updateSettings: async (data) => {
        const { settings } = get();
        if (!settings) return;

        // Optimistic update
        const newSettings = { ...settings, ...data };
        set({ settings: newSettings });

        // Handle Socket connection explicitly based on realTimeSync
        if (data.realTimeSync === false) {
            disconnectSocket();
        } else if (data.realTimeSync === true) {
            connectSocket();
        }

        try {
            await api.patch('/users/settings', data);
        } catch (err) {
            console.error('Failed to sync settings with backend', err);
            // Revert on error
            set({ settings });
        }
    },

    logout: async () => {
        set({ session: null, user: null, token: null, settings: null });
    },
}));

