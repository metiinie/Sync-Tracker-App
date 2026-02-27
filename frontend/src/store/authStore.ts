import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
    session: Session | null;
    user: User | null;
    token: string | null;
    systemRole: 'ADMIN' | 'USER' | null;
    hasHydrated: boolean;
    setSession: (session: Session | null) => Promise<void>;
    setSystemRole: (role: 'ADMIN' | 'USER') => void;
    setHasHydrated: (state: boolean) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            user: null,
            token: null,
            systemRole: null,
            hasHydrated: false,
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
            setHasHydrated: (state) => set({ hasHydrated: state }),
            logout: async () => {
                set({ session: null, user: null, token: null, systemRole: null });
            },
        }),
        {
            name: 'sync-tracker-auth',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: (state) => {
                return () => state.setHasHydrated(true);
            },
        }
    )
);
