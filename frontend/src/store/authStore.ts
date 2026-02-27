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
                const timestamp = new Date().toLocaleTimeString();
                if (session) {
                    console.log(`[${timestamp}] [Auth Store] Setting session for user: ${session.user.email}`);
                    set({
                        session,
                        user: session.user,
                        token: session.access_token
                    });
                } else {
                    console.log(`[${timestamp}] [Auth Store] Clearing session (Logout)`);
                    set({ session: null, user: null, token: null, systemRole: null });
                }
            },
            setSystemRole: (role) => {
                console.log(`[Auth Store] System role set to: ${role}`);
                set({ systemRole: role });
            },
            setHasHydrated: (state) => set({ hasHydrated: state }),
            logout: async () => {
                console.log('[Auth Store] Manual logout triggered');
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
