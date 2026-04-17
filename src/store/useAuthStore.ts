import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, SystemRole } from '../types';

export interface RolePermissions {
  pos: boolean;
  clients: boolean;
  dashboard: boolean;
  settings: boolean;
  agenda: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLicensed: boolean;
  permissions: Record<SystemRole, RolePermissions>;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLicensed: (status: boolean) => void;
  updatePermissions: (role: SystemRole, modules: RolePermissions) => void;
}

const defaultPermissions: Record<SystemRole, RolePermissions> = {
  admin: { pos: true, clients: true, dashboard: true, settings: true, agenda: true },
  gerant: { pos: true, clients: true, dashboard: true, settings: true, agenda: true },
  employe: { pos: true, clients: false, dashboard: false, settings: false, agenda: true },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLicensed: false,
      permissions: defaultPermissions,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (updates) => set((state) => ({ 
        user: state.user ? { ...state.user, ...updates } : null 
      })),
      setLicensed: (status) => set({ isLicensed: status }),
      updatePermissions: (role, modules) => set((state) => ({
        permissions: {
           ...state.permissions,
           [role]: role === 'admin' ? defaultPermissions.admin : modules
        }
      })),
    }),
    {
      name: 'elite-auth-storage',
    }
  )
);
