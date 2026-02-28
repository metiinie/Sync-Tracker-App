import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    token: string | null;
    systemRole: 'ADMIN' | 'USER' | null;
    setSession: (session: Session | null) => Promise<void>;
    setSystemRole: (role: 'ADMIN' | 'USER') => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    token: null,
    systemRole: null,
    setSession: async (session) => {
        if (session) {
            set({
                session,
                user: session.user,
                token: session.access_token
            });
        } else {
            set({ session: null, user: null, token: null, systemRole: null });
        }
    },
    setSystemRole: (role) => set({ systemRole: role }),
    logout: async () => {
        set({ session: null, user: null, token: null, systemRole: null });
    },
}));
