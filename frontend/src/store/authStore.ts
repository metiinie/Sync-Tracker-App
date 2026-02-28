import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    token: string | null;
    setSession: (session: Session | null) => Promise<void>;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    token: null,
    setSession: async (session) => {
        if (session) {
            set({
                session,
                user: session.user,
                token: session.access_token
            });
        } else {
            set({ session: null, user: null, token: null });
        }
    },
    logout: async () => {
        set({ session: null, user: null, token: null });
    },
}));
